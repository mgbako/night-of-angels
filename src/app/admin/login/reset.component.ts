import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { LogoComponent } from '../../shared/logo/logo.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-reset',
  standalone: true,
  imports: [FormsModule, RouterLink, LogoComponent],
  template: `
    <div class="login">
      <form class="login__card" (ngSubmit)="submit()">
        <app-logo [size]="72" />
        <h1>Choose a new password</h1>

        @if (!token) {
          <p class="login__error">This reset link is missing or invalid.</p>
          <a routerLink="/admin/forgot" class="login__btn" style="text-align:center">Request a new link</a>
        } @else if (done()) {
          <p class="login__sub">Your password has been updated. You can sign in now.</p>
          <a routerLink="/admin/login" class="login__btn" style="text-align:center">Go to sign in</a>
        } @else {
          <div class="login__field">
            <label for="pw">New password</label>
            <input id="pw" type="password" name="pw" [(ngModel)]="password" autocomplete="new-password" />
          </div>
          <div class="login__field">
            <label for="pw2">Confirm password</label>
            <input id="pw2" type="password" name="pw2" [(ngModel)]="confirm" autocomplete="new-password" />
          </div>
          @if (error()) { <p class="login__error">{{ error() }}</p> }
          <button type="submit" class="login__btn" [disabled]="busy()">
            {{ busy() ? 'Saving…' : 'Update password' }}
          </button>
        }
      </form>
    </div>
  `,
  styleUrl: './login.component.scss',
})
export class ResetComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

  password = '';
  confirm = '';
  busy = signal(false);
  done = signal(false);
  error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.error.set(null);
    if (this.password.length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }
    if (this.password !== this.confirm) {
      this.error.set('Passwords do not match.');
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.resetPassword(this.token, this.password);
      this.done.set(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      this.busy.set(false);
    }
  }
}
