import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';

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
      import('./pages/gallery-page.component').then((m) => m.GalleryPageComponent),
    title: 'Gallery — A Night of Angels | Moments From Past Editions',
  },
  {
    path: 'sponsor',
    loadComponent: () =>
      import('./pages/sponsor-page.component').then((m) => m.SponsorPageComponent),
    title: 'Partner With Us — A Night of Angels | Sponsorship',
  },
  { path: '**', redirectTo: '' },
];
