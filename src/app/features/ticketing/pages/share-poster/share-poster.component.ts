import {
  Component,
  Inject,
  PLATFORM_ID,
  afterNextRender,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LogoComponent } from '../../../../shared/logo/logo.component';
import {
  EVENT_ARRIVAL_TIME,
  EVENT_DATE,
  EVENT_HASHTAG,
  INSTAGRAM_HANDLE,
} from '../../../../config/event.config';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Lets a guest drop in their own photo and get back a branded, shareable
 * portrait poster ("I'm attending") — everything is drawn on a canvas, same
 * approach as the ticket QR and the admin "Promote & Share" poster, so it
 * downloads/shares as a plain PNG with no server round-trip.
 */
@Component({
  selector: 'app-share-poster',
  standalone: true,
  imports: [FormsModule, RouterLink, LogoComponent],
  template: `
    <section class="shp">
      <div class="shp__head">
        <app-logo [size]="56" />
        <h1>Share Your Invite</h1>
        <p>Add your photo and get a branded poster to post on Instagram, WhatsApp status or anywhere else.</p>
      </div>

      <div class="shp__grid">
        <div class="shp__panel">
          <label class="shp__field">
            <span>Your name <em>(used only for the file name)</em></span>
            <input type="text" [(ngModel)]="name" placeholder="e.g. Ada Obi" />
          </label>

          <div class="shp__field">
            <span>Your photo</span>
            <label class="shp__drop" [class.shp__drop--has]="hasPhoto()">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                (change)="onPhoto($event)"
              />
              @if (hasPhoto()) {
                <span class="shp__drop-name">📷 Photo added</span>
                <span class="shp__drop-hint">Tap to replace</span>
              } @else {
                <span class="shp__drop-name">Tap to upload a photo</span>
                <span class="shp__drop-hint">JPG, PNG or WEBP · max 8 MB</span>
              }
            </label>
            @if (photoError()) { <span class="shp__err">{{ photoError() }}</span> }
          </div>

          <div class="shp__actions">
            <button class="btn btn--solid btn--block" (click)="download()" [disabled]="!posterUrl() || rendering()">
              Download poster
            </button>
            <button class="btn btn--outline btn--block" (click)="share()" [disabled]="!posterUrl() || rendering()">
              {{ shared() ? 'Shared!' : 'Share' }}
            </button>
          </div>
        </div>

        <div class="shp__preview">
          @if (posterUrl(); as src) {
            <img [src]="src" alt="Your A Night of Angels share poster" />
          } @else {
            <div class="shp__spinner-wrap"><div class="shp__spinner"></div></div>
          }
        </div>
      </div>

      <a routerLink="/" class="shp__back">← Back to site</a>
    </section>
  `,
  styleUrl: './share-poster.component.scss',
})
export class SharePosterComponent {
  private isBrowser: boolean;

  name = '';
  photoError = signal<string | null>(null);
  posterUrl = signal<string | null>(null);
  rendering = signal(false);
  hasPhoto = signal(false);
  shared = signal(false);

  private photoImg: HTMLImageElement | null = null;

  readonly eventDateLabel = EVENT_DATE.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
  readonly arrivalTime = EVENT_ARRIVAL_TIME;
  readonly hashtag = EVENT_HASHTAG;
  readonly instagram = INSTAGRAM_HANDLE;
  readonly reserveLink = 'nightofangels2026.com/reserve';

  constructor(
    private route: ActivatedRoute,
    @Inject(DOCUMENT) private doc: Document,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    afterNextRender(() => {
      this.name = this.route.snapshot.queryParamMap.get('name') ?? '';
      this.render();
    });
  }

