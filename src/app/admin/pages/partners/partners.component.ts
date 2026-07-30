import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import { PartnerAdminService } from '../../services/partner-admin.service';
import { Partner, PartnerTier, partnerLogoSrc } from '../../../config/sponsor.config';

interface TierOption {
  value: PartnerTier;
  label: string;
}

@Component({
  selector: 'app-admin-partners',
  standalone: true,
  imports: [FormsModule, AdminIconComponent],
  template: `
    <div class="adm-page-head">
      <div>
        <h2>Sponsors</h2>
        <p>The partners shown on the home page and sponsor page. Changes go live immediately.</p>
      </div>
      <div>
        <button class="adm-btn adm-btn--primary" (click)="openAdd()" [disabled]="formOpen()">
          <adm-icon name="register" [size]="17" /> Add sponsor
        </button>
      </div>
    </div>

    @if (notice(); as n) {
      <div class="adm-notice" [class.adm-notice--err]="!n.ok">{{ n.msg }}</div>
    }

    @if (formOpen()) {
      <div class="adm-card adm-card--pad sp-editor">
        <h3>{{ editingId() ? 'Edit sponsor' : 'Add sponsor' }}</h3>
        <div class="sp-grid">
          <div class="adm-field">
            <label for="sp-name">Name</label>
            <input id="sp-name" type="text" [(ngModel)]="draft.name" maxlength="120" placeholder="AfriChange" />
          </div>
          <div class="adm-field">
            <label for="sp-tier">Tier</label>
            <select id="sp-tier" [(ngModel)]="draft.tier">
              @for (t of tierOptions; track t.value) {
                <option [value]="t.value">{{ t.label }}</option>
              }
            </select>
          </div>
          <div class="adm-field sp-col-2">
            <label for="sp-role">Role</label>
            <input
              id="sp-role"
              type="text"
              [(ngModel)]="draft.role"
              maxlength="160"
              placeholder="Title Sponsor & Official Payment Partner"
            />
          </div>
          <div class="adm-field sp-col-2">
            <label for="sp-logo">Logo image URL or asset path</label>
            <input
              id="sp-logo"
              type="text"
              [(ngModel)]="draft.logo"
              maxlength="500"
              placeholder="partners/africhange.svg  ·  or  https://…/logo.png"
            />
            <span class="adm-hint">
              Point to an uploaded image URL, or an existing file in
              <b>/public/partners</b> (e.g. <code>partners/africhange.svg</code>).
            </span>
          </div>
          <div class="adm-field sp-col-2">
            <label for="sp-url">Website (optional)</label>
            <input id="sp-url" type="url" [(ngModel)]="draft.url" maxlength="500" placeholder="https://www.africhange.com" />
            <span class="adm-hint">When set, the logo links here (opens in a new tab).</span>
          </div>
          @if (draft.logo) {
            <div class="sp-preview sp-col-2">
              <span>Preview</span>
              <img [src]="src(draft.logo)" [alt]="draft.name || 'logo preview'" />
            </div>
          }
        </div>
        @if (error()) { <p class="adm-error">{{ error() }}</p> }
        <div class="sp-editor__actions">
          <button class="adm-btn adm-btn--primary" (click)="save()" [disabled]="busy()">
            <adm-icon name="check" [size]="16" /> {{ busy() ? 'Saving…' : 'Save' }}
          </button>
          <button class="adm-btn" (click)="cancel()" [disabled]="busy()">Cancel</button>
        </div>
      </div>
    }

    @if (loading() && !partners().length) {
      <div class="adm-loading"><div class="adm-spinner"></div><p>Loading sponsors…</p></div>
    } @else if (loadError()) {
      <div class="adm-empty">
        <adm-icon name="alert" [size]="28" />
        <p style="margin:.5rem 0">Couldn’t load sponsors.</p>
        <button class="adm-btn adm-btn--sm" (click)="reload()">Retry</button>
      </div>
    } @else {
      <div class="sp-list">
        @for (p of partners(); track p.id; let i = $index) {
          <div
            class="sp-row"
            [class.sp-row--title]="p.tier === 'title'"
            [class.sp-row--off]="p.enabled === false"
          >
            <div class="sp-row__order">
              <button
                class="adm-btn adm-btn--sm adm-btn--ghost"
                (click)="move(i, -1)"
                [disabled]="i === 0 || busy()"
                aria-label="Move up"
              >↑</button>
              <button
                class="adm-btn adm-btn--sm adm-btn--ghost"
                (click)="move(i, 1)"
                [disabled]="i === partners().length - 1 || busy()"
                aria-label="Move down"
              >↓</button>
            </div>
            <div class="sp-row__logo"><img [src]="src(p.logo)" [alt]="p.name" /></div>
            <div class="sp-row__meta">
              <strong>
                {{ p.name }}
                @if (p.enabled === false) { <span class="sp-hidden-badge">Hidden</span> }
              </strong>
              <span class="sp-row__role">{{ p.role }}</span>
              @if (p.url) {
                <a class="sp-row__url" [href]="p.url" target="_blank" rel="noopener">
                  <adm-icon name="external" [size]="13" /> {{ p.url }}
                </a>
              } @else {
                <span class="sp-row__url sp-row__url--none">No website link</span>
              }
            </div>
            <span class="sp-tier sp-tier--{{ p.tier }}">{{ tierLabel(p.tier) }}</span>
            <div class="sp-row__actions">
              <button
                class="sp-toggle"
                [class.sp-toggle--on]="p.enabled !== false"
                role="switch"
                [attr.aria-checked]="p.enabled !== false"
                [attr.aria-label]="(p.enabled !== false ? 'Hide ' : 'Show ') + p.name + ' on the site'"
                [title]="p.enabled !== false ? 'Shown on site — click to hide' : 'Hidden — click to show'"
                (click)="toggleEnabled(p)"
                [disabled]="busy()"
              >
                <span class="sp-toggle__knob"></span>
              </button>
              <button class="adm-btn adm-btn--sm" (click)="openEdit(p)" [disabled]="busy()">
                Edit
              </button>
              <button
                class="adm-btn adm-btn--sm adm-btn--danger"
                (click)="del(p)"
                [disabled]="busy()"
                aria-label="Remove sponsor"
              >
                <adm-icon name="trash" [size]="15" />
              </button>
            </div>
          </div>
        } @empty {
          <div class="adm-empty">
            <adm-icon name="attendees" [size]="28" />
            <p style="margin-top:.5rem">No sponsors yet. Add your first partner.</p>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .sp-editor h3 { margin: 0 0 1rem; font-size: 1.1rem; color: #23201a; }
      .sp-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem 1.2rem;
      }
      .sp-col-2 { grid-column: 1 / -1; }
      .sp-editor__actions { display: flex; gap: 0.6rem; margin-top: 1.2rem; }
      .sp-preview {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.2rem;
        background: #f6f1e7;
        border: 1px solid #e7e2d5;
        border-radius: 8px;
      }
      .sp-preview span {
        font-size: 0.7rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #8a8270;
      }
      .sp-preview img { height: 48px; width: auto; object-fit: contain; }
      code { font-size: 0.85em; background: rgba(0,0,0,.05); padding: 0 .2em; border-radius: 3px; }

      .sp-list { display: flex; flex-direction: column; gap: 0.7rem; margin-top: 1rem; }
      .sp-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.8rem 1rem;
        background: #fff;
        border: 1px solid #e7e2d5;
        border-radius: 10px;
      }
      .sp-row--title { border-color: rgba(94, 53, 217, 0.35); border-left: 3px solid #5e35d9; }
      .sp-row__order { display: flex; flex-direction: column; gap: 0.2rem; }
      .sp-row__order button { padding: 0.1rem 0.5rem; line-height: 1.2; }
      .sp-row__logo {
        width: 92px;
        min-width: 92px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f6f1e7;
        border-radius: 6px;
      }
      .sp-row__logo img { max-height: 40px; max-width: 84px; object-fit: contain; }
      .sp-row__meta { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; min-width: 0; }
      .sp-row__meta strong { color: #23201a; }
      .sp-row__role { font-size: 0.82rem; color: #6a6354; }
      .sp-row__url {
        font-size: 0.76rem;
        color: #5e35d9;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 320px;
      }
      .sp-row__url--none { color: #a49c88; }
      .sp-row__actions { display: flex; gap: 0.4rem; }
      .sp-tier {
        font-size: 0.64rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-weight: 600;
        padding: 0.25rem 0.6rem;
        border-radius: 999px;
        white-space: nowrap;
      }
      .sp-tier--title { color: #fff; background: #5e35d9; }
      .sp-tier--platinum { color: #3a3730; background: #e6e6ea; }
      .sp-tier--gold { color: #7a5f12; background: rgba(201, 162, 39, 0.18); }
      .sp-tier--partner { color: #55506a; background: rgba(94, 53, 217, 0.1); }

      .sp-row--off { opacity: 0.55; }
      .sp-row--off .sp-row__logo { filter: grayscale(1); }
      .sp-hidden-badge {
        font-size: 0.6rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-weight: 700;
        color: #8a8270;
        background: #ece7db;
        border-radius: 999px;
        padding: 0.12rem 0.45rem;
        margin-left: 0.4rem;
        vertical-align: middle;
      }
      .sp-toggle {
        width: 40px;
        height: 23px;
        border-radius: 999px;
        border: 0;
        background: #cfc9ba;
        position: relative;
        cursor: pointer;
        padding: 0;
        transition: background 0.18s ease;
        flex: none;
      }
      .sp-toggle:disabled { cursor: progress; opacity: 0.7; }
      .sp-toggle__knob {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 17px;
        height: 17px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
        transition: transform 0.18s ease;
      }
      .sp-toggle--on { background: #1a7f52; }
      .sp-toggle--on .sp-toggle__knob { transform: translateX(17px); }

      @media (max-width: 720px) {
        .sp-grid { grid-template-columns: 1fr; }
        .sp-row { flex-wrap: wrap; }
        .sp-row__url { max-width: 200px; }
      }
    `,
  ],
})
export class PartnersAdminComponent {
  private svc = inject(PartnerAdminService);

