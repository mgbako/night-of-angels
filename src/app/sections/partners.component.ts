import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CURRENT_PARTNERS } from '../sponsor.config';

interface Tier {
  mark: string;
  name: string;
  benefit: string;
}

interface CategoryPill {
  label: string;
  open: boolean;
}

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section section--ivory" id="partners">
      <div class="wrap">
        <div class="partners__intro">
          <span class="eyebrow">Partners</span>
          <h2 class="section-title">Be Woven Into the Room</h2>
          <p>
            Each year a small number of brands are invited to partner with A Night
            of Angels — woven into the room rather than placed beside it.
            Sponsorship spans four tiers, and a few select categories remain open
            for the coming edition.
          </p>
        </div>

        <div class="tiers">
          @for (tier of tiers; track tier.name) {
            <div class="tier">
              <div class="tier-mark">{{ tier.mark }}</div>
              <h3>{{ tier.name }}</h3>
              <p>{{ tier.benefit }}</p>
            </div>
          }
        </div>

        <div class="pills">
          @for (pill of pills; track pill.label) {
            <span class="pill" [class.pill--open]="pill.open">{{ pill.label }}</span>
          }
        </div>

        <div class="partners__current">
          <span class="partners__current-label">In good company</span>
          <div class="partners__logos">
            @for (p of partners; track p.name) {
              <img [src]="p.logo" [alt]="p.name" loading="lazy" />
            }
          </div>
        </div>

        <div class="partners__cta">
          <a routerLink="/sponsor" class="btn btn--ink"
            >View Sponsorship Packages</a
          >
        </div>
      </div>
    </section>
  `,
  styleUrl: './partners.component.scss',
})
export class PartnersComponent {
  partners = CURRENT_PARTNERS;

  tiers: Tier[] = [
    {
      mark: '◆◆◆',
      name: 'Title Sponsor',
      benefit:
        'Headline presence across the evening, with the night presented in partnership with your brand.',
    },
    {
      mark: '◆◆',
      name: 'Platinum',
      benefit:
        'Premium positioning within the experience and a reserved table for your guests.',
    },
    {
      mark: '◆',
      name: 'Gold',
      benefit:
        'A considered brand moment woven through the programme and guest touchpoints.',
    },
  ];

  pills: CategoryPill[] = [
    { label: 'Official Beverage Partner — Available', open: true },
    { label: 'Title Sponsor — Available', open: true },
    { label: 'Décor & Florals — In Conversation', open: false },
    { label: 'Photography Partner — In Conversation', open: false },
  ];
}
