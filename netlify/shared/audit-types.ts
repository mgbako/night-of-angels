/**
 * Audit log event shape — one stable schema across every domain.
 * See docs/audit-log-design.md for the full design.
 */
export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditActor {
  id: string | null; // user id (JWT sub); null for anonymous/system
  name: string | null; // display name at time of action
  email: string | null; // email at time of action
  role: string | null; // role at time of action
}

export interface AuditTarget {
  type: string; // 'attendee' | 'user' | 'settings' | 'sponsor' | ...
  id: string | null; // primary key of the affected entity
  label: string | null; // human label (attendee name, ticket code, ...)
}

export interface AuditEvent {
  id: string; // uuid v4
  seq: number; // monotonic sequence (hash chain)
  ts: string; // ISO 8601 timestamp (server clock)
  action: string; // taxonomy key, e.g. 'attendee.deleted'
  severity: AuditSeverity;
  outcome: 'success' | 'failure';
  actor: AuditActor;
  target: AuditTarget | null;
  /** Field-level change set for updates: { field: { from, to } }. */
  changes?: Record<string, { from: unknown; to: unknown }>;
  /** Small, non-sensitive extras (counts, reasons, provider names, ...). */
  metadata?: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  /** Tamper-evidence: hash of the previous event, and this event's own hash. */
  prevHash: string | null;
  hash: string;
}
