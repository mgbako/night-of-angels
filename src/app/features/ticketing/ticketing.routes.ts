import { Routes } from '@angular/router';

/**
 * Public, un-chromed ticket pages.
 *   /tickets/confirm/:ticketCode  -> scanner check-in
 *   /tickets/:ticketCode          -> attendee ticket + QR
 * `confirm` is declared first so it wins over the :ticketCode wildcard.
 */
export const TICKETING_ROUTES: Routes = [
  {
    path: 'confirm/:ticketCode',
    loadComponent: () =>
      import('./pages/confirm/confirm.component').then((m) => m.ConfirmComponent),
    title: 'Check-in — A Night of Angels',
  },
  {
    path: ':ticketCode',
    loadComponent: () =>
      import('./pages/ticket-detail/ticket-detail.component').then((m) => m.TicketDetailComponent),
    title: 'Your Ticket — A Night of Angels',
  },
];
