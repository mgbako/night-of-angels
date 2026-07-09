import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import { AttendeeApiService } from '../../../features/ticketing/services/attendee-api.service';
import { TICKET_TYPES } from '../../../features/ticketing/models/attendee.model';

@Component({
  selector: 'app-admin-tickets',
  standalone: true,
  imports: [RouterLink, AdminIconComponent],
  template: `
    <div class="adm-page-head">
      <div>
        <h2>Ticketing</h2>
        <p>Sales and check-ins by ticket type.</p>
      </div>
      <a routerLink="/admin/register" class="adm-btn adm-btn--primary">
        <adm-icon name="register" [size]="17" /> Register
      </a>
    </div>

    <div class="tkt-grid">
      @for (row of rows(); track row.value) {
        <div class="adm-card adm-card--pad tkt">
          <div class="tkt__head">
            <div>
              <h3>{{ row.label }}</h3>
              <span class="tkt__price">₦{{ row.price.toLocaleString() }} · {{ row.seats }} seat(s)</span>
            </div>
            <span class="tkt__sold">{{ row.count }}</span>
          </div>

          <div class="tkt__stats">
            <div>
              <span class="tkt__k">Revenue</span>
              <span class="tkt__v">₦{{ row.revenue.toLocaleString() }}</span>
            </div>
            <div>
              <span class="tkt__k">Guests</span>
              <span class="tkt__v">{{ row.guests }}</span>
            </div>
            <div>
              <span class="tkt__k">Checked in</span>
              <span class="tkt__v">{{ row.checkedIn }}</span>
            </div>
          </div>

          <div class="tkt__meter">
            <div class="tkt__meter-top">
              <span>Check-in progress</span>
              <span>{{ row.rate }}%</span>
            </div>
            <div class="adm-meter"><div class="adm-meter__fill" [style.width.%]="row.rate"></div></div>
          </div>
        </div>
      }
    </div>

    <p class="tkt-note">
      Prices mirror the public
      <a routerLink="/" fragment="tickets" target="_blank">Tickets section</a>.
      Editing ticket types &amp; capacities will be enabled once the backend is connected.
    </p>
  `,
  styles: [
    `
      .tkt-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
      }
      .tkt__head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .tkt__head h3 { font-family: var(--display); font-size: 1.3rem; margin: 0; color: #23201a; }
      .tkt__price { font-size: 0.8rem; color: #8a8270; }
      .tkt__sold {
        font-family: var(--display);
        font-size: 2rem;
        font-weight: 600;
        color: #9a7d1f;
        line-height: 1;
      }
      .tkt__stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
        padding: 0.9rem 0;
        border-top: 1px solid #efeade;
        border-bottom: 1px solid #efeade;
        margin-bottom: 0.9rem;
      }
      .tkt__k { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #8a8270; }
      .tkt__v { display: block; font-weight: 600; color: #23201a; font-size: 0.95rem; margin-top: 0.15rem; }
      .tkt__meter-top {
        display: flex;
        justify-content: space-between;
        font-size: 0.78rem;
        color: #8a8270;
        margin-bottom: 0.35rem;
      }
      .tkt-note { margin-top: 1.2rem; font-size: 0.82rem; color: #8a8270; }
      .tkt-note a { color: #9a7d1f; text-decoration: underline; }
      @media (max-width: 860px) { .tkt-grid { grid-template-columns: 1fr; } }
    `,
  ],
})
export class TicketsComponent {
  private api = inject(AttendeeApiService);
  private list = this.api.attendees;

  rows = computed(() =>
    TICKET_TYPES.map((t) => {
      const rows = this.list().filter((a) => a.ticketType === t.value);
      const checkedIn = rows.filter((a) => a.checkedIn).length;
      return {
        value: t.value,
        label: t.label,
        price: t.price,
        seats: t.seats,
        count: rows.length,
        revenue: rows.length * t.price,
        guests: rows.length * t.seats,
        checkedIn,
        rate: rows.length ? Math.round((checkedIn / rows.length) * 100) : 0,
      };
    }),
  );
}
