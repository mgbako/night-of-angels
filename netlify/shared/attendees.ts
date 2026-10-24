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
  | 'KUMELIN'
  | 'VODKA'
  | 'WHISKEY';

export interface TableGuest {
  name?: string;
  gender?: Gender;
  specificDrinks?: SpecificDrink[];
}

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
  /** Named occupants beyond the primary buyer — Table tickets only. */
  tableGuests?: TableGuest[];
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

const MAX_ATTEMPTS = 8;

/**
 * Read-modify-write of the whole attendee list, safe under concurrency.
 *
 * Every attendee lives in one blob, so two staff checking guests in at the same
 * moment would otherwise each write back their own copy and silently erase the
 * other's change. Here the write only lands if the blob is unchanged since we
 * read it (ETag match); if someone else wrote first, `fn` is re-run on the
 * newer list. Return `{ list }` to save, or omit `list` to save nothing.
 * `fn` may run more than once, so keep side effects (audit, email) outside it.
 */
export async function updateAttendees<T, A = Attendee>(
  fn: (list: A[]) => { list?: A[]; result: T },
): Promise<T> {
  const s = store();
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const entry = await s.getWithMetadata(KEY, { type: 'json' });
    const current = Array.isArray(entry?.data) ? (entry.data as A[]) : [];
    const { list, result } = fn(current);
    if (!list) return result;
    if (entry && !entry.etag) {
      console.warn('attendees: blob read returned no ETag — writing without a concurrency check');
    }
    const { modified } = !entry
      ? await s.setJSON(KEY, list, { onlyIfNew: true })
      : entry.etag
        ? await s.setJSON(KEY, list, { onlyIfMatch: entry.etag })
        : await s.setJSON(KEY, list);
    if (modified) return result;
    // Lost the race — back off briefly (with jitter) and retry on fresh data.
    await new Promise((r) => setTimeout(r, Math.random() * Math.min(800, 25 * 2 ** attempt)));
  }
  throw new Error('STORE_BUSY');
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
  tableGuests?: TableGuest[];
}): Promise<Attendee> {
  return updateAttendees((list) => {
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
      ...(input.tableGuests?.length ? { tableGuests: input.tableGuests } : {}),
    };
    return { list: [attendee, ...list], result: attendee };
  });
}
