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
      title: 'A Night of Angels 2026 | All-White Harvest Dinner, Lagos',
      description:
        'A Night of Angels 2026 — the all-white luxury harvest dinner of SS Peter & Paul Catholic Church, Oke-Afa, Ejigbo, Lagos, on 24 October. Reserve your seat, book a table, or become a partner.',
      keywords:
        'A Night of Angels, Night of Angels 2026, Night of Angels Lagos, all-white dinner Lagos, luxury harvest dinner Lagos, harvest dinner Lagos 2026, SS Peter and Paul Catholic Church Oke-Afa, Harvest of Everlasting Peace, all-white party Lagos, Oke-Afa Ejigbo event, exclusive gala Lagos Nigeria',
      path: '/',
    });
  }
}
