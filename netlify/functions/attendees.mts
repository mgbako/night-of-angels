import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import {
  AuthError,
  TokenPayload,
  canManageAttendees,
  requireOwner,
  requirePermission,
} from '../shared/auth';
import { EmailError, sendEmail, ticketEmailHtml } from '../shared/email';
import { SmsError, sendBulkSms, sendSms, toInternational } from '../shared/sms';
import { recordAudit } from '../shared/audit';

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
 *   PATCH  /api/attendees/:code               -> checkedIn / tableNumber / details edit (owner only)
 *   POST   /api/attendees/:code/check-in      -> check in (404 / 409 already)
 *
 * NOTE: endpoints are currently open (no auth). The list endpoint exposes
 * attendee contact details — add auth before wider use.
 */

export const config = {
  path: [
    '/api/attendees',
    '/api/attendees/bulk-delete',
    '/api/attendees/sms-broadcast',
    '/api/attendees/:code',
    '/api/attendees/:code/check-in',
    '/api/attendees/:code/email',
    '/api/attendees/:code/sms',
  ],
};

type TicketType = 'SINGLES' | 'COUPLES' | 'TABLE';
type Gender = 'MALE' | 'FEMALE';
type SpecificDrink =
  | 'ALCOHOLIC_WINE'
  | 'NON_ALCOHOLIC_WINE'
  | 'SMIRNOFF'
  | 'STAR_RADLER'
  | 'MALT'
  | 'HEINEKEN'
  | 'STOUT'
  | 'TROPHY'
  | 'BOTTLE_WATER'
  | 'KUMELIN';
const GENDERS: Gender[] = ['MALE', 'FEMALE'];
const SPECIFIC_DRINKS: SpecificDrink[] = [
  'ALCOHOLIC_WINE',
  'NON_ALCOHOLIC_WINE',
  'SMIRNOFF',
  'STAR_RADLER',
  'MALT',
  'HEINEKEN',
  'STOUT',
  'TROPHY',
  'BOTTLE_WATER',
  'KUMELIN',
];

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
  gender?: Gender;
  specificDrink?: SpecificDrink;
  partnerGender?: Gender;
  partnerSpecificDrink?: SpecificDrink;
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
  const isSms = pathname.endsWith('/sms');
  const isBulk = pathname.endsWith('/bulk-delete');
  const isBroadcast = pathname.endsWith('/sms-broadcast');

  try {
    // Bulk archive / permanent delete — one read-modify-write so it can't race.
    if (isBulk) {
      if (req.method === 'POST') return await bulkRemove(req);
      return json({ error: 'Method not allowed' }, 405);
    }

    // Custom SMS to many guests at once (broadcast).
    if (isBroadcast) {
      if (req.method === 'POST') return await smsBroadcast(req);
      return json({ error: 'Method not allowed' }, 405);
    }

    // Email the guest their ticket (ticketing action)
    if (isEmail) {
      if (req.method === 'POST') {
        const actor = requirePermission(req, 'tickets');
        return await emailTicket(code, req, actor);
      }
      return json({ error: 'Method not allowed' }, 405);
    }

    // Text the guest their ticket link (ticketing action)
    if (isSms) {
      if (req.method === 'POST') {
        const actor = requirePermission(req, 'tickets');
        return await smsTicket(code, req, actor);
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
        const actor = requirePermission(req, 'register');
        return await register(req, actor);
      }
      return json({ error: 'Method not allowed' }, 405);
    }

    // Check-in: /api/attendees/:code/check-in — requires the check-in permission.
    if (isCheckin) {
      if (req.method === 'POST') {
        const actor = requirePermission(req, 'checkin');
        return await checkIn(code, req, actor);
      }
      return json({ error: 'Method not allowed' }, 405);
    }

    // Item: /api/attendees/:code
    if (req.method === 'GET') return await getOne(code); // public: the ticket page
    if (req.method === 'DELETE') {
      // ?permanent=1 hard-deletes (owner only); otherwise soft-delete (archive).
      if (new URL(req.url).searchParams.get('permanent') === '1') {
        const actor = requireOwner(req);
        return await removeOne(code, true, req, actor);
      }
      const actor = requirePermission(req, 'attendees');
      if (!canManageAttendees(actor.role)) throw new AuthError(403, 'You do not have access to this action');
      return await removeOne(code, false, req, actor);
    }
    if (req.method === 'PATCH') return await patchOne(code, req);
    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, err.status);
    console.error('attendees function error', err);
    return json({ error: 'Server error' }, 500);
  }
};

