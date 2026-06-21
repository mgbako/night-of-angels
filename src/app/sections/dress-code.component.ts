import { Component } from '@angular/core';

interface Rule {
  title: string;
  detail: string;
}

@Component({
  selector: 'app-dress-code',
  standalone: true,
  template: `
    <section class="section section--ink dress" id="dress">
      <div class="wrap two-col">
        <div>
          <span class="eyebrow eyebrow--italic">The Dress Code Is</span>
          <div class="dress__big">WHITE</div>
        </div>
        <ul class="etiquette">
          @for (rule of rules; track rule.title) {
            <li>
              <span class="dia">◆</span>
              <div>
                <b>{{ rule.title }}</b>
                <span class="d">{{ rule.detail }}</span>
              </div>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styleUrl: './dress-code.component.scss',
})
export class DressCodeComponent {
  rules: Rule[] = [
    {
      title: 'All-white is the only rule',
      detail: 'Head to toe in white — it is what gives the room its glow.',
    },
    {
      title: 'Ivory, champagne & pearl welcome',
      detail: 'Soft off-white tones sit beautifully within the palette.',
    },
    {
      title: 'Gold accents are encouraged',
      detail: 'A touch of gold — jewellery or detailing — is always in keeping.',
    },
    {
      title: 'Formal eveningwear, please',
      detail: 'Dress for an occasion. Black tie elegance in white.',
    },
  ];
}
