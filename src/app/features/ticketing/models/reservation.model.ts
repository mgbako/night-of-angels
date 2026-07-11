import { TicketType } from './attendee.model';

export type ReservationStatus = 'pending' | 'approved' | 'rejected';

export interface Reservation {
  id: string;
  name: string;
  phone: string;
  email: string;
  proofType: string;
  proofName: string;
  status: ReservationStatus;
  ticketCode?: string;
  createdAt: string;
}

export interface ReservationDto {
  name: string;
  phone: string;
  email: string;
  proof: { name: string; type: string; dataBase64: string };
}

export type { TicketType };
