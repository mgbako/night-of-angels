import { Component, afterNextRender, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import { EventSettingsService } from '../../../shared/event-settings.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [FormsModule, AdminIconComponent],
  template: `
    <div class="adm-page-head">
      <div>
        <h2>Settings</h2>
        <p>Set when early-bird pricing, ticket sales and reservations end — and put the site in maintenance mode.</p>
      </div>
    </div>

    @if (notice(); as n) {
      <div class="adm-notice" [class.adm-notice--err]="!n.ok">{{ n.msg }}</div>
    }

    @if (loading()) {
      <div class="adm-loading"><div class="adm-spinner"></div><p>Loading…</p></div>
    } @else {
      <div class="adm-card adm-card--pad set-card">
        <form class="adm-form" (ngSubmit)="save()" style="max-width:none">
          <div class="adm-field">
            <label for="s-early">Early bird ends</label>
            <input
              id="s-early"
              type="date"
              [(ngModel)]="earlyBird"
              name="earlyBird"
              (click)="openPicker($event)"
            />
            <span class="adm-hint">
              After this, the Couples ticket reverts to the regular ₦40,000.
              @if (svc.settings().earlyBirdEnds) {
                Currently: <b>{{ svc.isEarlyBird() ? 'early-bird active' : 'ended' }}</b>.
              } @else { Not set — early bird stays active. }
            </span>
          </div>

          <div class="adm-field">
            <label for="s-sales">Ticket sales end</label>
            <input
              id="s-sales"
              type="date"
              [(ngModel)]="ticketSales"
              name="ticketSales"
              (click)="openPicker($event)"
            />
            <span class="adm-hint">After this, ticket sales close.</span>
          </div>

          <div class="adm-field">
            <label for="s-res">Reservations end</label>
            <input
              id="s-res"
              type="date"
              [(ngModel)]="reservation"
              name="reservation"
              (click)="openPicker($event)"
            />
            <span class="adm-hint">
              After this, the reserve form closes. Reservations shut at the earlier
              of this and the ticket-sales date —
              <b>{{ svc.reservationsOpen() ? 'currently open' : 'currently closed' }}</b>.
            </span>
          </div>

          <div class="set-divider"></div>

          <div class="adm-field">
            <label class="set-check">
              <input type="checkbox" [(ngModel)]="maintenance" name="maintenance" />
              <span>Maintenance mode</span>
              <em class="set-badge" [class.set-badge--on]="maintenance">
                {{ maintenance ? 'ON — site hidden' : 'Off' }}
              </em>
            </label>
            <span class="adm-hint">
              When on, signed-out visitors see the coming-soon page below. Signed-in
              team members still see the full site, and everyone can still reach
              <b>/admin</b> to sign in.
            </span>
          </div>

          @if (maintenance) {
            <div class="adm-field">
              <label for="s-mtitle">Coming-soon heading</label>
              <input
                id="s-mtitle"
                type="text"
                [(ngModel)]="maintenanceTitle"
                name="maintenanceTitle"
                maxlength="120"
                placeholder="Coming Soon"
              />
            </div>
            <div class="adm-field">
              <label for="s-mmsg">Coming-soon message</label>
              <textarea
                id="s-mmsg"
                [(ngModel)]="maintenanceMessage"
                name="maintenanceMessage"
                rows="3"
                maxlength="600"
                placeholder="Something beautiful is on the way…"
              ></textarea>
              <span class="adm-hint">Leave blank to use the default wording.</span>
            </div>
          }

          @if (error()) { <p class="adm-error">{{ error() }}</p> }

          <div class="set-actions">
            <button type="submit" class="adm-btn adm-btn--primary" [disabled]="busy()">
              <adm-icon name="check" [size]="17" /> {{ busy() ? 'Saving…' : 'Save settings' }}
            </button>
            <button type="button" class="adm-btn" (click)="clearAll()" [disabled]="busy()">
              Clear all dates
            </button>
          </div>
        </form>
      </div>
    }
  `,
  styles: [
    `
      .set-card { max-width: 560px; }
      .set-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
      .adm-form input[type='date'] { color-scheme: light dark; cursor: pointer; }
      .set-divider {
        height: 1px;
        background: var(--adm-line, #e7e2d5);
        margin: 0.4rem 0 0.2rem;
      }
      .set-check {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        cursor: pointer;
        font-weight: 600;
        color: var(--adm-ink, #23201a);
      }
      .set-check input { width: 1.05rem; height: 1.05rem; accent-color: var(--adm-gold, #c9a227); }
      .set-badge {
        font-style: normal;
        font-size: 0.7rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--adm-muted, #8a8270);
        border: 1px solid var(--adm-line, #e7e2d5);
        border-radius: 999px;
        padding: 0.08rem 0.5rem;
      }
      .set-badge--on {
        color: #17140f;
        background: var(--adm-gold, #c9a227);
        border-color: transparent;
      }
      .adm-form textarea {
        padding: 0.7rem 0.8rem;
        border: 1px solid var(--adm-line, #e7e2d5);
        border-radius: 8px;
        background: var(--adm-surface, #fff);
        color: var(--adm-ink, #23201a);
        font: inherit;
        font-size: 0.9rem;
        resize: vertical;
      }
      .adm-form textarea:focus { outline: none; border-color: var(--adm-gold, #c9a227); }
    `,
  ],
})
export class SettingsComponent {
  protected svc = inject(EventSettingsService);

