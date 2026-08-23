import {
  Component,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import { AttendeeApiService } from '../../../features/ticketing/services/attendee-api.service';
import { AuthService } from '../../services/auth.service';
import { ticketShareUrl } from '../../../features/ticketing/share.util';
import {
  Attendee,
  GENDERS,
  Gender,
  SPECIFIC_DRINKS,
  SpecificDrink,
  TABLE_CAPACITY,
  TICKET_TYPES,
  TicketType,
  genderLabel,
  seatsFor,
  specificDrinksLabel,
  tablePersons,
  ticketTypeMeta,
} from '../../../features/ticketing/models/attendee.model';

@Component({
  selector: 'app-admin-attendees',
  standalone: true,
  imports: [FormsModule, RouterLink, AdminIconComponent],
  template: `
    <div class="adm-page-head">
      <div>
        <h2>Attendees @if (showArchived()) { <span class="adm-badge">Archived</span> }</h2>
        <p>{{ filtered().length }} of {{ (showArchived() ? archived() : all()).length }} shown</p>
      </div>
      <div style="display:flex; gap:.6rem; flex-wrap:wrap; align-items:center">
        <button
          type="button"
          class="live-toggle"
          [class.live-toggle--on]="liveEnabled()"
          (click)="toggleLive()"
          [attr.aria-pressed]="liveEnabled()"
          [title]="liveEnabled() ? 'Live updates on — click to pause' : 'Live updates paused — click to resume'"
        >
          <span class="live-toggle__dot"></span>
          {{ liveEnabled() ? 'Live' : 'Live off' }}
        </button>
        <div class="exp">
          <button
            class="adm-btn"
            (click)="exportOpen.set(!exportOpen())"
            [disabled]="!filtered().length"
            [attr.aria-expanded]="exportOpen()"
          >
            <adm-icon name="download" [size]="17" /> Export
            <span class="exp__caret" [class.exp__caret--open]="exportOpen()">▾</span>
          </button>
          @if (exportOpen()) {
            <div class="exp__backdrop" (click)="exportOpen.set(false)"></div>
            <div class="exp__menu" role="menu">
              <button role="menuitem" (click)="download('csv')" [disabled]="busy()">
                CSV <span>.csv</span>
              </button>
              <button role="menuitem" (click)="download('excel')" [disabled]="busy()">
                Excel <span>.xlsx</span>
              </button>
              <button role="menuitem" (click)="download('pdf')" [disabled]="busy()">
                PDF <span>.pdf</span>
              </button>
            </div>
          }
        </div>
        @if (isOwner()) {
          <button
            class="adm-btn"
            [class.adm-btn--primary]="showArchived()"
            (click)="toggleArchived()"
          >
            <adm-icon name="trash" [size]="16" />
            {{ showArchived() ? 'Back to active' : 'Archived' }}
          </button>
        }
        @if (canManage() && !showArchived()) {
          <a routerLink="/admin/register" class="adm-btn adm-btn--primary">
            <adm-icon name="register" [size]="17" /> Register
          </a>
        }
      </div>
    </div>

    @if (notice(); as n) {
      <div class="adm-notice" [class.adm-notice--err]="!n.ok">{{ n.msg }}</div>
    }

    <div class="adm-toolbar">
      <div class="adm-search">
        <adm-icon name="search" [size]="17" />
        <input
          type="search"
          placeholder="Search name, email, phone or code…"
          [ngModel]="search()"
          (ngModelChange)="search.set($event); page.set(1); clearSelection()"
          aria-label="Search attendees by name, email, phone or ticket code"
        />
      </div>
      <select
        class="adm-select"
        [ngModel]="typeFilter()"
        (ngModelChange)="typeFilter.set($event); page.set(1); clearSelection()"
        aria-label="Filter by ticket type"
      >
        <option value="ALL">All ticket types</option>
        @for (t of ticketTypes; track t.value) {
          <option [value]="t.value">{{ t.label }}</option>
        }
      </select>
      <select
        class="adm-select"
        [ngModel]="checkFilter()"
        (ngModelChange)="checkFilter.set($event); page.set(1); clearSelection()"
        aria-label="Filter by check-in"
      >
        <option value="ALL">All check-in</option>
        <option value="IN">Checked in</option>
        <option value="OUT">Not checked in</option>
      </select>
      <select
        class="adm-select"
        [ngModel]="tableFilter()"
        (ngModelChange)="tableFilter.set($event); page.set(1); clearSelection()"
        aria-label="Filter by table number"
      >
        <option value="ALL">All tables</option>
        <option value="NONE">No table assigned</option>
        @for (t of tableOptions(); track t) {
          <option [value]="t">Table {{ t }}</option>
        }
      </select>
    </div>

    @if (canManage() && selected().size) {
      <div class="bulk-bar">
        <span class="bulk-bar__count">{{ selected().size }} selected</span>
        @if (!showArchived()) {
          <button class="adm-btn adm-btn--sm" (click)="openSms()" [disabled]="busy() || smsBusy()">
            <adm-icon name="message" [size]="15" /> Send SMS
          </button>
        }
        <button class="adm-btn adm-btn--sm adm-btn--danger" (click)="bulkDelete()" [disabled]="busy()">
          <adm-icon name="trash" [size]="15" />
          {{ showArchived() ? 'Delete permanently' : 'Archive selected' }}
        </button>
        <button class="adm-btn adm-btn--sm adm-btn--ghost" (click)="clearSelection()" [disabled]="busy()">
          Clear
        </button>
      </div>
    }

    @if (smsOpen()) {
      <div class="sms-backdrop" (click)="closeSms()"></div>
      <div class="sms-modal" role="dialog" aria-modal="true" aria-labelledby="sms-title">
        <h3 id="sms-title">Send SMS to {{ selected().size }} guest{{ selected().size === 1 ? '' : 's' }}</h3>
        <p class="sms-modal__hint">
          One message goes to every selected guest with a phone number. Guests without a
          number are skipped.
        </p>
        <textarea
          class="sms-textarea"
          [ngModel]="smsText()"
          (ngModelChange)="smsText.set($event)"
          maxlength="480"
          rows="5"
          placeholder="e.g. Reminder: A Night of Angels is this Saturday. Arrivals from 5:00 PM. See you there!"
          [disabled]="smsBusy()"
        ></textarea>
        <div class="sms-meta">
          <span>{{ smsText().length }}/480 chars</span>
          <span>{{ smsSegments() }} SMS segment{{ smsSegments() === 1 ? '' : 's' }} each</span>
        </div>
        <div class="sms-actions">
          <button class="adm-btn adm-btn--sm adm-btn--ghost" (click)="closeSms()" [disabled]="smsBusy()">
            Cancel
          </button>
          <button
            class="adm-btn adm-btn--sm adm-btn--primary"
            (click)="sendBulkSms()"
            [disabled]="smsBusy() || !smsText().trim()"
          >
            <adm-icon name="message" [size]="15" />
            {{ smsBusy() ? 'Sending…' : 'Send message' }}
          </button>
        </div>
      </div>
    }

    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            @if (canManage()) {
              <th class="adm-check-col">
                <input
                  type="checkbox"
                  [checked]="allFilteredSelected()"
                  [indeterminate]="someSelected()"
                  (change)="toggleSelectAll()"
                  [disabled]="!filtered().length"
                  aria-label="Select all attendees"
                />
              </th>
            }
            <th>Full Name</th>
            <th>Ticket</th>
            <th>Preferred Drink</th>
            <th>Table</th>
            <th>Phone</th>
            <th>Check-in</th>
            <th class="adm-actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (a of paged(); track a.id) {
            <tr [class.adm-row--selected]="isSelected(a.ticketCode)">
              @if (canManage()) {
                <td class="adm-check-col">
                  <input
                    type="checkbox"
                    [checked]="isSelected(a.ticketCode)"
                    (change)="toggleSelect(a.ticketCode)"
                    [attr.aria-label]="'Select ' + a.name"
                  />
                </td>
              }
              <td>
                <span class="adm-name">{{ a.name }}</span>
                <span class="adm-sub">{{ genderLabel(a.gender) }}@if (a.email) { · {{ a.email }} }</span>
              </td>
              <td>
                <span class="adm-name">{{ meta(a.ticketType).label }}</span>
                <span class="adm-sub"><span class="adm-code">{{ a.ticketCode }}</span></span>
              </td>
              <td>{{ specificDrinksLabel(a.specificDrinks) }}</td>
              <td>
                @if (!showArchived() && canManage()) {
                  <button
                    class="adm-btn adm-btn--sm adm-btn--ghost adm-table-edit"
                    (click)="editTable(a)"
                    [disabled]="busy()"
                    title="Set table number"
                  >
                    {{ a.tableNumber || '—' }}
                  </button>
                } @else {
                  {{ a.tableNumber || '—' }}
                }
              </td>
              <td>{{ a.phone }}</td>
              <td>
                @if (a.checkedIn) {
                  <span class="adm-badge adm-badge--in"
                    ><adm-icon name="check" [size]="13" /> In</span
                  >
                } @else {
                  <span class="adm-badge adm-badge--out">Not yet</span>
                }
              </td>
              <td class="adm-actions-col">
                <div class="row-actions">
                  @if (showArchived()) {
                    <button class="adm-btn adm-btn--sm" (click)="restore(a)" [disabled]="busy()">
                      Restore
                    </button>
                    <button
                      class="adm-btn adm-btn--sm adm-btn--danger"
                      (click)="permanentDelete(a)"
                      [disabled]="busy()"
                      title="Delete permanently"
                    >
                      <adm-icon name="trash" [size]="15" /> Delete
                    </button>
                  } @else {
                  <a
                    [href]="waLink(a)"
                    target="_blank"
                    rel="noopener"
                    class="adm-btn adm-btn--sm wa-share"
                    title="Send ticket on WhatsApp"
                  >
                    <adm-icon name="whatsapp" [size]="16" />
                  </a>
                  <a
                    [routerLink]="['/tickets', a.ticketCode]"
                    target="_blank"
                    class="adm-btn adm-btn--sm adm-btn--ghost"
                    title="View ticket"
                  >
                    <adm-icon name="external" [size]="15" />
                  </a>
                  @if (canManage()) {
                    <button
                      class="adm-btn adm-btn--sm"
                      (click)="openEdit(a)"
                      [disabled]="busy()"
                      title="Edit attendee"
                    >
                      <adm-icon name="edit" [size]="15" />
                    </button>
                    <button
                      class="adm-btn adm-btn--sm"
                      (click)="toggle(a)"
                      [title]="a.checkedIn ? 'Undo check-in' : 'Check in'"
                    >
                      <adm-icon
                        [name]="a.checkedIn ? 'close' : 'check'"
                        [size]="15"
                      />
                    </button>
                    <div class="row-actions__group">
                      <button
                        class="adm-btn adm-btn--sm"
                        (click)="emailTicket(a)"
                        [disabled]="sendingCode() === a.ticketCode || !a.email"
                        [title]="a.email ? 'Email ticket to guest' : 'No email on file for this guest'"
                      >
                        <adm-icon name="mail" [size]="15" />
                      </button>
                      <button
                        class="adm-btn adm-btn--sm"
                        (click)="smsTicket(a)"
                        [disabled]="sendingCode() === a.ticketCode || !a.phone"
                        [title]="a.phone ? 'Text ticket link to guest' : 'No phone on file for this guest'"
                      >
                        <adm-icon name="message" [size]="15" />
                      </button>
                      <button
                        class="adm-btn adm-btn--sm adm-btn--danger"
                        (click)="remove(a)"
                        title="Archive"
                      >
                        <adm-icon name="trash" [size]="15" />
                      </button>
                    </div>
                  }
                  }
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="canManage() ? 8 : 7">
                @if (loading() && !all().length) {
                  <div class="adm-loading">
                    <div class="adm-spinner"></div>
                    <p>Loading attendees…</p>
                  </div>
                } @else if (loadError()) {
                  <div class="adm-empty">
                    <adm-icon name="alert" [size]="28" />
                    <p style="margin:.5rem 0">Couldn’t load attendees.</p>
                    <button class="adm-btn adm-btn--sm" (click)="reload()">
                      Retry
                    </button>
                  </div>
                } @else {
                  <div class="adm-empty">
                    <adm-icon name="attendees" [size]="28" />
                    <p style="margin-top:.5rem">No attendees yet.</p>
                  </div>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (totalPages() > 1) {
      <div class="adm-pagination">
        <span>Page {{ page() }} of {{ totalPages() }}</span>
        <div class="adm-pagination__controls">
          <button
            (click)="page.set(page() - 1)"
            [disabled]="page() === 1"
            aria-label="Previous page"
          >
            <adm-icon name="chevron-left" [size]="16" />
          </button>
          <button
            (click)="page.set(page() + 1)"
            [disabled]="page() === totalPages()"
            aria-label="Next page"
          >
            <adm-icon name="chevron-right" [size]="16" />
          </button>
        </div>
      </div>
    }

    @if (editOpen()) {
      <div class="sms-backdrop" (click)="closeEdit()"></div>
      <div class="sms-modal edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title">
        <h3 id="edit-title">Edit {{ editTarget()?.name }}</h3>

        <div class="adm-field">
          <label for="e-name">Full name</label>
          <input id="e-name" type="text" [(ngModel)]="editForm.name" [disabled]="editBusy()" />
        </div>
        <div class="adm-field">
          <label for="e-phone">Phone number</label>
          <input id="e-phone" type="tel" [(ngModel)]="editForm.phone" [disabled]="editBusy()" />
        </div>
        <div class="adm-field">
          <label for="e-email">Email <span style="opacity:.6">(optional)</span></label>
          <input id="e-email" type="email" [(ngModel)]="editForm.email" [disabled]="editBusy()" />
        </div>
        <div class="adm-field">
          <label for="e-ticket">Ticket type</label>
          <select id="e-ticket" [(ngModel)]="editForm.ticketType" [disabled]="editBusy()">
            @for (t of ticketTypes; track t.value) {
              <option [value]="t.value">{{ t.label }}</option>
            }
          </select>
        </div>
        <div class="adm-field">
          <label for="e-gender">Gender</label>
          <select id="e-gender" [(ngModel)]="editForm.gender" [disabled]="editBusy()">
            <option value="" disabled>Select gender</option>
            @for (g of genders; track g.value) {
              <option [value]="g.value">{{ g.label }}</option>
            }
          </select>
        </div>
        <div class="adm-field">
          <label>Preferred drink(s) <span style="opacity:.6">(optional)</span></label>
          <div class="adm-checks">
            @for (d of specificDrinks; track d.value) {
              <label class="adm-check">
                <input
                  type="checkbox"
                  [checked]="editForm.specificDrink.includes(d.value)"
                  (change)="toggleEditDrink('specificDrink', d.value, $any($event.target).checked)"
                  [disabled]="editBusy()"
                />
                {{ d.label }}
              </label>
            }
          </div>
        </div>
        @if (editForm.ticketType === 'COUPLES') {
          <div class="adm-field">
            <label for="e-p-gender">Partner's gender <span style="opacity:.6">(optional)</span></label>
            <select id="e-p-gender" [(ngModel)]="editForm.partnerGender" [disabled]="editBusy()">
              <option value="">Select gender</option>
              @for (g of genders; track g.value) {
                <option [value]="g.value">{{ g.label }}</option>
              }
            </select>
          </div>
          <div class="adm-field">
            <label>Partner's preferred drink(s) <span style="opacity:.6">(optional)</span></label>
            <div class="adm-checks">
              @for (d of specificDrinks; track d.value) {
                <label class="adm-check">
                  <input
                    type="checkbox"
                    [checked]="editForm.partnerSpecificDrink.includes(d.value)"
                    (change)="toggleEditDrink('partnerSpecificDrink', d.value, $any($event.target).checked)"
                    [disabled]="editBusy()"
                  />
                  {{ d.label }}
                </label>
              }
            </div>
          </div>
        }

        @if (editError()) {
          <p class="adm-error" style="font-size:.85rem" role="alert">{{ editError() }}</p>
        }

        <div class="sms-actions">
          <button class="adm-btn adm-btn--sm adm-btn--ghost" (click)="closeEdit()" [disabled]="editBusy()">
            Cancel
          </button>
          <button class="adm-btn adm-btn--sm adm-btn--primary" (click)="saveEdit()" [disabled]="editBusy()">
            {{ editBusy() ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .live-toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        border: 1px solid var(--adm-line);
        background: var(--adm-surface);
        color: var(--adm-muted);
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s var(--ease);
      }
      .live-toggle:hover {
        border-color: var(--adm-gold);
      }
      .live-toggle__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--adm-muted);
      }
      .live-toggle--on {
        background: rgba(26, 127, 82, 0.12);
        border-color: transparent;
        color: #1a7f52;
      }
      .live-toggle--on .live-toggle__dot {
        background: #1a7f52;
      }
      .adm-table .adm-name {
        display: block;
      }
      .adm-table .adm-sub {
        display: block;
        margin-top: 0.15rem;
        white-space: normal;
      }
      .row-actions {
        display: flex;
        gap: 0.35rem;
        justify-content: flex-end;
      }
      .row-actions__group {
        display: flex;
        gap: 0.35rem;
        padding-left: 0.4rem;
        margin-left: 0.05rem;
        border-left: 1px solid var(--adm-line);
      }
      .bulk-bar {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-bottom: 0.8rem;
        padding: 0.55rem 0.85rem;
        background: rgba(176, 55, 55, 0.06);
        border: 1px solid rgba(176, 55, 55, 0.28);
        border-radius: 8px;
      }
      .bulk-bar__count {
        font-size: 0.85rem;
        font-weight: 600;
        color: #23201a;
        margin-right: auto;
      }
      .adm-check-col {
        width: 36px;
        text-align: center;
        padding-right: 0;
      }
      .adm-actions-col {
        width: 310px;
        text-align: right;
        white-space: nowrap;
      }
      .adm-check-col input {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: #b0891d;
        vertical-align: middle;
      }
      .adm-row--selected {
        background: rgba(176, 137, 29, 0.08);
      }
      .sms-backdrop {
        position: fixed;
        inset: 0;
        z-index: 40;
        background: rgba(11, 11, 10, 0.5);
      }
      .sms-modal {
        position: fixed;
        z-index: 41;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(94vw, 480px);
        background: #fff;
        border: 1px solid #e7e2d5;
        border-radius: 14px;
        box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.5);
        padding: 1.3rem 1.4rem;
      }
      .sms-modal h3 {
        margin: 0 0 0.3rem;
        font-size: 1.1rem;
        color: #23201a;
      }
      .edit-modal {
        max-height: 88vh;
        overflow-y: auto;
      }
      .edit-modal h3 {
        margin-bottom: 0.9rem;
      }
      .edit-modal .adm-field {
        margin-bottom: 0.8rem;
      }
      .sms-modal__hint {
        margin: 0 0 0.9rem;
        font-size: 0.82rem;
        color: #8a8270;
        line-height: 1.45;
      }
      .sms-textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #d9d3c4;
        border-radius: 9px;
        padding: 0.7rem 0.8rem;
        font: inherit;
        font-size: 0.92rem;
        color: #23201a;
        resize: vertical;
      }
      .sms-textarea:focus {
        outline: none;
        border-color: #b0891d;
        box-shadow: 0 0 0 3px rgba(176, 137, 29, 0.15);
      }
      .sms-meta {
        display: flex;
        justify-content: space-between;
        margin: 0.45rem 0.1rem 0;
        font-size: 0.75rem;
        color: #8a8270;
      }
      .sms-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1.1rem;
      }
      .exp {
        position: relative;
      }
      .exp__caret {
        margin-left: 0.15rem;
        font-size: 0.7rem;
        transition: transform 0.2s ease;
      }
      .exp__caret--open {
        transform: rotate(180deg);
      }
      .exp__backdrop {
        position: fixed;
        inset: 0;
        z-index: 30;
      }
      .exp__menu {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        z-index: 31;
        min-width: 168px;
        background: #fff;
        border: 1px solid #e7e2d5;
        border-radius: 10px;
        box-shadow: 0 16px 40px -18px rgba(0, 0, 0, 0.4);
        padding: 0.3rem;
        display: flex;
        flex-direction: column;
      }
      .exp__menu button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.55rem 0.7rem;
        border: none;
        background: transparent;
        border-radius: 7px;
        font-size: 0.88rem;
        color: #23201a;
        cursor: pointer;
        text-align: left;
      }
      .exp__menu button span {
        font-size: 0.74rem;
        color: #8a8270;
      }
      .exp__menu button:hover:not(:disabled) {
        background: #f3f1ea;
      }
      .exp__menu button:disabled {
        opacity: 0.5;
        cursor: progress;
      }
    `,
  ],
})
export class AttendeesComponent implements OnDestroy {
  private api = inject(AttendeeApiService);
  private auth = inject(AuthService);
  private doc = inject(DOCUMENT);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly ticketTypes = TICKET_TYPES;
  readonly genders = GENDERS;
  readonly specificDrinks = SPECIFIC_DRINKS;
  meta = ticketTypeMeta;
  genderLabel = genderLabel;
  specificDrinksLabel = specificDrinksLabel;

