import { Component, OnDestroy, afterNextRender, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import { AttendeeApiService } from '../../../features/ticketing/services/attendee-api.service';
import { TICKET_TYPES, ticketTypeMeta } from '../../../features/ticketing/models/attendee.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, AdminIconComponent],
  template: `
    <div class="adm-page-head">
      <div>
        <h2>Overview</h2>
        <p>Ticket sales and check-ins at a glance.</p>
      </div>
      <div style="display:flex; gap:.6rem; flex-wrap:wrap; align-items:center">
        @if (live()) {
          <span title="Check-ins update automatically"
            style="display:inline-flex; align-items:center; gap:.4rem; padding:.3rem .6rem; border-radius:999px; background:rgba(26,127,82,.12); color:#1a7f52; font-size:.78rem; font-weight:600">
            <span style="width:8px; height:8px; border-radius:50%; background:#1a7f52"></span> Live
          </span>
        }
        <a routerLink="/admin/register" class="adm-btn adm-btn--primary">
          <adm-icon name="register" [size]="17" /> Register attendee
        </a>
        <a routerLink="/admin/attendees" class="adm-btn">
          <adm-icon name="attendees" [size]="17" /> View attendees
        </a>
      </div>
    </div>

    <div class="adm-stats">
      <div class="adm-stat">
        <span class="adm-stat__label"><adm-icon name="ticket" [size]="15" /> Revenue</span>
        <div class="adm-stat__value">{{ money(revenue()) }}</div>
        <span class="adm-stat__sub">{{ registrations() }} registrations</span>
      </div>
      <div class="adm-stat">
        <span class="adm-stat__label"><adm-icon name="ticket" [size]="15" /> Tickets sold</span>
        <div class="adm-stat__value">{{ registrations() }}</div>
        <span class="adm-stat__sub">across {{ ticketTypes.length }} ticket types</span>
      </div>
      <div class="adm-stat">
        <span class="adm-stat__label"><adm-icon name="attendees" [size]="15" /> Guests expected</span>
        <div class="adm-stat__value">{{ seats() }}</div>
        <span class="adm-stat__sub">seats reserved</span>
      </div>
      <div class="adm-stat">
        <span class="adm-stat__label"><adm-icon name="check-circle" [size]="15" /> Checked in</span>
        <div class="adm-stat__value">{{ checkedIn() }}</div>
        <span class="adm-stat__sub">{{ attendanceRate() }}% of guests</span>
      </div>
      <div class="adm-stat">
        <span class="adm-stat__label"><adm-icon name="attendees" [size]="15" /> Still to arrive</span>
        <div class="adm-stat__value">{{ stillToArrive() }}</div>
        <span class="adm-stat__sub">guests not yet in</span>
      </div>
      <div class="adm-stat">
        <span class="adm-stat__label"><adm-icon name="check-circle" [size]="15" /> Arrivals · 15 min</span>
        <div class="adm-stat__value">{{ arrivalsLast15() }}</div>
        <span class="adm-stat__sub">recent check-ins</span>
      </div>
    </div>

    <div class="adm-card adm-card--pad dash-progress">
      <div class="dash-progress__head">
        <h3 class="dash-title" style="margin:0">Check-in progress</h3>
        <span class="dash-progress__val">{{ checkedInSeats() }} / {{ seats() }} guests in · {{ attendanceRate() }}%</span>
      </div>
      <div class="adm-meter adm-meter--tall">
        <div class="adm-meter__fill" [style.width.%]="attendanceRate()"></div>
      </div>
    </div>

    <div class="dash-grid">
      <!-- Breakdown -->
      <div class="adm-card adm-card--pad">
        <h3 class="dash-title">Sales by ticket type</h3>
        <div class="breakdown">
          @for (row of breakdown(); track row.value) {
            <div class="breakdown__row">
              <div class="breakdown__top">
                <span class="breakdown__name">{{ row.label }}</span>
                <span class="breakdown__count">{{ row.count }} sold · {{ money(row.revenue) }}</span>
              </div>
              <div class="adm-meter">
                <div class="adm-meter__fill" [style.width.%]="row.share"></div>
              </div>
            </div>
          }
          @if (registrations() === 0) {
            <p class="adm-empty" style="padding:1.5rem 0">No sales yet.</p>
          }
        </div>
      </div>

      <!-- Recent -->
      <div class="adm-card adm-card--pad">
        <h3 class="dash-title">Recent registrations</h3>
        @if (recent().length) {
          <ul class="recent">
            @for (a of recent(); track a.id) {
              <li>
                <div>
                  <span class="recent__name">{{ a.name }}</span>
                  <span class="recent__meta">{{ meta(a.ticketType).label }} · {{ shortDate(a.createdAt) }}</span>
                </div>
                <a [routerLink]="['/tickets', a.ticketCode]" class="adm-btn adm-btn--sm" target="_blank" title="Open ticket">
                  <adm-icon name="external" [size]="15" />
                </a>
              </li>
            }
          </ul>
        } @else {
          <p class="adm-empty" style="padding:1.5rem 0">Nothing yet.</p>
        }
      </div>

      <!-- Check-in by ticket type -->
      <div class="adm-card adm-card--pad">
        <h3 class="dash-title">Check-in by ticket type</h3>
        <div class="breakdown">
          @for (row of checkinByType(); track row.value) {
            <div class="breakdown__row">
              <div class="breakdown__top">
                <span class="breakdown__name">{{ row.label }}</span>
                <span class="breakdown__count">{{ row.checkedIn }} / {{ row.total }} in</span>
              </div>
              <div class="adm-meter">
                <div class="adm-meter__fill adm-meter__fill--green" [style.width.%]="row.share"></div>
              </div>
            </div>
          }
          @if (registrations() === 0) {
            <p class="adm-empty" style="padding:1.5rem 0">No guests yet.</p>
          }
        </div>
      </div>

      <!-- Recently checked in -->
      <div class="adm-card adm-card--pad">
        <h3 class="dash-title">Recently checked in</h3>
        @if (recentCheckins().length) {
          <ul class="recent">
            @for (a of recentCheckins(); track a.id) {
              <li>
                <div>
                  <span class="recent__name">{{ a.name }}</span>
                  <span class="recent__meta">{{ meta(a.ticketType).label }} · {{ checkinTime(a.checkedInAt!) }}</span>
                </div>
                <span class="dash-tick" title="Checked in"><adm-icon name="check-circle" [size]="17" /></span>
              </li>
            }
          </ul>
        } @else {
          <p class="adm-empty" style="padding:1.5rem 0">No check-ins yet.</p>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .dash-grid {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 1rem;
      }
      .dash-title {
        font-family: var(--display);
        font-size: 1.15rem;
        margin: 0 0 1rem;
        color: #23201a;
      }
      .breakdown__row { margin-bottom: 1rem; }
      .breakdown__top {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.4rem;
        font-size: 0.86rem;
      }
      .breakdown__name { font-weight: 600; color: #23201a; }
      .breakdown__count { color: #8a8270; }
      .recent { list-style: none; margin: 0; padding: 0; }
      .recent li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.6rem 0;
        border-bottom: 1px solid #efeade;
      }
      .recent li:last-child { border-bottom: none; }
      .recent__name { display: block; font-weight: 600; font-size: 0.9rem; color: #23201a; }
      .recent__meta { display: block; font-size: 0.78rem; color: #8a8270; }
      .dash-progress { margin-bottom: 1rem; }
      .dash-progress__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.7rem;
      }
      .dash-progress__val { font-size: 0.85rem; font-weight: 600; color: #6a6354; }
      .adm-meter--tall { height: 12px; border-radius: 999px; }
      .adm-meter__fill--green { background: #1a7f52; }
      .dash-tick { color: #1a7f52; display: inline-flex; flex: 0 0 auto; }
      @media (max-width: 860px) {
        .dash-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class DashboardComponent implements OnDestroy {
  private api = inject(AttendeeApiService);
  readonly ticketTypes = TICKET_TYPES;
  meta = ticketTypeMeta;
  readonly live = this.api.live;

  private list = this.api.attendees;

  constructor() {
    afterNextRender(() => {
      this.api.refresh().catch(() => {});
      this.api.startLive();
    });
  }

  ngOnDestroy(): void {
    this.api.stopLive();
  }

  registrations = computed(() => this.list().length);

  seats = computed(() =>
    this.list().reduce((sum, a) => sum + ticketTypeMeta(a.ticketType).seats, 0),
  );

  revenue = computed(() =>
    this.list().reduce((sum, a) => sum + ticketTypeMeta(a.ticketType).price, 0),
  );

  checkedIn = computed(() => this.list().filter((a) => a.checkedIn).length);

  /** Seats represented by checked-in guests (a Couples/Table ticket covers several). */
  checkedInSeats = computed(() =>
    this.list()
      .filter((a) => a.checkedIn)
      .reduce((sum, a) => sum + ticketTypeMeta(a.ticketType).seats, 0),
  );

  attendanceRate = computed(() => {
    const s = this.seats();
    return s ? Math.round((this.checkedInSeats() / s) * 100) : 0;
  });

  /** Seats still expected to walk through the door. */
  stillToArrive = computed(() => Math.max(0, this.seats() - this.checkedInSeats()));

  /** Check-in velocity — guests scanned in within the last 15 minutes. */
  arrivalsLast15 = computed(() => {
    const cutoff = Date.now() - 15 * 60 * 1000;
    return this.list().filter(
      (a) => a.checkedIn && a.checkedInAt && +new Date(a.checkedInAt) >= cutoff,
    ).length;
  });

  /** Most recent arrivals, newest first — a live door feed. */
  recentCheckins = computed(() =>
    this.list()
      .filter((a) => a.checkedIn && a.checkedInAt)
      .sort((a, b) => +new Date(b.checkedInAt!) - +new Date(a.checkedInAt!))
      .slice(0, 6),
  );

  /** Arrivals vs sold, per ticket type. */
  checkinByType = computed(() =>
    TICKET_TYPES.map((t) => {
      const rows = this.list().filter((a) => a.ticketType === t.value);
      const inCount = rows.filter((a) => a.checkedIn).length;
      return {
        value: t.value,
        label: t.label,
        total: rows.length,
        checkedIn: inCount,
        share: rows.length ? Math.round((inCount / rows.length) * 100) : 0,
      };
    }),
  );

  breakdown = computed(() => {
    const total = this.revenue() || 1;
    return TICKET_TYPES.map((t) => {
      const rows = this.list().filter((a) => a.ticketType === t.value);
      const revenue = rows.length * t.price;
      return {
        value: t.value,
        label: t.label,
        count: rows.length,
        revenue,
        share: Math.round((revenue / total) * 100),
      };
    });
  });

  recent = computed(() =>
    [...this.list()]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 6),
  );

  money(n: number): string {
    return '₦' + n.toLocaleString('en-NG');
  }

  shortDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  checkinTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
}
