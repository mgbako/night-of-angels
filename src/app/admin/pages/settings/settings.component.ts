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
        <p>Set when early-bird pricing, ticket sales and reservations end.</p>
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
      });
      this.flash('Settings saved.', true);
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
