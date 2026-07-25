import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LogoComponent } from '../../shared/logo/logo.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, RouterLink, LogoComponent],
  template: `
    <div class="login">
      <form class="login__card" (ngSubmit)="submit()">
        <app-logo [size]="72" />
        <h1>Back Office</h1>
        <p class="login__sub">Sign in to manage tickets and attendees.</p>

        <div class="login__field">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            name="email"
            [(ngModel)]="email"
            autocomplete="username"
            required
          />
        </div>

        <div class="login__field">
          <label for="password">Password</label>
          <div class="login__pw">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              name="password"
              [(ngModel)]="password"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              class="login__pw-toggle"
              (click)="showPassword.set(!showPassword())"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              [attr.aria-pressed]="showPassword()"
            >
              @if (showPassword()) {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              }
            </button>
          </div>
        </div>

        @if (error()) {
          <p class="login__error">{{ error() }}</p>
        }

        <button type="submit" class="login__btn" [disabled]="busy()">
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>

        <p class="login__hint"><a routerLink="/admin/forgot">Forgot password?</a></p>
      </form>
    </div>
  `,
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = signal(false);
  busy = signal(false);
  error = signal<string | null>(null);

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.error.set(null);
    if (!this.email || !this.password) {
      this.error.set('Enter your email and password.');
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.login(this.email.trim(), this.password);
      // Honour a returnUrl (e.g. a scanned check-in link that bounced through login).
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      this.router.navigateByUrl(returnUrl || '/admin');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Login failed');
    } finally {
      this.busy.set(false);
    }
  }
}
