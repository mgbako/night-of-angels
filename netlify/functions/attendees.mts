import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { AuthError, canManageAttendees, requireOwner, requirePermission } from '../shared/auth';
import { EmailError, sendEmail, ticketEmailHtml } from '../shared/email';

const TICKET_LABELS: Record<TicketType, string> = {
  SINGLES: 'Singles',
  COUPLES: 'Couples',
  TABLE: 'Table of Ten',
};

/** Persons each ticket occupies at a table. A table seats TABLE_CAPACITY. */
const SEATS: Record<TicketType, number> = { SINGLES: 1, COUPLES: 2, TABLE: 10 };
const TABLE_CAPACITY = 10;

/** Persons already at a table (sum of seats), excluding one attendee id. */
function tablePersons(list: Attendee[], table: string, excludeId?: string): number {
  const key = table.trim();
  return list
    .filter((a) => !a.deletedAt && (a.tableNumber ?? '').trim() === key && a.id !== excludeId)
    .reduce((sum, a) => sum + SEATS[a.ticketType], 0);
}

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
  path: [
    '/api/attendees',
    '/api/attendees/:code',
    '/api/attendees/:code/check-in',
    '/api/attendees/:code/email',
  ],
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
  tableNumber?: string;
  deletedAt?: string | null;
}

const STORE = 'ticketing';
const KEY = 'attendees';

function store() {
  // Strong consistency so read-after-write is immediate (duplicate checks,
  // check-in, and the ticket page all rely on seeing the latest write).
  return getStore({ name: STORE, consistency: 'strong' });
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

  const code = (context.params?.['code'] ?? '').trim();
  const pathname = new URL(req.url).pathname;
  const isCheckin = pathname.endsWith('/check-in');
  const isEmail = pathname.endsWith('/email');

  try {
    // Email the guest their ticket (ticketing action)
    if (isEmail) {
      if (req.method === 'POST') {
        requirePermission(req, 'tickets');
        return await emailTicket(code, req);
      }
      return json({ error: 'Method not allowed' }, 405);
    }

    // Collection: /api/attendees (organizer-only: contains PII)
    if (!code) {
      if (req.method === 'GET') {
        // ?archived=1 lists soft-deleted records (super admin / owner only).
        if (new URL(req.url).searchParams.get('archived') === '1') {
          requireOwner(req);
          return json((await readAll()).filter((a) => a.deletedAt));
        }
        requirePermission(req, 'attendees');
        return json((await readAll()).filter((a) => !a.deletedAt));
      }
      if (req.method === 'POST') {
        requirePermission(req, 'register');
        return await register(req);
      }
      return json({ error: 'Method not allowed' }, 405);
    }

    // Check-in: /api/attendees/:code/check-in — requires the check-in permission.
    if (isCheckin) {
      if (req.method === 'POST') {
        requirePermission(req, 'checkin');
        return await checkIn(code);
      }
      return json({ error: 'Method not allowed' }, 405);
    }

    // Item: /api/attendees/:code
    if (req.method === 'GET') return await getOne(code); // public: the ticket page
    if (req.method === 'DELETE') {
      // ?permanent=1 hard-deletes (owner only); otherwise soft-delete (archive).
      if (new URL(req.url).searchParams.get('permanent') === '1') {
        requireOwner(req);
        return await removeOne(code, true);
      }
      const actor = requirePermission(req, 'attendees');
      if (!canManageAttendees(actor.role)) throw new AuthError(403, 'You do not have access to this action');
      return await removeOne(code, false);
    }
    if (req.method === 'PATCH') return await patchOne(code, req);
    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, err.status);
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
  if (list.some((a) => !a.deletedAt && a.email.toLowerCase() === email)) {
    return json({ error: 'An attendee with this email already exists' }, 409);
  }
  const tableNumber = String(body.tableNumber ?? '').trim();
  if (tableNumber) {
    const persons = tablePersons(list, tableNumber) + SEATS[body.ticketType as TicketType];
    if (persons > TABLE_CAPACITY) {
      return json({ error: `Table ${tableNumber} is full (seats ${TABLE_CAPACITY})` }, 409);
    }
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
    ...(tableNumber ? { tableNumber } : {}),
  };
  await writeAll([attendee, ...list]);
  return json(attendee, 201);
}

