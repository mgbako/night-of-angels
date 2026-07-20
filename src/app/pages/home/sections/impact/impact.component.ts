import { Component } from '@angular/core';
import { IMPACT_POINTS, SPONSOR_STATS } from '../../../../config/sponsor.config';

@Component({
  selector: 'app-impact',
  standalone: true,
  template: `
    <section class="section section--ink impact" id="impact">
      <div class="wrap">
        <div class="impact__head">
          <span class="eyebrow">Why We Gather</span>
          <h2 class="section-title">More Than a Dinner</h2>
          <p class="impact__lead">
            A Night of Angels is the signature evening of
            <em>Harvest of Everlasting Peace</em> — the annual harvest programme of
            Saints Peter and Paul Catholic Church, Oke Afa. Beneath the
            candlelight and fine dining is a community giving thanks, and a cause
            worth standing beside.
          </p>
        </div>

        <div class="impact__grid">
          @for (point of points; track point.title) {
            <article class="impact-card">
              <span class="impact-card__mark" aria-hidden="true"></span>
              <h3>{{ point.title }}</h3>
              <p>{{ point.body }}</p>
            </article>
          }
        </div>

        <div class="stats">
          @for (stat of stats; track stat.label) {
            <div class="stat">
              <span class="stat__value">{{ stat.value }}</span>
              <span class="stat__label">{{ stat.label }}</span>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: './impact.component.scss',
})
export class ImpactComponent {
  points = IMPACT_POINTS;
  stats = SPONSOR_STATS;
}
