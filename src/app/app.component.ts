import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './layout/nav/nav.component';
import { RsvpFooterComponent } from './layout/footer/rsvp-footer.component';
import { WhatsappChatComponent } from './layout/whatsapp-chat/whatsapp-chat.component';

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
