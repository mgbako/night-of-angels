import type { Context } from '@netlify/functions';
import { AuthError, requirePermission } from '../shared/auth';
import { diff, recordAudit } from '../shared/audit';
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  DEFAULT_MAINTENANCE_TITLE,
  EventSettings,
  normalizeDate,
  normalizeProvider,
  normalizeSnoozeHours,
  normalizeText,
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
      const actor = requirePermission(req, 'settings');
      const body = (await req.json().catch(() => ({}))) as Partial<EventSettings>;
      const before = await readSettings();
      const settings: EventSettings = {
        earlyBirdEnds: normalizeDate(body.earlyBirdEnds),
        ticketSalesEnd: normalizeDate(body.ticketSalesEnd),
        reservationEnd: normalizeDate(body.reservationEnd),
        maintenance: body.maintenance === true,
        maintenanceTitle: normalizeText(body.maintenanceTitle, DEFAULT_MAINTENANCE_TITLE, 120),
        maintenanceMessage: normalizeText(body.maintenanceMessage, DEFAULT_MAINTENANCE_MESSAGE, 600),
        smsProvider: normalizeProvider(body.smsProvider),
        earlyBirdModalSnoozeHours: normalizeSnoozeHours(body.earlyBirdModalSnoozeHours),
      };
      await writeSettings(settings);
      const changes = diff(
        before as unknown as Record<string, unknown>,
        settings as unknown as Record<string, unknown>,
      );
      let action = 'settings.updated';
      if (before.smsProvider !== settings.smsProvider) action = 'settings.sms_provider_changed';
      else if (before.maintenance !== settings.maintenance) action = 'settings.maintenance_toggled';
      await recordAudit({
        req,
        actor,
        action,
        severity: 'warning',
        target: { type: 'settings', id: 'event', label: 'Event settings' },
        changes,
      });
      return json(settings);
    }
    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, err.status);
    console.error('settings function error', err);
    return json({ error: 'Server error' }, 500);
  }
};