async function register(req: Request, actor: TokenPayload): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Partial<Attendee> | null;
  if (!body?.name || !body?.phone || !body?.ticketType) {
    return json({ error: 'Missing required fields' }, 400);
  }
  if (!body.gender || !GENDERS.includes(body.gender)) {
    return json({ error: 'A valid gender is required' }, 400);
  }
  if (!body.specificDrink || !SPECIFIC_DRINKS.includes(body.specificDrink)) {
    return json({ error: 'A valid preferred drink is required' }, 400);
  }
  const list = await readAll();
  // Email is optional. Only dedupe when one is supplied.
  const email = String(body.email ?? '').trim().toLowerCase();
  if (email && list.some((a) => !a.deletedAt && a.email.toLowerCase() === email)) {
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
    email: String(body.email ?? '').trim(),
    phone: String(body.phone).trim(),
    ticketType: body.ticketType as TicketType,
    ticketCode: genCode(new Set(list.map((a) => a.ticketCode))),
    checkedIn: false,
    checkedInAt: null,
    createdAt: new Date().toISOString(),
    ...(tableNumber ? { tableNumber } : {}),
    gender: body.gender,
    specificDrink: body.specificDrink,
  };
  await writeAll([attendee, ...list]);
  await recordAudit({
    req,
    actor,
    action: 'attendee.registered',
    target: { type: 'attendee', id: attendee.id, label: attendee.name },
    metadata: { ticketType: attendee.ticketType, ticketCode: attendee.ticketCode },
  });
  return json(attendee, 201);
}

async function getOne(code: string): Promise<Response> {
  // Public ticket page — archived (soft-deleted) tickets are void.
  const found = (await readAll()).find(
    (a) => !a.deletedAt && a.ticketCode.toLowerCase() === code.toLowerCase(),
  );
  return found ? json(found) : json({ error: 'Ticket not found' }, 404);
}

async function checkIn(code: string, req: Request, actor: TokenPayload): Promise<Response> {
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
  await recordAudit({
    req,
    actor,
    action: 'attendee.checked_in',
    target: { type: 'attendee', id: list[idx].id, label: list[idx].name },
    metadata: { ticketCode: list[idx].ticketCode },
  });
  return json(list[idx]);
}