  /** Ushers get a read-only view: hide register / email / check-in / delete. */
  canManage = () => this.auth.canManageAttendees();

  search = signal('');
  typeFilter = signal<TicketType | 'ALL'>('ALL');
  checkFilter = signal<'ALL' | 'IN' | 'OUT'>('ALL');
  /** 'ALL', 'NONE' (unassigned), or a specific table number. */
  tableFilter = signal<string>('ALL');
  page = signal(1);
  readonly pageSize = 8;

  exportOpen = signal(false);
  busy = signal(false);
  sendingCode = signal<string | null>(null);
  notice = signal<{ msg: string; ok: boolean } | null>(null);

  /** Bulk SMS composer state. */
  smsOpen = signal(false);
  smsText = signal('');
  smsBusy = signal(false);
  /** Rough GSM segment estimate (160 chars, or 153 per part when concatenated). */
  smsSegments = computed(() => {
    const len = this.smsText().length;
    if (len === 0) return 1;
    return len <= 160 ? 1 : Math.ceil(len / 153);
  });

  /** Edit-attendee modal state — owner only. */
  editOpen = signal(false);
  editTarget = signal<Attendee | null>(null);
  editBusy = signal(false);
  editError = signal<string | null>(null);
  editForm: {
    name: string;
    email: string;
    phone: string;
    ticketType: TicketType;
    gender: Gender | '';
    specificDrink: SpecificDrink[];
    partnerGender: Gender | '';
    partnerSpecificDrink: SpecificDrink[];
  } = this.blankEditForm();

