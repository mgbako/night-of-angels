import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CrestComponent } from '../shared/crest.component';
import {
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  PARTNERSHIPS_EMAIL,
  PHONE_DISPLAY,
  PHONE_TEL,
  RSVP_EMAIL,
} from '../event.config';

@Component({
  selector: 'app-rsvp-footer',
  standalone: true,
  imports: [CrestComponent, RouterLink],
  template: `
    <section class="section section--panel rsvp" id="rsvp">
      <div class="wrap">
        <span class="eyebrow">RSVP</span>
        <h2>The Room Is Small. <em>The Night Is Not.</em></h2>
        <p class="rsvp__lead">
          For reservations, full tables, or partnership enquiries, reach out and a
          member of our team will look after you personally.
        </p>
        <div class="rsvp__ctas">
          <a [href]="rsvpMailto" class="btn btn--solid">Email to Reserve</a>
          <a [href]="phoneTel" class="btn btn--outline">Call {{ phoneDisplay }}</a>
        </div>

        <div class="footer">
          <div class="footer__brand">
            <div class="brand">
              <app-crest [size]="46" />
              <span class="wordmark">Night of Angels</span>
            </div>
            <p>
              An all-white luxury dinner experience in Lagos, Nigeria. By
              invitation and ticket.
            </p>
          </div>

          <div>
            <h4>Explore</h4>
            <ul>
              <li><a [routerLink]="'/'" fragment="evening">The Evening</a></li>
              <li><a routerLink="/gallery">Gallery</a></li>
              <li><a [routerLink]="'/'" fragment="dress">Dress Code</a></li>
              <li><a [routerLink]="'/'" fragment="tickets">Tickets</a></li>
              <li><a [routerLink]="'/'" fragment="programme">Programme</a></li>
              <li><a [routerLink]="'/'" fragment="partners">Partners</a></li>
              <li><a [routerLink]="'/'" fragment="faq">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4>Connect</h4>
            <ul>
              <li><a [href]="'mailto:' + rsvpEmail">{{ rsvpEmail }}</a></li>
              <li>
                <a [href]="'mailto:' + partnershipsEmail">{{ partnershipsEmail }}</a>
              </li>
              <li>
                <a [href]="instagramUrl" target="_blank" rel="noopener">{{
                  instagramHandle
                }}</a>
              </li>
            </ul>
          </div>
        </div>

        <p class="copyright">
          © 2026 A Night of Angels · Lagos, Nigeria · All Rights Reserved
        </p>
      </div>
    </section>
  `,
  styleUrl: './rsvp-footer.component.scss',
})
export class RsvpFooterComponent {
  rsvpEmail = RSVP_EMAIL;
  partnershipsEmail = PARTNERSHIPS_EMAIL;
  phoneDisplay = PHONE_DISPLAY;
  instagramHandle = INSTAGRAM_HANDLE;
  instagramUrl = INSTAGRAM_URL;

  rsvpMailto =
    `mailto:${RSVP_EMAIL}` +
    '?subject=Reservation%20Enquiry%20%E2%80%94%20A%20Night%20of%20Angels';
  phoneTel = `tel:${PHONE_TEL}`;
}
