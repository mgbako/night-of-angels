import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../admin/services/auth.service';
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

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private auth: AuthService,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /** Headers for organizer-only endpoints. Returns 401 handling via guard(). */
  private authHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return { ...extra, ...this.auth.authHeader() };
  }

  private guard(res: Response): void {
    if (res.status === 401) this.auth.handleUnauthorized();
  }

  get appBaseUrl(): string {
    const base = environment.appBaseUrl || (this.isBrowser ? window.location.origin : '');
    return base.replace(/\/+$/, ''); // no trailing slash -> avoids //tickets
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
      const res = await fetch(API, { headers: this.authHeaders({ Accept: 'application/json' }) });
      this.guard(res);
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
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(dto),
    });
    this.guard(res);
    if (res.status === 409) {
      throw new ApiError(409, (await this.msg(res)) || 'An attendee with this email already exists');
    }
    if (!res.ok) throw new ApiError(res.status, (await this.msg(res)) || 'Could not register');
    const attendee = (await res.json()) as Attendee;
    await this.refresh();
    return attendee;
  }

  /** Marks checked-in. Requires the check-in permission. Throws 409 (payload = existing record) if already in. */
  async checkIn(ticketCode: string): Promise<Attendee> {
    const res = await fetch(`${API}/${encodeURIComponent(ticketCode)}/check-in`, {
      method: 'POST',
      headers: this.authHeaders(),
    });
    this.guard(res);
    if (res.status === 403) throw new ApiError(403, 'You do not have permission to check guests in');
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
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ checkedIn: value }),
    });
    this.guard(res);
    if (!res.ok) throw new ApiError(res.status, 'Update failed');
    const attendee = (await res.json()) as Attendee;
    await this.refresh();
    return attendee;
  }

  /** Assign / clear an attendee's table number. */
  async setTable(ticketCode: string, tableNumber: string): Promise<Attendee> {
    const res = await fetch(`${API}/${encodeURIComponent(ticketCode)}`, {
      method: 'PATCH',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ tableNumber }),
    });
    this.guard(res);
    if (!res.ok) throw new ApiError(res.status, 'Update failed');
    const attendee = (await res.json()) as Attendee;
    await this.refresh();
    return attendee;
  }

  /** Archive (soft-delete) an attendee — removes them from the active list. */
  async remove(ticketCode: string): Promise<void> {
    const res = await fetch(`${API}/${encodeURIComponent(ticketCode)}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    this.guard(res);
    if (!res.ok) throw new ApiError(res.status, 'Archive failed');
    await this.refresh();
  }

  /** List archived (soft-deleted) attendees — super admin (owner) only. */
  async archived(): Promise<Attendee[]> {
    const res = await fetch(`${API}?archived=1`, {
      headers: this.authHeaders({ Accept: 'application/json' }),
    });
    this.guard(res);
    if (!res.ok) throw new ApiError(res.status, 'Failed to load archive');
    return (await res.json()) as Attendee[];
  }

  /** Restore an archived attendee — owner only. */
  async restore(ticketCode: string): Promise<void> {
    const res = await fetch(`${API}/${encodeURIComponent(ticketCode)}`, {
      method: 'PATCH',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ restore: true }),
    });
    this.guard(res);
    if (!res.ok) throw new ApiError(res.status, (await this.msg(res)) || 'Restore failed');
    await this.refresh();
  }

  /** Permanently delete an attendee — owner only. */
  async permanentDelete(ticketCode: string): Promise<void> {
    const res = await fetch(`${API}/${encodeURIComponent(ticketCode)}?permanent=1`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    this.guard(res);
    if (!res.ok) throw new ApiError(res.status, (await this.msg(res)) || 'Delete failed');
  }

  /** Email the guest their ticket link. Returns the address it was sent to. */
  async emailTicket(ticketCode: string): Promise<string> {
    const res = await fetch(`${API}/${encodeURIComponent(ticketCode)}/email`, {
      method: 'POST',
      headers: this.authHeaders(),
    });
    this.guard(res);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, (body as { error?: string }).error || 'Email failed');
    return (body as { sentTo?: string }).sentTo ?? ticketCode;
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
