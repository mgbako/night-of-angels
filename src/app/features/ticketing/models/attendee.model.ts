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
  { value: 'TABLE', label: 'Table of Ten', price: 500000, seats: 10 },
];

export function ticketTypeMeta(t: TicketType): TicketTypeMeta {
  return TICKET_TYPES.find((x) => x.value === t) ?? TICKET_TYPES[0];
}

export function ticketTypeLabel(t: TicketType): string {
  return ticketTypeMeta(t).label;
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
}

export interface RegisterDto {
  name: string;
  email: string;
  phone: string;
  ticketType: TicketType;
}
