import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../admin/services/auth.service';
import { Attendee, TicketType } from '../models/attendee.model';
import { Reservation, ReservationDto } from '../models/reservation.model';

const API = '/api/reservations';

@Injectable({ providedIn: 'root' })
export class ReservationApiService {
  private auth = inject(AuthService);

  /** Public — submit a self-reservation with proof of payment. */
  async create(dto: ReservationDto): Promise<void> {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as { error?: string }).error || 'Could not submit reservation');
  }

  /** Organizer — list reservations. Pass archived to list soft-deleted ones (owner only). */
  async list(archived = false): Promise<Reservation[]> {
    const res = await fetch(archived ? `${API}?archived=1` : API, {
      headers: this.auth.authHeader(),
    });
    if (res.status === 401) {
      this.auth.handleUnauthorized();
      throw new Error('Session expired');
    }
    if (!res.ok) throw new Error('Could not load reservations');
    return (await res.json()) as Reservation[];
  }

  /** Fetch the proof file (with auth) as an object URL + its content type. */
  async proofObjectUrl(id: string): Promise<{ url: string; type: string }> {
    const res = await fetch(`${API}/${id}/proof`, { headers: this.auth.authHeader() });
    if (res.status === 401) {
      this.auth.handleUnauthorized();
      throw new Error('Session expired');
    }
    if (!res.ok) throw new Error('Could not load proof');
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), type: blob.type };
  }

  async approve(id: string, ticketType: TicketType): Promise<Attendee> {
    const res = await fetch(`${API}/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.auth.authHeader() },
      body: JSON.stringify({ ticketType }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as { error?: string }).error || 'Could not approve');
    return (body as { attendee: Attendee }).attendee;
  }

  /** Archive (soft-delete) a reservation. Keeps the record + proof. */
  async remove(id: string): Promise<void> {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: this.auth.authHeader() });
    if (!res.ok) throw new Error('Could not archive reservation');
  }

  /** Restore an archived reservation — owner only. */
  async restore(id: string): Promise<void> {
    const res = await fetch(`${API}/${id}/restore`, {
      method: 'POST',
      headers: this.auth.authHeader(),
    });
    if (!res.ok) throw new Error('Could not restore reservation');
  }

  /** Permanently delete a reservation and its proof — owner only. */
  async permanentDelete(id: string): Promise<void> {
    const res = await fetch(`${API}/${id}?permanent=1`, {
      method: 'DELETE',
      headers: this.auth.authHeader(),
    });
    if (!res.ok) throw new Error('Could not delete reservation');
  }
}
