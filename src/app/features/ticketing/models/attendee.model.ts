/**
 * Ticketing domain models. Self-contained so a real backend
 * (Node/Express + Prisma) can adopt the same shapes 1:1.
 */

export type TicketType = 'SINGLES' | 'COUPLES' | 'TABLE';

export interface TicketTypeMeta {
  value: TicketType;
  label: string;
  price: number; // NGN per ticket
  seats: number; // guests admitted per ticket
}

export const TICKET_TYPES: TicketTypeMeta[] = [
  { value: 'SINGLES', label: 'Singles', price: 20000, seats: 1 },
  { value: 'COUPLES', label: 'Couples', price: 35000, seats: 2 },
  { value: 'TABLE', label: 'Table of Ten', price: 300000, seats: 10 },
];

/** Couples is early-bird priced; it reverts to this once early bird ends. */
export const COUPLES_REGULAR_PRICE = 40000;

export function ticketTypeMeta(t: TicketType): TicketTypeMeta {
  return TICKET_TYPES.find((x) => x.value === t) ?? TICKET_TYPES[0];
}

/** Price to charge/display for a ticket, given whether early bird is still active. */
export function effectivePrice(meta: TicketTypeMeta, isEarlyBird: boolean): number {
  if (meta.value === 'COUPLES' && !isEarlyBird) return COUPLES_REGULAR_PRICE;
  return meta.price;
}

export function ticketTypeLabel(t: TicketType): string {
  return ticketTypeMeta(t).label;
}

/** A table seats this many persons. */
export const TABLE_CAPACITY = 10;

/** Persons a ticket occupies at a table (Singles 1, Couples 2, Table 10). */
export function seatsFor(t: TicketType): number {
  return ticketTypeMeta(t).seats;
}

export interface TableSummary {
  table: string;
  persons: number;
  attendees: Attendee[];
  full: boolean;
}

/** Persons already seated at a table (sum of seats), excluding one attendee id. */
export function tablePersons(list: Attendee[], table: string, excludeId?: string): number {
  const key = table.trim();
  return list
    .filter((a) => !a.deletedAt && (a.tableNumber ?? '').trim() === key && a.id !== excludeId)
    .reduce((sum, a) => sum + seatsFor(a.ticketType), 0);
}

/** Grouped, sorted table summaries for the Tables view (active attendees only). */
export function tableSummaries(list: Attendee[]): TableSummary[] {
  const groups = new Map<string, Attendee[]>();
  for (const a of list) {
    const key = (a.tableNumber ?? '').trim();
    if (a.deletedAt || !key) continue;
    const arr = groups.get(key) ?? [];
    arr.push(a);
    groups.set(key, arr);
  }
  return [...groups.entries()]
    .map(([table, attendees]) => {
      const persons = attendees.reduce((s, a) => s + seatsFor(a.ticketType), 0);
      return { table, attendees, persons, full: persons >= TABLE_CAPACITY };
    })
    .sort((a, b) => a.table.localeCompare(b.table, undefined, { numeric: true }));
}

export interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  ticketType: TicketType;
  ticketCode: string; // short unique code used in the QR URL
  checkedIn: boolean;
  checkedInAt: string | null; // ISO
  createdAt: string; // ISO
  tableNumber?: string; // organizer-assigned table
  deletedAt?: string | null; // set when archived (soft-deleted)
}

export interface RegisterDto {
  name: string;
  email: string;
  phone: string;
  ticketType: TicketType;
  tableNumber?: string;
}
