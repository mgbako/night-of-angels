import {
  Component,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventSettingsService } from '../../../../shared/event-settings.service';
import {
  COUPLES_REGULAR_PRICE,
  TICKET_TYPES,
} from '../../../../features/ticketing/models/attendee.model';

interface CountdownView {
  days: string;
  hours: string;
  mins: string;
  secs: string;
}

/** Reappears once per browser session, and again if the organiser moves the deadline. */
const DISMISS_KEY = 'noa_earlybird_dismissed';

@Component({
  selector: 'app-early-bird-modal',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (visible()) {
      <div class="ebm-backdrop" (click)="dismiss()"></div>
      <div class="ebm" role="dialog" aria-modal="true" aria-labelledby="ebm-title">
        <button class="ebm__close" (click)="dismiss()" aria-label="Close">×</button>
        <span class="ebm__eyebrow">Early Bird Pricing</span>
        <h2 id="ebm-title" class="ebm__title">Save on Couples Tickets</h2>
        <p class="ebm__lead">
          Reserve a Couples ticket now for ₦{{ couplesEarly.toLocaleString() }} — save
          ₦{{ savings.toLocaleString() }} before early-bird pricing ends.
        </p>

        <div class="ebm__countdown" role="timer" aria-live="off">
          <div class="ebm-unit">
            <span class="ebm-num">{{ cd().days }}</span>
            <span class="ebm-label">Days</span>
          </div>
          <span class="ebm-sep">:</span>
          <div class="ebm-unit">
            <span class="ebm-num">{{ cd().hours }}</span>
            <span class="ebm-label">Hours</span>
          </div>
          <span class="ebm-sep">:</span>
          <div class="ebm-unit">
            <span class="ebm-num">{{ cd().mins }}</span>
            <span class="ebm-label">Minutes</span>
          </div>
          <span class="ebm-sep">:</span>
          <div class="ebm-unit">
            <span class="ebm-num">{{ cd().secs }}</span>
            <span class="ebm-label">Seconds</span>
          </div>
        </div>

        <div class="ebm__ctas">
          <a routerLink="/reserve" class="btn btn--solid" (click)="dismiss()">Reserve Your Seat</a>
          <button type="button" class="ebm__later" (click)="dismiss()">Maybe later</button>
        </div>
      </div>
    }
  `,
  styleUrl: './early-bird-modal.component.scss',
})
export class EarlyBirdModalComponent implements OnDestroy {
  private settings = inject(EventSettingsService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly couplesEarly = TICKET_TYPES.find((t) => t.value === 'COUPLES')!.price;
  readonly savings = COUPLES_REGULAR_PRICE - this.couplesEarly;

  visible = signal(false);
  cd = signal<CountdownView>({ days: '00', hours: '00', mins: '00', secs: '00' });

  private deadline = 0;
  private timer?: ReturnType<typeof setInterval>;
  private opened = false;

  constructor() {
    afterNextRender(() => this.settings.load());

    // Auto-open once, the first time we see an active early-bird deadline
    // that hasn't already been dismissed this session.
    effect(() => {
      if (!this.isBrowser || this.opened) return;
      if (!this.settings.loaded() || !this.settings.isEarlyBird() || !this.settings.reservationsOpen()) {
        return;
      }
      const deadlineIso = this.settings.settings().earlyBirdEnds;
      if (!deadlineIso) return;
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === deadlineIso) return;
      } catch {
        // Storage unavailable (private mode) — fall through and show it anyway.
      }

      this.opened = true;
      this.deadline = Date.parse(deadlineIso);
      this.tick();
      this.timer = setInterval(() => this.tick(), 1000);
      setTimeout(() => this.visible.set(true), 900);
    });
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private pad(n: number): string {
    return String(Math.max(0, n)).padStart(2, '0');
  }

  private tick(): void {
    const diff = this.deadline - Date.now();
    if (diff <= 0) {
      this.cd.set({ days: '00', hours: '00', mins: '00', secs: '00' });
      this.visible.set(false);
      if (this.timer) clearInterval(this.timer);
      return;
    }
    const s = Math.floor(diff / 1000);
    this.cd.set({
      days: this.pad(Math.floor(s / 86400)),
      hours: this.pad(Math.floor((s % 86400) / 3600)),
      mins: this.pad(Math.floor((s % 3600) / 60)),
      secs: this.pad(s % 60),
    });
  }

  dismiss(): void {
    this.visible.set(false);
    if (this.timer) clearInterval(this.timer);
    try {
      const deadlineIso = this.settings.settings().earlyBirdEnds;
      if (deadlineIso) sessionStorage.setItem(DISMISS_KEY, deadlineIso);
    } catch {
      // Storage unavailable — nothing to persist, it just may show again.
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible()) this.dismiss();
  }
}
