import {
  Component,
  Inject,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { CrestComponent } from '../../shared/crest/crest.component';
import { AdminIconComponent, IconName } from '../shared/admin-icon.component';
import { AuthService } from '../services/auth.service';
import { Permission, ROLE_LABELS } from '../services/permissions';

interface AdminNavLink {
  path: string;
  label: string;
  icon: IconName;
  exact: boolean;
  perm: Permission;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CrestComponent,
    AdminIconComponent,
  ],
  template: `
    <div class="adm-shell" [class.adm-open]="isOpen()">
      <!-- Backdrop (mobile) -->
      <div
        class="adm-overlay"
        role="button"
        aria-label="Close menu"
        (click)="close()"
      ></div>

      <!-- Sidebar -->
      <aside class="adm-sidebar">
        <a class="adm-brand" routerLink="/admin" aria-label="Admin home">
          <app-crest [size]="34" [full]="false" />
          <span>
            <strong>Night of Angels</strong>
            <em>Back Office</em>
          </span>
        </a>

        <nav class="adm-nav" aria-label="Admin">
          @for (link of visibleLinks(); track link.path) {
            <a
              class="adm-nav__link"
              [routerLink]="link.path"
              routerLinkActive="is-active"
              [routerLinkActiveOptions]="{ exact: link.exact }"
              (click)="close()"
            >
              <adm-icon [name]="link.icon" [size]="19" />
              <span>{{ link.label }}</span>
            </a>
          }
        </nav>

        <div class="adm-user">
          <div class="adm-user__avatar"><app-crest [size]="26" [full]="false" /></div>
          <div class="adm-user__meta">
            <span class="adm-user__name">{{ auth.user()?.name || 'Account' }}</span>
            <span class="adm-user__role">{{ roleLabel() }}</span>
          </div>
          <a
            class="adm-user__logout"
            routerLink="/admin/account"
            (click)="close()"
            aria-label="Account settings"
            title="Account"
          >
            <adm-icon name="shield" [size]="17" />
          </a>
          <button class="adm-user__logout" (click)="logout()" aria-label="Sign out">
            <adm-icon name="logout" [size]="18" />
          </button>
        </div>
      </aside>

      <!-- Main -->
      <div class="adm-main">
        <header class="adm-topbar">
          <a class="adm-topbar__brand" routerLink="/admin">
            <app-crest [size]="30" [full]="false" />
            <span>Back Office</span>
          </a>

          <h1 class="adm-topbar__title">{{ heading() }}</h1>

          <div class="adm-topbar__spacer"></div>

          <a class="adm-topbar__view" routerLink="/" title="View public site" target="_blank">
            <adm-icon name="external" [size]="18" />
            <span>View site</span>
          </a>

          <button
            class="adm-hamburger"
            [attr.aria-expanded]="isOpen()"
            aria-label="Toggle menu"
            (click)="toggle()"
          >
            <adm-icon [name]="isOpen() ? 'close' : 'menu'" [size]="22" />
          </button>
        </header>

        <main class="adm-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  private isBrowser: boolean;

  isOpen = signal(true);
  heading = signal('Dashboard');

  links: AdminNavLink[] = [
    { path: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true, perm: 'dashboard' },
    { path: '/admin/attendees', label: 'Attendees', icon: 'attendees', exact: false, perm: 'attendees' },
    { path: '/admin/reservations', label: 'Reservations', icon: 'inbox', exact: false, perm: 'reservations' },
    { path: '/admin/register', label: 'Register', icon: 'register', exact: false, perm: 'register' },
    { path: '/admin/tickets', label: 'Tickets', icon: 'ticket', exact: false, perm: 'tickets' },
    { path: '/admin/tables', label: 'Tables', icon: 'tables', exact: false, perm: 'attendees' },
    { path: '/admin/promote', label: 'Promote', icon: 'qr', exact: false, perm: 'reservations' },
    { path: '/admin/team', label: 'Team', icon: 'shield', exact: false, perm: 'team' },
    { path: '/admin/settings', label: 'Settings', icon: 'settings', exact: false, perm: 'settings' },
  ];

  /** Only the modules the signed-in user's role can open. */
  visibleLinks = computed(() => this.links.filter((l) => this.auth.can(l.perm)));

  roleLabel = computed(() => ROLE_LABELS[this.auth.role()]);

  private headings: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/attendees': 'Attendees',
    '/admin/reservations': 'Reservations',
    '/admin/register': 'Register Attendee',
    '/admin/tickets': 'Ticketing',
    '/admin/tables': 'Tables',
    '/admin/promote': 'Promote & Share',
    '/admin/team': 'Team',
    '/admin/settings': 'Settings',
    '/admin/account': 'Account',
  };

  constructor(
    private router: Router,
    protected auth: AuthService,
    @Inject(DOCUMENT) private doc: Document,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.heading.set(this.headings[e.urlAfterRedirects.split('?')[0]] ?? 'Back Office');
        if (this.isMobile()) this.setOpen(false);
      });

    afterNextRender(() => {
      // Start collapsed on mobile, open on desktop.
      this.setOpen(!this.isMobile());
      this.heading.set(this.headings[this.router.url.split('?')[0]] ?? 'Back Office');
    });
  }

  private isMobile(): boolean {
    return this.isBrowser && window.matchMedia('(max-width: 1024px)').matches;
  }

  private setOpen(open: boolean): void {
    this.isOpen.set(open);
    if (this.isBrowser && this.isMobile()) {
      this.doc.body.style.overflow = open ? 'hidden' : '';
    }
  }

  toggle(): void {
    this.setOpen(!this.isOpen());
  }

  close(): void {
    if (this.isMobile()) this.setOpen(false);
  }

  logout(): void {
    this.doc.body.style.overflow = '';
    this.auth.logout(); // clears token + navigates to /admin/login
  }
}
