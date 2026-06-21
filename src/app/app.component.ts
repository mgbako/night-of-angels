import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './sections/nav.component';
import { RsvpFooterComponent } from './sections/rsvp-footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent, RsvpFooterComponent],
  template: `
    <app-nav />
    <router-outlet />
    <app-rsvp-footer />
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {}
