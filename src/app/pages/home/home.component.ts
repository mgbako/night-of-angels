import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../shared/seo.service';
import { HeroComponent } from './sections/hero/hero.component';
import { EveningComponent } from './sections/evening/evening.component';
import { GalleryPreviewComponent } from './sections/gallery-preview/gallery-preview.component';
import { ImpactComponent } from './sections/impact/impact.component';
import { DressCodeComponent } from './sections/dress-code/dress-code.component';
import { TicketsComponent } from './sections/tickets/tickets.component';
import { ProgrammeComponent } from './sections/programme/programme.component';
import { PartnersComponent } from './sections/partners/partners.component';
import { FaqComponent } from './sections/faq/faq.component';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroComponent,
    EveningComponent,
    GalleryPreviewComponent,
    ImpactComponent,
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
      <app-partners appReveal />
      <app-impact appReveal />
      <app-evening appReveal />
      <app-gallery-preview appReveal />
      <app-dress-code appReveal />
      <app-tickets appReveal />
      <app-programme appReveal />
      <app-faq appReveal />
    </main>
  `,
})
export class HomeComponent implements OnInit {
  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setSEO({
      title: 'A Night of Angels | All-White Luxury Dinner Experience · Lagos',
      description:
        'A Night of Angels — an exclusive all-white luxury harvest dinner in Lagos on 24 October 2026. Reserve your seat, book a table of ten, or become a partner.',
      keywords:
        'all-white party Lagos, luxury dinner Lagos, harvest dinner 2026, A Night of Angels, exclusive gala Lagos Nigeria, SS Peter and Paul Oke-Afa',
      path: '/',
    });
  }
}
