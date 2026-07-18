import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../shared/logo/logo.component';
import { EventSettingsService } from '../../shared/event-settings.service';

/**
 * The public "coming soon" screen shown to signed-out visitors while the site
 * is in maintenance mode. Title and message are organiser-configurable in the
 * back-office Settings page; they fall back to sensible defaults.
 */
@Component({
  selector: 'app-maintenance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LogoComponent],
  template: `
    <main class="mnt">
      <div class="mnt__inner">
        <app-logo [size]="140" />
        <p class="mnt__eyebrow">A Night of Angels · Harvest Dinner 2026</p>
        <h1>{{ settings.settings().maintenanceTitle }}</h1>
        <p class="mnt__msg">{{ settings.settings().maintenanceMessage }}</p>
        <a routerLink="/admin" class="mnt__admin">Team sign in</a>
      </div>
    </main>
  `,
  styles: [
    `
      .mnt {
        min-height: 100vh;
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem 1.4rem;
        background: var(--ink);
        color: var(--text-on-ink);
        text-align: center;
      }
      .mnt__inner { max-width: 560px; display: grid; justify-items: center; gap: 0.4rem; }
      .mnt__eyebrow {
        margin: 1.4rem 0 0;
        font-size: 0.72rem;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        color: var(--gold-soft);
      }
      .mnt h1 {
        font-family: var(--display, 'Cormorant Garamond', serif);
        font-size: clamp(2.6rem, 8vw, 4.4rem);
        font-weight: 600;
        margin: 0.4rem 0 0.2rem;
        color: var(--gold);
      }
      .mnt__msg {
        font-size: 1.05rem;
        line-height: 1.7;
        color: var(--ink-soft, #6c6555);
        margin: 0.6rem 0 0;
      }
      .mnt__admin {
        margin-top: 2rem;
        font-size: 0.78rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--ink-soft, #8a8270);
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: color 0.2s, border-color 0.2s;
      }
      .mnt__admin:hover { color: var(--gold); border-color: var(--gold); }
    `,
  ],
})
export class MaintenanceComponent {
  protected settings = inject(EventSettingsService);
}
