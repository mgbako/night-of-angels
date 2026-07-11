import type { Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { AuthError, requireAuth } from '../shared/auth';
import { addAttendee, TicketType } from '../shared/attendees';

/**
 * Self-service reservations with proof of payment.
 *   POST   /api/reservations              (public) create a pending reservation
 *   GET    /api/reservations              (auth)   list reservations
 *   GET    /api/reservations/:id/proof    (auth)   stream the uploaded proof file
 *   POST   /api/reservations/:id/approve  (auth)   { ticketType } -> creates attendee
 *   DELETE /api/reservations/:id          (auth)   reject / remove
 */
export const config = {
  path: [
    '/api/reservations',
    '/api/reservations/:id',
    '/api/reservations/:id/proof',
    '/api/reservations/:id/approve',
  ],
};

type Status = 'pending' | 'approved' | 'rejected';

interface Reservation {
  id: string;
  name: string;
  phone: string;
  email: string;
  proofKey: string;
  proofType: string;
  proofName: string;
  status: Status;
  ticketCode?: string;
  createdAt: string;
}

const RES_STORE = 'reservations';
const RES_KEY = 'list';
const PROOF_STORE = 'proofs';
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED = ['image/jpeg', 'image/png', 'application/pdf'];
const TICKET_TYPES: TicketType[] = ['SINGLES', 'COUPLES', 'TABLE'];

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

function reservationsStore() {
  return getStore({ name: RES_STORE, consistency: 'strong' });
}
function proofsStore() {
  return getStore({ name: PROOF_STORE, consistency: 'strong' });
}

async function readReservations(): Promise<Reservation[]> {
  const data = await reservationsStore().get(RES_KEY, { type: 'json' });
  return Array.isArray(data) ? (data as Reservation[]) : [];
}
async function writeReservations(list: Reservation[]): Promise<void> {
  await reservationsStore().setJSON(RES_KEY, list);
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });

  const id = context.params?.['id'];
  const path = new URL(req.url).pathname;

  try {
    // Public create
    if (path === '/api/reservations') {
      if (req.method === 'POST') return await create(req);
      if (req.method === 'GET') {
        requireAuth(req);
        return json(await readReservations());
      }
      return json({ error: 'Method not allowed' }, 405);
    }

    if (id) {
      // Proof download (auth)
      if (path.endsWith('/proof') && req.method === 'GET') {
        requireAuth(req);
        return await getProof(id);
      }
      // Approve (auth)
      if (path.endsWith('/approve') && req.method === 'POST') {
        requireAuth(req);
        return await approve(id, req);
      }
      // Reject / delete (auth)
      if (req.method === 'DELETE') {
        requireAuth(req);
        return await remove(id);
      }
    }

    return json({ error: 'Not found' }, 404);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, err.status);
    console.error('reservations function error', err);
    return json({ error: 'Server error' }, 500);
  }
};

async function create(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    phone?: string;
    email?: string;
    proof?: { name?: string; type?: string; dataBase64?: string };
  } | null;

  if (!body?.name || !body?.phone) {
    return json({ error: 'Full name and phone number are required' }, 400);
  }
  const proof = body.proof;
  if (!proof?.dataBase64 || !proof.type) {
    return json({ error: 'Proof of payment is required' }, 400);
  }
  if (!ALLOWED.includes(proof.type)) {
    return json({ error: 'Proof must be a JPG, PNG or PDF' }, 400);
  }

  const base64 = proof.dataBase64.replace(/^data:[^;]+;base64,/, '');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) return json({ error: 'Could not read the uploaded file' }, 400);
  if (bytes.length > MAX_BYTES) return json({ error: 'File is too large (max 4 MB)' }, 400);

  const proofKey = randomUUID();
  await proofsStore().set(proofKey, bytes, {
    metadata: { contentType: proof.type, filename: proof.name ?? 'proof' },
  });

  const reservation: Reservation = {
    id: randomUUID(),
    name: String(body.name).trim(),
    phone: String(body.phone).trim(),
    email: (body.email ?? '').trim(),
    proofKey,
    proofType: proof.type,
    proofName: proof.name ?? 'proof',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  const list = await readReservations();
  await writeReservations([reservation, ...list]);
  return json({ ok: true }, 201);
}

async function getProof(id: string): Promise<Response> {
  const reservation = (await readReservations()).find((r) => r.id === id);
  if (!reservation) return json({ error: 'Not found' }, 404);
  const result = await proofsStore().getWithMetadata(reservation.proofKey, {
    type: 'arrayBuffer',
  });
  if (!result) return json({ error: 'Proof not found' }, 404);
  const contentType =
    (result.metadata?.['contentType'] as string) || reservation.proofType || 'application/octet-stream';
  return new Response(result.data as ArrayBuffer, {
    status: 200,
    headers: { 'Content-Type': contentType, 'Cache-Control': 'private, no-store', ...CORS },
  });
}

async function approve(id: string, req: Request): Promise<Response> {
  const { ticketType } = (await req.json().catch(() => ({}))) as { ticketType?: TicketType };
  if (!ticketType || !TICKET_TYPES.includes(ticketType)) {
    return json({ error: 'A valid ticket type is required' }, 400);
  }
  const list = await readReservations();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return json({ error: 'Reservation not found' }, 404);
  const reservation = list[idx];

  let attendee;
  try {
    attendee = await addAttendee({
      name: reservation.name,
      email: reservation.email,
      phone: reservation.phone,
      ticketType,
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'DUP_EMAIL') {
      return json({ error: 'An attendee with this email already exists' }, 409);
    }
    throw e;
  }

  list[idx] = { ...reservation, status: 'approved', ticketCode: attendee.ticketCode };
  await writeReservations(list);
  return json({ ok: true, attendee });
}

async function remove(id: string): Promise<Response> {
  const list = await readReservations();
  const reservation = list.find((r) => r.id === id);
  if (reservation) {
    await proofsStore().delete(reservation.proofKey).catch(() => {});
  }
  await writeReservations(list.filter((r) => r.id !== id));
  return json({ ok: true });
}
