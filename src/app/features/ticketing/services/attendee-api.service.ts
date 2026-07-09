import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { Attendee, RegisterDto, TicketType } from '../models/attendee.model';

const LS_KEY = 'noa_attendees_v1';

/**
 * Error mirroring an HTTP failure so pages can branch on `status`
 * exactly as they would against the real API.
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
 * MOCK ticketing API. In-memory store seeded on first run and persisted to
 * localStorage. Async + latency so it behaves like a network call.
 *
 * Endpoints mirrored:
 *   POST   /api/attendees                -> register()
 *   GET    /api/attendees                -> list()
 *   GET    /api/attendees/:ticketCode    -> getByCode()
 *   POST   /api/attendees/:ticketCode/check-in -> checkIn()
 *
 * TO GO LIVE: replace the bodies below with HttpClient calls to the real
 * backend. The signatures and the `attendees` signal stay the same.
 */
@Injectable({ providedIn: 'root' })
export class AttendeeApiService {
  private isBrowser: boolean;
  private store = signal<Attendee[]>([]);

  /** Live view of all attendees (for list pages / dashboards). */
  readonly attendees = this.store.asReadonly();

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) this.load();
  }

  /** Absolute base URL for QR/ticket links (env var, then window origin). */
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

  // ---------- "endpoints" ----------
  async list(): Promise<Attendee[]> {
    await this.delay();
    return this.store();
  }

  async getByCode(ticketCode: string): Promise<Attendee> {
    await this.delay();
    const found = this.find(ticketCode);
    if (!found) throw new ApiError(404, 'Ticket not found');
    return found;
  }

  async register(dto: RegisterDto): Promise<Attendee> {
    await this.delay();
    const email = dto.email.trim().toLowerCase();
    if (this.store().some((a) => a.email.toLowerCase() === email)) {
      throw new ApiError(409, 'An attendee with this email already exists');
    }
    const attendee: Attendee = {
      id: this.uuid(),
      name: dto.name.trim(),
      email: dto.email.trim(),
      phone: dto.phone.trim(),
      ticketType: dto.ticketType,
      ticketCode: this.uniqueCode(),
      checkedIn: false,
      checkedInAt: null,
      createdAt: new Date().toISOString(),
    };
    this.store.update((list) => [attendee, ...list]);
    this.persist();
    return attendee;
  }

  /** Marks checked-in. Throws 409 (with the existing record) if already in. */
  async checkIn(ticketCode: string): Promise<Attendee> {
    await this.delay();
    const found = this.find(ticketCode);
    if (!found) throw new ApiError(404, 'Ticket not found');
    if (found.checkedIn) {
      throw new ApiError(409, 'This ticket has already been checked in', found);
    }
    const updated: Attendee = {
      ...found,
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
    };
    this.replace(updated);
    return updated;
  }

  /** Organizer override: set check-in state directly (used in the admin table). */
  async setCheckIn(id: string, value: boolean): Promise<Attendee> {
    await this.delay(150);
    const found = this.store().find((a) => a.id === id);
    if (!found) throw new ApiError(404, 'Ticket not found');
    const updated: Attendee = {
      ...found,
      checkedIn: value,
      checkedInAt: value ? found.checkedInAt ?? new Date().toISOString() : null,
    };
    this.replace(updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.delay();
    this.store.update((list) => list.filter((a) => a.id !== id));
    this.persist();
  }

  /** Dev helper: wipe + reseed. */
  resetToSeed(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(LS_KEY);
    this.load();
  }

  // ---------- internals ----------
  private find(ticketCode: string): Attendee | undefined {
    const code = ticketCode.trim().toLowerCase();
    return this.store().find((a) => a.ticketCode.toLowerCase() === code);
  }

  private replace(attendee: Attendee): void {
    this.store.update((list) => list.map((a) => (a.id === attendee.id ? attendee : a)));
    this.persist();
  }

  private persist(): void {
    if (this.isBrowser) localStorage.setItem(LS_KEY, JSON.stringify(this.store()));
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(LS_KEY);
      this.store.set(raw ? (JSON.parse(raw) as Attendee[]) : seed());
    } catch {
      this.store.set(seed());
    }
    if (!localStorage.getItem(LS_KEY)) this.persist();
  }

  private delay(ms = 300): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private uuid(): string {
    if (this.isBrowser && 'randomUUID' in crypto) return crypto.randomUUID();
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  private uniqueCode(): string {
    let code = genCode();
    const existing = new Set(this.store().map((a) => a.ticketCode));
    while (existing.has(code)) code = genCode();
    return code;
  }
}

// 8-char, unambiguous uppercase alphanumeric (no 0/O/1/I).
function genCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function seed(): Attendee[] {
  const day = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
  const rows: Array<[string, string, string, TicketType, boolean, number]> = [
    ['Adaeze Okafor', 'adaeze.okafor@example.com', '+2348031112233', 'SINGLES', true, 2],
    ['Emeka Nwosu', 'emeka.nwosu@example.com', '08024567788', 'COUPLES', false, 3],
    ['Blessing Adeyemi', 'blessing.a@example.com', '+2348069901122', 'SINGLES', false, 5],
    ['Chinedu Balogun', 'chinedu.b@example.com', '08092234455', 'TABLE', false, 6],
    ['Funke Alabi', 'funke.alabi@example.com', '+2348056678899', 'SINGLES', false, 1],
    ['Ibrahim Sanni', 'ibrahim.sanni@example.com', '08073345566', 'COUPLES', true, 8],
    ['Tunde Bakare', 'tunde.bakare@example.com', '+2348134456677', 'SINGLES', false, 4],
    ['Amara Obi', 'amara.obi@example.com', '08151123344', 'COUPLES', false, 0],
    ['Yusuf Danjuma', 'yusuf.d@example.com', '+2348165567788', 'TABLE', true, 7],
    ['Grace Uche', 'grace.uche@example.com', '08189902211', 'SINGLES', false, 2],
  ];
  const codes = ['NOA23AB7', 'K9M4PQZ2', 'TBLX82HJ', 'RSVP5KQ9', 'ANG3LS88', 'H7J2K9MN', 'PQ4R8TZX', 'B3N7M2KP', 'ZX9K2J4H', 'GRC5UCH2'];
  return rows.map(([name, email, phone, ticketType, checkedIn, d], i) => ({
    id: `att_seed_${i}`,
    name,
    email,
    phone,
    ticketType,
    ticketCode: codes[i],
    checkedIn,
    checkedInAt: checkedIn ? day(d === 0 ? 0 : d - 0.2) : null,
    createdAt: day(d),
  }));
}
