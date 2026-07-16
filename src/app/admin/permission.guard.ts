import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Permission } from './services/permissions';

/**
 * Gate a route behind a specific permission. Unauthenticated users go to the
 * login page (with a returnUrl); authenticated users lacking the permission are
 * redirected to the first module they *can* open. During prerender (no browser)
 * we allow the render so the static shell is produced; the real check runs
 * client-side. The server also enforces every action independently.
 */
export function permissionGuard(perm: Permission): CanActivateFn {
  return (_route, state) => {
    const platformId = inject(PLATFORM_ID);
    if (!isPlatformBrowser(platformId)) return true;

    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthed()) {
      return router.createUrlTree(['/admin/login'], {
        queryParams: { returnUrl: state.url },
      });
    }
    if (auth.can(perm)) return true;
    return router.createUrlTree([auth.landingRoute()]);
  };
}