  private blankEditForm() {
    return {
      name: '',
      email: '',
      phone: '',
      ticketType: 'SINGLES' as TicketType,
      gender: '' as Gender | '',
      specificDrink: [] as SpecificDrink[],
      partnerGender: '' as Gender | '',
      partnerSpecificDrink: [] as SpecificDrink[],
    };
  }

  openEdit(a: Attendee): void {
    this.editTarget.set(a);
    this.editForm = {
      name: a.name,
      email: a.email,
      phone: a.phone,
      ticketType: a.ticketType,
      gender: a.gender ?? '',
      specificDrink: a.specificDrinks ?? [],
      partnerGender: a.partnerGender ?? '',
      partnerSpecificDrink: a.partnerSpecificDrinks ?? [],
    };
    this.editError.set(null);
    this.editOpen.set(true);
  }

  closeEdit(): void {
    if (this.editBusy()) return;
    this.editOpen.set(false);
    this.editTarget.set(null);
  }

  /** Preferred-drink checkboxes in the edit modal are optional and multi-select. */
  toggleEditDrink(
    field: 'specificDrink' | 'partnerSpecificDrink',
    value: SpecificDrink,
    checked: boolean,
  ): void {
    const current = this.editForm[field];
    this.editForm[field] = checked ? [...current, value] : current.filter((v) => v !== value);
  }

