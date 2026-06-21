import { Component } from '@angular/core';
import { HeroComponent } from '../sections/hero.component';
import { EveningComponent } from '../sections/evening.component';
import { GalleryPreviewComponent } from '../sections/gallery-preview.component';
import { DressCodeComponent } from '../sections/dress-code.component';
import { TicketsComponent } from '../sections/tickets.component';
import { ProgrammeComponent } from '../sections/programme.component';
import { PartnersComponent } from '../sections/partners.component';
import { FaqComponent } from '../sections/faq.component';
import { RevealDirective } from '../shared/reveal.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroComponent,
    EveningComponent,
    GalleryPreviewComponent,
    DressCodeComponent,
    TicketsComponent,
    ProgrammeComponent,
    PartnersComponent,
    FaqComponent,
    RevealDirective,
  ],
  template: `
    <main id="top">
      <app-hero />
      <app-evening appReveal />
      <app-gallery-preview appReveal />
      <app-dress-code appReveal />
      <app-tickets appReveal />
      <app-programme appReveal />
      <app-partners appReveal />
      <app-faq appReveal />
    </main>
  `,
})
export class HomeComponent {}
