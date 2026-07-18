import { Component } from '@angular/core';

interface ProgrammeItem {
  time: string;
  title: string;
}

@Component({
  selector: 'app-programme',
  standalone: true,
  template: `
    <section class="section section--panel" id="programme">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">The Programme</span>
          <h2 class="section-title">How the Night Unfolds</h2>
        </div>
        <div class="programme__list">
          @for (item of items; track item.time) {
            <div class="prog-row">
              <span class="prog-time">{{ item.time }}</span>
              <span class="prog-title">{{ item.title }}</span>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: './programme.component.scss',
})
export class ProgrammeComponent {
  items: ProgrammeItem[] = [
    { time: '5:00 PM', title: 'Arrival & Champagne Reception' },
    { time: '7:00 PM', title: 'Seated Dinner' },
    { time: '8:00 PM', title: 'Live Entertainment' },
    { time: '8:45 PM', title: 'Toast & Recognition' },
    { time: '9:30 PM', title: 'Dancing & Late Night' },
  ];
}
