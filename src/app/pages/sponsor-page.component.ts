import {
  Component,
  Inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CrestComponent } from '../shared/crest.component';
import { RevealDirective } from '../shared/reveal.directive';
import { PARTNERSHIPS_EMAIL } from '../event.config';
import {
  CURRENT_PARTNERS,
  IMPACT_POINTS,
  SPONSOR_CATEGORIES,
  SPONSOR_DEADLINE,
  SPONSOR_STATS,
  SPONSOR_TIERS,
} from '../sponsor.config';

type FormStatus = 'idle' | 'sending' | 'sent' | 'error';

@Component({
  selector: 'app-sponsor-page',
  standalone: true,
  imports: [CrestComponent, RevealDirective],
  template: `
    <main class="sponsor" id="top">
      <!-- Header -->
      <header class="sp-hero section section--ink">
        <div class="sp-hero__grain" aria-hidden="true"></div>
        <div class="wrap sp-hero__inner">
          <app-crest [size]="56" />
          <span class="eyebrow">Partnership</span>
          <h1 class="sp-hero__title">Partner With Purpose</h1>
          <p class="sp-hero__lead">
            Place your brand at the heart of <em>A Night of Angels</em> — the
            signature dinner of Harvest of Internal Peace, Saints Peter and Paul
            Catholic Church, Oke Afa. A room of distinguished guests, a respected
            faith community, and goodwill that travels with your name.
          </p>
          <div class="sp-hero__ctas no-print">
            <a href="#enquire" class="btn btn--solid">Become a Partner</a>
            <button class="btn btn--outline" type="button" (click)="downloadPdf()">
              Download Prospectus
            </button>
          </div>
        </div>
      </header>

      <!-- By the numbers -->
      <section class="section section--panel" appReveal>
        <div class="wrap">
          <div class="section-head">
            <span class="eyebrow">The Room</span>
            <h2 class="section-title">Who You’ll Reach</h2>
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

      <!-- Confirmed partners -->
      <section class="section section--ivory" appReveal>
        <div class="wrap">
          <div class="section-head">
            <span class="eyebrow">In Good Company</span>
            <h2 class="section-title">Our Partners</h2>
            <p>Proudly supported by brands who believe in the evening.</p>
          </div>
          <div class="partners-wall">
            @for (p of partners; track p.name) {
              <figure class="partner">
                <img [src]="p.logo" [alt]="p.name" loading="lazy" />
                <figcaption>{{ p.role }}</figcaption>
              </figure>
            }
          </div>
        </div>
      </section>

      <!-- Tiers -->
      <section class="section section--ink" id="tiers" appReveal>
        <div class="wrap">
          <div class="section-head">
            <span class="eyebrow">Packages</span>
            <h2 class="section-title">Sponsorship Tiers</h2>
            <p>
              Each tier is woven into the evening — present in the moments guests
              remember. Packages can be tailored or combined.
            </p>
          </div>
          <div class="tiers">
            @for (tier of tiers; track tier.name) {
              <article class="tier" [class.tier--featured]="tier.featured">
                @if (tier.featured) {
                  <span class="tier__flag">Most Visible</span>
                }
                <h3 class="tier__name">{{ tier.name }}</h3>
                <div class="tier__price">{{ tier.price }}</div>
                <div class="tier__slots">{{ tier.slots }}</div>
                <p class="tier__summary">{{ tier.summary }}</p>
                <ul class="tier__benefits">
                  @for (b of tier.benefits; track b) {
                    <li>{{ b }}</li>
                  }
                </ul>
                <a href="#enquire" class="btn btn--block no-print"
                  [class.btn--solid]="tier.featured"
                  [class.btn--outline]="!tier.featured"
                  >Choose {{ tier.name }}</a
                >
              </article>
            }
          </div>
        </div>
      </section>

      <!-- Available categories + deadline -->
      <section class="section section--panel" appReveal>
        <div class="wrap">
          <div class="section-head">
            <span class="eyebrow">Availability</span>
            <h2 class="section-title">Open Categories</h2>
            <p>
              A few exclusive categories remain for this edition. Confirm your
              place before
              <strong class="deadline">{{ deadline }}</strong>.
            </p>
          </div>
          <div class="cats">
            @for (c of categories; track c.label) {
              <span class="cat" [attr.data-status]="c.status">
                <span class="cat__dot" aria-hidden="true"></span>
                <span class="cat__label">{{ c.label }}</span>
                <span class="cat__status">{{ statusText(c.status, c.note) }}</span>
              </span>
            }
          </div>
        </div>
      </section>

      <!-- Impact -->
      <section class="section section--ivory" appReveal>
        <div class="wrap">
          <div class="section-head">
            <span class="eyebrow">Your Impact</span>
            <h2 class="section-title">More Than Exposure</h2>
          </div>
          <div class="impact-row">
            @for (point of impact; track point.title) {
              <div class="impact-col">
                <h3>{{ point.title }}</h3>
                <p>{{ point.body }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Enquiry form -->
      <section class="section section--ink no-print" id="enquire" appReveal>
        <div class="wrap sp-form-wrap">
          <div class="section-head">
            <span class="eyebrow">Become a Partner</span>
            <h2 class="section-title">Request the Full Proposal</h2>
            <p>
              Tell us a little about your brand and we’ll send a tailored
              proposal — usually within one working day.
            </p>
          </div>

          @if (status() === 'sent') {
            <div class="form-success" role="status">
              <app-crest [size]="44" />
              <h3>Thank you</h3>
              <p>
                Your enquiry is in. A member of our partnerships team will be in
                touch shortly. For anything urgent, message us on WhatsApp.
              </p>
            </div>
          } @else {
            <form
              class="sp-form"
              name="sponsor"
              method="POST"
              data-netlify="true"
              netlify-honeypot="bot-field"
              (submit)="submit($event)"
            >
              <input type="hidden" name="form-name" value="sponsor" />
              <p class="hp" aria-hidden="true">
                <label>Don’t fill this in <input name="bot-field" /></label>
              </p>

              <div class="field">
                <label for="f-name">Full name</label>
                <input id="f-name" name="name" type="text" required autocomplete="name" />
              </div>
              <div class="field">
                <label for="f-company">Company / brand</label>
                <input id="f-company" name="company" type="text" required />
              </div>
              <div class="field">
                <label for="f-email">Email</label>
                <input id="f-email" name="email" type="email" required autocomplete="email" />
              </div>
              <div class="field">
                <label for="f-phone">Phone / WhatsApp</label>
                <input id="f-phone" name="phone" type="tel" autocomplete="tel" />
              </div>
              <div class="field">
                <label for="f-tier">Tier of interest</label>
                <select id="f-tier" name="tier">
                  <option value="">Not sure yet</option>
                  @for (tier of tiers; track tier.name) {
                    <option [value]="tier.name">{{ tier.name }} — {{ tier.price }}</option>
                  }
                  <option value="In-kind">In-kind / product</option>
                </select>
              </div>
              <div class="field">
                <label for="f-budget">Indicative budget (optional)</label>
                <input id="f-budget" name="budget" type="text" />
              </div>
              <div class="field field--full">
                <label for="f-message">Anything else?</label>
                <textarea id="f-message" name="message" rows="4"></textarea>
              </div>

              <div class="sp-form__actions field--full">
                <button class="btn btn--solid" type="submit" [disabled]="status() === 'sending'">
                  {{ status() === 'sending' ? 'Sending…' : 'Send Enquiry' }}
                </button>
                <a [href]="mailto" class="btn btn--outline">Or email us</a>
              </div>

              @if (status() === 'error') {
                <p class="form-error field--full" role="alert">
                  Something went wrong sending your enquiry. Please email
                  <a [href]="mailto">{{ partnershipsEmail }}</a> or message us on
                  WhatsApp.
                </p>
              }
            </form>
          }
        </div>
      </section>
    </main>
  `,
  styleUrl: './sponsor-page.component.scss',
})
export class SponsorPageComponent {
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  readonly stats = SPONSOR_STATS;
  readonly tiers = SPONSOR_TIERS;
  readonly categories = SPONSOR_CATEGORIES;
  readonly partners = CURRENT_PARTNERS;
  readonly impact = IMPACT_POINTS;
  readonly deadline = SPONSOR_DEADLINE;
  readonly partnershipsEmail = PARTNERSHIPS_EMAIL;
  readonly mailto =
    `mailto:${PARTNERSHIPS_EMAIL}` +
    '?subject=Partnership%20Proposal%20Request%20%E2%80%94%20A%20Night%20of%20Angels';

  status = signal<FormStatus>('idle');

  statusText(status: string, note?: string): string {
    if (status === 'confirmed') return note ? `Confirmed · ${note}` : 'Confirmed';
    if (status === 'talking') return 'In conversation';
    return 'Available';
  }

  downloadPdf(): void {
    if (this.isBrowser) window.print();
  }

  submit(event: Event): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    if (!this.isBrowser) return;

    this.status.set('sending');
    const data = new FormData(form);
    const body = new URLSearchParams();
    data.forEach((value, key) => body.append(key, value.toString()));
    body.set('form-name', 'sponsor');

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        this.status.set('sent');
        form.reset();
      })
      .catch(() => this.status.set('error'));
  }
}
