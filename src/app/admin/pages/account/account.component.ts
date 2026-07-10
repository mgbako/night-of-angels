import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-account',
  standalone: true,
  imports: [FormsModule, AdminIconComponent],
  template: `
    <div class="adm-page-head">
      <div>
        <h2>Account</h2>
        <p>{{ auth.user()?.name }} · {{ auth.user()?.email }}</p>
      </div>
    </div>

    <div class="adm-card adm-card--pad" style="max-width:520px">
      <h3 class="acc-title">Change password</h3>
      <form class="adm-form" (ngSubmit)="submit()" style="max-width:none">
        <div class="adm-field">
          <label for="cur">Current password</label>
          <input id="cur" type="password" name="cur" [(ngModel)]="current" autocomplete="current-password" />
        </div>
        <div class="adm-field">
          <label for="nw">New password</label>
          <input id="nw" type="password" name="nw" [(ngModel)]="next" autocomplete="new-password" />
        </div>
        <div class="adm-field">
          <label for="cf">Confirm new password</label>
          <input id="cf" type="password" name="cf" [(ngModel)]="confirm" autocomplete="new-password" />
        </div>

        @if (error()) { <p class="adm-error">{{ error() }}</p> }
        @if (done()) { <p class="acc-ok">✓ Password updated.</p> }

        <div>
          <button type="submit" class="adm-btn adm-btn--primary" [disabled]="busy()">
            <adm-icon name="shield" [size]="17" /> {{ busy() ? 'Saving…' : 'Update password' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .acc-title { font-family: var(--display); font-size: 1.2rem; margin: 0 0 1rem; color: #23201a; }
      .acc-ok { color: #1c7a41; font-size: 0.86rem; }
    `,
  ],
})
export class AccountComponent {
  auth = inject(AuthService);

  current = '';
  next = '';
  confirm = '';
  busy = signal(false);
  done = signal(false);
  error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.error.set(null);
    this.done.set(false);
    if (!this.current || this.next.length < 8) {
      this.error.set('Enter your current password and a new one (8+ characters).');
      return;
    }
    if (this.next !== this.confirm) {
      this.error.set('New passwords do not match.');
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.changePassword(this.current, this.next);
      this.done.set(true);
      this.current = this.next = this.confirm = '';
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not update password');
    } finally {
      this.busy.set(false);
    }
  }
}
