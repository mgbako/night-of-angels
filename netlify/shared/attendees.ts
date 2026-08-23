/**
 * Shared access to the attendees store (Netlify Blobs), so both the attendees
 * function and the reservations "approve" flow create attendees the same way,
 * with globally-unique ticket codes.
 */
import { randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export type TicketType = 'SINGLES' | 'COUPLES' | 'TABLE';

export type Gender = 'MALE' | 'FEMALE';
export type SpecificDrink =
  | 'ALCOHOLIC_WINE'
  | 'NON_ALCOHOLIC_WINE'
  | 'SOURED_WINE'
  | 'SMIRNOFF'
  | 'STAR_RADLER'
  | 'MALT'
  | 'HEINEKEN'
  | 'STOUT'
  | 'TROPHY'
  | 'BOTTLE_WATER'
  | 'KUMELIN';

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
  /** Table assignment (e.g. "12" or "VIP 3"). Optional. */
  tableNumber?: string;
  /** Set when soft-deleted (archived). Absent/null = active. */
  deletedAt?: string | null;
  gender?: Gender;
  /** Optional, multi-select. */
  specificDrinks?: SpecificDrink[];
  /** Second guest's preferences — Couples tickets only. */
  partnerGender?: Gender;
  partnerSpecificDrinks?: SpecificDrink[];
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
  gender?: Gender;
  specificDrinks?: SpecificDrink[];
  partnerGender?: Gender;
  partnerSpecificDrinks?: SpecificDrink[];
}): Promise<Attendee> {
  const list = await readAttendees();
  const email = input.email.trim().toLowerCase();
  if (email && list.some((a) => !a.deletedAt && a.email.toLowerCase() === email)) {
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
    ...(input.gender ? { gender: input.gender } : {}),
    ...(input.specificDrinks?.length ? { specificDrinks: input.specificDrinks } : {}),
    ...(input.partnerGender ? { partnerGender: input.partnerGender } : {}),
    ...(input.partnerSpecificDrinks?.length ? { partnerSpecificDrinks: input.partnerSpecificDrinks } : {}),
  };
  await writeAttendees([attendee, ...list]);
  return attendee;
}