async function patchOne(code: string, req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as {
    checkedIn?: boolean;
    restore?: boolean;
    tableNumber?: string;
    name?: string;
    email?: string;
    phone?: string;
    ticketType?: TicketType;
    gender?: Gender;
    specificDrink?: SpecificDrink;
    partnerGender?: Gender | '';
    partnerSpecificDrink?: SpecificDrink | '';
  } | null;
  const list = await readAll();
  const idx = list.findIndex((a) => a.ticketCode.toLowerCase() === code.toLowerCase());
  if (idx === -1) return json({ error: 'Ticket not found' }, 404);

  // Restore an archived attendee — super admin (owner) only.
  if (body?.restore === true) {
    const owner = requireOwner(req);
    list[idx] = { ...list[idx], deletedAt: null };
    await writeAll(list);
    await recordAudit({
      req,
      actor: owner,
      action: 'attendee.restored',
      severity: 'warning',
      target: { type: 'attendee', id: list[idx].id, label: list[idx].name },
      metadata: { ticketCode: list[idx].ticketCode },
    });
    return json(list[idx]);
  }

  // Everything else — needs manage rights (owner only), and only on active records.
  const actor = requirePermission(req, 'attendees');
  if (!canManageAttendees(actor.role)) {
    throw new AuthError(403, 'You do not have access to this action');
  }
  if (list[idx].deletedAt) return json({ error: 'Ticket not found' }, 404);
  const target = { type: 'attendee', id: list[idx].id, label: list[idx].name };
  if (typeof body?.checkedIn === 'boolean') {
    const from = list[idx].checkedIn;
    list[idx] = {
      ...list[idx],
      checkedIn: body.checkedIn,
      checkedInAt: body.checkedIn ? list[idx].checkedInAt ?? new Date().toISOString() : null,
    };
    await recordAudit({
      req,
      actor,
      action: 'attendee.checkin_overridden',
      severity: 'warning',
      target,
      changes: { checkedIn: { from, to: body.checkedIn } },
      metadata: { ticketCode: list[idx].ticketCode },
    });
  }
  if (typeof body?.tableNumber === 'string') {
    const tableNumber = body.tableNumber.trim();
    if (tableNumber) {
      const persons = tablePersons(list, tableNumber, list[idx].id) + SEATS[list[idx].ticketType];
      if (persons > TABLE_CAPACITY) {
        return json({ error: `Table ${tableNumber} is full (seats ${TABLE_CAPACITY})` }, 409);
      }
    }
    const from = list[idx].tableNumber ?? null;
    list[idx] = { ...list[idx], tableNumber: tableNumber || undefined };
    await recordAudit({
      req,
      actor,
      action: 'attendee.table_assigned',
      target,
      changes: { tableNumber: { from, to: tableNumber || null } },
      metadata: { ticketCode: list[idx].ticketCode },
    });
  }

  // Edit the guest's own details (name, contact, ticket type, gender, drink).
  const editingDetails =
    typeof body?.name === 'string' ||
    typeof body?.email === 'string' ||
    typeof body?.phone === 'string' ||
    typeof body?.ticketType === 'string' ||
    typeof body?.gender === 'string' ||
    typeof body?.specificDrink === 'string';
  if (editingDetails) {
    const before = list[idx];
    const name = typeof body?.name === 'string' ? body.name.trim() : before.name;
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : before.phone;
    const email = typeof body?.email === 'string' ? body.email.trim() : before.email;
    const ticketType = body?.ticketType ?? before.ticketType;
    const gender = body?.gender ?? before.gender;
    const specificDrink = body?.specificDrink ?? before.specificDrink;

    if (!name) return json({ error: 'Full name is required' }, 400);
    if (!phone) return json({ error: 'Phone number is required' }, 400);
    if (!TICKET_LABELS[ticketType]) return json({ error: 'A valid ticket type is required' }, 400);
    if (!gender || !GENDERS.includes(gender)) {
      return json({ error: 'A valid gender is required' }, 400);
    }
    if (!specificDrink || !SPECIFIC_DRINKS.includes(specificDrink)) {
      return json({ error: 'A valid preferred drink is required' }, 400);
    }

    const emailLower = email.toLowerCase();
    if (
      emailLower &&
      list.some((a, i) => i !== idx && !a.deletedAt && a.email.toLowerCase() === emailLower)
    ) {
      return json({ error: 'An attendee with this email already exists' }, 409);
    }

    const tableNumber = (list[idx].tableNumber ?? '').trim();
    if (tableNumber && ticketType !== before.ticketType) {
      const persons = tablePersons(list, tableNumber, before.id) + SEATS[ticketType];
      if (persons > TABLE_CAPACITY) {
        return json(
          { error: `Table ${tableNumber} is full for a ${TICKET_LABELS[ticketType]} ticket (seats ${TABLE_CAPACITY})` },
          409,
        );
      }
    }

    // Second-guest preferences only make sense for Couples tickets.
    const isCouples = ticketType === 'COUPLES';
    const partnerGender = isCouples
      ? (typeof body?.partnerGender === 'string' ? body.partnerGender || undefined : before.partnerGender)
      : undefined;
    const partnerSpecificDrink = isCouples
      ? (typeof body?.partnerSpecificDrink === 'string'
          ? body.partnerSpecificDrink || undefined
          : before.partnerSpecificDrink)
      : undefined;

    list[idx] = {
      ...list[idx],
      name,
      email,
      phone,
      ticketType,
      gender,
      specificDrink,
      partnerGender,
      partnerSpecificDrink,
    };
    await recordAudit({
      req,
      actor,
      action: 'attendee.details_updated',
      target,
      changes: {
        name: { from: before.name, to: name },
        email: { from: before.email, to: email },
        phone: { from: before.phone, to: phone },
        ticketType: { from: before.ticketType, to: ticketType },
        gender: { from: before.gender ?? null, to: gender ?? null },
        specificDrink: { from: before.specificDrink ?? null, to: specificDrink ?? null },
      },
      metadata: { ticketCode: list[idx].ticketCode },
    });
  }

  await writeAll(list);
  return json(list[idx]);
}

