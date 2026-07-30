import { Component, afterNextRender, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import { AuditEvent, AuditQuery, AuditService } from '../../services/audit.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [FormsModule, AdminIconComponent],
  template: `
    <div class="adm-page-head">
      <div>
        <h2>Audit Log</h2>
        <p>Every security-relevant and state-changing action, newest first.</p>
      </div>
      <div style="display:flex; gap:.6rem; flex-wrap:wrap">
        @if (isOwner()) {
          <button class="adm-btn" (click)="verify()" [disabled]="verifying()">
            <adm-icon name="shield" [size]="16" /> {{ verifying() ? 'Checking…' : 'Verify integrity' }}
          </button>
        }
        <button class="adm-btn" (click)="exportCsv()" [disabled]="!events().length">
          <adm-icon name="download" [size]="16" /> Export CSV
        </button>
      </div>
    </div>

    @if (verifyResult(); as v) {
      <div class="adm-notice" [class.adm-notice--err]="!v.ok">
        @if (v.ok) {
          ✔ Chain intact — {{ v.checked }} event{{ v.checked === 1 ? '' : 's' }} verified.
        } @else {
          ✖ Tampering detected at sequence {{ v.brokenAt }} (after {{ v.checked }} valid).
        }
      </div>
    }
    @if (error(); as e) { <div class="adm-notice adm-notice--err">{{ e }}</div> }

    <div class="adm-toolbar aud-filters">
      <label>From <input type="date" [(ngModel)]="from" (ngModelChange)="reload()" /></label>
      <label>To <input type="date" [(ngModel)]="to" (ngModelChange)="reload()" /></label>
      <select [(ngModel)]="action" (ngModelChange)="reload()" aria-label="Filter by action">
        <option value="">All actions</option>
        @for (a of actionGroups; track a.value) { <option [value]="a.value">{{ a.label }}</option> }
      </select>
      <select [(ngModel)]="severity" (ngModelChange)="reload()" aria-label="Filter by severity">
        <option value="">All severities</option>
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="critical">Critical</option>
      </select>
      <select [(ngModel)]="outcome" (ngModelChange)="reload()" aria-label="Filter by outcome">
        <option value="">Any outcome</option>
        <option value="success">Success</option>
        <option value="failure">Failure</option>
      </select>
      <input
        type="search"
        placeholder="Actor email or id…"
        [(ngModel)]="actor"
        (ngModelChange)="reloadDebounced()"
        aria-label="Filter by actor"
      />
    </div>

    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (e of events(); track e.id) {
            <tr class="aud-row" (click)="selected.set(e)">
              <td class="aud-when">{{ when(e.ts) }}</td>
              <td>
                <div class="aud-actor">{{ e.actor.name || e.actor.email || 'Anonymous' }}</div>
                @if (e.actor.role) { <div class="aud-sub">{{ e.actor.role }}</div> }
              </td>
              <td>
                <span class="aud-sev aud-sev--{{ e.severity }}">{{ e.severity }}</span>
                <span class="aud-action">{{ e.action }}</span>
                @if (e.outcome === 'failure') { <span class="aud-fail">failed</span> }
              </td>
              <td>
                @if (e.target) {
                  <span class="aud-target">{{ e.target.label || e.target.type }}</span>
                  <span class="aud-sub">{{ e.target.type }}</span>
                } @else { <span class="aud-sub">—</span> }
              </td>
              <td style="text-align:right"><adm-icon name="chevron-right" [size]="15" /></td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5">
                @if (loading()) {
                  <div class="adm-loading"><div class="adm-spinner"></div><p>Loading…</p></div>
                } @else {
                  <div class="adm-empty">
                    <adm-icon name="audit" [size]="28" />
                    <p style="margin-top:.5rem">No events match these filters.</p>
                  </div>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (cursor()) {
      <div style="text-align:center; margin-top:1rem">
        <button class="adm-btn" (click)="loadMore()" [disabled]="loadingMore()">
          {{ loadingMore() ? 'Loading…' : 'Load more' }}
        </button>
      </div>
    }

    @if (selected(); as e) {
      <div class="aud-backdrop" (click)="selected.set(null)"></div>
      <aside class="aud-drawer" role="dialog" aria-modal="true">
        <div class="aud-drawer__head">
          <div>
            <span class="aud-sev aud-sev--{{ e.severity }}">{{ e.severity }}</span>
            <strong>{{ e.action }}</strong>
          </div>
          <button class="adm-btn adm-btn--sm adm-btn--ghost" (click)="selected.set(null)">
            <adm-icon name="close" [size]="16" />
          </button>
        </div>
        <dl class="aud-dl">
          <dt>When</dt><dd>{{ e.ts }}</dd>
          <dt>Outcome</dt><dd>{{ e.outcome }}</dd>
          <dt>Actor</dt>
          <dd>{{ e.actor.name || '—' }} · {{ e.actor.email || '—' }} · {{ e.actor.role || '—' }}<br /><span class="aud-sub">{{ e.actor.id || 'anonymous' }}</span></dd>
          <dt>Target</dt>
          <dd>@if (e.target) { {{ e.target.label || '—' }} <span class="aud-sub">({{ e.target.type }}{{ e.target.id ? ' · ' + e.target.id : '' }})</span> } @else { — }</dd>
          @if (e.changes) {
            <dt>Changes</dt>
            <dd>
              @for (c of changeList(e); track c.field) {
                <div class="aud-change"><b>{{ c.field }}</b>: {{ fmt(c.from) }} → {{ fmt(c.to) }}</div>
              }
            </dd>
          }
          @if (e.metadata) { <dt>Metadata</dt><dd><pre class="aud-pre">{{ pretty(e.metadata) }}</pre></dd> }
          <dt>Request</dt>
          <dd class="aud-sub">IP {{ e.ip || '—' }}<br />{{ e.userAgent || '—' }}<br />req {{ e.requestId || '—' }}</dd>
          <dt>Chain</dt>
          <dd class="aud-sub">seq {{ e.seq }}<br />hash {{ short(e.hash) }}<br />prev {{ short(e.prevHash) }}</dd>
        </dl>
      </aside>
    }
  `,
  styles: [
    `
      .aud-filters { flex-wrap: wrap; gap: 0.6rem; align-items: center; }
      .aud-filters label { font-size: 0.8rem; color: #6a6354; display: inline-flex; align-items: center; gap: 0.35rem; }
      .aud-filters input[type='date'], .aud-filters select, .aud-filters input[type='search'] {
        padding: 0.45rem 0.6rem; border: 1px solid #d9d3c4; border-radius: 8px; font: inherit; font-size: 0.85rem; background: #fff; color: #23201a;
      }
      .aud-row { cursor: pointer; }
      .aud-row:hover td { background: rgba(176, 137, 29, 0.06); }
      .aud-when { white-space: nowrap; font-size: 0.82rem; color: #4a4438; }
      .aud-actor { font-weight: 600; color: #23201a; }
      .aud-sub { font-size: 0.72rem; color: #8a8270; }
      .aud-action { font-family: ui-monospace, Menlo, monospace; font-size: 0.8rem; color: #3a3630; }
      .aud-target { color: #23201a; display: block; }
      .aud-fail { margin-left: 0.4rem; font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.08em; color: #b03737; font-weight: 700; }
      .aud-sev { display: inline-block; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; padding: 0.12rem 0.4rem; border-radius: 999px; margin-right: 0.5rem; vertical-align: middle; }
      .aud-sev--info { background: #e7eef5; color: #2c5877; }
      .aud-sev--warning { background: rgba(201, 162, 39, 0.18); color: #7a5f12; }
      .aud-sev--critical { background: rgba(176, 55, 55, 0.14); color: #a02525; }
      .aud-backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(11, 11, 10, 0.45); }
      .aud-drawer { position: fixed; z-index: 51; top: 0; right: 0; height: 100%; width: min(94vw, 460px); background: #fff; box-shadow: -16px 0 50px -20px rgba(0,0,0,.4); padding: 1.2rem 1.3rem; overflow-y: auto; }
      .aud-drawer__head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
      .aud-drawer__head strong { font-family: ui-monospace, Menlo, monospace; font-size: 0.9rem; }
      .aud-dl { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem; margin: 0; font-size: 0.85rem; }
      .aud-dl dt { color: #8a8270; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; padding-top: 0.15rem; }
      .aud-dl dd { margin: 0; color: #23201a; word-break: break-word; }
      .aud-change { font-size: 0.82rem; margin: 0.1rem 0; }
      .aud-pre { background: #f4f1ea; border-radius: 6px; padding: 0.5rem 0.6rem; font-size: 0.75rem; white-space: pre-wrap; word-break: break-word; margin: 0; }
    `,
  ],
})
export class AuditComponent {
  private svc = inject(AuditService);
  private auth = inject(AuthService);
  private doc = inject(DOCUMENT);

