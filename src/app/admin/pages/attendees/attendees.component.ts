import {
  Component,
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
import {
  Attendee,
  TICKET_TYPES,
  TicketType,
  ticketTypeMeta,
} from '../../../features/ticketing/models/attendee.model';

@Component({
  selector: 'app-admin-attendees',
  standalone: true,
  imports: [FormsModule, RouterLink, AdminIconComponent],
  template: `
    <div class="adm-page-head">
      <div>
        <h2>Attendees</h2>
        <p>{{ filtered().length }} of {{ all().length }} shown</p>
      </div>
      <div style="display:flex; gap:.6rem; flex-wrap:wrap">
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
        <a routerLink="/admin/register" class="adm-btn adm-btn--primary">
          <adm-icon name="register" [size]="17" /> Register
        </a>
      </div>
    </div>

    <div class="adm-toolbar">
      <div class="adm-search">
        <adm-icon name="search" [size]="17" />
        <input
          type="search"
          placeholder="Search name or email…"
          [ngModel]="search()"
          (ngModelChange)="search.set($event); page.set(1)"
          aria-label="Search attendees"
        />
      </div>
      <select
        class="adm-select"
        [ngModel]="typeFilter()"
        (ngModelChange)="typeFilter.set($event); page.set(1)"
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
        (ngModelChange)="checkFilter.set($event); page.set(1)"
        aria-label="Filter by check-in"
      >
        <option value="ALL">All check-in</option>
        <option value="IN">Checked in</option>
        <option value="OUT">Not checked in</option>
      </select>
    </div>

    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Email</th>
            <th>Ticket</th>
            <th>Phone</th>
            <th>Code</th>
            <th>Check-in</th>
            <th style="text-align:right">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (a of paged(); track a.id) {
            <tr>
              <td>
                {{ a.name }}
              </td>
              <td>
                {{ a.email }}
              </td>
              <td>{{ meta(a.ticketType).label }}</td>
              <td>{{ a.phone }}</td>
              <td>
                <span class="adm-code">{{ a.ticketCode }}</span>
              </td>
              <td>
                @if (a.checkedIn) {
                  <span class="adm-badge adm-badge--in"
                    ><adm-icon name="check" [size]="13" /> In</span
                  >
                } @else {
                  <span class="adm-badge adm-badge--out">Not yet</span>
                }
              </td>
              <td>
                <div class="row-actions">
                  <a
                    [routerLink]="['/tickets', a.ticketCode]"
                    target="_blank"
                    class="adm-btn adm-btn--sm adm-btn--ghost"
                    title="View ticket"
                  >
                    <adm-icon name="external" [size]="15" />
                  </a>
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
                  <button
                    class="adm-btn adm-btn--sm adm-btn--danger"
                    (click)="remove(a)"
                    title="Delete"
                  >
                    <adm-icon name="trash" [size]="15" />
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7">
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
  `,
  styles: [
    `
      .row-actions {
        display: flex;
        gap: 0.35rem;
        justify-content: flex-end;
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
export class AttendeesComponent {
  private api = inject(AttendeeApiService);
  private doc = inject(DOCUMENT);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly ticketTypes = TICKET_TYPES;
  meta = ticketTypeMeta;

  search = signal('');
  typeFilter = signal<TicketType | 'ALL'>('ALL');
  checkFilter = signal<'ALL' | 'IN' | 'OUT'>('ALL');
  page = signal(1);
  readonly pageSize = 8;

  exportOpen = signal(false);
  busy = signal(false);

  all = this.api.attendees;
  loading = this.api.loading;
  loadError = this.api.loadError;

  constructor() {
    afterNextRender(() => this.api.refresh().catch(() => {}));
  }

  filtered = computed<Attendee[]>(() => {
    const q = this.search().trim().toLowerCase();
    const type = this.typeFilter();
    const check = this.checkFilter();
    return this.all().filter((a) => {
      if (q && !`${a.name} ${a.email}`.toLowerCase().includes(q)) return false;
      if (type !== 'ALL' && a.ticketType !== type) return false;
      if (check === 'IN' && !a.checkedIn) return false;
      if (check === 'OUT' && a.checkedIn) return false;
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

  async toggle(a: Attendee): Promise<void> {
    await this.api.setCheckIn(a.ticketCode, !a.checkedIn);
  }

  async remove(a: Attendee): Promise<void> {
    if (this.isBrowser && !confirm(`Delete ${a.name}? This cannot be undone.`))
      return;
    await this.api.remove(a.ticketCode);
    if (this.page() > this.totalPages()) this.page.set(this.totalPages());
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
    ws['!cols'] = [24, 26, 16, 14, 10, 11, 20, 20].map((w) => ({ wch: w }));
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
