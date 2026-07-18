import {
  Component,
  Inject,
  PLATFORM_ID,
  afterNextRender,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LogoComponent } from '../../../../shared/logo/logo.component';
import {
  ApiError,
  AttendeeApiService,
} from '../../services/attendee-api.service';
import { Attendee, ticketTypeMeta } from '../../models/attendee.model';

type State = 'loading' | 'notfound' | 'confirm' | 'success' | 'already';

@Component({
  selector: 'app-ticket-confirm',
  standalone: true,
  imports: [RouterLink, LogoComponent],
  template: `
    <section class="cf">
      <div class="cf__card" [attr.data-state]="state()">
        @switch (state()) {
          @case ('loading') {
            <div class="cf__spinner"></div>
            <p>Verifying ticket…</p>
          }
          @case ('notfound') {
            <span class="cf__icon cf__icon--bad">✕</span>
            <h1>Ticket not found</h1>
            <p>This code doesn’t match any registered guest. Ask the guest to show their ticket link.</p>
            <a routerLink="/" class="btn btn--outline">Back to site</a>
          }
          @case ('confirm') {
            @if (attendee(); as a) {
              <app-logo [size]="56" />
              <span class="cf__eyebrow">Check-in</span>
              <h1>{{ a.name }}</h1>
              <p class="cf__meta">{{ meta(a.ticketType).label }} · Admit {{ meta(a.ticketType).seats }} · <span class="mono">{{ a.ticketCode }}</span></p>
              @if (a.tableNumber) { <p class="cf__table">Table {{ a.tableNumber }}</p> }
              <button class="btn btn--solid cf__btn" (click)="confirm()" [disabled]="working()">
                {{ working() ? 'Checking in…' : 'Confirm check-in' }}
              </button>
              @if (error()) { <p class="cf__error">{{ error() }}</p> }
            }
          }
          @case ('success') {
            @if (attendee(); as a) {
              <span class="cf__icon cf__icon--good">✓</span>
              <h1>Checked in</h1>
              <p class="cf__meta">{{ a.name }} · {{ meta(a.ticketType).label }}</p>
              @if (a.tableNumber) { <p class="cf__table">Table {{ a.tableNumber }}</p> }
              <p class="cf__stamp">Admitted at {{ time(a.checkedInAt) }}</p>
            }
          }
          @case ('already') {
            @if (attendee(); as a) {
              <span class="cf__icon cf__icon--warn">!</span>
              <h1>Already checked in</h1>
              <p class="cf__meta">{{ a.name }} · {{ meta(a.ticketType).label }}</p>
              @if (a.tableNumber) { <p class="cf__table">Table {{ a.tableNumber }}</p> }
              <p class="cf__stamp">This ticket was admitted at {{ time(a.checkedInAt) }}. Do not admit again.</p>
            }
          }
        }
      </div>
    </section>
  `,
  styleUrl: './confirm.component.scss',
})
export class ConfirmComponent {
  private isBrowser: boolean;
  meta = ticketTypeMeta;

  state = signal<State>('loading');
  attendee = signal<Attendee | null>(null);
  working = signal(false);
  error = signal<string | null>(null);

  private code = '';

  constructor(
    private route: ActivatedRoute,
    private api: AttendeeApiService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    afterNextRender(() => this.load());
  }

  private async load(): Promise<void> {
    this.code = this.route.snapshot.paramMap.get('ticketCode') ?? '';
    try {
      const a = await this.api.getByCode(this.code);
      this.attendee.set(a);
      this.state.set(a.checkedIn ? 'already' : 'confirm');
    } catch {
      this.state.set('notfound');
    }
  }

  async confirm(): Promise<void> {
    this.error.set(null);
    this.working.set(true);
    try {
      const a = await this.api.checkIn(this.code);
      this.attendee.set(a);
      this.state.set('success');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.payload) {
        this.attendee.set(e.payload as Attendee);
        this.state.set('already');
      } else if (e instanceof ApiError && e.status === 404) {
        this.state.set('notfound');
      } else {
        this.error.set('Something went wrong. Please try again.');
      }
    } finally {
      this.working.set(false);
    }
  }

  time(iso: string | null): string {
    return iso ? new Date(iso).toLocaleString('en-GB') : '—';
  }
}
