import { Component, HostListener, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import { ReservationApiService } from '../../../features/ticketing/services/reservation-api.service';
import {
  Reservation,
  ReservationStatus,
} from '../../../features/ticketing/models/reservation.model';
import {
  TICKET_TYPES,
  TicketType,
  TicketTypeMeta,
  effectivePrice,
  ticketTypeLabel,
} from '../../../features/ticketing/models/attendee.model';
import { EventSettingsService } from '../../../shared/event-settings.service';
import { AuthService } from '../../services/auth.service';

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
        @if (isOwner()) {
          <option value="archived">Archived ({{ archived().length }})</option>
        }
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
                @if (r.ticketType) {
                  <span class="res__req">Requested: {{ typeLabel(r.ticketType) }}</span>
                }
                @if (r.partnerName || r.partnerPhone || r.partnerEmail) {
                  <span class="res__partner">
                    <adm-icon name="attendees" [size]="13" />
                    Second guest:
                    {{ r.partnerName || '—' }}@if (r.partnerPhone) { · {{ r.partnerPhone }} }@if (r.partnerEmail) { · {{ r.partnerEmail }} }
                  </span>
                }
              </div>
              <span class="adm-badge" [class]="badge(r.status)">{{ r.status }}</span>
            </div>

            <div class="res__actions">
              <button class="adm-btn adm-btn--sm" (click)="viewProof(r)" [disabled]="opening() === r.id">
                <adm-icon name="external" [size]="15" /> {{ opening() === r.id ? 'Opening…' : 'View proof' }}
              </button>

              @if (r.deletedAt) {
                <button class="adm-btn adm-btn--sm" (click)="restore(r)" [disabled]="busy()">
                  Restore
                </button>
                <button class="adm-btn adm-btn--sm adm-btn--danger" (click)="permanentDelete(r)" [disabled]="busy()">
                  <adm-icon name="trash" [size]="15" /> Delete permanently
                </button>
              } @else if (r.status === 'pending') {
                <select class="adm-select res__type" [(ngModel)]="picked[r.id]">
                  <option value="">Ticket type…</option>
                  @for (t of ticketTypes; track t.value) {
                    <option [value]="t.value">{{ t.label }} — ₦{{ price(t).toLocaleString() }}</option>
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

    @if (proof(); as p) {
      <div class="proof-modal" role="dialog" aria-modal="true" aria-label="Proof of payment" (click)="closeProof()">
        <div class="proof-modal__box" (click)="$event.stopPropagation()">
          <div class="proof-modal__head">
            <span>Proof of payment — {{ p.name }}</span>
            <div class="proof-modal__tools">
              <a class="adm-btn adm-btn--sm" [href]="p.url" target="_blank" rel="noopener" title="Open in new tab">
                <adm-icon name="external" [size]="15" /> Open
              </a>
              <button class="adm-btn adm-btn--sm" (click)="closeProof()" aria-label="Close">
                <adm-icon name="close" [size]="16" />
              </button>
            </div>
          </div>
          <div class="proof-modal__body">
            @if (p.isImage) {
              <img [src]="p.url" [alt]="'Proof of payment from ' + p.name" />
            } @else {
              <iframe [src]="p.safeUrl" title="Proof of payment"></iframe>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .proof-modal {
        position: fixed;
        inset: 0;
        z-index: 60;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.2rem;
        background: rgba(10, 9, 8, 0.72);
        backdrop-filter: blur(2px);
        animation: proof-fade 0.14s ease;
      }
      @keyframes proof-fade { from { opacity: 0; } to { opacity: 1; } }
      .proof-modal__box {
        display: flex;
        flex-direction: column;
        width: min(720px, 100%);
        max-height: 90vh;
        background: #fff;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
      }
      .proof-modal__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.6rem;
        padding: 0.7rem 0.9rem 0.7rem 1.1rem;
        border-bottom: 1px solid #e7e2d5;
        font-weight: 600;
        color: #23201a;
      }
      .proof-modal__tools { display: flex; gap: 0.4rem; }
      .proof-modal__body {
        overflow: auto;
        background: #f2efe7;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .proof-modal__body img { max-width: 100%; max-height: 82vh; display: block; }
      .proof-modal__body iframe { width: 100%; height: 82vh; border: 0; background: #fff; }
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
      .res__req {
        display: inline-block;
        margin-top: 0.35rem;
        font-size: 0.72rem;
        letter-spacing: 0.04em;
        color: #9a7d1f;
        border: 1px solid rgba(154, 125, 31, 0.35);
        border-radius: 999px;
        padding: 0.1rem 0.6rem;
      }
      .res__partner {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin-top: 0.4rem;
        font-size: 0.78rem;
        color: #6a6354;
      }
      .res__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
      .res__type { padding: 0.4rem 0.6rem; font-size: 0.82rem; }
      .res__code { font-size: 0.84rem; color: #6a6354; }
      .res__code b { font-family: ui-monospace, Menlo, monospace; color: #23201a; }
    `,
  ],
})
export class ReservationsComponent {
  private api = inject(ReservationApiService);
  private auth = inject(AuthService);
  private settings = inject(EventSettingsService);
  private sanitizer = inject(DomSanitizer);
  readonly ticketTypes = TICKET_TYPES;

  /** Proof lightbox state (null when closed). */
  proof = signal<{
    name: string;
    url: string;
    safeUrl: SafeResourceUrl;
    isImage: boolean;
  } | null>(null);

  price(t: TicketTypeMeta): number {
    return effectivePrice(t, this.settings.isEarlyBird());
  }

  isOwner = () => this.auth.isOwner();

  all = signal<Reservation[]>([]);
  archived = signal<Reservation[]>([]);
  loading = signal(true);
  busy = signal(false);
  opening = signal<string | null>(null);
  filter = signal<'pending' | 'approved' | 'all' | 'archived'>('pending');
  notice = signal<{ msg: string; ok: boolean } | null>(null);
  picked: Record<string, TicketType | ''> = {};

  counts = computed(() => ({
    pending: this.all().filter((r) => r.status === 'pending').length,
    approved: this.all().filter((r) => r.status === 'approved').length,
  }));

  visible = computed(() => {
    const f = this.filter();
    if (f === 'archived') return this.archived();
    if (f === 'all') return this.all();
    return this.all().filter((r) => r.status === f);
  });

  constructor() {
    afterNextRender(() => {
      this.settings.load();
      this.load();
    });
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const list = await this.api.list();
      this.all.set(list);
      // Default each pending row's approve selector to the type the guest requested.
      for (const r of list) {
        if (r.status === 'pending' && r.ticketType && !this.picked[r.id]) {
          this.picked[r.id] = r.ticketType;
        }
      }
      if (this.auth.isOwner()) this.archived.set(await this.api.list(true));
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not load', false);
    } finally {
      this.loading.set(false);
    }
  }

  async restore(r: Reservation): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.restore(r.id);
      this.flash(`${r.name}'s reservation restored.`, true);
      await this.load();
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not restore', false);
    } finally {
      this.busy.set(false);
    }
  }

  async permanentDelete(r: Reservation): Promise<void> {
    if (!confirm(`Permanently delete ${r.name}'s reservation and its proof? This cannot be undone.`)) {
      return;
    }
    this.busy.set(true);
    try {
      await this.api.permanentDelete(r.id);
      this.flash(`${r.name}'s reservation deleted.`, true);
      await this.load();
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not delete', false);
    } finally {
      this.busy.set(false);
    }
  }

  async viewProof(r: Reservation): Promise<void> {
    this.opening.set(r.id);
    try {
      this.closeProof(); // revoke any previous object URL
      const { url, type } = await this.api.proofObjectUrl(r.id);
      this.proof.set({
        name: r.name,
        url,
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url),
        isImage: type.startsWith('image/'),
      });
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not open proof', false);
    } finally {
      this.opening.set(null);
    }
  }

  closeProof(): void {
    const p = this.proof();
    if (p) {
      URL.revokeObjectURL(p.url);
      this.proof.set(null);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeProof();
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
    if (!confirm(`Archive ${r.name}'s reservation? It moves to the archive and can be restored.`)) {
      return;
    }
    this.busy.set(true);
    try {
      await this.api.remove(r.id);
      this.flash(`${r.name}'s reservation archived.`, true);
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

  typeLabel(t: TicketType): string {
    return ticketTypeLabel(t);
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
