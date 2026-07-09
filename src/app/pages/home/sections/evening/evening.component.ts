import { Component } from '@angular/core';
import { CrestComponent } from '../../../../shared/crest/crest.component';

@Component({
  selector: 'app-evening',
  standalone: true,
  imports: [CrestComponent],
  template: `
    <section class="section section--ivory evening" id="evening">
      <div class="wrap two-col">
        <div class="evening__copy">
          <span class="eyebrow">The Evening</span>
          <h2 class="section-title">A Rare Gathering, Dressed in White</h2>
          <p>
            <span class="lead"
              >A Night of Angels is an exclusive, all-white dinner created for
              Lagos’s most distinguished circle of entrepreneurs, executives and
              tastemakers.</span
            >
            One evening, one room, and a guest list kept deliberately small.
          </p>
          <p>
            The night is built around three things done exceptionally well — fine
            dining, live entertainment, and intentional networking. Every detail,
            from the menu to the music, is composed to bring remarkable people
            into the same conversation.
          </p>
          <p>
            For a select few partner brands, it is a rare chance to be woven into
            the experience itself — present in the moments guests remember, rather
            than placed on a banner at the edge of the room.
          </p>
        </div>
        <div class="evening__art" aria-hidden="true">
          <svg viewBox="0 0 200 320">
            <path class="la-stroke" d="M55 70 Q100 140 145 70" />
            <path class="la-stroke" d="M55 70 Q60 60 100 60 Q140 60 145 70" />
            <line class="la-stroke" x1="100" y1="135" x2="100" y2="250" />
            <line class="la-stroke" x1="68" y1="262" x2="132" y2="262" />
            <path class="la-stroke" d="M70 262 Q100 246 130 262" />
            <circle class="la-stroke" cx="92" cy="100" r="3" />
            <circle class="la-stroke" cx="108" cy="88" r="2.5" />
            <circle class="la-stroke" cx="100" cy="112" r="2" />
            <circle class="la-stroke" cx="100" cy="38" r="2.5" />
            <circle class="la-stroke" cx="93" cy="22" r="2" />
            <circle class="la-stroke" cx="107" cy="14" r="1.6" />
            <circle class="la-stroke" cx="100" cy="4" r="1.4" />
          </svg>
        </div>
      </div>
    </section>

    <div class="section section--ink crest-spacer">
      <div class="crest-transition" aria-hidden="true">
        <span class="line"></span>
        <app-crest [size]="34" [full]="false" />
        <span class="line"></span>
      </div>
    </div>
  `,
  styleUrl: './evening.component.scss',
})
export class EveningComponent {}
