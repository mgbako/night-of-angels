import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import { ReservationApiService } from '../../../features/ticketing/services/reservation-api.service';
import {
  Reservation,
  ReservationStatus,
} from '../../../features/ticketing/models/reservation.model';
import {
  TICKET_TYPES,
  TicketType,
} from '../../../features/ticketing/models/attendee.model';

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [FormsModule, RouterLink, AdminIconComponent],
  template: `
    <div class="adm-page-head">
      <div>
        <h2>Reservations</h2>
        <p>Self-service requests awaiting payment confirmation.</p>
      </div>
      <button class="adm-btn" (click)="load()" [disabled]="loading()">
        <adm-icon name="external" [size]="16" /> Refresh
      </button>
    </div>

    @if (notice(); as n) {
      <div class="adm-notice" [class.adm-notice--err]="!n.ok">{{ n.msg }}</div>
    }

    <div class="adm-toolbar">
      <select class="adm-select" [ngModel]="filter()" (ngModelChange)="filter.set($event)">
        <option value="pending">Pending ({{ counts().pending }})</option>
        <option value="approved">Approved ({{ counts().approved }})</option>
        <option value="all">All ({{ all().length }})</option>
      </select>
    </div>

    @if (loading()) {
      <div class="adm-loading"><div class="adm-spinner"></div><p>Loading…</p></div>
    } @else {
      <div class="res-list">
        @for (r of visible(); track r.id) {
          <div class="adm-card res">
            <div class="res__main">
              <div>
                <span class="res__name">{{ r.name }}</span>
                <span class="res__sub">
                  {{ r.phone }}@if (r.email) { · {{ r.email }} } · {{ date(r.createdAt) }}
                </span>
              </div>
              <span class="adm-badge" [class]="badge(r.status)">{{ r.status }}</span>
            </div>

            <div class="res__actions">
              <button class="adm-btn adm-btn--sm" (click)="viewProof(r)" [disabled]="opening() === r.id">
                <adm-icon name="external" [size]="15" /> {{ opening() === r.id ? 'Opening…' : 'View proof' }}
              </button>

              @if (r.status === 'pending') {
                <select class="adm-select res__type" [(ngModel)]="picked[r.id]">
                  <option value="">Ticket type…</option>
                  @for (t of ticketTypes; track t.value) {
                    <option [value]="t.value">{{ t.label }} — ₦{{ t.price.toLocaleString() }}</option>
                  }
                </select>
                <button class="adm-btn adm-btn--sm adm-btn--primary" (click)="approve(r)" [disabled]="busy()">
                  <adm-icon name="check" [size]="15" /> Approve
                </button>
                <button class="adm-btn adm-btn--sm adm-btn--danger" (click)="reject(r)" [disabled]="busy()">
                  <adm-icon name="trash" [size]="15" /> Reject
                </button>
              } @else if (r.status === 'approved') {
                <span class="res__code">Ticket <b>{{ r.ticketCode }}</b></span>
                <a routerLink="/admin/attendees" class="adm-btn adm-btn--sm">Open attendees</a>
                <button class="adm-btn adm-btn--sm adm-btn--danger" (click)="reject(r)" [disabled]="busy()">
                  <adm-icon name="trash" [size]="15" /> Remove
                </button>
              }
            </div>
          </div>
        } @empty {
          <div class="adm-empty">
            <adm-icon name="ticket" [size]="28" />
            <p style="margin-top:.5rem">No {{ filter() === 'all' ? '' : filter() }} reservations.</p>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .res-list { display: grid; gap: 0.8rem; }
      .res { padding: 1rem 1.1rem; }
      .res__main {
        display: flex;
        justify-content: space-between;
        gap: 0.6rem;
        align-items: flex-start;
        margin-bottom: 0.8rem;
      }
      .res__name { display: block; font-weight: 600; color: #23201a; }
      .res__sub { display: block; font-size: 0.8rem; color: #8a8270; margin-top: 0.15rem; }
      .res__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
      .res__type { padding: 0.4rem 0.6rem; font-size: 0.82rem; }
      .res__code { font-size: 0.84rem; color: #6a6354; }
      .res__code b { font-family: ui-monospace, Menlo, monospace; color: #23201a; }
    `,
  ],
})
export class ReservationsComponent {
  private api = inject(ReservationApiService);
  readonly ticketTypes = TICKET_TYPES;

  all = signal<Reservation[]>([]);
  loading = signal(true);
  busy = signal(false);
  opening = signal<string | null>(null);
  filter = signal<'pending' | 'approved' | 'all'>('pending');
  notice = signal<{ msg: string; ok: boolean } | null>(null);
  picked: Record<string, TicketType | ''> = {};

  counts = computed(() => ({
    pending: this.all().filter((r) => r.status === 'pending').length,
    approved: this.all().filter((r) => r.status === 'approved').length,
  }));

  visible = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.all() : this.all().filter((r) => r.status === f);
  });

  constructor() {
    afterNextRender(() => this.load());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.all.set(await this.api.list());
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not load', false);
    } finally {
      this.loading.set(false);
    }
  }

  async viewProof(r: Reservation): Promise<void> {
    this.opening.set(r.id);
    try {
      const url = await this.api.proofObjectUrl(r.id);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not open proof', false);
    } finally {
      this.opening.set(null);
    }
  }

  async approve(r: Reservation): Promise<void> {
    const type = this.picked[r.id];
    if (!type) {
      this.flash('Choose a ticket type first.', false);
      return;
    }
    this.busy.set(true);
    try {
      const attendee = await this.api.approve(r.id, type);
      this.flash(`${r.name} approved — ticket ${attendee.ticketCode} created.`, true);
      await this.load();
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not approve', false);
    } finally {
      this.busy.set(false);
    }
  }

  async reject(r: Reservation): Promise<void> {
    if (!confirm(`Remove ${r.name}'s reservation? This deletes their uploaded proof.`)) return;
    this.busy.set(true);
    try {
      await this.api.remove(r.id);
      this.flash(`${r.name}'s reservation removed.`, true);
      await this.load();
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not remove', false);
    } finally {
      this.busy.set(false);
    }
  }

  badge(status: ReservationStatus): string {
    return status === 'approved'
      ? 'adm-badge--confirmed'
      : status === 'rejected'
        ? 'adm-badge--cancelled'
        : 'adm-badge--pending';
  }

  date(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private flash(msg: string, ok: boolean): void {
    this.notice.set({ msg, ok });
    setTimeout(() => this.notice.set(null), 5000);
  }
}
