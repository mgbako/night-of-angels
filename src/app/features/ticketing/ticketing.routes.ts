import { Routes } from '@angular/router';
import { permissionGuard } from '../../admin/permission.guard';

/**
 * Un-chromed ticket pages.
 *   /tickets/confirm/:ticketCode  -> scanner check-in (needs the check-in permission)
 *   /tickets/:ticketCode          -> attendee ticket + QR (public)
 * `confirm` is declared first so it wins over the :ticketCode wildcard.
 */
export const TICKETING_ROUTES: Routes = [
  {
    path: 'confirm/:ticketCode',
    canActivate: [permissionGuard('checkin')],
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