/**
 * Archive (or permanently delete) many attendees in a single read-modify-write.
 * Doing it in one pass avoids the lost-update race you get from firing many
 * concurrent single deletes at the blob store.
 */
async function bulkRemove(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as
    | { codes?: unknown; permanent?: unknown }
    | null;
  const codes = Array.isArray(body?.codes)
    ? body!.codes.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
    : [];
  const permanent = body?.permanent === true;
  if (!codes.length) return json({ error: 'No ticket codes provided' }, 400);

  let actor: TokenPayload;
  if (permanent) {
    actor = requireOwner(req);
  } else {
    actor = requirePermission(req, 'attendees');
    if (!canManageAttendees(actor.role)) throw new AuthError(403, 'You do not have access to this action');
  }

  const set = new Set(codes);
  const list = await readAll();
  let removed = 0;

  if (permanent) {
    const next = list.filter((a) => {
      const hit = set.has(a.ticketCode.toLowerCase());
      if (hit) removed++;
      return !hit;
    });
    if (removed) await writeAll(next);
  } else {
    const now = new Date().toISOString();
    const next = list.map((a) => {
      if (!a.deletedAt && set.has(a.ticketCode.toLowerCase())) {
        removed++;
        return { ...a, deletedAt: now };
      }
      return a;
    });
    if (removed) await writeAll(next);
  }
  await recordAudit({
    req,
    actor,
    action: permanent ? 'attendee.bulk_deleted' : 'attendee.bulk_archived',
    severity: permanent ? 'critical' : 'warning',
    target: null,
    metadata: { requested: codes.length, removed },
  });
  return json({ removed });
}

async function removeOne(
  code: string,
  permanent: boolean,
  req: Request,
  actor: TokenPayload,
): Promise<Response> {
  const list = await readAll();
  const idx = list.findIndex((a) => a.ticketCode.toLowerCase() === code.toLowerCase());
  if (idx === -1) return json({ error: 'Ticket not found' }, 404);
  const victim = list[idx];
  if (permanent) {
    await writeAll(list.filter((_, i) => i !== idx));
  } else {
    if (!list[idx].deletedAt) {
      list[idx] = { ...list[idx], deletedAt: new Date().toISOString() };
      await writeAll(list);
    }
  }
  await recordAudit({
    req,
    actor,
    action: permanent ? 'attendee.deleted' : 'attendee.archived',
    severity: permanent ? 'critical' : 'warning',
    target: { type: 'attendee', id: victim.id, label: victim.name },
    metadata: { ticketCode: victim.ticketCode },
  });
  return json({ ok: true });
}