  events = signal<AuditEvent[]>([]);
  cursor = signal<string | null>(null);
  loading = signal(false);
  loadingMore = signal(false);
  error = signal<string | null>(null);
  verifying = signal(false);
  verifyResult = signal<{ ok: boolean; brokenAt?: number; checked: number } | null>(null);
  selected = signal<AuditEvent | null>(null);

  from = '';
  to = '';
  action = '';
  severity = '';
  outcome = '';
  actor = '';

  isOwner = () => this.auth.isOwner();

  actionGroups = [
    { value: 'auth.', label: 'Authentication' },
    { value: 'team.', label: 'Team / users' },
    { value: 'attendee.', label: 'Attendees' },
    { value: 'ticket.', label: 'Ticketing' },
    { value: 'sms.', label: 'SMS' },
    { value: 'reservation.', label: 'Reservations' },
    { value: 'settings.', label: 'Settings' },
    { value: 'sponsor.', label: 'Sponsors' },
    { value: 'audit.', label: 'Audit log' },
  ];

  private debounce?: ReturnType<typeof setTimeout>;

  constructor() {
    afterNextRender(() => this.reload());
  }

  private params(): AuditQuery {
    return {
      from: this.from ? new Date(this.from).toISOString() : undefined,
      to: this.to ? new Date(this.to + 'T23:59:59').toISOString() : undefined,
      action: this.action || undefined,
      severity: this.severity || undefined,
      outcome: this.outcome || undefined,
      actor: this.actor.trim() || undefined,
      limit: 50,
    };
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { events, cursor } = await this.svc.query(this.params());
      this.events.set(events);
      this.cursor.set(cursor);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load audit log');
    } finally {
      this.loading.set(false);
    }
  }

  reloadDebounced(): void {
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.reload(), 350);
  }

  async loadMore(): Promise<void> {
    const cursor = this.cursor();
    if (!cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    try {
      const res = await this.svc.query({ ...this.params(), cursor });
      this.events.update((cur) => [...cur, ...res.events]);
      this.cursor.set(res.cursor);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load more');
    } finally {
      this.loadingMore.set(false);
    }
  }

  async verify(): Promise<void> {
    this.verifying.set(true);
    this.verifyResult.set(null);
    try {
      this.verifyResult.set(await this.svc.verify());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Verify failed');
    } finally {
      this.verifying.set(false);
    }
  }

  when(ts: string): string {
    return new Date(ts).toLocaleString();
  }

  fmt(v: unknown): string {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  pretty(v: unknown): string {
    return JSON.stringify(v, null, 2);
  }

  short(h: string | null): string {
    return h ? h.slice(0, 16) + '…' : '—';
  }

  changeList(e: AuditEvent): { field: string; from: unknown; to: unknown }[] {
    return Object.entries(e.changes ?? {}).map(([field, v]) => ({ field, from: v.from, to: v.to }));
  }

  exportCsv(): void {
    const cols = ['When', 'Actor', 'Email', 'Role', 'Action', 'Severity', 'Outcome', 'Target', 'TargetType', 'IP'];
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = this.events().map((e) => [
      e.ts,
      e.actor.name ?? '',
      e.actor.email ?? '',
      e.actor.role ?? '',
      e.action,
      e.severity,
      e.outcome,
      e.target?.label ?? '',
      e.target?.type ?? '',
      e.ip ?? '',
    ]);
    const csv = [cols, ...rows].map((r) => r.map((c) => esc(String(c))).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = this.doc.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
