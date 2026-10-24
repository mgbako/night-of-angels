import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  afterNextRender,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import jsQR from 'jsqr';
import { AdminIconComponent } from './admin-icon.component';
import {
  Attendee,
  genderLabel,
  seatsFor,
  specificDrinksLabel,
  ticketTypeLabel,
} from '../../features/ticketing/models/attendee.model';

/**
 * Full-screen camera QR scanner for guest check-in, with a manual code
 * entry fallback for devices without a usable camera. Decoding runs
 * entirely client-side via jsQR — no frames leave the device.
 *
 * A scan doesn't check anyone in by itself: the parent resolves the code and
 * calls showGuest(), the door staff confirm the guest's details, then tap
 * Check in (emits `checkIn`).
 */
@Component({
  selector: 'adm-qr-scanner',
  standalone: true,
  imports: [FormsModule, AdminIconComponent],
  template: `
    <div class="qr-backdrop" (click)="close.emit()"></div>
    <div class="qr-modal" role="dialog" aria-label="Scan ticket QR code">
      <div class="qr-modal__head">
        <h3>Scan ticket</h3>
        <button class="qr-close" (click)="close.emit()" aria-label="Close scanner">
          <adm-icon name="close" [size]="18" />
        </button>
      </div>

      @if (guest(); as g) {
        <div class="qr-guest" [class.qr-guest--in]="g.checkedIn">
          <div class="qr-guest__status">
            @if (g.checkedIn) {
              <adm-icon name="check" [size]="16" /> Checked in{{ g.checkedInAt ? ' · ' + time(g.checkedInAt) : '' }}
            } @else {
              Not checked in yet
            }
          </div>
          <h4 class="qr-guest__name">{{ g.name }}</h4>
          <dl class="qr-guest__dl">
            <div>
              <dt>Ticket</dt>
              <dd>{{ ticketTypeLabel(g.ticketType) }} · admits {{ seatsFor(g.ticketType) }}</dd>
            </div>
            <div><dt>Code</dt><dd class="qr-guest__code">{{ g.ticketCode }}</dd></div>
            <div><dt>Table</dt><dd>{{ g.tableNumber || '—' }}</dd></div>
            <div><dt>Gender</dt><dd>{{ genderLabel(g.gender) }}</dd></div>
            <div><dt>Phone</dt><dd>{{ g.phone || '—' }}</dd></div>
            <div><dt>Drink(s)</dt><dd>{{ specificDrinksLabel(g.specificDrinks) }}</dd></div>
            @if (g.ticketType === 'COUPLES' && (g.partnerGender || g.partnerSpecificDrinks?.length)) {
              <div>
                <dt>Partner</dt>
                <dd>
                  {{ genderLabel(g.partnerGender) }}@if (g.partnerSpecificDrinks?.length) { · {{ specificDrinksLabel(g.partnerSpecificDrinks) }} }
                </dd>
              </div>
            }
            @if (g.ticketType === 'TABLE' && g.tableGuests?.length) {
              <div>
                <dt>Guests</dt>
                <dd>
                  @for (t of g.tableGuests; track $index) {
                    <span class="qr-guest__party">{{ t.name || 'Guest' }}</span>
                  }
                </dd>
              </div>
            }
          </dl>
        </div>
      }

      @if (lastFeedback(); as f) {
        <div class="qr-feedback" [class.qr-feedback--err]="!f.ok">{{ f.msg }}</div>
      }

      @if (guest(); as g) {
        <div class="qr-guest__actions">
          <button class="adm-btn adm-btn--ghost" (click)="scanNext()" [disabled]="checkingIn()">
            <adm-icon name="qr" [size]="16" /> Scan next
          </button>
          @if (!g.checkedIn) {
            <button class="adm-btn adm-btn--primary" (click)="checkIn.emit(g)" [disabled]="checkingIn()">
              <adm-icon name="check" [size]="16" /> {{ checkingIn() ? 'Checking in…' : 'Check in' }}
            </button>
          }
        </div>
      }

      <div class="qr-video-wrap" [hidden]="guest()">
        <video #video class="qr-video" muted playsinline [hidden]="!cameraReady()"></video>
        @if (!cameraReady()) {
          <div class="qr-video-fallback">
            @if (cameraError()) {
              <adm-icon name="alert" [size]="26" />
              <p>{{ cameraError() }}</p>
            } @else {
              <div class="qr-spinner"></div>
              <p>Starting camera…</p>
            }
          </div>
        }
        @if (cameraReady()) {
          <div class="qr-frame"></div>
        }
      </div>

      @if (!guest()) {
        <p class="qr-hint">Point the camera at the QR code on the guest's ticket.</p>

        <div class="qr-manual">
          <input
            type="text"
            placeholder="Or enter ticket code manually…"
            [ngModel]="manualCode()"
            (ngModelChange)="manualCode.set($event)"
            (keydown.enter)="submitManual()"
            aria-label="Ticket code"
          />
          <button class="adm-btn adm-btn--primary" (click)="submitManual()" [disabled]="!manualCode().trim()">
            Look up
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .qr-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(20, 17, 12, 0.55);
        z-index: 200;
      }
      .qr-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(420px, calc(100vw - 2rem));
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
        background: var(--adm-surface);
        border-radius: 16px;
        padding: 1.1rem;
        z-index: 201;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
      }
      .qr-modal__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .qr-modal__head h3 {
        margin: 0;
        font-family: var(--display);
        font-size: 1.15rem;
        color: #23201a;
      }
      .qr-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        color: #8a8270;
        border-radius: 8px;
        cursor: pointer;
      }
      .qr-close:hover {
        background: #f3efe3;
        color: #23201a;
      }
      .qr-video-wrap {
        position: relative;
        width: 100%;
        aspect-ratio: 1 / 1;
        background: #17140f;
        border-radius: 12px;
        overflow: hidden;
      }
      .qr-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .qr-frame {
        position: absolute;
        inset: 12%;
        border: 3px solid rgba(201, 162, 39, 0.85);
        border-radius: 14px;
        pointer-events: none;
      }
      .qr-video-fallback {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        color: #cfc8b5;
        text-align: center;
        padding: 1rem;
      }
      .qr-video-fallback p {
        margin: 0;
        font-size: 0.86rem;
      }
      .qr-spinner {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid rgba(201, 162, 39, 0.3);
        border-top-color: #c9a227;
        animation: qr-spin 0.8s linear infinite;
      }
      @keyframes qr-spin {
        to {
          transform: rotate(360deg);
        }
      }
      .qr-hint {
        margin: 0;
        font-size: 0.8rem;
        color: #8a8270;
        text-align: center;
      }
      .qr-feedback {
        padding: 0.6rem 0.8rem;
        border-radius: 10px;
        background: rgba(63, 174, 99, 0.14);
        color: #2a7a46;
        font-size: 0.86rem;
        font-weight: 600;
        text-align: center;
      }
      .qr-feedback--err {
        background: rgba(201, 76, 60, 0.12);
        color: #b4402f;
      }
      .qr-video-wrap[hidden] {
        display: none;
      }
      .qr-guest {
        border: 1px solid var(--adm-line);
        border-radius: 12px;
        padding: 0.9rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .qr-guest--in {
        border-color: rgba(63, 174, 99, 0.45);
        background: rgba(63, 174, 99, 0.06);
      }
      .qr-guest__status {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        align-self: flex-start;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        background: #f3efe3;
        color: #8a8270;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .qr-guest--in .qr-guest__status {
        background: rgba(63, 174, 99, 0.16);
        color: #2a7a46;
      }
      .qr-guest__name {
        margin: 0;
        font-family: var(--display);
        font-size: 1.35rem;
        line-height: 1.2;
        color: #23201a;
        overflow-wrap: anywhere;
      }
      .qr-guest__dl {
        margin: 0;
        display: grid;
        gap: 0.35rem;
      }
      .qr-guest__dl > div {
        display: grid;
        grid-template-columns: 5.5rem 1fr;
        gap: 0.5rem;
        font-size: 0.88rem;
      }
      .qr-guest__dl dt {
        color: #8a8270;
      }
      .qr-guest__dl dd {
        margin: 0;
        color: var(--adm-ink);
        overflow-wrap: anywhere;
      }
      .qr-guest__code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        letter-spacing: 0.04em;
      }
      .qr-guest__party:not(:last-child)::after {
        content: ', ';
      }
      .qr-guest__actions {
        display: flex;
        gap: 0.5rem;
      }
      .qr-guest__actions .adm-btn {
        flex: 1;
        justify-content: center;
        min-height: 48px;
        font-size: 0.95rem;
      }
      .qr-manual {
        display: flex;
        gap: 0.5rem;
        border-top: 1px solid var(--adm-line);
        padding-top: 0.8rem;
      }
      .qr-manual input {
        flex: 1;
        padding: 0.55rem 0.7rem;
        border: 1px solid var(--adm-line);
        border-radius: 8px;
        background: var(--adm-surface);
        color: var(--adm-ink);
        font: inherit;
        font-size: 0.86rem;
      }
      .qr-manual input:focus {
        outline: none;
        border-color: var(--adm-gold);
      }
    `,
  ],
})
export class QrScannerModalComponent {
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;

