import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './sections/nav.component';
import { RsvpFooterComponent } from './sections/rsvp-footer.component';
import { WhatsappChatComponent } from './shared/whatsapp-chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent, RsvpFooterComponent, WhatsappChatComponent],
  template: `
    <app-nav />
    <router-outlet />
    <app-rsvp-footer />
    <app-whatsapp-chat />
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {}