  readonly partners = this.svc.partners;
  readonly loading = this.svc.loading;
  readonly loadError = this.svc.loadError;
  src = partnerLogoSrc;

  tierOptions: TierOption[] = [
    { value: 'title', label: 'Title Sponsor' },
    { value: 'platinum', label: 'Platinum' },
    { value: 'gold', label: 'Gold' },
    { value: 'partner', label: 'Partner' },
  ];

  formOpen = signal(false);
  editingId = signal<string | null>(null);
  draft: Partial<Partner> = { tier: 'partner' };
  busy = signal(false);
  error = signal<string | null>(null);
  notice = signal<{ msg: string; ok: boolean } | null>(null);

  readonly titleCount = computed(() => this.partners().filter((p) => p.tier === 'title').length);

  constructor() {
    afterNextRender(() => this.svc.refresh());
  }

  reload(): void {
    this.svc.refresh();
  }

  openAdd(): void {
    this.draft = { name: '', logo: '', role: '', url: '', tier: 'partner', enabled: true };
    this.editingId.set(null);
    this.error.set(null);
    this.formOpen.set(true);
  }

  openEdit(p: Partner): void {
    this.draft = { ...p };
    this.editingId.set(p.id);
    this.error.set(null);
    this.formOpen.set(true);
  }