  /** Emits the decoded QR text (or a manually-typed code) for the parent to resolve. */
  @Output() scanned = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  /** The door staff confirmed the shown guest — the parent performs the check-in. */
  @Output() checkIn = new EventEmitter<Attendee>();

  cameraReady = signal(false);
  cameraError = signal<string | null>(null);
  lastFeedback = signal<{ msg: string; ok: boolean } | null>(null);
  manualCode = signal('');
  /** Guest resolved from the last scan; while set, the camera stops decoding. */
  guest = signal<Attendee | null>(null);
  checkingIn = signal(false);

  readonly genderLabel = genderLabel;
  readonly seatsFor = seatsFor;
  readonly specificDrinksLabel = specificDrinksLabel;
  readonly ticketTypeLabel = ticketTypeLabel;

  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  private lastCode: string | null = null;
  private lastCodeAt = 0;

  constructor() {
    afterNextRender(() => this.startCamera());
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  /** Lets the parent show scan feedback without the parent owning camera state. */
  showFeedback(msg: string, ok: boolean): void {
    this.lastFeedback.set({ msg, ok });
  }

  /** Shows a resolved guest's details for confirmation (replaces the camera view). */
  showGuest(a: Attendee): void {
    this.guest.set(a);
  }

  /** Back to the camera for the next guest. */
  scanNext(): void {
    this.guest.set(null);
    this.lastFeedback.set(null);
    // The previous ticket may still be in frame — don't re-open it straight away.
    this.lastCodeAt = Date.now();
  }

  time(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  submitManual(): void {
    const code = this.manualCode().trim();
    if (!code) return;
    this.manualCode.set('');
    this.scanned.emit(code);
  }

  private async startCamera(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Camera access is not supported on this device. Use manual entry below.');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      const video = this.videoRef?.nativeElement;
      if (!video) return;
      video.srcObject = this.stream;
      await video.play();
      this.cameraReady.set(true);
      this.tick();
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      this.cameraError.set(
        name === 'NotAllowedError'
          ? 'Camera access was denied. Allow camera permission, or use manual entry below.'
          : name === 'NotFoundError'
            ? 'No camera found on this device. Use manual entry below.'
            : 'Could not start the camera. Use manual entry below.',
      );
    }
  }

  private tick = (): void => {
    const video = this.videoRef?.nativeElement;
    if (this.guest() || !video || !this.canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }
    this.canvas.width = video.videoWidth;
    this.canvas.height = video.videoHeight;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }
    ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
    const frame = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const result = jsQR(frame.data, frame.width, frame.height);
    if (result?.data) {
      const now = Date.now();
      if (result.data !== this.lastCode || now - this.lastCodeAt > 2500) {
        this.lastCode = result.data;
        this.lastCodeAt = now;
        this.scanned.emit(result.data);
      }
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  private stopCamera(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
