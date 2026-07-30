import type { Context } from '@netlify/functions';
import { AuthError, TokenPayload, requirePermission } from '../shared/auth';
import { Partner, coerce, readPartners, writePartners } from '../shared/partners';
import { diff, recordAudit } from '../shared/audit';

/**
 * Sponsors / partners API — public read, owner/manager write.
 *   GET    /api/partners          -> ordered list (public)
 *   POST   /api/partners          -> add a partner            [sponsors]
 *   POST   /api/partners/reorder  -> { ids } reorder the list [sponsors]
 *   PATCH  /api/partners/:id      -> edit a partner           [sponsors]
 *   DELETE /api/partners/:id      -> remove a partner         [sponsors]
 */
export const config = {
  path: ['/api/partners', '/api/partners/reorder', '/api/partners/:id'],
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });

  const id = (context.params?.['id'] ?? '').trim();
  const pathname = new URL(req.url).pathname;
  const isReorder = pathname.endsWith('/reorder');

  try {
    if (isReorder) {
      if (req.method === 'POST') return await reorder(req);
      return json({ error: 'Method not allowed' }, 405);
    }

    // Collection
    if (!id) {
      if (req.method === 'GET') {
        // ?all=1 returns disabled partners too (back office); public gets enabled only.
        if (new URL(req.url).searchParams.get('all') === '1') {
          requirePermission(req, 'sponsors');
          return json(await readPartners());
        }
        return json((await readPartners()).filter((p) => p.enabled !== false));
      }
      if (req.method === 'POST') {
        const actor = requirePermission(req, 'sponsors');
        return await create(req, actor);
      }
      return json({ error: 'Method not allowed' }, 405);
    }

    // Item
    if (req.method === 'PATCH') {
      const actor = requirePermission(req, 'sponsors');
      return await update(id, req, actor);
    }
    if (req.method === 'DELETE') {
      const actor = requirePermission(req, 'sponsors');
      return await remove(id, req, actor);
    }
    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    if (err instanceof AuthError) return json({ error: err.message }, err.status);
    console.error('partners function error', err);
    return json({ error: 'Server error' }, 500);
  }
};

async function create(req: Request, actor: TokenPayload): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Partial<Partner> | null;
  if (!body?.name || !body?.logo) {
    return json({ error: 'Name and logo are required' }, 400);
  }
  const partner = coerce({ ...body, id: crypto.randomUUID() });
  const list = await readPartners();
  await writePartners([...list, partner]);
  await recordAudit({
    req,
    actor,
    action: 'sponsor.created',
    target: { type: 'sponsor', id: partner.id, label: partner.name },
    metadata: { tier: partner.tier },
  });
  return json(partner, 201);
}

async function update(id: string, req: Request, actor: TokenPayload): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Partial<Partner> | null;
  if (!body) return json({ error: 'Invalid body' }, 400);
  const list = await readPartners();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return json({ error: 'Partner not found' }, 404);
  const before = list[idx];
  // Keep id fixed; merge the rest, then re-sanitise.
  list[idx] = coerce({ ...before, ...body, id });
  await writePartners(list);
  const changes = diff(
    before as unknown as Record<string, unknown>,
    list[idx] as unknown as Record<string, unknown>,
  );
  // A pure enable/disable is a visibility change; anything else is a normal edit.
  const onlyEnabled = changes && Object.keys(changes).length === 1 && 'enabled' in changes;
  await recordAudit({
    req,
    actor,
    action: onlyEnabled ? 'sponsor.visibility_changed' : 'sponsor.updated',
    target: { type: 'sponsor', id, label: list[idx].name },
    changes,
  });
  return json(list[idx]);
}

async function remove(id: string, req: Request, actor: TokenPayload): Promise<Response> {
  const list = await readPartners();
  const victim = list.find((p) => p.id === id);
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return json({ error: 'Partner not found' }, 404);
  await writePartners(next);
  await recordAudit({
    req,
    actor,
    action: 'sponsor.deleted',
    severity: 'warning',
    target: { type: 'sponsor', id, label: victim?.name ?? id },
  });
  return json({ ok: true });
}

async function reorder(req: Request): Promise<Response> {
  const actor = requirePermission(req, 'sponsors');
  const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body!.ids.map((i) => String(i)) : [];
  if (!ids.length) return json({ error: 'No order provided' }, 400);
  const list = await readPartners();
  const byId = new Map(list.map((p) => [p.id, p]));
  // Reorder to match `ids`; append any partners not named (safety) in old order.
  const ordered: Partner[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (p) {
      ordered.push(p);
      byId.delete(id);
    }
  }
  for (const p of list) if (byId.has(p.id)) ordered.push(p);
  await writePartners(ordered);
  await recordAudit({
    req,
    actor,
    action: 'sponsor.reordered',
    target: null,
    metadata: { count: ordered.length },
  });
  return json(ordered);
}
