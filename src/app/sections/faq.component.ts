import { Component, signal } from '@angular/core';

interface Faq {
  q: string;
  a: string;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  template: `
    <section class="section section--ink" id="faq">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Questions</span>
          <h2 class="section-title">Good to Know</h2>
        </div>
        <div class="faq">
          @for (item of faqs; track item.q; let i = $index) {
            <div class="faq-item" [class.open]="openIndex() === i">
              <button
                class="faq-q"
                [attr.aria-expanded]="openIndex() === i"
                (click)="toggle(i)"
              >
                <span>{{ item.q }}</span>
                <span class="faq-icon" aria-hidden="true"></span>
              </button>
              <div class="faq-a">
                <div class="faq-a__inner">{{ item.a }}</div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: './faq.component.scss',
})
export class FaqComponent {
  openIndex = signal<number | null>(null);

  toggle(i: number): void {
    this.openIndex.update((current) => (current === i ? null : i));
  }

  faqs: Faq[] = [
    {
      q: 'Where is the venue?',
      a: 'The venue is a private address in Lagos, revealed to confirmed guests ahead of the evening. This keeps the gathering intimate and secure for everyone in the room.',
    },
    {
      q: 'Is the dress code strictly enforced?',
      a: 'Yes. All-white attire is essential — it is the heart of the experience. Guests who are not in white may be asked to adjust before entry.',
    },
    {
      q: 'Can a company book a full table?',
      a: 'Absolutely. A Table seats ten and is popular with companies hosting clients or teams. Tables can also be bundled into a wider sponsorship package — reach out and we will tailor it.',
    },
    {
      q: 'Is there an age requirement?',
      a: 'Yes — A Night of Angels is strictly for guests aged 18 and over.',
    },
    {
      q: 'What is the refund policy?',
      a: 'Refund and transfer terms are confirmed at the point of booking, so you will have the full details before any payment is completed.',
    },
  ];
}