  onPhoto(event: Event): void {
    this.photoError.set(null);
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      this.photoError.set('Please upload a JPG, PNG or WEBP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.photoError.set('That photo is larger than 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        this.photoImg = await this.loadImage(String(reader.result));
        this.hasPhoto.set(true);
        this.shared.set(false);
        await this.render();
      } catch {
        this.photoError.set('Could not read that photo. Try another.');
      }
    };
    reader.onerror = () => this.photoError.set('Could not read that photo. Try another.');
    reader.readAsDataURL(file);
  }

  download(): void {
    const src = this.posterUrl();
    if (!src) return;
    const slug = this.name.trim()
      ? this.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : 'guest';
    const a = this.doc.createElement('a');
    a.href = src;
    a.download = `night-of-angels-${slug || 'guest'}-poster.png`;
    a.click();
  }

  /** Native share sheet with the poster file where supported, else a WhatsApp text fallback. */
  async share(): Promise<void> {
    const src = this.posterUrl();
    if (!src) return;
    const msg = `I will be at ${this.hashtag}! Reserve your seat: https://${this.reserveLink}`;
    const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
    if (nav.canShare) {
      try {
        const blob = await (await fetch(src)).blob();
        const file = new File([blob], 'night-of-angels-poster.png', { type: 'image/png' });
        if (nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], text: msg, title: 'A Night of Angels' });
          this.shared.set(true);
          return;
        }
      } catch {
        /* user cancelled or sharing unavailable — fall through to link */
      }
    }
    this.doc.defaultView?.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  }

  private async render(): Promise<void> {
    if (!this.isBrowser) return;
    this.rendering.set(true);
    try {
      const canvas = await this.buildPoster();
      this.posterUrl.set(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error('Poster render failed', e);
    } finally {
      this.rendering.set(false);
    }
  }

  private async buildPoster(): Promise<HTMLCanvasElement> {
    const W = 1080;
    const H = 1350;
    const canvas = this.doc.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Wait for brand fonts so canvas text matches the site.
    await (this.doc as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;

    const ivory = '#f7f4ec';
    const ink = '#1a1610';
    const soft = '#6c6555';
    const gold = '#b0891d';

    ctx.fillStyle = ivory;
    ctx.fillRect(0, 0, W, H);

    // Decorative double frame.
    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    this.roundRect(ctx, 34, 34, W - 68, H - 68, 26);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(176,137,29,.4)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 48, 48, W - 96, H - 96, 20);
    ctx.stroke();

    ctx.textAlign = 'center';
    let y = 90;

    // Emblem.
    const logo = await this.loadImage('/noa-logo.png').catch(() => null);
    const logoSize = 126;
    if (logo) ctx.drawImage(logo, (W - logoSize) / 2, y, logoSize, logoSize);
    y += logoSize + 46;

    ctx.fillStyle = gold;
    this.text(ctx, 'A NIGHT OF ANGELS', W / 2, y, '600 52px "Cormorant Garamond", Georgia, serif', 2);
    y += 32;
    ctx.fillStyle = soft;
    this.text(ctx, 'HARVEST DINNER 2026', W / 2, y, '500 19px Jost, Arial, sans-serif', 6);
    y += 30;
    ctx.fillStyle = gold;
    this.text(ctx, 'Harvest of Everlasting Peace', W / 2, y, 'italic 500 23px "Cormorant Garamond", Georgia, serif', 0);
    y += 22;
    ctx.fillStyle = soft;
    this.text(ctx, 'ISAIAH 26:3', W / 2, y, '500 12px Jost, Arial, sans-serif', 3);
    y += 40;

    // Photo frame.
    const cx = W / 2;
    const r = 215;
    const cy = y + r;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 16, 0, Math.PI * 2);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(176,137,29,.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    if (this.photoImg) {
      this.drawCoverImage(ctx, this.photoImg, cx, cy, r);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#efe9da';
      ctx.fill();
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = gold;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.fillStyle = soft;
      this.text(ctx, 'YOUR PHOTO', cx, cy - 8, '500 19px Jost, Arial, sans-serif', 3);
      this.text(ctx, 'GOES HERE', cx, cy + 20, '500 19px Jost, Arial, sans-serif', 3);
    }
    y = cy + r + 40;

    // "I just bought my ticket" ribbon.
    const ribbonH = 60;
    this.roundRectFill(ctx, W / 2 - 320, y, 640, ribbonH, ribbonH / 2, gold);
    ctx.fillStyle = '#fff';
    this.text(ctx, 'I JUST BOUGHT MY DINNER TICKET!', W / 2, y + ribbonH / 2 + 9, '700 26px Jost, Arial, sans-serif', 0.5);
    y += ribbonH + 34;

    ctx.fillStyle = ink;
    this.text(ctx, 'I will be at', W / 2, y, 'italic 500 25px "Cormorant Garamond", Georgia, serif', 0);
    y += 44;
    ctx.fillStyle = gold;
    this.text(ctx, this.hashtag, W / 2, y, '700 44px Jost, Arial, sans-serif', 0.5);
    y += 36;
    ctx.fillStyle = soft;
    this.text(ctx, this.instagram, W / 2, y, '500 19px Jost, Arial, sans-serif', 1);
    y += 36;

    // Reserve pill.
    const pillH = 48;
    this.roundRectFill(ctx, W / 2 - 240, y, 480, pillH, pillH / 2, gold);
    ctx.fillStyle = '#fff';
    this.text(ctx, this.reserveLink, W / 2, y + pillH / 2 + 7, '600 19px Jost, Arial, sans-serif', 0.5);
    y += pillH + 30;

    this.divider(ctx, y, gold);
    y += 30;

    // Event detail row — no street address: the venue is only revealed to
    // confirmed guests, so the public poster stays at city level.
    this.detailCol(ctx, W * 0.21, y, 'DATE', this.eventDateLabel, ink, gold);
    this.detailCol(ctx, W * 0.5, y, 'ARRIVAL', this.arrivalTime.toUpperCase(), ink, gold);
    this.detailCol(ctx, W * 0.8, y, 'LOCATION', 'LAGOS, NIGERIA', ink, gold);
    y += 54;

    // Title sponsor.
    const sponsor = await this.loadImage('/partners/africhange.png').catch(() => null);
    if (sponsor) {
      ctx.fillStyle = soft;
      this.text(ctx, 'TITLE SPONSOR', W / 2, y, '600 15px Jost, Arial, sans-serif', 4);
      y += 14;
      const lh = 44;
      const ratio = sponsor.naturalWidth / sponsor.naturalHeight || 4;
      const lw = lh * ratio;
      ctx.drawImage(sponsor, (W - lw) / 2, y, lw, lh);
    }

    return canvas;
  }

  /** Draw an image cover-fit and centered within a circular clip. */
  private drawCoverImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    cx: number,
    cy: number,
    r: number,
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    const size = r * 2;
    const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  }

  /** A short gold hairline with a diamond accent, centered on the poster. */
  private divider(ctx: CanvasRenderingContext2D, y: number, gold: string): void {
    const cx = ctx.canvas.width / 2;
    ctx.strokeStyle = 'rgba(176,137,29,.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 220, y);
    ctx.lineTo(cx - 28, y);
    ctx.moveTo(cx + 28, y);
    ctx.lineTo(cx + 220, y);
    ctx.stroke();
    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = gold;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }

  /** A small caption + value, stacked and centered at x. */
  private detailCol(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    label: string,
    value: string,
    ink: string,
    gold: string,
  ): void {
    ctx.fillStyle = gold;
    this.text(ctx, label, x, y, '600 13px Jost, Arial, sans-serif', 3);
    ctx.fillStyle = ink;
    this.text(ctx, value, x, y + 28, '600 20px "Cormorant Garamond", Georgia, serif', 0.5);
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

  private roundRectFill(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    color: string,
  ): void {
    ctx.fillStyle = color;
    this.roundRect(ctx, x, y, w, h, r);
    ctx.fill();
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject();
      img.src = src;
    });
  }
}
