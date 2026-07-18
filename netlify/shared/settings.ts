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
  /** When true, the public site shows the coming-soon page to signed-out visitors. */
  maintenance: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
}

export const DEFAULT_MAINTENANCE_TITLE = 'Coming Soon';
export const DEFAULT_MAINTENANCE_MESSAGE =
  'Something beautiful is on the way. A Night of Angels will be revealed shortly — please check back soon.';

export const DEFAULT_SETTINGS: EventSettings = {
  earlyBirdEnds: null,
  ticketSalesEnd: null,
  reservationEnd: null,
  maintenance: false,
  maintenanceTitle: DEFAULT_MAINTENANCE_TITLE,
  maintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE,
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
    maintenance: d.maintenance === true,
    maintenanceTitle: normalizeText(d.maintenanceTitle, DEFAULT_MAINTENANCE_TITLE, 120),
    maintenanceMessage: normalizeText(d.maintenanceMessage, DEFAULT_MAINTENANCE_MESSAGE, 600),
  };
}

export async function writeSettings(s: EventSettings): Promise<void> {
  await store().setJSON(KEY, s);
}

/** Trim a string to a max length, falling back to a default when empty. */
export function normalizeText(value: unknown, fallback: string, max: number): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
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
