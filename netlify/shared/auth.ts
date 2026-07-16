/**
 * Self-hosted auth helpers for Netlify Functions (no external deps).
 * - Passwords: scrypt with a random salt (node:crypto)
 * - Sessions: HS256 JWT signed with JWT_SECRET (node:crypto HMAC)
 * - Users: stored in the Netlify Blobs store `auth`, key `users`
 */
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { getStore } from '@netlify/blobs';

export type Role = 'owner' | 'manager' | 'coordinator' | 'usher';

/** One key per admin module / view that access is gated on. */
export type Permission =
  | 'dashboard'
  | 'attendees'
  | 'reservations'
  | 'register'
  | 'tickets'
  | 'checkin'
  | 'team';

export const ROLES: Role[] = ['owner', 'manager', 'coordinator', 'usher'];

/** What each role can reach. Owner is the only role that manages the team. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ['dashboard', 'attendees', 'reservations', 'register', 'tickets', 'checkin', 'team'],
  manager: ['dashboard', 'attendees', 'reservations', 'register', 'tickets', 'checkin'],
  coordinator: ['attendees', 'reservations', 'register', 'tickets', 'checkin'],
  usher: ['checkin', 'attendees'],
};

/**
 * Coerce any stored/legacy role to a valid one. The original app had a single
 * 'admin' role with full access, so legacy 'admin' users become owners; any
 * unrecognised value falls back to the least-privileged role.
 */
export function normalizeRole(role: string | undefined | null): Role {
  if (role === 'owner' || role === 'manager' || role === 'coordinator' || role === 'usher') {
    return role;
  }
  if (role === 'admin') return 'owner';
  return 'usher';
}

export function hasPermission(role: string | undefined | null, perm: Permission): boolean {
  return ROLE_PERMISSIONS[normalizeRole(role)].includes(perm);
}

/** Ushers may view attendees but not mutate them. */
export function canManageAttendees(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return hasPermission(r, 'attendees') && r !== 'usher';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string; // "salt:hash"
  createdAt: string;
}

/** Public shape (never leak passwordHash to the client). */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  iat: number;
  exp: number;
}

const STORE = 'auth';
const KEY = 'users';
const TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days

function store() {
  return getStore({ name: STORE, consistency: 'strong' });
}

export async function readUsers(): Promise<User[]> {
  const data = await store().get(KEY, { type: 'json' });
  return Array.isArray(data) ? (data as User[]) : [];
}

export async function writeUsers(users: User[]): Promise<void> {
  await store().setJSON(KEY, users);
}

export function toSafe(u: User): SafeUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: normalizeRole(u.role),
    createdAt: u.createdAt,
  };
}

// ---------- passwords ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const known = Buffer.from(hash, 'hex');
  return test.length === known.length && timingSafeEqual(test, known);
}

// ---------- JWT (HS256) ----------
function getSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret || secret.length < 16) {
    throw new AuthError(500, 'Server auth is not configured (missing JWT_SECRET).');
  }
  return secret;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlJson(obj: unknown): string {
  return b64url(JSON.stringify(obj));
}

export function signToken(user: User): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: normalizeRole(user.role),
    iat: now,
    exp: now + TOKEN_TTL,
  };
  const head = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const body = b64urlJson(payload);
  const sig = b64url(createHmac('sha256', getSecret()).update(`${head}.${body}`).digest());
  return `${head}.${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  const expected = b64url(createHmac('sha256', getSecret()).update(`${head}.${body}`).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64').toString()) as TokenPayload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------- request auth ----------
export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function requireAuth(req: Request): TokenPayload {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AuthError(401, 'Authentication required');
  const payload = verifyToken(match[1]);
  if (!payload) throw new AuthError(401, 'Session expired or invalid');
  return payload;
}

/** Authenticate the request and require a specific permission (403 if lacking). */
export function requirePermission(req: Request, perm: Permission): TokenPayload {
  const payload = requireAuth(req);
  if (!hasPermission(payload.role, perm)) {
    throw new AuthError(403, 'You do not have access to this action');
  }
  return payload;
}

// ---------- bootstrap ----------
/**
 * Seed the first admin from env vars if no users exist yet.
 * Requires SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD to be set.
 */
export async function ensureSeedUser(): Promise<void> {
  const users = await readUsers();
  if (users.length > 0) return;
  const email = process.env['SEED_ADMIN_EMAIL'];
  const password = process.env['SEED_ADMIN_PASSWORD'];
  const name = process.env['SEED_ADMIN_NAME'] || 'Owner';
  if (!email || !password) return;
  await writeUsers([
    {
      id: randomUUID(),
      name,
      email: email.trim().toLowerCase(),
      role: 'owner',
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    },
  ]);
}

export function newUser(input: { name: string; email: string; password: string; role?: Role }): User {
  return {
    id: randomUUID(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: normalizeRole(input.role),
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
}

/** Update a user's role in the store. Returns false if the user is missing. */
export async function setRole(userId: string, role: Role): Promise<boolean> {
  const users = await readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return false;
  users[idx] = { ...users[idx], role };
  await writeUsers(users);
  return true;
}

export async function findByEmail(email: string): Promise<User | undefined> {
  const e = email.trim().toLowerCase();
  return (await readUsers()).find((u) => u.email === e);
}

export async function setPassword(userId: string, newPassword: string): Promise<boolean> {
  const users = await readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return false;
  users[idx] = { ...users[idx], passwordHash: hashPassword(newPassword) };
  await writeUsers(users);
  return true;
}

// ---------- password reset tokens ----------
interface ResetRecord {
  tokenHash: string;
  userId: string;
  exp: number; // epoch seconds
}

const RESET_KEY = 'resets';
const RESET_TTL = 60 * 60; // 1 hour

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

async function readResets(): Promise<ResetRecord[]> {
  const data = await store().get(RESET_KEY, { type: 'json' });
  const now = Math.floor(Date.now() / 1000);
  return (Array.isArray(data) ? (data as ResetRecord[]) : []).filter((r) => r.exp > now);
}

async function writeResets(list: ResetRecord[]): Promise<void> {
  await store().setJSON(RESET_KEY, list);
}

/** Create a single-use reset token for a user; returns the raw token to email. */
export async function createResetToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString('hex');
  const list = (await readResets()).filter((r) => r.userId !== userId);
  list.push({ tokenHash: sha256(raw), userId, exp: Math.floor(Date.now() / 1000) + RESET_TTL });
  await writeResets(list);
  return raw;
}

/** Validate + consume a reset token, returning the userId (or null). */
export async function consumeResetToken(token: string): Promise<string | null> {
  const hash = sha256(token);
  const list = await readResets();
  const rec = list.find((r) => r.tokenHash === hash);
  if (!rec) return null;
  await writeResets(list.filter((r) => r.tokenHash !== hash));
  return rec.userId;
}
