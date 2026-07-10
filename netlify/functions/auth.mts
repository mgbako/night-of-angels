import type { Context } from '@netlify/functions';
import {
  AuthError,
  ensureSeedUser,
  newUser,
  readUsers,
  requireAuth,
  signToken,
  toSafe,
  verifyPassword,
  writeUsers,
} from '../shared/auth';

/**
 * Auth API (self-hosted).
 *   POST   /api/auth/login        { email, password } -> { token, user }
 *   GET    /api/auth/me           -> { user }                 [auth]
 *   GET    /api/auth/users        -> SafeUser[]               [auth]
 *   POST   /api/auth/users        { name, email, password }   [auth]
 *   DELETE /api/auth/users/:id                                [auth]
 *
 * Requires env: JWT_SECRET (>=16 chars). First admin is seeded from
 * SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD when the user store is empty.
 */
export const config = {
  path: ['/api/auth/login', '/api/auth/me', '/api/auth/users', '/api/auth/users/:id'],
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });

  const path = new URL(req.url).pathname;
  const userId = context.params?.['id'];

  try {
    if (path === '/api/auth/login' && req.method === 'POST') return await login(req);
    if (path === '/api/auth/me' && req.method === 'GET') return me(req);

    if (path === '/api/auth/users') {
      requireAuth(req);
      if (req.method === 'GET') return json((await readUsers()).map(toSafe));
      if (req.method === 'POST') return await createUser(req);
    }

    if (userId && req.method === 'DELETE') {
      const actor = requireAuth(req);
      return await deleteUser(userId, actor.sub);
    }

    return json({ error: 'Not found' }, 404);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, err.status);
    console.error('auth function error', err);
    return json({ error: 'Server error' }, 500);
  }
};

async function login(req: Request): Promise<Response> {
  const { email, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  if (!email || !password) return json({ error: 'Email and password are required' }, 400);

  await ensureSeedUser();
  const users = await readUsers();
  const user = users.find((u) => u.email === email.trim().toLowerCase());

  // Same response whether user is missing or password is wrong.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return json({ error: 'Incorrect email or password' }, 401);
  }
  return json({ token: signToken(user), user: toSafe(user) });
}

function me(req: Request): Response {
  const payload = requireAuth(req);
  return json({
    user: {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      createdAt: '',
    },
  });
}

async function createUser(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
  };
  if (!body.name || !body.email || !body.password) {
    return json({ error: 'Name, email and password are required' }, 400);
  }
  if (body.password.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, 400);
  }
  const users = await readUsers();
  const email = body.email.trim().toLowerCase();
  if (users.some((u) => u.email === email)) {
    return json({ error: 'A user with this email already exists' }, 409);
  }
  const user = newUser({ name: body.name, email, password: body.password });
  await writeUsers([...users, user]);
  return json(toSafe(user), 201);
}

async function deleteUser(id: string, actorId: string): Promise<Response> {
  const users = await readUsers();
  if (!users.some((u) => u.id === id)) return json({ error: 'User not found' }, 404);
  if (id === actorId) return json({ error: 'You cannot delete your own account' }, 400);
  if (users.length <= 1) return json({ error: 'Cannot delete the last user' }, 400);
  await writeUsers(users.filter((u) => u.id !== id));
  return json({ ok: true });
}
