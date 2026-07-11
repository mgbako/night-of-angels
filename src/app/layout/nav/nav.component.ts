import {
  Component,
  HostListener,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CrestComponent } from '../../shared/crest/crest.component';

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
  imports: [CrestComponent, RouterLink, RouterLinkActive],
  template: `
    <header class="nav" [class.scrolled]="scrolled()" [class.nav-open]="menuOpen()">
      <div class="nav__inner">
        <a class="brand" routerLink="/" aria-label="Night of Angels — home">
          <app-crest [size]="46" />
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
          </ul>
        </nav>

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
      <a routerLink="/reserve" class="btn btn--solid" (click)="closeMenu()"
        >Reserve Your Seat</a
      >
    </div>
  `,
  styleUrl: './nav.component.scss',
})
export class NavComponent {
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
