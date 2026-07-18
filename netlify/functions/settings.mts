import type { Context } from '@netlify/functions';
import { AuthError, requirePermission } from '../shared/auth';
import {
  EventSettings,
  normalizeDate,
  readSettings,
  writeSettings,
} from '../shared/settings';

/**
 * Event settings API.
 *   GET  /api/settings   -> EventSettings              (public — deadlines are public info)
 *   POST /api/settings   { earlyBirdEnds, ticketSalesEnd, reservationEnd }  [owner]
 */
export const config = { path: ['/api/settings'] };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });

  try {
    if (req.method === 'GET') {
      return json(await readSettings());
    }
    if (req.method === 'POST') {
      requirePermission(req, 'settings');
      const body = (await req.json().catch(() => ({}))) as Partial<EventSettings>;
      const settings: EventSettings = {
        earlyBirdEnds: normalizeDate(body.earlyBirdEnds),
        ticketSalesEnd: normalizeDate(body.ticketSalesEnd),
        reservationEnd: normalizeDate(body.reservationEnd),
      };
      await writeSettings(settings);
      return json(settings);
    }
    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, err.status);
    console.error('settings function error', err);
    return json({ error: 'Server error' }, 500);
  }
};
