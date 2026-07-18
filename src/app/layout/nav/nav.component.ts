import {
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LogoComponent } from '../../shared/logo/logo.component';
import { ThemeService } from '../../shared/theme.service';
import { AuthService } from '../../admin/services/auth.service';

interface NavLink {
  label: string;
  /** In-page section on the home route. */
  fragment?: string;
  /** A standalone route (e.g. the gallery page). */
  route?: string;
}

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [LogoComponent, RouterLink, RouterLinkActive],
  template: `
    <header class="nav" [class.scrolled]="scrolled()" [class.nav-open]="menuOpen()">
      <div class="nav__inner">
        <a class="brand" routerLink="/" aria-label="Night of Angels — home">
          <app-logo [size]="44" />
          <span class="wordmark">Night of Angels</span>
        </a>

        <nav aria-label="Primary">
          <ul class="nav__links">
            @for (link of links; track link.label) {
              <li>
                @if (link.route) {
                  <a [routerLink]="link.route" routerLinkActive="active">{{ link.label }}</a>
                } @else {
                  <a [routerLink]="'/'" [fragment]="link.fragment">{{ link.label }}</a>
                }
              </li>
            }
            @if (auth.isAuthed()) {
              <li><a routerLink="/admin" routerLinkActive="active">Admin</a></li>
            }
          </ul>
        </nav>

        <button
          class="theme-toggle"
          type="button"
          [attr.aria-label]="
            theme.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
          "
          (click)="theme.toggle()"
        >
          @if (theme.theme() === 'dark') {
            <!-- sun -->
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="12" cy="12" r="4.2" fill="currentColor" />
              <g stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
                <line x1="12" y1="2.5" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="21.5" />
                <line x1="2.5" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="21.5" y2="12" />
                <line x1="5.2" y1="5.2" x2="6.9" y2="6.9" />
                <line x1="17.1" y1="17.1" x2="18.8" y2="18.8" />
                <line x1="5.2" y1="18.8" x2="6.9" y2="17.1" />
                <line x1="17.1" y1="6.9" x2="18.8" y2="5.2" />
              </g>
            </svg>
          } @else {
            <!-- moon -->
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M20 14.5A8 8 0 0 1 9.5 4a0.5 0.5 0 0 0-0.7-0.6A9 9 0 1 0 20.6 15.2a0.5 0.5 0 0 0-0.6-0.7z"
                fill="currentColor"
              />
            </svg>
          }
        </button>

        <a routerLink="/reserve" class="btn btn--solid btn--sm nav__cta">Reserve</a>

        <button
          class="hamburger"
          [attr.aria-label]="menuOpen() ? 'Close menu' : 'Open menu'"
          [attr.aria-expanded]="menuOpen()"
          aria-controls="overlay"
          (click)="toggleMenu()"
        >
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>

    <div class="overlay" [class.open]="menuOpen()" id="overlay">
      @for (link of links; track link.label) {
        @if (link.route) {
          <a [routerLink]="link.route" (click)="closeMenu()">{{ link.label }}</a>
        } @else {
          <a [routerLink]="'/'" [fragment]="link.fragment" (click)="closeMenu()">{{
            link.label
          }}</a>
        }
      }
      @if (auth.isAuthed()) {
        <a routerLink="/admin" (click)="closeMenu()">Admin</a>
      }
      <a routerLink="/reserve" class="btn btn--solid" (click)="closeMenu()"
        >Reserve Your Seat</a
      >
    </div>
  `,
  styleUrl: './nav.component.scss',
})
export class NavComponent {
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  scrolled = signal(false);
  menuOpen = signal(false);

  links: NavLink[] = [
    { label: 'The Evening', fragment: 'evening' },
    { label: 'Gallery', route: '/gallery' },
    { label: 'Tickets', fragment: 'tickets' },
    { label: 'Sponsor', route: '/sponsor' },
    { label: 'FAQ', fragment: 'faq' },
  ];

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 40);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