  async saveEdit(): Promise<void> {
    const a = this.editTarget();
    if (!a) return;
    const f = this.editForm;
    if (!f.name.trim() || !f.phone.trim() || !f.gender) {
      this.editError.set('Please fill in all required fields.');
      return;
    }
    this.editBusy.set(true);
    this.editError.set(null);
    try {
      const name = f.name.trim();
      await this.api.updateDetails(a.ticketCode, {
        name,
        email: f.email.trim(),
        phone: f.phone.trim(),
        ticketType: f.ticketType,
        gender: f.gender,
        specificDrinks: f.specificDrink,
        ...(f.ticketType === 'COUPLES'
          ? { partnerGender: f.partnerGender, partnerSpecificDrinks: f.partnerSpecificDrink }
          : {}),
      });
      this.flash(`${name} updated.`, true);
      this.editOpen.set(false);
      this.editTarget.set(null);
    } catch (e) {
      this.editError.set(e instanceof Error ? e.message : 'Could not update attendee');
    } finally {
      this.editBusy.set(false);
    }
  }

  all = this.api.attendees;
  loading = this.api.loading;
  loadError = this.api.loadError;
  readonly live = this.api.live;

  /** User-controlled toggle for near-real-time polling on this page. */
  liveEnabled = signal(true);

