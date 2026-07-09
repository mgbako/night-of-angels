import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from './services/admin-auth.service';

/**
 * Gate admin routes behind the passcode. During prerender (no browser)
 * allow render so the static shell is produced; the real check runs client-side.
 */
export const adminGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const auth = inject(AdminAuthService);
  const router = inject(Router);
  return auth.isAuthed() ? true : router.createUrlTree(['/admin/login']);
};
