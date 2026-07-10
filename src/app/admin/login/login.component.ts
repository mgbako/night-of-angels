import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CrestComponent } from '../../shared/crest/crest.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, RouterLink, CrestComponent],
  template: `
    <div class="login">
      <form class="login__card" (ngSubmit)="submit()">
        <app-crest [size]="48" />
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
          <input
            id="password"
            type="password"
            name="password"
            [(ngModel)]="password"
            autocomplete="current-password"
            required
          />
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
  busy = signal(false);
  error = signal<string | null>(null);

  constructor(private auth: AuthService, private router: Router) {}

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
      this.router.navigate(['/admin']);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Login failed');
    } finally {
      this.busy.set(false);
    }
  }
}
