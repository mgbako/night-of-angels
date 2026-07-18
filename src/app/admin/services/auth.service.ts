import { Inject, Injectable, PLATFORM_ID, computed, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import {
  Permission,
  Role,
  canManageAttendees,
  hasPermission,
  normalizeRole,
} from './permissions';

const LS_TOKEN = 'noa_admin_token_v1';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  deletedAt?: string | null;
}

/** Admin routes in priority order — used to pick a landing page per role. */
const ROUTE_PERMISSIONS: { path: string; perm: Permission }[] = [
  { path: '/admin', perm: 'dashboard' },
  { path: '/admin/attendees', perm: 'attendees' },
  { path: '/admin/reservations', perm: 'reservations' },
  { path: '/admin/register', perm: 'register' },
  { path: '/admin/tickets', perm: 'tickets' },
  { path: '/admin/team', perm: 'team' },
];

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
  readonly role = computed<Role>(() => normalizeRole(this.user()?.role));

  /** Does the signed-in user have access to a given module/view? */
  can(perm: Permission): boolean {
    return this.isAuthed() && hasPermission(this.role(), perm);
  }

  /** Ushers can view attendees but not mutate them. */
  canManageAttendees(): boolean {
    return this.isAuthed() && canManageAttendees(this.role());
  }

  /** The super admin — the only role that can restore or permanently delete. */
  isOwner(): boolean {
    return this.isAuthed() && this.role() === 'owner';
  }

  /** First admin route the current user is allowed to open. */
  landingRoute(): string {
    const match = ROUTE_PERMISSIONS.find((r) => this.can(r.perm));
    return match?.path ?? '/admin/account';
  }

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

  async addUser(input: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }): Promise<AuthUser> {
    return this.request<AuthUser>('/api/auth/users', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateUserRole(id: string, role: Role): Promise<void> {
    await this.request(`/api/auth/users/${id}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  /** Deactivate (soft-delete) a user — they can no longer sign in. */
  async removeUser(id: string): Promise<void> {
    await this.request(`/api/auth/users/${id}`, { method: 'DELETE' });
  }

  /** List deactivated users — owner only. */
  async listArchivedUsers(): Promise<AuthUser[]> {
    return this.request<AuthUser[]>('/api/auth/users?archived=1');
  }

  /** Reactivate a deactivated user — owner only. */
  async restoreUser(id: string): Promise<void> {
    await this.request(`/api/auth/users/${id}/restore`, { method: 'POST' });
  }

  /** Permanently delete a user account — owner only. */
  async permanentDeleteUser(id: string): Promise<void> {
    await this.request(`/api/auth/users/${id}?permanent=1`, { method: 'DELETE' });
  }

  async setUserPassword(id: string, password: string): Promise<void> {
    await this.request(`/api/auth/users/${id}/password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // ---------- password reset (public, no token) ----------
  async forgotPassword(email: string): Promise<void> {
    await fetch('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    // Always resolves — the endpoint never reveals whether the email exists.
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const res = await fetch('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body as { error?: string }).error || 'Reset failed');
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
      return { id: p.sub, name: p.name, email: p.email, role: normalizeRole(p.role), createdAt: '' };
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
