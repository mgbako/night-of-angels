import {
  Component,
  Inject,
  PLATFORM_ID,
  afterNextRender,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CrestComponent } from '../../../../shared/crest/crest.component';
import {
  ApiError,
  AttendeeApiService,
} from '../../services/attendee-api.service';
import { Attendee, ticketTypeMeta } from '../../models/attendee.model';

type State = 'loading' | 'ready' | 'notfound';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [RouterLink, CrestComponent],
  template: `
    <section class="tk">
      @switch (state()) {
        @case ('loading') {
          <div class="tk__status"><div class="tk__spinner"></div><p>Loading your ticket…</p></div>
        }
        @case ('notfound') {
          <div class="tk__status">
            <h1>Ticket not found</h1>
            <p>We couldn’t find a ticket with that code. Please check the link and try again.</p>
            <a routerLink="/" class="btn btn--outline">Back to site</a>
          </div>
        }
        @case ('ready') {
          @if (attendee(); as a) {
            <article class="ticket" [class.ticket--in]="a.checkedIn">
              <header class="ticket__head">
                <app-crest [size]="40" />
                <div>
                  <span class="ticket__event">A Night of Angels</span>
                  <span class="ticket__sub">Harvest of Internal Peace · Admit {{ meta(a.ticketType).seats }}</span>
                </div>
              </header>

              <div class="ticket__body">
                <div class="ticket__info">
                  <span class="ticket__name">{{ a.name }}</span>
                  <dl>
                    <div><dt>Ticket</dt><dd>{{ meta(a.ticketType).label }}</dd></div>
                    <div><dt>Email</dt><dd>{{ a.email }}</dd></div>
                    <div><dt>Phone</dt><dd>{{ a.phone }}</dd></div>
                    <div><dt>Code</dt><dd class="mono">{{ a.ticketCode }}</dd></div>
                  </dl>
                  @if (a.checkedIn) {
                    <span class="ticket__flag">Checked in</span>
                  }
                </div>

                <div class="ticket__qr">
                  @if (qr(); as src) {
                    <img [src]="src" alt="Ticket QR code" width="220" height="220" />
                  } @else {
                    <div class="tk__spinner"></div>
                  }
                  <span class="ticket__qr-hint">Present this at the door</span>
                </div>
              </div>

              <div class="ticket__actions no-print">
                <button class="btn btn--solid" (click)="download()" [disabled]="!qr()">Download QR</button>
                <button class="btn btn--outline" (click)="print()">Print ticket</button>
              </div>
            </article>
          }
        }
      }
    </section>
  `,
  styleUrl: './ticket-detail.component.scss',
})
export class TicketDetailComponent {
  private isBrowser: boolean;
  meta = ticketTypeMeta;

  state = signal<State>('loading');
  attendee = signal<Attendee | null>(null);
  qr = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private api: AttendeeApiService,
    @Inject(DOCUMENT) private doc: Document,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    afterNextRender(() => this.loadTicket());
  }

  private async loadTicket(): Promise<void> {
    const code = this.route.snapshot.paramMap.get('ticketCode') ?? '';
    try {
      const a = await this.api.getByCode(code);
      this.attendee.set(a);
      this.state.set('ready');
      await this.makeQr(this.api.checkInUrl(a.ticketCode));
    } catch (e) {
      this.state.set(e instanceof ApiError && e.status === 404 ? 'notfound' : 'notfound');
    }
  }

  private async makeQr(url: string): Promise<void> {
    if (!this.isBrowser) return;
    const QRCode = await import('qrcode');
    const dataUrl = await QRCode.toDataURL(url, {
      width: 440,
      margin: 1,
      color: { dark: '#0b0b0a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
    this.qr.set(dataUrl);
  }

  download(): void {
    const src = this.qr();
    const a = this.attendee();
    if (!src || !a) return;
    const link = this.doc.createElement('a');
    link.href = src;
    link.download = `night-of-angels-ticket-${a.ticketCode}.png`;
    link.click();
  }

  print(): void {
    if (this.isBrowser) window.print();
  }
}