  cancel(): void {
    this.formOpen.set(false);
    this.error.set(null);
  }

  tierLabel(t: PartnerTier): string {
    return this.tierOptions.find((o) => o.value === t)?.label ?? t;
  }

  async save(): Promise<void> {
    const name = (this.draft.name ?? '').trim();
    const logo = (this.draft.logo ?? '').trim();
    if (!name || !logo) {
      this.error.set('Name and logo are both required.');
      return;
    }
    // Guard against two title sponsors — only one headline slot on the site.
    const id = this.editingId();
    if (
      this.draft.tier === 'title' &&
      this.partners().some((p) => p.tier === 'title' && p.id !== id)
    ) {
      this.error.set('There is already a Title Sponsor. Change the other one first, or pick another tier.');
      return;
    }
    const payload = {
      name,
      logo,
      role: (this.draft.role ?? '').trim(),
      url: (this.draft.url ?? '').trim() || undefined,
      tier: (this.draft.tier ?? 'partner') as PartnerTier,
      enabled: this.draft.enabled !== false,
    };
    this.busy.set(true);
    this.error.set(null);
    try {
      if (id) await this.svc.update(id, payload);
      else await this.svc.create(payload);
      this.formOpen.set(false);
      this.flash(id ? 'Sponsor updated.' : 'Sponsor added.', true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not save sponsor');
    } finally {
      this.busy.set(false);
    }
  }

  async toggleEnabled(p: Partner): Promise<void> {
    if (this.busy()) return;
    const next = p.enabled === false;
    this.busy.set(true);
    try {
      await this.svc.setEnabled(p.id, next);
      this.flash(next ? `${p.name} is now shown on the site.` : `${p.name} is now hidden.`, true);
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not update', false);
    } finally {
      this.busy.set(false);
    }
  }

  async del(p: Partner): Promise<void> {
    if (!confirm(`Remove ${p.name} from the site?`)) return;
    this.busy.set(true);
    try {
      await this.svc.remove(p.id);
      this.flash(`${p.name} removed.`, true);
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not remove sponsor', false);
    } finally {
      this.busy.set(false);
    }
  }

  async move(index: number, dir: -1 | 1): Promise<void> {
    const ids = this.partners().map((p) => p.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    this.busy.set(true);
    try {
      await this.svc.reorder(ids);
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not reorder', false);
    } finally {
      this.busy.set(false);
    }
  }

  private flash(msg: string, ok: boolean): void {
    this.notice.set({ msg, ok });
    setTimeout(() => this.notice.set(null), 4000);
  }
}