  /** Bulk selection — set of selected ticket codes (persists across pages). */
  selected = signal<Set<string>>(new Set<string>());
  isSelected = (code: string) => this.selected().has(code);

  allFilteredSelected = computed(() => {
    const f = this.filtered();
    return f.length > 0 && f.every((a) => this.selected().has(a.ticketCode));
  });

  someSelected = computed(() => this.selected().size > 0 && !this.allFilteredSelected());

  /** Owner-only archive view of soft-deleted attendees. */
  showArchived = signal(false);
  archived = signal<Attendee[]>([]);
  isOwner = () => this.auth.isOwner();

  constructor() {
    afterNextRender(() => {
      this.api.refresh().catch(() => {});
      this.api.startLive();
    });
  }

  ngOnDestroy(): void {
    if (this.liveEnabled()) this.api.stopLive();
  }

  /** Pause or resume near-real-time polling for this page only. */
  toggleLive(): void {
    if (this.liveEnabled()) {
      this.api.stopLive();
      this.liveEnabled.set(false);
    } else {
      this.api.startLive();
      this.liveEnabled.set(true);
    }
  }

  async toggleArchived(): Promise<void> {
    const next = !this.showArchived();
    this.showArchived.set(next);
    this.page.set(1);
    this.clearSelection();
    if (next) {
      try {
        this.archived.set(await this.api.archived());
      } catch (e) {
        this.flash(e instanceof Error ? e.message : 'Could not load archive', false);
        this.showArchived.set(false);
      }
    }
  }

