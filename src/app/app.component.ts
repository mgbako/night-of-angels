import { Component } from '@angular/core';
import { NavComponent } from './sections/nav.component';
import { HeroComponent } from './sections/hero.component';
import { EveningComponent } from './sections/evening.component';
import { DressCodeComponent } from './sections/dress-code.component';
import { TicketsComponent } from './sections/tickets.component';
import { ProgrammeComponent } from './sections/programme.component';
import { PartnersComponent } from './sections/partners.component';
import { FaqComponent } from './sections/faq.component';
import { RsvpFooterComponent } from './sections/rsvp-footer.component';
import { RevealDirective } from './shared/reveal.directive';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NavComponent,
    HeroComponent,
    EveningComponent,
    DressCodeComponent,
    TicketsComponent,
    ProgrammeComponent,
    PartnersComponent,
    FaqComponent,
    RsvpFooterComponent,
    RevealDirective,
  ],
  template: `
    <app-nav />
    <main id="top">
      <app-hero />
      <app-evening appReveal />
      <app-dress-code appReveal />
      <app-tickets appReveal />
      <app-programme appReveal />
      <app-partners appReveal />
      <app-faq appReveal />
      <app-rsvp-footer />
    </main>
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {}
