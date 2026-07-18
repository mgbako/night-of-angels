import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * The official "A Night of Angels" emblem.
 *
 * Uses the transparent-background PNG so the round emblem sits cleanly on any
 * surface — light or dark — with no visible plate behind it.
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="noa-logo"
      [style.width.px]="size"
      [style.height.px]="size"
    >
      <img src="/noa-logo.png" [attr.width]="size" [attr.height]="size" [alt]="alt" />
    </span>
  `,
  styles: [
    `
      .noa-logo {
        display: inline-block;
        line-height: 0;
      }
      .noa-logo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
    `,
  ],
})
export class LogoComponent {
  /** Rendered diameter in px. */
  @Input() size = 96;
  @Input() alt = 'A Night of Angels — Harvest Dinner 2026';
}
