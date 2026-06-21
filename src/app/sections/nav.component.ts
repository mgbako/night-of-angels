import {
  Component,
  HostListener,
  signal,
} from '@angular/core';
import { CrestComponent } from '../shared/crest.component';

interface NavLink {
  href: string;
  label: string;
}

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CrestComponent],
  template: `
    <header class="nav" [class.scrolled]="scrolled()" [class.nav-open]="menuOpen()">
      <div class="nav__inner">
        <a class="brand" href="#top" aria-label="Night of Angels — home">
          <app-crest [size]="46" />
          <span class="wordmark">Night of Angels</span>
        </a>

        <nav aria-label="Primary">
          <ul class="nav__links">
            @for (link of links; track link.href) {
              <li><a [href]="link.href">{{ link.label }}</a></li>
            }
          </ul>
        </nav>

        <a href="#tickets" class="btn btn--solid btn--sm nav__cta">Reserve</a>

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
      @for (link of links; track link.href) {
        <a [href]="link.href" (click)="closeMenu()">{{ link.label }}</a>
      }
      <a href="#tickets" class="btn btn--solid" (click)="closeMenu()">Reserve Your Seat</a>
    </div>
  `,
  styleUrl: './nav.component.scss',
})
export class NavComponent {
  scrolled = signal(false);
  menuOpen = signal(false);

  links: NavLink[] = [
    { href: '#evening', label: 'The Evening' },
    { href: '#dress', label: 'Dress Code' },
    { href: '#tickets', label: 'Tickets' },
    { href: '#partners', label: 'Partners' },
    { href: '#faq', label: 'FAQ' },
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
