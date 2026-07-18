import { Component, afterNextRender, computed, inject } from '@angular/core';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import { AttendeeApiService } from '../../../features/ticketing/services/attendee-api.service';
import {
  TABLE_CAPACITY,
  seatsFor,
  tableSummaries,
  ticketTypeMeta,
} from '../../../features/ticketing/models/attendee.model';

@Component({
  selector: 'app-admin-tables',
  standalone: true,
  imports: [AdminIconComponent],
  template: `
    <div class="adm-page-head">
      <div>
        <h2>Tables</h2>
        <p>
          {{ tables().length }} {{ tables().length === 1 ? 'table' : 'tables' }} ·
          {{ seated() }} seated · {{ seatsLeft() }} {{ seatsLeft() === 1 ? 'seat' : 'seats' }} left ·
          {{ unassignedCount() }} unassigned
        </p>
      </div>
      <button class="adm-btn" (click)="reload()" [disabled]="loading()">
        <adm-icon name="external" [size]="16" /> Refresh
      </button>
    </div>

    @if (loading()) {
      <div class="adm-loading"><div class="adm-spinner"></div><p>Loading…</p></div>
    } @else {
      @if (tables().length) {
        <div class="tbl-grid">
          @for (t of tables(); track t.table) {
            <div class="adm-card tbl" [class.tbl--full]="t.full">
              <div class="tbl__head">
                <span class="tbl__name">Table {{ t.table }}</span>
                <span
                  class="adm-badge"
                  [class.adm-badge--in]="t.full"
                  [class.adm-badge--out]="!t.full"
                >
                  {{ t.persons }}/{{ capacity }}{{ t.full ? ' · Full' : '' }}
                </span>
              </div>
              <div class="tbl__bar">
                <span [style.width.%]="(t.persons / capacity) * 100"></span>
              </div>
              <p class="tbl__left">
                @if (t.full) {
                  Full — no seats left
                } @else {
                  {{ capacity - t.persons }} {{ capacity - t.persons === 1 ? 'seat' : 'seats' }} left
                }
              </p>
              <ul class="tbl__people">
                @for (a of t.attendees; track a.id) {
                  <li>
                    <span>{{ a.name }}</span>
                    <span class="tbl__seats">{{ meta(a.ticketType).label }} · {{ seats(a.ticketType) }}</span>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      } @else {
        <div class="adm-empty">
          <adm-icon name="attendees" [size]="28" />
          <p style="margin-top:.5rem">No tables assigned yet. Set a table number on the Attendees page.</p>
        </div>
      }
    }
  `,
  styles: [
    `
      .tbl-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 1rem;
      }
      .tbl { padding: 1rem 1.1rem; }
      .tbl--full { border-color: #3fae63; }
      .tbl__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.6rem;
      }
      .tbl__name { font-family: var(--display); font-size: 1.25rem; color: #23201a; }
      .tbl__bar {
        height: 6px;
        border-radius: 999px;
        background: #efeade;
        overflow: hidden;
        margin: 0.7rem 0 0.9rem;
      }
      .tbl__bar span { display: block; height: 100%; background: #c9a227; }
      .tbl--full .tbl__bar span { background: #3fae63; }
      .tbl__left { margin: 0 0 0.9rem; font-size: 0.8rem; color: #8a8270; }
      .tbl--full .tbl__left { color: #3fae63; font-weight: 600; }
      .tbl__people { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
      .tbl__people li {
        display: flex;
        justify-content: space-between;
        gap: 0.6rem;
        font-size: 0.86rem;
        color: #23201a;
      }
      .tbl__seats { color: #8a8270; font-size: 0.76rem; white-space: nowrap; }
    `,
  ],
})
export class TablesComponent {
  private api = inject(AttendeeApiService);

  readonly capacity = TABLE_CAPACITY;
  loading = this.api.loading;
  meta = ticketTypeMeta;
  seats = seatsFor;

  tables = computed(() => tableSummaries(this.api.attendees()));
  seated = computed(() => this.tables().reduce((s, t) => s + t.persons, 0));
  seatsLeft = computed(() =>
    this.tables().reduce((s, t) => s + Math.max(0, TABLE_CAPACITY - t.persons), 0),
  );
  unassignedCount = computed(
    () =>
      this.api
        .attendees()
        .filter((a) => !a.deletedAt && !(a.tableNumber ?? '').trim())
        .reduce((s, a) => s + seatsFor(a.ticketType), 0),
  );

  constructor() {
    afterNextRender(() => this.api.refresh().catch(() => {}));
  }

  reload(): void {
    this.api.refresh().catch(() => {});
  }
}
