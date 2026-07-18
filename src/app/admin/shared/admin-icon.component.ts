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
  | 'whatsapp'
  | 'inbox'
  | 'external'
  | 'settings'
  | 'tables'
  | 'qr';

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
        @case ('inbox') {
          <path d="M4 13l2.5-7a2 2 0 0 1 1.9-1.4h7.2a2 2 0 0 1 1.9 1.4L20 13" />
          <path d="M4 13h4l1.5 2.5h5L16 13h4v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        }
        @case ('whatsapp') {
          <g transform="scale(0.75)" fill="currentColor" stroke="none">
            <path d="M16.004 4.5c-6.35 0-11.5 5.146-11.5 11.494 0 2.026.53 4.005 1.537 5.75L4.5 27.5l5.9-1.546a11.46 11.46 0 0 0 5.6 1.43h.005c6.347 0 11.495-5.147 11.498-11.495A11.42 11.42 0 0 0 24.13 7.86 11.42 11.42 0 0 0 16.004 4.5zm0 20.94h-.004a9.5 9.5 0 0 1-4.84-1.326l-.347-.206-3.5.918.934-3.414-.226-.35a9.45 9.45 0 0 1-1.45-5.062c0-5.27 4.29-9.558 9.563-9.558a9.49 9.49 0 0 1 6.756 2.804 9.46 9.46 0 0 1 2.8 6.762c-.003 5.27-4.292 9.558-9.56 9.558zm5.24-7.156c-.287-.144-1.7-.84-1.964-.936-.263-.096-.455-.144-.647.144-.192.287-.743.936-.91 1.128-.168.192-.335.216-.622.072-.287-.144-1.213-.447-2.31-1.426-.854-.762-1.43-1.703-1.598-1.99-.168-.287-.018-.442.126-.586.13-.13.287-.335.43-.503.144-.168.192-.287.288-.48.096-.192.048-.36-.024-.503-.072-.144-.647-1.56-.886-2.136-.233-.56-.47-.484-.647-.494l-.55-.01c-.192 0-.503.072-.766.36-.263.287-1.006.983-1.006 2.4 0 1.415 1.03 2.78 1.174 2.972.144.192 2.03 3.1 4.92 4.347.688.297 1.224.474 1.642.607.69.22 1.318.188 1.814.114.553-.082 1.7-.695 1.94-1.366.24-.67.24-1.246.168-1.366-.072-.12-.263-.192-.55-.336z"/>
          </g>
        }
        @case ('external') {
          <path d="M14 4h6v6" />
          <path d="M20 4l-9 9" />
          <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        }
        @case ('tables') {
          <circle cx="7.5" cy="7.5" r="3.5" />
          <circle cx="16.5" cy="7.5" r="3.5" />
          <circle cx="7.5" cy="16.5" r="3.5" />
          <circle cx="16.5" cy="16.5" r="3.5" />
        }
        @case ('qr') {
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3M20 14v.01M14 20v.01M20 20v.01M17 17h.01M20 17h.01M17 20h3" />
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 2.5l1.4 2.2 2.6-.5.5 2.6 2.2 1.4-1.1 2.3 1.1 2.3-2.2 1.4-.5 2.6-2.6-.5-1.4 2.2-1.4-2.2-2.6.5-.5-2.6-2.2-1.4 1.1-2.3-1.1-2.3 2.2-1.4.5-2.6 2.6.5z"
          />
        }
      }
    </svg>
  `,
})
export class AdminIconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() size = 20;
}
