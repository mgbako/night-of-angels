import { Injectable, computed, signal } from '@angular/core';
import { DEFAULT_PARTNERS, Partner } from '../config/sponsor.config';

/**
 * Public read of the sponsors/partners managed in the back office.
 *
 * The signal is seeded with DEFAULT_PARTNERS so the statically prerendered home
 * and sponsor pages render the confirmed partners with no network call; on the
 * browser, load() refreshes from /api/partners so back-office edits show up
 * without a redeploy.
 */
@Injectable({ providedIn: 'root' })
export class PartnersService {
  readonly partners = signal<Partner[]>(DEFAULT_PARTNERS);

  /** Only the enabled partners — what the public site should ever show. */
  readonly visible = computed(() => this.partners().filter((p) => p.enabled !== false));

  /** The headline title sponsor, if one is enabled. */
  readonly titleSponsor = computed(() => this.visible().find((p) => p.tier === 'title') ?? null);

  /** Everyone except the title sponsor — shown in the supporting logo row. */
  readonly supporting = computed(() => this.visible().filter((p) => p.tier !== 'title'));

  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const res = await fetch('/api/partners', { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const list = (await res.json()) as Partner[];
      if (Array.isArray(list) && list.length) this.partners.set(list);
    } catch {
      // Keep the seeded defaults on any network/endpoint error.
    }
  }
}