async function getOne(code: string): Promise<Response> {
  // Public ticket page — archived (soft-deleted) tickets are void.
  const found = (await readAll()).find(
    (a) => !a.deletedAt && a.ticketCode.toLowerCase() === code.toLowerCase(),
  );
  return found ? json(found) : json({ error: 'Ticket not found' }, 404);
}

async function checkIn(code: string): Promise<Response> {
  const list = await readAll();
  const idx = list.findIndex(
    (a) => !a.deletedAt && a.ticketCode.toLowerCase() === code.toLowerCase(),
  );
  if (idx === -1) return json({ error: 'Ticket not found' }, 404);
  if (list[idx].checkedIn) {
    return json({ error: 'This ticket has already been checked in', attendee: list[idx] }, 409);
  }
  list[idx] = { ...list[idx], checkedIn: true, checkedInAt: new Date().toISOString() };
  await writeAll(list);
  return json(list[idx]);
}

async function patchOne(code: string, req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as {
    checkedIn?: boolean;
    restore?: boolean;
    tableNumber?: string;
  } | null;
  const list = await readAll();
  const idx = list.findIndex((a) => a.ticketCode.toLowerCase() === code.toLowerCase());
  if (idx === -1) return json({ error: 'Ticket not found' }, 404);

  // Restore an archived attendee — super admin (owner) only.
  if (body?.restore === true) {
    requireOwner(req);
    list[idx] = { ...list[idx], deletedAt: null };
    await writeAll(list);
    return json(list[idx]);
  }

  // Otherwise a check-in override — needs manage rights, and only on active records.
  const actor = requirePermission(req, 'attendees');
  if (!canManageAttendees(actor.role)) {
    throw new AuthError(403, 'You do not have access to this action');
  }
  if (list[idx].deletedAt) return json({ error: 'Ticket not found' }, 404);
  if (typeof body?.checkedIn === 'boolean') {
    list[idx] = {
      ...list[idx],
      checkedIn: body.checkedIn,
      checkedInAt: body.checkedIn ? list[idx].checkedInAt ?? new Date().toISOString() : null,
    };
  }
  if (typeof body?.tableNumber === 'string') {
    const tableNumber = body.tableNumber.trim();
    if (tableNumber) {
      const persons = tablePersons(list, tableNumber, list[idx].id) + SEATS[list[idx].ticketType];
      if (persons > TABLE_CAPACITY) {
        return json({ error: `Table ${tableNumber} is full (seats ${TABLE_CAPACITY})` }, 409);
      }
    }
    list[idx] = { ...list[idx], tableNumber: tableNumber || undefined };
  }
  await writeAll(list);
  return json(list[idx]);
}

async function removeOne(code: string, permanent: boolean): Promise<Response> {
  const list = await readAll();
  const idx = list.findIndex((a) => a.ticketCode.toLowerCase() === code.toLowerCase());
  if (idx === -1) return json({ error: 'Ticket not found' }, 404);
  if (permanent) {
    await writeAll(list.filter((_, i) => i !== idx));
  } else {
    if (!list[idx].deletedAt) {
      list[idx] = { ...list[idx], deletedAt: new Date().toISOString() };
      await writeAll(list);
    }
  }
  return json({ ok: true });
}

async function emailTicket(code: string, req: Request): Promise<Response> {
  const attendee = (await readAll()).find(
    (a) => !a.deletedAt && a.ticketCode.toLowerCase() === code.toLowerCase(),
  );
  if (!attendee) return json({ error: 'Ticket not found' }, 404);

  const base = process.env['URL'] || new URL(req.url).origin;
  const url = `${base}/tickets/${attendee.ticketCode}`;
  try {
    await sendEmail({
      to: attendee.email,
      subject: 'Your ticket — A Night of Angels',
      html: ticketEmailHtml(
        attendee.name,
        TICKET_LABELS[attendee.ticketType],
        url,
        `${base}/noa-logo.png`,
      ),
    });
  } catch (e) {
    if (e instanceof EmailError) return json({ error: e.message }, 502);
    throw e;
  }
  return json({ ok: true, sentTo: attendee.email });
}
