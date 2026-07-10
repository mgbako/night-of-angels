/**
 * Self-hosted auth helpers for Netlify Functions (no external deps).
 * - Passwords: scrypt with a random salt (node:crypto)
 * - Sessions: HS256 JWT signed with JWT_SECRET (node:crypto HMAC)
 * - Users: stored in the Netlify Blobs store `auth`, key `users`
 */
import {
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { getStore } from '@netlify/blobs';

export type Role = 'admin';

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
  return { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };
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
    role: user.role,
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
      role: 'admin',
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
    role: input.role ?? 'admin',
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
}
