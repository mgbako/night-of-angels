import {
  Component,
  Inject,
  PLATFORM_ID,
  afterNextRender,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import { EVENT_DATE, EVENT_ARRIVAL_NOTE } from '../../../config/event.config';

type Theme = 'dark' | 'light';

/**
 * Generates a shareable "Scan to Reserve" asset for social media and printed
 * drop banners: a branded portrait poster (logo + QR + event details) and a
 * plain high-res QR. Everything is drawn on a canvas so it downloads as PNG.
 */
@Component({
  selector: 'app-admin-promote',
  standalone: true,
  imports: [FormsModule, AdminIconComponent],
  template: `
    <div class="adm-page-head">
      <div>
        <h2>Promote &amp; Share</h2>
        <p>A branded QR that sends guests straight to the reservation page — for social posts and printed banners.</p>
      </div>
    </div>

    <div class="promo">
      <div class="promo__controls adm-card">
        <label class="promo__field">
          <span>Reservation link</span>
          <input type="url" [(ngModel)]="link" (ngModelChange)="scheduleRender()" />
        </label>

        <div class="promo__field">
          <span>Poster style</span>
          <div class="promo__seg">
            <button [class.on]="theme() === 'dark'" (click)="setTheme('dark')">Dark</button>
            <button [class.on]="theme() === 'light'" (click)="setTheme('light')">Light (all-white)</button>
          </div>
        </div>

        <div class="promo__actions">
          <button class="adm-btn adm-btn--primary" (click)="downloadPoster()" [disabled]="!posterUrl()">
            <adm-icon name="download" [size]="16" /> Download poster
          </button>
          <button class="adm-btn" (click)="downloadQr()" [disabled]="!qrUrl()">
            <adm-icon name="download" [size]="16" /> QR only
          </button>
          <button class="adm-btn" (click)="copyLink()">
            <adm-icon name="qr" [size]="16" /> {{ copied() ? 'Copied!' : 'Copy link' }}
          </button>
          <button class="adm-btn wa-share" (click)="shareWhatsApp()">
            <adm-icon name="whatsapp" [size]="16" /> Share to WhatsApp
          </button>
        </div>

        <p class="promo__hint">
          The poster is 1080 × 1350 — ideal for Instagram, WhatsApp status and status flyers.
          Scan test: open your phone camera and point it at the code.
        </p>
      </div>

      <div class="promo__preview">
        @if (posterUrl(); as src) {
          <img [src]="src" alt="Reservation QR poster preview" />
        } @else {
          <div class="adm-loading"><div class="adm-spinner"></div><p>Rendering…</p></div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .promo { display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; align-items: start; }
      @media (max-width: 860px) { .promo { grid-template-columns: 1fr; } }
      .promo__controls { padding: 1.2rem; display: grid; gap: 1.1rem; }
      .promo__field { display: grid; gap: 0.4rem; }
      .promo__field > span { font-size: 0.8rem; color: var(--adm-muted, #8a8270); letter-spacing: 0.03em; }
      .promo__field input {
        padding: 0.65rem 0.75rem; border: 1px solid var(--adm-line, #d9d2c2);
        border-radius: 8px; font: inherit; font-size: 0.9rem;
        background: var(--adm-surface, #fff); color: var(--adm-ink, #1a1610);
      }
      .promo__field input:focus { outline: none; border-color: var(--adm-gold, #b0891d); }
      .promo__seg { display: inline-flex; border: 1px solid var(--adm-line, #d9d2c2); border-radius: 8px; overflow: hidden; }
      .promo__seg button {
        flex: 1; padding: 0.55rem 0.6rem; background: transparent; border: 0; cursor: pointer;
        font: inherit; font-size: 0.85rem; color: var(--adm-muted, #6c6555);
      }
      .promo__seg button.on { background: var(--adm-gold, #b0891d); color: #17140f; }
      .promo__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
      .promo__hint { font-size: 0.78rem; color: #8a8270; margin: 0; line-height: 1.5; }
      .promo__preview {
        display: flex; align-items: flex-start; justify-content: center; min-height: 300px;
      }
      .promo__preview img {
        width: 100%; max-width: 420px; height: auto; border-radius: 12px;
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
      }
    `,
  ],
})
export class PromoteComponent {
  private isBrowser: boolean;

  link = '';
  theme = signal<Theme>('dark');
  posterUrl = signal<string | null>(null);
  qrUrl = signal<string | null>(null);
  copied = signal(false);

  private renderTimer?: ReturnType<typeof setTimeout>;

  constructor(
    @Inject(DOCUMENT) private doc: Document,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    afterNextRender(() => {
      this.link = `${this.doc.location.origin}/reserve`;
      this.render();
    });
  }

  setTheme(t: Theme): void {
    this.theme.set(t);
    this.render();
  }

  scheduleRender(): void {
    clearTimeout(this.renderTimer);
    this.renderTimer = setTimeout(() => this.render(), 400);
  }

