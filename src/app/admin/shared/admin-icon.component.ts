import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type IconName =
  | 'dashboard'
  | 'attendees'
  | 'ticket'
  | 'register'
  | 'logout'
  | 'menu'
  | 'close'
  | 'search'
  | 'download'
  | 'check'
  | 'check-circle'
  | 'alert'
  | 'trash'
  | 'chevron-left'
  | 'chevron-right'
  | 'mail'
  | 'phone'
  | 'shield'
  | 'external';

/**
 * Tiny inline-SVG icon set (stroke = currentColor). Rendered directly in the
 * template (not [innerHTML]) so Angular's sanitizer never strips the paths.
 */
@Component({
  selector: 'adm-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name) {
        @case ('dashboard') {
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        }
        @case ('attendees') {
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M16 5.5a3 3 0 0 1 0 5.5" />
          <path d="M18 20a6 6 0 0 0-3-5.2" />
        }
        @case ('ticket') {
          <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" />
          <path d="M15 6v12" stroke-dasharray="2 2" />
        }
        @case ('register') {
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M18 8v6M15 11h6" />
        }
        @case ('logout') {
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        }
        @case ('menu') {
          <path d="M4 6h16M4 12h16M4 18h16" />
        }
        @case ('close') {
          <path d="M6 6l12 12M18 6L6 18" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        }
        @case ('download') {
          <path d="M12 3v12" />
          <path d="M7 11l5 5 5-5" />
          <path d="M5 21h14" />
        }
        @case ('check') {
          <path d="M5 12l5 5 9-11" />
        }
        @case ('check-circle') {
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12l3 3 5-6" />
        }
        @case ('alert') {
          <path d="M12 3l9 16H3z" />
          <path d="M12 10v4M12 17h.01" />
        }
        @case ('trash') {
          <path d="M4 7h16" />
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
        }
        @case ('chevron-left') {
          <path d="M15 5l-7 7 7 7" />
        }
        @case ('chevron-right') {
          <path d="M9 5l7 7-7 7" />
        }
        @case ('mail') {
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        }
        @case ('phone') {
          <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
        }
        @case ('shield') {
          <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
          <path d="M9 12l2 2 4-4" />
        }
        @case ('external') {
          <path d="M14 4h6v6" />
          <path d="M20 4l-9 9" />
          <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        }
      }
    </svg>
  `,
})
export class AdminIconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() size = 20;
}
