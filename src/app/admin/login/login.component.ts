import { Component, OnDestroy, signal } from '@angular/core';
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
      @if (step() === 'credentials') {
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
      } @else {
        <form class="login__card" (ngSubmit)="verify()">
          <app-logo [size]="72" />
          <h1>Check your email</h1>
          <p class="login__sub">
            We sent a 6-digit code to <b>{{ otpEmail }}</b>. It expires in 10 minutes.
          </p>

          <div class="login__field">
            <label for="code">Verification code</label>
            <input
              id="code"
              class="login__code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              name="code"
              [(ngModel)]="code"
              autofocus
            />
          </div>

          @if (error()) {
            <p class="login__error">{{ error() }}</p>
          }

          <button type="submit" class="login__btn" [disabled]="busy()">
            {{ busy() ? 'Verifying…' : 'Verify & sign in' }}
          </button>

          <p class="login__hint">
            <button type="button" class="login__link" (click)="resend()" [disabled]="resendCooldown() > 0">
              {{ resendCooldown() > 0 ? 'Resend code (' + resendCooldown() + 's)' : 'Resend code' }}
            </button>
            ·
            <button type="button" class="login__link" (click)="backToCredentials()">Use a different account</button>
          </p>
        </form>
      }
    </div>
  `,
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnDestroy {
  email = '';
  password = '';
  code = '';
  otpEmail = '';
  showPassword = signal(false);
  busy = signal(false);
  error = signal<string | null>(null);
  step = signal<'credentials' | 'otp'>('credentials');
  resendCooldown = signal(0);

  private resendTimer?: ReturnType<typeof setInterval>;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnDestroy(): void {
    if (this.resendTimer) clearInterval(this.resendTimer);
  }

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.error.set(null);
    if (!this.email || !this.password) {
      this.error.set('Enter your email and password.');
      return;
    }
    this.busy.set(true);
    try {
      const result = await this.auth.login(this.email.trim(), this.password);
      this.otpEmail = result.email;
      this.code = '';
      this.step.set('otp');
      this.startResendCooldown();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Login failed');
    } finally {
      this.busy.set(false);
    }
  }

  async verify(): Promise<void> {
    if (this.busy()) return;
    this.error.set(null);
    if (this.code.trim().length !== 6) {
      this.error.set('Enter the 6-digit code from your email.');
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.verifyOtp(this.otpEmail, this.code.trim());
      // Honour a returnUrl (e.g. a scanned check-in link that bounced through login).
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      this.router.navigateByUrl(returnUrl || '/admin');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Invalid or expired code');
    } finally {
      this.busy.set(false);
    }
  }

  async resend(): Promise<void> {
    if (this.resendCooldown() > 0) return;
    this.error.set(null);
    try {
      await this.auth.resendOtp(this.otpEmail);
    } finally {
      this.startResendCooldown();
    }
  }

  backToCredentials(): void {
    this.step.set('credentials');
    this.code = '';
    this.error.set(null);
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendCooldown.set(0);
  }

  private startResendCooldown(): void {
    this.resendCooldown.set(30);
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendTimer = setInterval(() => {
      this.resendCooldown.update((v) => {
        if (v <= 1) {
          if (this.resendTimer) clearInterval(this.resendTimer);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }
}
