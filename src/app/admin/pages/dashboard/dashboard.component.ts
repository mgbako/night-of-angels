import { Component, computed, inject } from '@angular/core';
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
      <div style="display:flex; gap:.6rem; flex-wrap:wrap">
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
      @media (max-width: 860px) {
        .dash-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class DashboardComponent {
  private api = inject(AttendeeApiService);
  readonly ticketTypes = TICKET_TYPES;
  meta = ticketTypeMeta;

  private list = this.api.attendees;

  registrations = computed(() => this.list().length);

  seats = computed(() =>
    this.list().reduce((sum, a) => sum + ticketTypeMeta(a.ticketType).seats, 0),
  );

  revenue = computed(() =>
    this.list().reduce((sum, a) => sum + ticketTypeMeta(a.ticketType).price, 0),
  );

  checkedIn = computed(() => this.list().filter((a) => a.checkedIn).length);

  attendanceRate = computed(() => {
    const s = this.seats();
    const inSeats = this.list()
      .filter((a) => a.checkedIn)
      .reduce((sum, a) => sum + ticketTypeMeta(a.ticketType).seats, 0);
    return s ? Math.round((inSeats / s) * 100) : 0;
  });

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
}
