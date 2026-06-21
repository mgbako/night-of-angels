import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-crest',
  standalone: true,
  template: `
    <svg
      class="crest"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <circle class="stroke" cx="50" cy="50" r="42" />
      @if (full) {
        <circle class="stroke" cx="50" cy="50" r="36" />
      }
      <text class="mono" x="50" [attr.y]="full ? 55 : 56" text-anchor="middle">
        N·O·A
      </text>
      @if (full) {
        <path class="stroke" d="M26 64 q-7 -9 -3 -20 q6 5 5 16" />
        <path class="stroke" d="M74 64 q7 -9 3 -20 q-6 5 -5 16" />
      }
    </svg>
  `,
})
export class CrestComponent {
  @Input() size = 46;
  @Input() full = true;
}
