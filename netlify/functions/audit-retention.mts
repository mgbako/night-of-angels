import type { Config } from '@netlify/functions';
import { auditStore } from '../shared/audit';
import type { AuditEvent } from '../shared/audit-types';

/**
 * Daily retention prune for the audit log.
 *   info      -> kept 180 days
 *   warning   -> kept 400 days
 *   critical  -> kept 400 days
 *
 * Pruning deletes individual event blobs; it deliberately breaks the hash
 * chain before the cutoff. Re-anchor the current head out-of-band if you rely
 * on end-to-end verification (see docs/audit-log-design.md §10).
 */
export const config: Config = { schedule: '@daily' };

const DAY = 24 * 60 * 60 * 1000;

export default async (): Promise<void> => {
  const s = auditStore();
  const now = Date.now();
  const infoCutoff = now - 180 * DAY;
  const longCutoff = now - 400 * DAY;

  const { blobs } = await s.list({ prefix: 'events/' });
  let pruned = 0;
  for (const b of blobs) {
    const ev = (await s.get(b.key, { type: 'json' })) as Pick<AuditEvent, 'ts' | 'severity'> | null;
    if (!ev) continue;
    const cutoff = ev.severity === 'info' ? infoCutoff : longCutoff;
    if (Date.parse(ev.ts) < cutoff) {
      await s.delete(b.key);
      pruned++;
    }
  }
  console.log(`audit retention: pruned ${pruned} event(s)`);
};
