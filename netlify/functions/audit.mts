import type { Context } from '@netlify/functions';
import { AuthError, requireOwner, requirePermission } from '../shared/auth';
import {
  auditStore,
  dayPrefixes,
  matches,
  recordAudit,
  verifyChain,
} from '../shared/audit';
import type { AuditEvent } from '../shared/audit-types';

/**
 * Audit log query API.
 *   GET /api/audit         -> filtered, paginated events        [permission: audit]
 *   GET /api/audit/verify  -> hash-chain integrity check         [owner]
 *
 * Reading the log is itself audited (audit.viewed).
 */
export const config = { path: ['/api/audit', '/api/audit/verify'] };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default async (req: Request, _ctx: Context): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });
  const pathname = new URL(req.url).pathname;

  try {
    if (pathname.endsWith('/verify')) {
      requireOwner(req);
      return json(await verifyChain());
    }
    if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

    const actor = requirePermission(req, 'audit');
    const url = new URL(req.url);
    const filters = {
      actor: url.searchParams.get('actor'),
      action: url.searchParams.get('action'),
      severity: url.searchParams.get('severity'),
      entity: url.searchParams.get('entity'),
      outcome: url.searchParams.get('outcome'),
    };
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
    const cursor = url.searchParams.get('cursor');
    const prefixes = dayPrefixes(url.searchParams.get('from'), url.searchParams.get('to'));

    const s = auditStore();
    const keys: string[] = [];
    for (const prefix of prefixes) {
      const { blobs } = await s.list({ prefix });
      for (const b of blobs) keys.push(b.key);
    }
    keys.sort().reverse(); // newest first
    const start = cursor ? keys.indexOf(cursor) + 1 : 0;

    const events: AuditEvent[] = [];
    let next: string | null = null;
    for (let i = start; i < keys.length && events.length < limit; i++) {
      const ev = (await s.get(keys[i], { type: 'json' })) as AuditEvent | null;
      next = keys[i];
      if (ev && matches(ev, filters)) events.push(ev);
    }

    await recordAudit({
      req,
      actor,
      action: 'audit.viewed',
      metadata: { ...filters, returned: events.length },
    });

    return json({ events, cursor: events.length === limit ? next : null });
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, err.status);
    console.error('audit function error', err);
    return json({ error: 'Server error' }, 500);
  }
};
