import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'A Night of Angels | All-White Luxury Dinner Experience · Lagos',
  },
  {
    path: 'gallery',
    // Lazily loaded so the heavier gallery view never weighs down the landing page.
    loadComponent: () =>
      import('./pages/gallery/gallery-page.component').then((m) => m.GalleryPageComponent),
    title: 'Gallery — A Night of Angels | Moments From Past Editions',
  },
  {
    path: 'sponsor',
    loadComponent: () =>
      import('./pages/sponsor/sponsor-page.component').then((m) => m.SponsorPageComponent),
    title: 'Partner With Us — A Night of Angels | Sponsorship',
  },
  {
    path: 'reserve',
    loadComponent: () =>
      import('./features/ticketing/pages/reserve/reserve.component').then(
        (m) => m.ReserveComponent,
      ),
    title: 'Reserve Your Seat — A Night of Angels',
  },
  {
    path: 'tickets',
    loadChildren: () =>
      import('./features/ticketing/ticketing.routes').then((m) => m.TICKETING_ROUTES),
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
