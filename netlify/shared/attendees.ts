/**
 * Shared access to the attendees store (Netlify Blobs), so both the attendees
 * function and the reservations "approve" flow create attendees the same way,
 * with globally-unique ticket codes.
 */
import { randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export type TicketType = 'SINGLES' | 'COUPLES' | 'TABLE';

export interface Attendee {
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
  return getStore({ name: STORE, consistency: 'strong' });
}

export async function readAttendees(): Promise<Attendee[]> {
  const data = await store().get(KEY, { type: 'json' });
  return Array.isArray(data) ? (data as Attendee[]) : [];
}

export async function writeAttendees(list: Attendee[]): Promise<void> {
  await store().setJSON(KEY, list);
}

export function genTicketCode(existing: Set<string>): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 8; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  } while (existing.has(code));
  return code;
}

/** Create + persist an attendee. Throws 'DUP_EMAIL' if the email already exists. */
export async function addAttendee(input: {
  name: string;
  email: string;
  phone: string;
  ticketType: TicketType;
}): Promise<Attendee> {
  const list = await readAttendees();
  const email = input.email.trim().toLowerCase();
  if (email && list.some((a) => a.email.toLowerCase() === email)) {
    throw new Error('DUP_EMAIL');
  }
  const attendee: Attendee = {
    id: randomUUID(),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    ticketType: input.ticketType,
    ticketCode: genTicketCode(new Set(list.map((a) => a.ticketCode))),
    checkedIn: false,
    checkedInAt: null,
    createdAt: new Date().toISOString(),
  };
  await writeAttendees([attendee, ...list]);
  return attendee;
}
