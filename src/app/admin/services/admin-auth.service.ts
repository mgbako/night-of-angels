import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const LS_KEY = 'noa_admin_authed_v1';

/**
 * PLACEHOLDER admin auth. A single shared passcode gates the back office
 * client-side only — good enough for a private demo, NOT real security.
 *
 * Before launch, replace with server-enforced auth (Netlify Identity, or
 * your Express backend issuing a session/JWT). Never rely on client-side
 * gating for anything sensitive.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  // PLACEHOLDER passcode — change this, and move off client-side auth for prod.
  private readonly passcode = 'angels2026';

  private isBrowser: boolean;
  readonly isAuthed = signal(false);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.isAuthed.set(sessionStorageSafe(() => sessionStorage.getItem(LS_KEY) === '1'));
    }
  }

  login(passcode: string): boolean {
    const ok = passcode.trim() === this.passcode;
    if (ok) {
      this.isAuthed.set(true);
      if (this.isBrowser) sessionStorageSafe(() => sessionStorage.setItem(LS_KEY, '1'));
    }
    return ok;
  }

  logout(): void {
    this.isAuthed.set(false);
    if (this.isBrowser) sessionStorageSafe(() => sessionStorage.removeItem(LS_KEY));
  }
}

function sessionStorageSafe<T>(fn: () => T): T | false {
  try {
    return fn();
  } catch {
    return false;
  }
}
