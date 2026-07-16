import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'noa-theme';

/**
 * Public-site light/dark theme. Light is the default ("colour of the day").
 * The chosen theme is a `data-theme` attribute on <html>; the palette lives in
 * styles.scss (:root vs :root[data-theme="dark"]). An inline script in
 * index.html applies the stored choice before first paint to avoid a flash.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);

  /** Current theme; drives the toggle icon. */
  readonly theme = signal<Theme>('light');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const attr = document.documentElement.getAttribute('data-theme');
      const stored = localStorage.getItem(STORAGE_KEY);
      const initial: Theme =
        attr === 'dark' || stored === 'dark'
          ? 'dark'
          : 'light';
      this.apply(initial);
    }
  }

  toggle(): void {
    this.apply(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.apply(theme);
  }

  private apply(theme: Theme): void {
    this.theme.set(theme);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.setAttribute('data-theme', theme);
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        /* storage may be unavailable (private mode) — theme still applies for the session */
      }
    }
  }
}
