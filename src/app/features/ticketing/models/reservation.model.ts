import { DrinkPreference, Gender, SpecificDrink, TicketType } from './attendee.model';

export type ReservationStatus = 'pending' | 'approved' | 'rejected';

export interface Reservation {
  id: string;
  name: string;
  phone: string;
  email: string;
  /** Ticket type the guest requested when reserving. Optional for records created before this field existed. */
  ticketType?: TicketType;
  /** Optional for records created before this field existed. */
  gender?: Gender;
  drinkPreference?: DrinkPreference;
  specificDrink?: SpecificDrink;
  /** Second guest details, captured for Couples reservations. All optional. */
  partnerName?: string;
  partnerPhone?: string;
  partnerEmail?: string;
  partnerGender?: Gender;
  partnerDrinkPreference?: DrinkPreference;
  partnerSpecificDrink?: SpecificDrink;
  proofType: string;
  proofName: string;
  status: ReservationStatus;
  ticketCode?: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface ReservationDto {
  name: string;
  phone: string;
  email: string;
  ticketType: TicketType;
  gender: Gender;
  drinkPreference: DrinkPreference;
  specificDrink: SpecificDrink;
  partnerName?: string;
  partnerPhone?: string;
  partnerEmail?: string;
  partnerGender?: Gender;
  partnerDrinkPreference?: DrinkPreference;
  partnerSpecificDrink?: SpecificDrink;
  proof: { name: string; type: string; dataBase64: string };
}

export type { TicketType, Gender, DrinkPreference, SpecificDrink };
