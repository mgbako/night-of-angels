import {
  Component,
  Inject,
  PLATFORM_ID,
  afterNextRender,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LogoComponent } from '../../../../shared/logo/logo.component';
import { AttendeeApiService } from '../../services/attendee-api.service';
import { Attendee, ticketTypeMeta } from '../../models/attendee.model';
import { EVENT_DATE, EVENT_ARRIVAL_NOTE } from '../../../../config/event.config';

type State = 'loading' | 'ready' | 'notfound';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [RouterLink, LogoComponent],
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
                <app-logo [size]="56" />
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
                    <div><dt>When</dt><dd>{{ eventDateLabel }}</dd></div>
                    <div><dt>Arrival</dt><dd>{{ arrivalNote }}</dd></div>
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
                    <img [src]="src" alt="Ticket QR code with ticket number" width="220" />
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
  readonly arrivalNote = EVENT_ARRIVAL_NOTE;
  readonly eventDateLabel = EVENT_DATE.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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

    // Load the ticket first. Only a real lookup failure means "not found".
    let attendee;
    try {
      attendee = await this.api.getByCode(code);
    } catch {
      this.state.set('notfound');
      return;
    }
    this.attendee.set(attendee);
    this.state.set('ready');

    // QR is best-effort: a failure here must NOT hide the ticket.
    try {
      await this.makeQr(this.api.checkInUrl(attendee.ticketCode), attendee.ticketCode);
    } catch (e) {
      console.error('QR generation failed', e);
    }
  }

  private async makeQr(url: string, code: string): Promise<void> {
    if (!this.isBrowser) return;
    // qrcode is CommonJS: under dynamic import its API sits on `.default`.
    const mod = (await import('qrcode')) as unknown as {
      default?: typeof import('qrcode');
    } & typeof import('qrcode');
    const QRCode = mod.default ?? mod;

    const size = 440;
    const qrCanvas = this.doc.createElement('canvas');
    qrCanvas.width = size;
    qrCanvas.height = size;
    // 'H' error correction (~30%) lets the centred logo cover the middle
    // without breaking scannability.
    await QRCode.toCanvas(qrCanvas, url, {
      width: size,
      margin: 1,
      color: { dark: '#0b0b0a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });

    // Overlay the event emblem in the centre, on a white rounded plate.
    try {
      await this.overlayLogo(qrCanvas);
    } catch {
      // If the logo can't be drawn (e.g. load blocked), keep the plain QR.
    }

    // Compose onto a taller canvas so the ticket number is printed on the image.
    const footer = 96;
    const out = this.doc.createElement('canvas');
    out.width = size;
    out.height = size + footer;
    const ctx = out.getContext('2d');
    if (!ctx) {
      this.qr.set(qrCanvas.toDataURL('image/png'));
      return;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(qrCanvas, 0, 0);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#b0891d';
    ctx.font = '600 17px Jost, Arial, sans-serif';
    ctx.fillText('TICKET NUMBER', size / 2, size + 30);
    ctx.fillStyle = '#0b0b0a';
    ctx.font = '700 30px "Courier New", monospace';
    ctx.fillText(code.toUpperCase(), size / 2, size + 66);

    this.qr.set(out.toDataURL('image/png'));
  }

  private overlayLogo(canvas: HTMLCanvasElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject();
      const img = new Image();
      img.onload = () => {
        const size = canvas.width;
        const box = Math.round(size * 0.26); // emblem size
        const c = size / 2;
        const half = box / 2;
        const pad = Math.round(box * 0.1);

        // White rounded plate behind the logo (clears QR modules underneath).
        ctx.fillStyle = '#ffffff';
        this.roundRect(ctx, c - half - pad, c - half - pad, box + pad * 2, box + pad * 2, box * 0.22);
        ctx.fill();
        ctx.strokeStyle = 'rgba(176,137,29,.5)';
        ctx.lineWidth = Math.max(1.5, size * 0.004);
        ctx.stroke();

        // Full emblem (transparent PNG), drawn to fit the plate.
        ctx.drawImage(img, c - half, c - half, box, box);
        resolve();
      };
      img.onerror = () => reject();
      img.src = '/noa-logo.png';
    });
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
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
