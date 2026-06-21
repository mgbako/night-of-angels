import {
  Component,
  OnDestroy,
  OnInit,
  afterNextRender,
  signal,
} from '@angular/core';
import { CrestComponent } from '../shared/crest.component';
import { EVENT_DATE } from '../event.config';

interface CountdownView {
  days: string;
  hours: string;
  mins: string;
  secs: string;
}

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CrestComponent],
  template: `
    <section class="hero" [class.loaded]="loaded()" id="hero">
      <div class="hero__grain" aria-hidden="true"></div>
      <span class="bracket tl" aria-hidden="true"></span>
      <span class="bracket tr" aria-hidden="true"></span>
      <span class="bracket bl" aria-hidden="true"></span>
      <span class="bracket br" aria-hidden="true"></span>

      <div class="hero__content">
        <app-crest [size]="64" />
        <h1>A Night of Angels</h1>
        <p class="tagline">An All-White Luxury Dinner Experience</p>
        <p class="meta">
          <b>Lagos, Nigeria</b> · September 2026 · By Invitation &amp; Ticket
        </p>

        <div class="hero__ctas">
          <a href="#tickets" class="btn btn--solid">Reserve Your Seat</a>
          <a href="#partners" class="btn btn--outline">Become a Partner</a>
        </div>

        <div class="countdown" role="timer" aria-live="off">
          <div class="cd-unit">
            <span class="cd-num">{{ cd().days }}</span>
            <span class="cd-label">Days</span>
          </div>
          <span class="cd-sep">:</span>
          <div class="cd-unit">
            <span class="cd-num">{{ cd().hours }}</span>
            <span class="cd-label">Hours</span>
          </div>
          <span class="cd-sep">:</span>
          <div class="cd-unit">
            <span class="cd-num">{{ cd().mins }}</span>
            <span class="cd-label">Minutes</span>
          </div>
          <span class="cd-sep">:</span>
          <div class="cd-unit">
            <span class="cd-num">{{ cd().secs }}</span>
            <span class="cd-label">Seconds</span>
          </div>
        </div>
        <p class="countdown-note">
          Exact date to be confirmed — countdown will activate once announced.
        </p>
      </div>
    </section>
  `,
  styleUrl: './hero.component.scss',
})
export class HeroComponent implements OnInit, OnDestroy {
  loaded = signal(false);
  cd = signal<CountdownView>({ days: '00', hours: '00', mins: '00', secs: '00' });

  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    // Browser-only: the live countdown tick and the entrance animation.
    // Skipped during server prerender (no setInterval drift, no requestAnimationFrame).
    afterNextRender(() => {
      this.timer = setInterval(() => this.tick(), 1000);
      requestAnimationFrame(() => this.loaded.set(true));
    });
  }

  ngOnInit(): void {
    // Initial value so the countdown is present in the prerendered HTML.
    this.tick();
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private pad(n: number): string {
    return String(Math.max(0, n)).padStart(2, '0');
  }

  private tick(): void {
    const diff = EVENT_DATE.getTime() - Date.now();
    if (diff <= 0) {
      this.cd.set({ days: '00', hours: '00', mins: '00', secs: '00' });
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
}
