import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { Partner } from '../../config/sponsor.config';

const API = '/api/partners';

/**
 * Back-office CRUD for sponsors/partners. Writes require the `sponsors`
 * permission (enforced server-side). The public site reads the same list via
 * PartnersService.
 */
@Injectable({ providedIn: 'root' })
export class PartnerAdminService {
  private auth = inject(AuthService);

  readonly partners = signal<Partner[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { ...extra, ...this.auth.authHeader() };
  }

  private guard(res: Response): void {
    if (res.status === 401) this.auth.handleUnauthorized();
  }

  private async errMsg(res: Response, fallback: string): Promise<string> {
    try {
      return ((await res.json()) as { error?: string }).error || fallback;
    } catch {
      return fallback;
    }
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const res = await fetch(API, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('load failed');
      this.partners.set((await res.json()) as Partner[]);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async create(input: Omit<Partner, 'id'>): Promise<void> {
    const res = await fetch(API, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(input),
    });
    this.guard(res);
    if (!res.ok) throw new Error(await this.errMsg(res, 'Could not add partner'));
    await this.refresh();
  }

  async update(id: string, patch: Partial<Partner>): Promise<void> {
    const res = await fetch(`${API}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(patch),
    });
    this.guard(res);
    if (!res.ok) throw new Error(await this.errMsg(res, 'Could not save partner'));
    await this.refresh();
  }

  async remove(id: string): Promise<void> {
    const res = await fetch(`${API}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    this.guard(res);
    if (!res.ok) throw new Error(await this.errMsg(res, 'Could not remove partner'));
    await this.refresh();
  }

  /** Persist a new display order (array of ids). Optimistically updates locally. */
  async reorder(ids: string[]): Promise<void> {
    const current = this.partners();
    const byId = new Map(current.map((p) => [p.id, p]));
    this.partners.set(ids.map((i) => byId.get(i)!).filter(Boolean));
    const res = await fetch(`${API}/reorder`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ids }),
    });
    this.guard(res);
    if (!res.ok) {
      this.partners.set(current); // revert on failure
      throw new Error(await this.errMsg(res, 'Could not reorder'));
    }
    this.partners.set((await res.json()) as Partner[]);
  }
}
