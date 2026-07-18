import { Routes } from '@angular/router';
import { adminGuard } from './admin.guard';
import { permissionGuard } from './permission.guard';
import { LoginComponent } from './login/login.component';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';

export const ADMIN_ROUTES: Routes = [
  { path: 'login', component: LoginComponent, title: 'Sign in — Back Office' },
  {
    path: 'forgot',
    loadComponent: () => import('./login/forgot.component').then((m) => m.ForgotComponent),
    title: 'Reset password — Back Office',
  },
  {
    path: 'reset',
    loadComponent: () => import('./login/reset.component').then((m) => m.ResetComponent),
    title: 'Reset password — Back Office',
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        canActivate: [permissionGuard('dashboard')],
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Dashboard — Back Office',
      },
      {
        path: 'attendees',
        canActivate: [permissionGuard('attendees')],
        loadComponent: () =>
          import('./pages/attendees/attendees.component').then((m) => m.AttendeesComponent),
        title: 'Attendees — Back Office',
      },
      {
        path: 'reservations',
        canActivate: [permissionGuard('reservations')],
        loadComponent: () =>
          import('./pages/reservations/reservations.component').then(
            (m) => m.ReservationsComponent,
          ),
        title: 'Reservations — Back Office',
      },
      {
        path: 'register',
        canActivate: [permissionGuard('register')],
        loadComponent: () =>
          import('./pages/register/register.component').then((m) => m.RegisterComponent),
        title: 'Register — Back Office',
      },
      {
        path: 'tickets',
        canActivate: [permissionGuard('tickets')],
        loadComponent: () =>
          import('./pages/tickets/tickets.component').then((m) => m.TicketsComponent),
        title: 'Ticketing — Back Office',
      },
      {
        path: 'tables',
        canActivate: [permissionGuard('attendees')],
        loadComponent: () =>
          import('./pages/tables/tables.component').then((m) => m.TablesComponent),
        title: 'Tables — Back Office',
      },
      {
        path: 'promote',
        canActivate: [permissionGuard('reservations')],
        loadComponent: () =>
          import('./pages/promote/promote.component').then((m) => m.PromoteComponent),
        title: 'Promote — Back Office',
      },
      {
        path: 'team',
        canActivate: [permissionGuard('team')],
        loadComponent: () =>
          import('./pages/team/team.component').then((m) => m.TeamComponent),
        title: 'Team — Back Office',
      },
      {
        path: 'settings',
        canActivate: [permissionGuard('settings')],
        loadComponent: () =>
          import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
        title: 'Settings — Back Office',
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./pages/account/account.component').then((m) => m.AccountComponent),
        title: 'Account — Back Office',
      },
    ],
  },
];
