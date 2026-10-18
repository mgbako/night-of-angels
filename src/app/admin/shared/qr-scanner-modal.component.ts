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

/**
 * Full-screen camera QR scanner for guest check-in, with a manual code
 * entry fallback for devices without a usable camera. Decoding runs
 * entirely client-side via jsQR — no frames leave the device.
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

      <div class="qr-video-wrap">
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

      <p class="qr-hint">Point the camera at the QR code on the guest's ticket.</p>

      @if (lastFeedback(); as f) {
        <div class="qr-feedback" [class.qr-feedback--err]="!f.ok">{{ f.msg }}</div>
      }

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
          Check in
        </button>
      </div>
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

  cameraReady = signal(false);
  cameraError = signal<string | null>(null);
  lastFeedback = signal<{ msg: string; ok: boolean } | null>(null);
  manualCode = signal('');

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
    if (!video || !this.canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
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