  /**
   * Share to WhatsApp. On mobile, the native share sheet lets the user attach
   * the poster image and pick WhatsApp; elsewhere we open WhatsApp pre-filled
   * with the invite text and reservation link.
   */
  async shareWhatsApp(): Promise<void> {
    const when = EVENT_DATE.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const msg =
      `You're invited to A Night of Angels — Harvest Dinner 2026.\n` +
      `${when} · ${EVENT_ARRIVAL_NOTE}.\n` +
      `Reserve your seat: ${this.link}`;

    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
    };
    const poster = this.posterUrl();
    if (poster && nav.canShare) {
      try {
        const blob = await (await fetch(poster)).blob();
        const file = new File([blob], 'night-of-angels-reserve-poster.png', {
          type: 'image/png',
        });
        if (nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], text: msg, title: 'A Night of Angels' });
          return;
        }
      } catch {
        /* user cancelled or sharing unavailable — fall through to link */
      }
    }
    this.doc.defaultView?.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener',
    );
  }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  private async render(): Promise<void> {
    if (!this.isBrowser || !this.link) return;
    try {
      const qr = await this.buildQr(this.link, 720);
      this.qrUrl.set(qr.toDataURL('image/png'));
      const poster = await this.buildPoster(qr);
      this.posterUrl.set(poster.toDataURL('image/png'));
    } catch (e) {
      console.error('Poster render failed', e);
    }
  }

  /** QR with the emblem on a white plate in the centre. */
  private async buildQr(url: string, size: number): Promise<HTMLCanvasElement> {
    const mod = (await import('qrcode')) as unknown as {
      default?: typeof import('qrcode');
    } & typeof import('qrcode');
    const QRCode = mod.default ?? mod;

    const canvas = this.doc.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    await QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 1,
      color: { dark: '#0b0b0a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const logo = await this.loadImage('/noa-logo.png').catch(() => null);
      if (logo) {
        const box = Math.round(size * 0.24);
        const c = size / 2;
        const half = box / 2;
        const pad = Math.round(box * 0.1);
        ctx.fillStyle = '#ffffff';
        this.roundRect(ctx, c - half - pad, c - half - pad, box + pad * 2, box + pad * 2, box * 0.22);
        ctx.fill();
        ctx.drawImage(logo, c - half, c - half, box, box);
      }
    }
    return canvas;
  }

  private async buildPoster(qr: HTMLCanvasElement): Promise<HTMLCanvasElement> {
    const W = 1080;
    const H = 1350;
    const dark = this.theme() === 'dark';
    const canvas = this.doc.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Wait for brand fonts so canvas text matches the site.
    await (this.doc as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;

    const ink = dark ? '#0b0b0a' : '#f7f4ec';
    const text = dark ? '#f4f1e7' : '#1a1610';
    const soft = dark ? '#b8b0a0' : '#6c6555';
    const gold = '#b0891d';

    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, W, H);

    // Decorative double frame.
    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    this.roundRect(ctx, 34, 34, W - 68, H - 68, 26);
    ctx.stroke();
    ctx.strokeStyle = dark ? 'rgba(176,137,29,.35)' : 'rgba(176,137,29,.4)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 48, 48, W - 96, H - 96, 20);
    ctx.stroke();

    ctx.textAlign = 'center';

    // Emblem.
    const logo = await this.loadImage('/noa-logo.png').catch(() => null);
    if (logo) {
      const s = 210;
      if (!dark) {
        // On the light poster, give it a faint gold ring for definition.
      }
      ctx.drawImage(logo, (W - s) / 2, 92, s, s);
    }

    // Title + subtitle.
    ctx.fillStyle = gold;
    this.text(ctx, 'A NIGHT OF ANGELS', W / 2, 372, '600 62px "Cormorant Garamond", Georgia, serif', 2);
    ctx.fillStyle = soft;
    this.text(ctx, 'HARVEST DINNER 2026', W / 2, 420, '500 24px Jost, Arial, sans-serif', 6);

    // Call to action.
    ctx.fillStyle = text;
    this.text(ctx, 'SCAN TO RESERVE YOUR SEAT', W / 2, 500, '600 30px Jost, Arial, sans-serif', 3);

    // White QR plate.
    const plate = 560;
    const px = (W - plate) / 2;
    const py = 540;
    ctx.fillStyle = '#ffffff';
    this.roundRect(ctx, px, py, plate, plate, 28);
    ctx.fill();
    const qrSize = plate - 64;
    ctx.drawImage(qr, px + 32, py + 32, qrSize, qrSize);

    // Date + arrival.
    const when = EVENT_DATE.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).toUpperCase();
    ctx.fillStyle = text;
    this.text(ctx, when, W / 2, py + plate + 76, '600 30px "Cormorant Garamond", Georgia, serif', 1);
    ctx.fillStyle = gold;
    this.text(ctx, EVENT_ARRIVAL_NOTE.toUpperCase(), W / 2, py + plate + 120, '500 22px Jost, Arial, sans-serif', 4);

    // Link footer.
    ctx.fillStyle = soft;
    this.text(ctx, this.displayLink(), W / 2, H - 70, '400 22px Jost, Arial, sans-serif', 1);

    return canvas;
  }

  /** Draw centred text with optional letter-spacing (px). */
  private text(
    ctx: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    font: string,
    spacing = 0,
  ): void {
    ctx.font = font;
    const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    try {
      c.letterSpacing = `${spacing}px`;
      ctx.fillText(value, x, y);
    } finally {
      c.letterSpacing = '0px';
    }
  }

  private displayLink(): string {
    return this.link.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject();
      img.src = src;
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

  downloadPoster(): void {
    this.save(this.posterUrl(), 'night-of-angels-reserve-poster.png');
  }

  downloadQr(): void {
    this.save(this.qrUrl(), 'night-of-angels-reserve-qr.png');
  }

  private save(src: string | null, filename: string): void {
    if (!src) return;
    const a = this.doc.createElement('a');
    a.href = src;
    a.download = filename;
    a.click();
  }
}
