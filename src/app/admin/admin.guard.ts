import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

/**
 * Gate admin routes behind a valid session. During prerender (no browser)
 * allow render so the static shell is produced; the real check runs client-side.
 */
export const adminGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthed() ? true : router.createUrlTree(['/admin/login']);
};
