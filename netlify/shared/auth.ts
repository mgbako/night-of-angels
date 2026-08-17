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
  randomInt,
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
  | 'team'
  | 'settings'
  | 'sponsors'
  | 'audit';

export const ROLES: Role[] = ['owner', 'manager', 'coordinator', 'usher'];

/** What each role can reach. Owner is the only role that manages the team. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'dashboard',
    'attendees',
    'reservations',
    'register',
    'tickets',
    'checkin',
    'team',
    'settings',
    'sponsors',
    'audit',
  ],
  manager: ['dashboard', 'attendees', 'reservations', 'register', 'tickets', 'checkin', 'sponsors'],
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

/** Only the owner (super admin) may update existing attendee records. */
export function canManageAttendees(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'owner';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string; // "salt:hash"
  createdAt: string;
  /** Set when the user is deactivated (soft-deleted). Absent/null = active. */
  deletedAt?: string | null;
}

/** Public shape (never leak passwordHash to the client). */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  deletedAt?: string | null;
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
    deletedAt: u.deletedAt ?? null,
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

/**
 * Require the super admin (owner). Used for destructive actions — permanently
 * deleting or restoring soft-deleted records.
 */
export function requireOwner(req: Request): TokenPayload {
  const payload = requireAuth(req);
  if (normalizeRole(payload.role) !== 'owner') {
    throw new AuthError(403, 'Only an owner can perform this action');
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
  return (await readUsers()).find((u) => u.email === e && !u.deletedAt);
}

/** Set or clear a user's deactivation timestamp. Returns false if missing. */
export async function setDeleted(userId: string, deleted: boolean): Promise<boolean> {
  const users = await readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return false;
  users[idx] = { ...users[idx], deletedAt: deleted ? new Date().toISOString() : null };
  await writeUsers(users);
  return true;
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

// ---------- login OTP (second factor, required for every sign-in) ----------
interface OtpRecord {
  userId: string;
  codeHash: string;
  exp: number; // epoch seconds
  attempts: number;
  issuedAt: number; // epoch seconds — used for the resend cooldown
}

const OTP_KEY = 'otps';
const OTP_TTL = 10 * 60; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN = 30; // seconds

async function readOtps(): Promise<OtpRecord[]> {
  const data = await store().get(OTP_KEY, { type: 'json' });
  const now = Math.floor(Date.now() / 1000);
  return (Array.isArray(data) ? (data as OtpRecord[]) : []).filter((r) => r.exp > now);
}

async function writeOtps(list: OtpRecord[]): Promise<void> {
  await store().setJSON(OTP_KEY, list);
}

function genOtpCode(): string {
  return String(randomInt(1_000_000)).padStart(6, '0');
}

/** Issue (replacing any existing) login OTP for a user; returns the raw code to email. */
export async function createLoginOtp(userId: string): Promise<string> {
  const code = genOtpCode();
  const now = Math.floor(Date.now() / 1000);
  const list = (await readOtps()).filter((r) => r.userId !== userId);
  list.push({ userId, codeHash: sha256(code), exp: now + OTP_TTL, attempts: 0, issuedAt: now });
  await writeOtps(list);
  return code;
}

/**
 * Re-issue a code for a user, but only if they already have an active
 * (unexpired) OTP record — i.e. they've already passed the password step —
 * and the resend cooldown has elapsed. Returns null otherwise, so the caller
 * can no-op without revealing which condition failed.
 */
export async function resendLoginOtp(userId: string): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const list = await readOtps();
  const existing = list.find((r) => r.userId === userId);
  if (!existing || now - existing.issuedAt < OTP_RESEND_COOLDOWN) return null;
  return createLoginOtp(userId);
}

/** Validate + consume a login OTP. Wrong/expired codes burn an attempt; too many burns the record. */
export async function verifyLoginOtp(userId: string, code: string): Promise<boolean> {
  const list = await readOtps();
  const idx = list.findIndex((r) => r.userId === userId);
  if (idx === -1) return false;
  const rec = list[idx];
  if (rec.attempts >= OTP_MAX_ATTEMPTS || rec.codeHash !== sha256(code)) {
    if (rec.attempts + 1 >= OTP_MAX_ATTEMPTS) {
      list.splice(idx, 1);
    } else {
      list[idx] = { ...rec, attempts: rec.attempts + 1 };
    }
    await writeOtps(list);
    return false;
  }
  list.splice(idx, 1); // single-use
  await writeOtps(list);
  return true;
}
