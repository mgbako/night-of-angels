import { Component } from '@angular/core';
import { PARTNERSHIPS_EMAIL } from '../event.config';

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

        <div class="partners__cta">
          <a [href]="proposalMailto" class="btn btn--ink"
            >Request the Partnership Proposal</a
          >
        </div>
      </div>
    </section>
  `,
  styleUrl: './partners.component.scss',
})
export class PartnersComponent {
  proposalMailto =
    `mailto:${PARTNERSHIPS_EMAIL}` +
    '?subject=Partnership%20Proposal%20Request%20%E2%80%94%20A%20Night%20of%20Angels';

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
