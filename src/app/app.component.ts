import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NavComponent } from './layout/nav/nav.component';
import { RsvpFooterComponent } from './layout/footer/rsvp-footer.component';
import { WhatsappChatComponent } from './layout/whatsapp-chat/whatsapp-chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent, RsvpFooterComponent, WhatsappChatComponent],
  template: `
    @if (showChrome()) {
      <app-nav />
    }
    <router-outlet />
    @if (showChrome()) {
      <app-rsvp-footer />
      <app-whatsapp-chat />
    }
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  // The admin back office has its own shell — hide the public nav/footer/chat there.
  showChrome = signal(true);

  constructor(router: Router) {
    const evaluate = (url: string) => this.showChrome.set(!url.startsWith('/admin'));
    evaluate(router.url);
    router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => evaluate(e.urlAfterRedirects));
  }
}
