import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

/**
 * Ticketing API backed by Netlify Blobs (shared across all devices).
 *
 *   GET    /api/attendees                     -> list
 *   POST   /api/attendees                     -> register (409 duplicate email)
 *   GET    /api/attendees/:code               -> one by ticketCode (404)
 *   DELETE /api/attendees/:code               -> remove
 *   PATCH  /api/attendees/:code               -> { checkedIn } organizer override
 *   POST   /api/attendees/:code/check-in      -> check in (404 / 409 already)
 *
 * NOTE: endpoints are currently open (no auth). The list endpoint exposes
 * attendee contact details — add auth before wider use.
 */

export const config = {
  path: ['/api/attendees', '/api/attendees/:code', '/api/attendees/:code/check-in'],
};

type TicketType = 'SINGLES' | 'COUPLES' | 'TABLE';

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  ticketType: TicketType;
  ticketCode: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  createdAt: string;
}

const STORE = 'ticketing';
const KEY = 'attendees';

function store() {
  return getStore(STORE);
}

async function readAll(): Promise<Attendee[]> {
  const data = await store().get(KEY, { type: 'json' });
  return Array.isArray(data) ? (data as Attendee[]) : [];
}

async function writeAll(list: Attendee[]): Promise<void> {
  await store().setJSON(KEY, list);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function genCode(existing: Set<string>): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 8; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  } while (existing.has(code));
  return code;
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });

  const code = (context.params?.code ?? '').trim();
  const isCheckin = new URL(req.url).pathname.endsWith('/check-in');

  try {
    // Collection: /api/attendees
    if (!code) {
      if (req.method === 'GET') return json(await readAll());
      if (req.method === 'POST') return await register(req);
      return json({ error: 'Method not allowed' }, 405);
    }

    // Check-in: /api/attendees/:code/check-in
    if (isCheckin) {
      if (req.method === 'POST') return await checkIn(code);
      return json({ error: 'Method not allowed' }, 405);
    }

    // Item: /api/attendees/:code
    if (req.method === 'GET') return await getOne(code);
    if (req.method === 'DELETE') return await removeOne(code);
    if (req.method === 'PATCH') return await patchOne(code, req);
    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('attendees function error', err);
    return json({ error: 'Server error' }, 500);
  }
};

async function register(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Partial<Attendee> | null;
  if (!body?.name || !body?.email || !body?.phone || !body?.ticketType) {
    return json({ error: 'Missing required fields' }, 400);
  }
  const list = await readAll();
  const email = String(body.email).trim().toLowerCase();
  if (list.some((a) => a.email.toLowerCase() === email)) {
    return json({ error: 'An attendee with this email already exists' }, 409);
  }
  const attendee: Attendee = {
    id: crypto.randomUUID(),
    name: String(body.name).trim(),
    email: String(body.email).trim(),
    phone: String(body.phone).trim(),
    ticketType: body.ticketType as TicketType,
    ticketCode: genCode(new Set(list.map((a) => a.ticketCode))),
    checkedIn: false,
    checkedInAt: null,
    createdAt: new Date().toISOString(),
  };
  await writeAll([attendee, ...list]);
  return json(attendee, 201);
}

async function getOne(code: string): Promise<Response> {
  const found = (await readAll()).find((a) => a.ticketCode.toLowerCase() === code.toLowerCase());
  return found ? json(found) : json({ error: 'Ticket not found' }, 404);
}

async function checkIn(code: string): Promise<Response> {
  const list = await readAll();
  const idx = list.findIndex((a) => a.ticketCode.toLowerCase() === code.toLowerCase());
  if (idx === -1) return json({ error: 'Ticket not found' }, 404);
  if (list[idx].checkedIn) {
    return json({ error: 'This ticket has already been checked in', attendee: list[idx] }, 409);
  }
  list[idx] = { ...list[idx], checkedIn: true, checkedInAt: new Date().toISOString() };
  await writeAll(list);
  return json(list[idx]);
}

async function patchOne(code: string, req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { checkedIn?: boolean } | null;
  const list = await readAll();
  const idx = list.findIndex((a) => a.ticketCode.toLowerCase() === code.toLowerCase());
  if (idx === -1) return json({ error: 'Ticket not found' }, 404);
  if (typeof body?.checkedIn === 'boolean') {
    list[idx] = {
      ...list[idx],
      checkedIn: body.checkedIn,
      checkedInAt: body.checkedIn ? list[idx].checkedInAt ?? new Date().toISOString() : null,
    };
  }
  await writeAll(list);
  return json(list[idx]);
}

async function removeOne(code: string): Promise<Response> {
  const list = await readAll();
  const next = list.filter((a) => a.ticketCode.toLowerCase() !== code.toLowerCase());
  await writeAll(next);
  return json({ ok: true });
}
