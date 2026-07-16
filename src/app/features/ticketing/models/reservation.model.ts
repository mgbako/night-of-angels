import { TicketType } from './attendee.model';

export type ReservationStatus = 'pending' | 'approved' | 'rejected';

export interface Reservation {
  id: string;
  name: string;
  phone: string;
  email: string;
  /** Ticket type the guest requested when reserving. Optional for records created before this field existed. */
  ticketType?: TicketType;
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
  ticketType: TicketType;
  proof: { name: string; type: string; dataBase64: string };
}

export type { TicketType };
