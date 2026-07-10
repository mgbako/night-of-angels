import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CrestComponent } from '../../shared/crest/crest.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-forgot',
  standalone: true,
  imports: [FormsModule, RouterLink, CrestComponent],
  template: `
    <div class="login">
      <form class="login__card" (ngSubmit)="submit()">
        <app-crest [size]="48" />
        <h1>Reset password</h1>

        @if (sent()) {
          <p class="login__sub">
            If an account exists for <strong>{{ email }}</strong>, a reset link is on
            its way. Check your inbox (and spam).
          </p>
          <a routerLink="/admin/login" class="login__btn" style="text-align:center">
            Back to sign in
          </a>
        } @else {
          <p class="login__sub">Enter your email and we’ll send you a reset link.</p>
          <div class="login__field">
            <label for="email">Email</label>
            <input id="email" type="email" name="email" [(ngModel)]="email" required autocomplete="username" />
          </div>
          <button type="submit" class="login__btn" [disabled]="busy()">
            {{ busy() ? 'Sending…' : 'Send reset link' }}
          </button>
          <p class="login__hint"><a routerLink="/admin/login">Back to sign in</a></p>
        }
      </form>
    </div>
  `,
  styleUrl: './login.component.scss',
})
export class ForgotComponent {
  email = '';
  busy = signal(false);
  sent = signal(false);

  constructor(private auth: AuthService) {}

  async submit(): Promise<void> {
    if (this.busy() || !this.email) return;
    this.busy.set(true);
    try {
      await this.auth.forgotPassword(this.email.trim());
      this.sent.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