async function emailTicket(code: string, req: Request, actor: TokenPayload): Promise<Response> {
  const attendee = (await readAll()).find(
    (a) => !a.deletedAt && a.ticketCode.toLowerCase() === code.toLowerCase(),
  );
  if (!attendee) return json({ error: 'Ticket not found' }, 404);
  if (!attendee.email) return json({ error: 'This guest has no email on file' }, 400);

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
    // 400, not 502: a Cloudflare-fronted origin 502 gets swapped for a generic
    // "Bad gateway" page, hiding this message. The client reads `error` on any non-2xx.
    if (e instanceof EmailError) return json({ error: e.message }, 400);
    throw e;
  }
  await recordAudit({
    req,
    actor,
    action: 'ticket.emailed',
    target: { type: 'attendee', id: attendee.id, label: attendee.name },
    metadata: { ticketCode: attendee.ticketCode, to: attendee.email },
  });
  return json({ ok: true, sentTo: attendee.email });
}

const EVENT_WHEN = 'Sat 24 Oct 2026';

async function smsTicket(code: string, req: Request, actor: TokenPayload): Promise<Response> {
  const attendee = (await readAll()).find(
    (a) => !a.deletedAt && a.ticketCode.toLowerCase() === code.toLowerCase(),
  );
  if (!attendee) return json({ error: 'Ticket not found' }, 404);
  if (!toInternational(attendee.phone)) {
    return json({ error: 'This guest has no valid phone number' }, 400);
  }

  const base = process.env['URL'] || new URL(req.url).origin;
  const url = `${base}/tickets/${attendee.ticketCode}`;
  const first = attendee.name.split(/\s+/)[0] || 'there';
  const message =
    `Hi ${first}, your ${TICKET_LABELS[attendee.ticketType]} ticket for ` +
    `A Night of Angels (${EVENT_WHEN}) is ready: ${url}`;
  try {
    await sendSms({ to: attendee.phone, message });
  } catch (e) {
    if (e instanceof SmsError) return json({ error: e.message }, 400);
    throw e;
  }
  await recordAudit({
    req,
    actor,
    action: 'ticket.smsed',
    target: { type: 'attendee', id: attendee.id, label: attendee.name },
    metadata: { ticketCode: attendee.ticketCode, to: attendee.phone },
  });
  return json({ ok: true, sentTo: attendee.phone });
}

/**
 * Send one custom message to many guests in a single Termii bulk request.
 * Body: { codes: string[], message: string }. Reports how many were reachable,
 * and how many had no usable phone number.
 */
async function smsBroadcast(req: Request): Promise<Response> {
  const actor = requirePermission(req, 'attendees');
  if (!canManageAttendees(actor.role)) {
    throw new AuthError(403, 'You do not have access to this action');
  }
  const body = (await req.json().catch(() => null)) as
    | { codes?: unknown; message?: unknown }
    | null;
  const message = String(body?.message ?? '').trim();
  const codes = Array.isArray(body?.codes)
    ? body!.codes.map((c) => String(c).trim().toLowerCase()).filter(Boolean)
    : [];
  if (!message) return json({ error: 'Message is required' }, 400);
  if (message.length > 480) return json({ error: 'Message is too long (max 480 characters)' }, 400);
  if (!codes.length) return json({ error: 'No recipients selected' }, 400);

  const set = new Set(codes);
  const recipients = (await readAll()).filter(
    (a) => !a.deletedAt && set.has(a.ticketCode.toLowerCase()),
  );

  const numbers: string[] = [];
  const seen = new Set<string>();
  let noPhone = 0;
  for (const a of recipients) {
    const intl = toInternational(a.phone);
    if (!intl) {
      noPhone++;
      continue;
    }
    if (seen.has(intl)) continue; // de-dupe (e.g. couples sharing a number)
    seen.add(intl);
    numbers.push(intl);
  }

  if (!numbers.length) return json({ sent: 0, failed: 0, noPhone });
  let result: { sent: number; failed: number };
  try {
    result = await sendBulkSms(numbers, message);
  } catch (e) {
    if (e instanceof SmsError) return json({ error: e.message }, 400);
    throw e;
  }
  await recordAudit({
    req,
    actor,
    action: 'sms.broadcast_sent',
    severity: 'warning',
    target: null,
    metadata: { recipients: numbers.length, sent: result.sent, failed: result.failed, noPhone },
  });
  return json({ sent: result.sent, failed: result.failed, noPhone });
}
