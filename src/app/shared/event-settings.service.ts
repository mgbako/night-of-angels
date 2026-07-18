import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../admin/services/auth.service';

export interface EventSettings {
  earlyBirdEnds: string | null;
  ticketSalesEnd: string | null;
  reservationEnd: string | null;
}

const EMPTY: EventSettings = {
  earlyBirdEnds: null,
  ticketSalesEnd: null,
  reservationEnd: null,
};

/**
 * Reads the organiser-set deadlines from /api/settings (public GET) and exposes
 * derived flags used across the public site (early-bird pricing, reserve open/
 * closed). The admin Settings page uses `save()` (owner-only on the server).
 */
@Injectable({ providedIn: 'root' })
export class EventSettingsService {
  private auth = inject(AuthService);

  readonly settings = signal<EventSettings>(EMPTY);
  readonly loaded = signal(false);

  /** Early bird is active while its deadline is unset or still in the future. */
  readonly isEarlyBird = computed(() => !this.isPast(this.settings().earlyBirdEnds));

  /** Reservations are open until the earlier of the two closing dates passes. */
  readonly reservationsOpen = computed(() => {
    const s = this.settings();
    return !this.isPast(s.ticketSalesEnd) && !this.isPast(s.reservationEnd);
  });

  async load(): Promise<EventSettings> {
    try {
      const res = await fetch('/api/settings', { headers: { Accept: 'application/json' } });
      if (res.ok) this.settings.set(this.coerce(await res.json()));
    } catch {
      // Offline or endpoint unavailable — keep defaults (everything open).
    } finally {
      this.loaded.set(true);
    }
    return this.settings();
  }

  async save(next: EventSettings): Promise<void> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.auth.authHeader() },
      body: JSON.stringify(next),
    });
    if (res.status === 401) {
      this.auth.handleUnauthorized();
      throw new Error('Session expired. Please sign in again.');
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as { error?: string }).error || 'Could not save settings');
    this.settings.set(this.coerce(body));
  }

  private coerce(v: unknown): EventSettings {
    const d = (v ?? {}) as Partial<EventSettings>;
    return {
      earlyBirdEnds: d.earlyBirdEnds ?? null,
      ticketSalesEnd: d.ticketSalesEnd ?? null,
      reservationEnd: d.reservationEnd ?? null,
    };
  }

  private isPast(iso: string | null): boolean {
    return !!iso && Date.parse(iso) < Date.now();
  }
}