  loading = signal(true);
  busy = signal(false);
  error = signal<string | null>(null);
  notice = signal<{ msg: string; ok: boolean } | null>(null);

  earlyBird = '';
  ticketSales = '';
  reservation = '';
  maintenance = false;
  maintenanceTitle = '';
  maintenanceMessage = '';

  constructor() {
    afterNextRender(() => this.load());
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const s = await this.svc.load();
      this.earlyBird = this.toInput(s.earlyBirdEnds);
      this.ticketSales = this.toInput(s.ticketSalesEnd);
      this.reservation = this.toInput(s.reservationEnd);
      this.maintenance = s.maintenance;
      this.maintenanceTitle = s.maintenanceTitle;
      this.maintenanceMessage = s.maintenanceMessage;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load settings');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.svc.save({
        earlyBirdEnds: this.fromInput(this.earlyBird),
        ticketSalesEnd: this.fromInput(this.ticketSales),
        reservationEnd: this.fromInput(this.reservation),
        maintenance: this.maintenance,
        maintenanceTitle: this.maintenanceTitle.trim(),
        maintenanceMessage: this.maintenanceMessage.trim(),
      });
      // Reflect any server-side normalisation (e.g. defaults applied to blanks).
      this.maintenanceTitle = this.svc.settings().maintenanceTitle;
      this.maintenanceMessage = this.svc.settings().maintenanceMessage;
      this.flash(this.maintenance ? 'Saved — site is in maintenance mode.' : 'Settings saved.', true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not save settings');
    } finally {
      this.busy.set(false);
    }
  }

  clearAll(): void {
    this.earlyBird = this.ticketSales = this.reservation = '';
  }

  /** Open the native calendar when the field (not just the icon) is clicked. */
  openPicker(event: Event): void {
    const input = event.target as HTMLInputElement & { showPicker?: () => void };
    try {
      input.showPicker?.();
    } catch {
      // showPicker can throw if unsupported or not user-activated — the icon still works.
    }
  }

  /** ISO -> local "YYYY-MM-DD" for the date input. */
  private toInput(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /** "YYYY-MM-DD" -> ISO at the end of that local day (or null when empty). */
  private fromInput(value: string): string | null {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  private flash(msg: string, ok: boolean): void {
    this.notice.set({ msg, ok });
    setTimeout(() => this.notice.set(null), 4000);
  }
}
