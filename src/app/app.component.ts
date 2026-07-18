import {
  Component,
  Inject,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NavComponent } from './layout/nav/nav.component';
import { RsvpFooterComponent } from './layout/footer/rsvp-footer.component';
import { WhatsappChatComponent } from './layout/whatsapp-chat/whatsapp-chat.component';
import { MaintenanceComponent } from './pages/maintenance/maintenance.component';
import { EventSettingsService } from './shared/event-settings.service';
import { AuthService } from './admin/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavComponent,
    RsvpFooterComponent,
    WhatsappChatComponent,
    MaintenanceComponent,
  ],
  template: `
    @if (maintenanceActive()) {
      <app-maintenance />
    } @else {
      @if (showChrome()) {
        <app-nav />
      }
      <router-outlet />
      @if (showChrome()) {
        <app-rsvp-footer />
        <app-whatsapp-chat />
      }
    }
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private settings = inject(EventSettingsService);
  private auth = inject(AuthService);
  private isBrowser: boolean;

  // The admin back office has its own shell — hide the public nav/footer/chat there.
  showChrome = signal(true);

  /**
   * Show the coming-soon page when maintenance is on and the visitor is a
   * signed-out guest on a public route. Admins (signed in) and the /admin
   * area — so the team can still sign in — always bypass it.
   */
  maintenanceActive = computed(
    () =>
      this.isBrowser &&
      this.settings.loaded() &&
      this.settings.maintenance() &&
      this.showChrome() &&
      !this.auth.isAuthed(),
  );

  constructor(
    router: Router,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    const evaluate = (url: string) => this.showChrome.set(!url.startsWith('/admin'));
    evaluate(router.url);
    router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => evaluate(e.urlAfterRedirects));

    // Load organiser settings once (browser only) to know if maintenance is on.
    afterNextRender(() => {
      this.settings.load();
    });
  }
}