  async restore(a: Attendee): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.restore(a.ticketCode);
      this.archived.set(await this.api.archived());
      this.flash(`${a.name} restored.`, true);
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not restore', false);
    } finally {
      this.busy.set(false);
    }
  }

  async permanentDelete(a: Attendee): Promise<void> {
    if (!confirm(`Permanently delete ${a.name}? Their ticket is voided and this cannot be undone.`)) {
      return;
    }
    this.busy.set(true);
    try {
      await this.api.permanentDelete(a.ticketCode);
      this.archived.set(await this.api.archived());
      this.flash(`${a.name} permanently deleted.`, true);
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not delete', false);
    } finally {
      this.busy.set(false);
    }
  }

  /** Distinct assigned table numbers for the current view, sorted numerically where possible. */
  tableOptions = computed(() => {
    const base = this.showArchived() ? this.archived() : this.all();
    const set = new Set<string>();
    for (const a of base) {
      const t = (a.tableNumber ?? '').trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  });

  filtered = computed<Attendee[]>(() => {
    const q = this.search().trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    const type = this.typeFilter();
    const check = this.checkFilter();
    const table = this.tableFilter();
    const base = this.showArchived() ? this.archived() : this.all();
    return base.filter((a) => {
      if (q) {
        const hay = `${a.name} ${a.email} ${a.phone} ${a.ticketCode}`.toLowerCase();
        const phoneDigits = a.phone.replace(/\D/g, '');
        const match =
          hay.includes(q) || (qDigits.length >= 3 && phoneDigits.includes(qDigits));
        if (!match) return false;
      }
      if (type !== 'ALL' && a.ticketType !== type) return false;
      if (check === 'IN' && !a.checkedIn) return false;
      if (check === 'OUT' && a.checkedIn) return false;
      if (table === 'NONE' && (a.tableNumber ?? '').trim()) return false;
      if (table !== 'ALL' && table !== 'NONE' && (a.tableNumber ?? '').trim() !== table) return false;
      return true;
    });
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
  );

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  reload(): void {
    this.api.refresh().catch(() => {});
  }

  waLink(a: Attendee): string {
    return ticketShareUrl({
      name: a.name,
      phone: a.phone,
      ticketType: ticketTypeMeta(a.ticketType).label,
      url: this.api.ticketUrl(a.ticketCode),
    });
  }

  async emailTicket(a: Attendee): Promise<void> {
    if (this.sendingCode()) return;
    this.sendingCode.set(a.ticketCode);
    this.notice.set(null);
    try {
      const to = await this.api.emailTicket(a.ticketCode);
      this.flash(`Ticket emailed to ${to}`, true);
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not send email', false);
    } finally {
      this.sendingCode.set(null);
    }
  }

  async smsTicket(a: Attendee): Promise<void> {
    if (this.sendingCode()) return;
    this.sendingCode.set(a.ticketCode);
    this.notice.set(null);
    try {
      const to = await this.api.smsTicket(a.ticketCode);
      this.flash(`Ticket texted to ${to}`, true);
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not send SMS', false);
    } finally {
      this.sendingCode.set(null);
    }
  }

  openSms(): void {
    if (!this.selected().size) return;
    this.smsOpen.set(true);
  }

  closeSms(): void {
    if (this.smsBusy()) return;
    this.smsOpen.set(false);
  }

  /** Send the composed message to every selected guest with a phone number. */
  async sendBulkSms(): Promise<void> {
    const codes = [...this.selected()];
    const message = this.smsText().trim();
    if (!codes.length || !message || this.smsBusy()) return;
    this.smsBusy.set(true);
    try {
      const r = await this.api.smsBroadcast(codes, message);
      const parts = [`${r.sent} sent`];
      if (r.noPhone) parts.push(`${r.noPhone} without a phone`);
      if (r.failed) parts.push(`${r.failed} failed`);
      this.flash(parts.join(', ') + '.', r.failed === 0);
      this.smsOpen.set(false);
      this.smsText.set('');
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not send SMS', false);
    } finally {
      this.smsBusy.set(false);
    }
  }

  private flash(msg: string, ok: boolean): void {
    this.notice.set({ msg, ok });
    setTimeout(() => this.notice.set(null), 5000);
  }

  async toggle(a: Attendee): Promise<void> {
    await this.api.setCheckIn(a.ticketCode, !a.checkedIn);
  }

  async editTable(a: Attendee): Promise<void> {
    if (!this.isBrowser) return;
    const value = prompt(`Table number for ${a.name}:`, a.tableNumber ?? '');
    if (value === null) return; // cancelled
    const next = value.trim();
    if (next === (a.tableNumber ?? '')) return;
    if (next) {
      const already = tablePersons(this.all(), next, a.id);
      if (already + seatsFor(a.ticketType) > TABLE_CAPACITY) {
        this.flash(
          `Table ${next} is full — ${already}/${TABLE_CAPACITY} seated, and ${a.name} needs ${seatsFor(a.ticketType)}.`,
          false,
        );
        return;
      }
    }
    this.busy.set(true);
    try {
      await this.api.setTable(a.ticketCode, next);
      this.flash(next ? `${a.name} assigned to table ${next}.` : `Table cleared for ${a.name}.`, true);
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Could not update table', false);
    } finally {
      this.busy.set(false);
    }
  }

  async remove(a: Attendee): Promise<void> {
    if (this.isBrowser && !confirm(`Archive ${a.name}? They can be restored from the archive.`))
      return;
    await this.api.remove(a.ticketCode);
    if (this.page() > this.totalPages()) this.page.set(this.totalPages());
  }

  toggleSelect(code: string): void {
    const next = new Set(this.selected());
    if (next.has(code)) next.delete(code);
    else next.add(code);
    this.selected.set(next);
  }

  /** Header checkbox: select or clear every row in the current filtered view (all pages). */
  toggleSelectAll(): void {
    if (this.allFilteredSelected()) this.selected.set(new Set());
    else this.selected.set(new Set(this.filtered().map((a) => a.ticketCode)));
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  /** Archive (or permanently delete, in the archive view) every selected attendee. */
  async bulkDelete(): Promise<void> {
    const codes = [...this.selected()];
    if (!codes.length || this.busy()) return;
    const permanent = this.showArchived();
    const n = codes.length;
    const noun = n === 1 ? 'attendee' : 'attendees';
    const msg = permanent
      ? `Permanently delete ${n} ${noun}? Their tickets are voided and this cannot be undone.`
      : `Archive ${n} ${noun}? They can be restored from the archive.`;
    if (this.isBrowser && !confirm(msg)) return;
    this.busy.set(true);
    try {
      const failed = permanent
        ? await this.api.permanentDeleteMany(codes)
        : await this.api.removeMany(codes);
      if (permanent) this.archived.set(await this.api.archived());
      this.clearSelection();
      if (this.page() > this.totalPages()) this.page.set(this.totalPages());
      const ok = n - failed;
      const verb = permanent ? 'deleted' : 'archived';
      this.flash(
        failed
          ? `${ok} ${verb}, ${failed} failed.`
          : `${ok} ${ok === 1 ? 'attendee' : 'attendees'} ${verb}.`,
        failed === 0,
      );
    } catch (e) {
      this.flash(e instanceof Error ? e.message : 'Bulk delete failed', false);
    } finally {
      this.busy.set(false);
    }
  }

  /** Route an export choice from the dropdown. */
  async download(format: 'csv' | 'excel' | 'pdf'): Promise<void> {
    this.exportOpen.set(false);
    if (!this.isBrowser || !this.filtered().length || this.busy()) return;
    this.busy.set(true);
    try {
      if (format === 'csv') this.exportCsv();
      else if (format === 'excel') await this.exportExcel();
      else await this.exportPdf();
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      this.busy.set(false);
    }
  }

  private readonly columns = [
    'Name',
    'Email',
    'Phone',
    'Ticket',
    'Gender',
    'Preferred Drink',
    'Table',
    'Code',
    'Checked In',
    'Checked In At',
    'Registered',
  ];

  /** Rows for every export format (respects the current search/filters). */
  private exportData(): string[][] {
    return this.filtered().map((a) => [
      a.name,
      a.email,
      a.phone,
      ticketTypeMeta(a.ticketType).label,
      genderLabel(a.gender),
      specificDrinksLabel(a.specificDrinks),
      a.tableNumber ?? '',
      a.ticketCode,
      a.checkedIn ? 'Yes' : 'No',
      a.checkedInAt ? new Date(a.checkedInAt).toLocaleString() : '',
      new Date(a.createdAt).toLocaleString(),
    ]);
  }

  private fileName(ext: string): string {
    return `attendees-${new Date().toISOString().slice(0, 10)}.${ext}`;
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = this.doc.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private exportCsv(): void {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [this.columns, ...this.exportData()]
      .map((row) => row.map(esc).join(','))
      .join('\n');
    this.saveBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), this.fileName('csv'));
  }

  private async exportExcel(): Promise<void> {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([this.columns, ...this.exportData()]);
    ws['!cols'] = [24, 26, 16, 14, 10, 14, 10, 11, 11, 20, 20].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendees');
    XLSX.writeFile(wb, this.fileName('xlsx'));
  }

  private async exportPdf(): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(15);
    doc.text('A Night of Angels — Attendees', 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `${this.filtered().length} attendee(s) · generated ${new Date().toLocaleString()}`,
      14,
      21,
    );

    autoTable(doc, {
      head: [this.columns],
      body: this.exportData(),
      startY: 26,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [201, 162, 39], textColor: [26, 24, 19] },
      alternateRowStyles: { fillColor: [248, 246, 242] },
    });

    doc.save(this.fileName('pdf'));
  }
}
