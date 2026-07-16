import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Ticket {
  eyebrow: string;
  title: string;
  desc: string;
  strike?: string;
  amount: string;
  unit: string;
  featured?: boolean;
  badge?: string;
}

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="section section--ivory" id="tickets">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Reserve</span>
          <h2 class="section-title">Secure Your Place</h2>
          <p>
            A limited number of seats are released for each Night of Angels.
            Choose the experience that suits you.
          </p>
        </div>

        <div class="tickets__grid">
          @for (t of tickets; track t.title) {
            <article class="ticket" [class.ticket--featured]="t.featured">
              @if (t.badge) {
                <span class="ticket__badge">{{ t.badge }}</span>
              }
              <span class="ticket__eyebrow">{{ t.eyebrow }}</span>
              <h3 class="ticket__title">{{ t.title }}</h3>
              <p class="ticket__desc">{{ t.desc }}</p>
              <div class="perf">
                <span class="notch l"></span><span class="notch r"></span>
              </div>
              <div class="price">
                @if (t.strike) {
                  <span class="strike">{{ t.strike }}</span>
                }
                <span class="amount">{{ t.amount }}</span>
                <span class="unit">{{ t.unit }}</span>
              </div>
              <a
                routerLink="/reserve"
                class="btn btn--block"
                [class.btn--solid]="true"
                [class.btn--ink]="!t.featured"
                >Reserve</a
              >
            </article>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: './tickets.component.scss',
})
export class TicketsComponent {
  tickets: Ticket[] = [
    {
      eyebrow: 'Single Entry',
      title: 'Regular',
      desc: 'One seat at the table, with full access to the dinner and the evening’s programme.',
      amount: '₦20,000',
      unit: 'per guest · single entry',
    },
    {
      eyebrow: 'Two Paired Seats',
      title: 'Couples',
      desc: 'Two seats together — perfect for arriving in pairs and sharing the night side by side.',
      strike: '₦40,000 regular',
      amount: '₦35,000',
      unit: 'early bird · two seats',
      featured: true,
      badge: 'Early Bird',
    },
    {
      eyebrow: 'Table of Ten',
      title: 'Table',
      desc: 'A full table of ten — ideal for corporate hosting or arriving with your whole circle.',
      amount: '₦300,000',
      unit: 'full table · seats ten',
    },
  ];
}
