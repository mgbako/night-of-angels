import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { Attendee, RegisterDto } from '../models/attendee.model';

const API = '/api/attendees';

/**
 * Error mirroring an HTTP failure so pages can branch on `status`.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Ticketing API client. Talks to the Netlify Function at /api/attendees, which
 * is backed by Netlify Blobs — so data is shared across every device.
 *
 * Local dev: run `netlify dev` (not `npm start`) so the function is served.
 */
@Injectable({ providedIn: 'root' })
export class AttendeeApiService {
  private isBrowser: boolean;

  /** Live cache of all attendees (for list pages / dashboards). */
  readonly attendees = signal<Attendee[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get appBaseUrl(): string {
    if (environment.appBaseUrl) return environment.appBaseUrl;
    return this.isBrowser ? window.location.origin : '';
  }

  checkInUrl(ticketCode: string): string {
    return `${this.appBaseUrl}/tickets/confirm/${ticketCode}`;
  }

  ticketUrl(ticketCode: string): string {
    return `${this.appBaseUrl}/tickets/${ticketCode}`;
  }

  // ---------- endpoints ----------
  async list(): Promise<Attendee[]> {
    return this.refresh();
  }

  /** Fetch the full list into the `attendees` signal. */
  async refresh(): Promise<Attendee[]> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const res = await fetch(API, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new ApiError(res.status, 'Failed to load attendees');
      const list = (await res.json()) as Attendee[];
      this.attendees.set(list);
      return list;
    } catch (e) {
      this.loadError.set(true);
      throw this.asApiError(e);
    } finally {
      this.loading.set(false);
    }
  }

  async getByCode(ticketCode: string): Promise<Attendee> {
    const res = await fetch(`${API}/${encodeURIComponent(ticketCode)}`);
    if (res.status === 404) throw new ApiError(404, 'Ticket not found');
    if (!res.ok) throw new ApiError(res.status, 'Failed to load ticket');
    return (await res.json()) as Attendee;
  }

  async register(dto: RegisterDto): Promise<Attendee> {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (res.status === 409) {
      throw new ApiError(409, (await this.msg(res)) || 'An attendee with this email already exists');
    }
    if (!res.ok) throw new ApiError(res.status, (await this.msg(res)) || 'Could not register');
    const attendee = (await res.json()) as Attendee;
    await this.refresh();
    return attendee;
  }

  /** Marks checked-in. Throws 409 (payload = existing record) if already in. */
  async checkIn(ticketCode: string): Promise<Attendee> {
    const res = await fetch(`${API}/${encodeURIComponent(ticketCode)}/check-in`, {
      method: 'POST',
    });
    if (res.status === 404) throw new ApiError(404, 'Ticket not found');
    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(409, body.error ?? 'Already checked in', body.attendee);
    }
    if (!res.ok) throw new ApiError(res.status, 'Check-in failed');
    return (await res.json()) as Attendee;
  }

  /** Organizer override used by the admin table. */
  async setCheckIn(ticketCode: string, value: boolean): Promise<Attendee> {
    const res = await fetch(`${API}/${encodeURIComponent(ticketCode)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkedIn: value }),
    });
    if (!res.ok) throw new ApiError(res.status, 'Update failed');
    const attendee = (await res.json()) as Attendee;
    await this.refresh();
    return attendee;
  }

  async remove(ticketCode: string): Promise<void> {
    const res = await fetch(`${API}/${encodeURIComponent(ticketCode)}`, { method: 'DELETE' });
    if (!res.ok) throw new ApiError(res.status, 'Delete failed');
    await this.refresh();
  }

  private async msg(res: Response): Promise<string> {
    try {
      return ((await res.json()) as { error?: string }).error ?? '';
    } catch {
      return '';
    }
  }

  private asApiError(e: unknown): ApiError {
    return e instanceof ApiError ? e : new ApiError(0, 'Network error');
  }
}
