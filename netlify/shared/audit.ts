/**
 * Audit log recorder + query helpers, backed by Netlify Blobs.
 *
 * Storage layout (race-free — one blob per event, unique keys never collide):
 *   Store: "audit"
 *   Key:   "events/<YYYY>/<MM>/<DD>/<ISO-ts>-<uuid>.json"
 *   Head:  "chain/head" -> { seq, hash }   (hash-chain pointer)
 *
 * recordAudit() is best-effort: it never throws into the caller, so an audit
 * failure can't break the primary action. See docs/audit-log-design.md.
 */
import { getStore } from '@netlify/blobs';
import { createHash, randomUUID } from 'node:crypto';
import type { TokenPayload } from './auth';
import type { AuditActor, AuditEvent, AuditSeverity, AuditTarget } from './audit-types';

const STORE = 'audit';

export function auditStore() {
  return getStore({ name: STORE, consistency: 'strong' });
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function keyFor(ts: Date, id: string): string {
  const y = ts.getUTCFullYear();
  const m = pad(ts.getUTCMonth() + 1);
  const d = pad(ts.getUTCDate());
  return `events/${y}/${m}/${d}/${ts.toISOString()}-${id}.json`;
}

function actorFrom(a: TokenPayload | AuditActor | null): AuditActor {
  if (!a) return { id: null, name: null, email: null, role: null };
  if ('sub' in a) return { id: a.sub, name: a.name, email: a.email, role: a.role };
  return a; // already an AuditActor (e.g. built during login, before a token exists)
}

function requestContext(req: Request) {
  return {
    ip: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
    userAgent: req.headers.get('user-agent'),
    requestId: req.headers.get('x-nf-request-id'),
  };
}

/** Canonical JSON (stable key order) so hashes are reproducible. */
export function canonical(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

interface HeadRecord {
  seq: number;
  hash: string;
}

async function advanceChain(
  base: Omit<AuditEvent, 'seq' | 'prevHash' | 'hash'>,
): Promise<AuditEvent> {
  const s = auditStore();
  for (let attempt = 0; attempt < 5; attempt++) {
    const head = (await s.get('chain/head', { type: 'json' })) as HeadRecord | null;
    const seq = (head?.seq ?? 0) + 1;
    const prevHash = head?.hash ?? null;
    const withoutHash = { ...base, seq, prevHash } as Omit<AuditEvent, 'hash'>;
    const hash = sha256(canonical(withoutHash));
    const event: AuditEvent = { ...withoutHash, hash };
    const key = keyFor(new Date(event.ts), event.id);
    // Write the immutable event first (unique key — cannot clobber anything).
    await s.setJSON(key, event);
    // Then advance the head. If it moved meanwhile, drop this event and retry.
    const current = (await s.get('chain/head', { type: 'json' })) as HeadRecord | null;
    if ((current?.seq ?? 0) === (head?.seq ?? 0)) {
      await s.setJSON('chain/head', { seq, hash } satisfies HeadRecord);
      return event;
    }
    await s.delete(key);
  }
  throw new Error('audit chain contention');
}

export interface RecordInput {
  req: Request;
  actor: TokenPayload | AuditActor | null;
  action: string;
  severity?: AuditSeverity;
  outcome?: 'success' | 'failure';
  target?: AuditTarget | null;
  changes?: AuditEvent['changes'];
  metadata?: Record<string, unknown>;
}

/**
 * Record one audit event. Best-effort: never throws into the caller.
 */
export async function recordAudit(input: RecordInput): Promise<void> {
  try {
    const ctx = requestContext(input.req);
    const base: Omit<AuditEvent, 'seq' | 'prevHash' | 'hash'> = {
      id: randomUUID(),
      ts: new Date().toISOString(),
      action: input.action,
      severity: input.severity ?? 'info',
      outcome: input.outcome ?? 'success',
      actor: actorFrom(input.actor),
      target: input.target ?? null,
      changes: input.changes,
      metadata: input.metadata,
      ...ctx,
    };
    await advanceChain(base);
  } catch (err) {
    // Swallow — auditing must not break the action. Surface to platform logs.
    console.error('audit.record failed', input.action, err);
  }
}

// ---------------------------------------------------------------- diff helper

const REDACT = new Set(['passwordHash', 'password', 'token', 'apiKey', 'secret']);

/** Build a redacted { field: {from,to} } diff for updates. */
export function diff<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): AuditEvent['changes'] | undefined {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of Object.keys(after)) {
    if (before[k] !== after[k as keyof T]) {
      const redacted = REDACT.has(k);
      changes[k] = {
        from: redacted ? '«redacted»' : before[k],
        to: redacted ? '«redacted»' : (after as Record<string, unknown>)[k],
      };
    }
  }
  return Object.keys(changes).length ? changes : undefined;
}

// -------------------------------------------------------------- query helpers

/**
 * Enumerate 'events/YYYY/MM/DD/' day prefixes between from..to (inclusive),
 * defaulting to the last 30 days when unset.
 */
export function dayPrefixes(from?: string | null, to?: string | null): string[] {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 30 * 864e5);
  const out: string[] = [];
  const d = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  // Guard against an inverted or huge range (cap at ~2 years of prefixes).
  let guard = 0;
  while (d <= endDay && guard++ < 800) {
    out.push(`events/${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/`);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function matches(ev: AuditEvent, f: Record<string, string | null | undefined>): boolean {
  if (f.actor && ev.actor.id !== f.actor && ev.actor.email !== f.actor) return false;
  if (f.action && !ev.action.startsWith(f.action)) return false;
  if (f.severity && ev.severity !== f.severity) return false;
  if (f.entity && ev.target?.type !== f.entity) return false;
  if (f.outcome && ev.outcome !== f.outcome) return false;
  return true;
}

/** Verify the hash chain end-to-end. Returns the first break, if any. */
export async function verifyChain(): Promise<{ ok: boolean; brokenAt?: number; checked: number }> {
  const s = auditStore();
  const { blobs } = await s.list({ prefix: 'events/' });
  const keys = blobs.map((b) => b.key).sort(); // chronological
  let prevHash: string | null = null;
  let checked = 0;
  for (const key of keys) {
    const ev = (await s.get(key, { type: 'json' })) as AuditEvent | null;
    if (!ev) continue;
    const { hash, ...rest } = ev;
    if (sha256(canonical(rest)) !== hash) return { ok: false, brokenAt: ev.seq, checked };
    if (ev.prevHash !== prevHash) return { ok: false, brokenAt: ev.seq, checked };
    prevHash = hash;
    checked++;
  }
  return { ok: true, checked };
}
