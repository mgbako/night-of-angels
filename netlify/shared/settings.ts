/**
 * Event settings the organiser can change live from the back office.
 * Stored in the Netlify Blobs store `settings`, key `event`.
 *
 * Each deadline is an ISO datetime string or null (= no deadline / open).
 *   earlyBirdEnds  — after this, Couples pricing reverts to regular.
 *   ticketSalesEnd — after this, ticket sales close.
 *   reservationEnd — after this, self-service reservations close.
 * Reservations are open only while BOTH ticketSalesEnd and reservationEnd
 * are still in the future (whichever comes first closes them).
 */
import { getStore } from '@netlify/blobs';

export interface EventSettings {
  earlyBirdEnds: string | null;
  ticketSalesEnd: string | null;
  reservationEnd: string | null;
}

export const DEFAULT_SETTINGS: EventSettings = {
  earlyBirdEnds: null,
  ticketSalesEnd: null,
  reservationEnd: null,
};

const STORE = 'settings';
const KEY = 'event';

function store() {
  return getStore({ name: STORE, consistency: 'strong' });
}

export async function readSettings(): Promise<EventSettings> {
  const data = await store().get(KEY, { type: 'json' });
  if (!data || typeof data !== 'object') return { ...DEFAULT_SETTINGS };
  const d = data as Partial<EventSettings>;
  return {
    earlyBirdEnds: normalizeDate(d.earlyBirdEnds),
    ticketSalesEnd: normalizeDate(d.ticketSalesEnd),
    reservationEnd: normalizeDate(d.reservationEnd),
  };
}

export async function writeSettings(s: EventSettings): Promise<void> {
  await store().setJSON(KEY, s);
}

/** Accept a valid ISO date string, else null. */
export function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function isPast(iso: string | null): boolean {
  return !!iso && Date.parse(iso) < Date.now();
}

/** Early bird is active while its deadline is unset or still in the future. */
export function isEarlyBird(s: EventSettings): boolean {
  return !isPast(s.earlyBirdEnds);
}

/** Reservations are open until the earlier of the two closing dates passes. */
export function reservationsOpen(s: EventSettings): boolean {
  return !isPast(s.ticketSalesEnd) && !isPast(s.reservationEnd);
}
