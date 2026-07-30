import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditActor {
  id: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
}

export interface AuditEvent {
  id: string;
  seq: number;
  ts: string;
  action: string;
  severity: AuditSeverity;
  outcome: 'success' | 'failure';
  actor: AuditActor;
  target: { type: string; id: string | null; label: string | null } | null;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  prevHash: string | null;
  hash: string;
}

export interface AuditQuery {
  from?: string;
  to?: string;
  actor?: string;
  action?: string;
  severity?: string;
  entity?: string;
  outcome?: string;
  cursor?: string;
  limit?: number;
}

const API = '/api/audit';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private auth = inject(AuthService);

  private headers(): Record<string, string> {
    return { Accept: 'application/json', ...this.auth.authHeader() };
  }

  private guard(res: Response): void {
    if (res.status === 401) this.auth.handleUnauthorized();
  }

  async query(params: AuditQuery): Promise<{ events: AuditEvent[]; cursor: string | null }> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const res = await fetch(`${API}?${qs.toString()}`, { headers: this.headers() });
    this.guard(res);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as { error?: string }).error || 'Could not load audit log');
    return body as { events: AuditEvent[]; cursor: string | null };
  }

  async verify(): Promise<{ ok: boolean; brokenAt?: number; checked: number }> {
    const res = await fetch(`${API}/verify`, { headers: this.headers() });
    this.guard(res);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as { error?: string }).error || 'Verify failed');
    return body as { ok: boolean; brokenAt?: number; checked: number };
  }
}
