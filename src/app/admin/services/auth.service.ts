import { Inject, Injectable, PLATFORM_ID, computed, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

const LS_TOKEN = 'noa_admin_token_v1';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

/**
 * Client for the self-hosted auth API (/api/auth/*). Holds the JWT + current
 * user, restores the session on load, and exposes an Authorization header for
 * the ticketing API. Real enforcement happens server-side in the functions.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private isBrowser: boolean;

  readonly token = signal<string | null>(null);
  readonly user = signal<AuthUser | null>(null);
  readonly isAuthed = computed(() => !!this.token() && !this.isExpired(this.token()!));

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private router: Router,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      const saved = localStorage.getItem(LS_TOKEN);
      if (saved && !this.isExpired(saved)) {
        this.token.set(saved);
        this.user.set(this.decode(saved));
      } else if (saved) {
        localStorage.removeItem(LS_TOKEN);
      }
    }
  }

  authHeader(): Record<string, string> {
    const t = this.token();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  async login(email: string, password: string): Promise<void> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Login failed');
    this.token.set(body.token);
    this.user.set(body.user);
    if (this.isBrowser) localStorage.setItem(LS_TOKEN, body.token);
  }

  logout(navigate = true): void {
    this.token.set(null);
    this.user.set(null);
    if (this.isBrowser) localStorage.removeItem(LS_TOKEN);
    if (navigate) this.router.navigate(['/admin/login']);
  }

  /** Called by API clients when a request returns 401. */
  handleUnauthorized(): void {
    this.logout();
  }

  // ---------- team management ----------
  async listUsers(): Promise<AuthUser[]> {
    return this.request<AuthUser[]>('/api/auth/users');
  }

  async addUser(input: { name: string; email: string; password: string }): Promise<AuthUser> {
    return this.request<AuthUser>('/api/auth/users', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async removeUser(id: string): Promise<void> {
    await this.request(`/api/auth/users/${id}`, { method: 'DELETE' });
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...this.authHeader(), ...(init.headers || {}) },
    });
    if (res.status === 401) {
      this.handleUnauthorized();
      throw new Error('Session expired. Please sign in again.');
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as { error?: string }).error || 'Request failed');
    return body as T;
  }

  // ---------- token helpers ----------
  private decode(token: string): AuthUser | null {
    try {
      const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return { id: p.sub, name: p.name, email: p.email, role: p.role, createdAt: '' };
    } catch {
      return null;
    }
  }

  private isExpired(token: string): boolean {
    try {
      const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof p.exp !== 'number' || p.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
