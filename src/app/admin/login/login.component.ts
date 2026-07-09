import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CrestComponent } from '../../shared/crest/crest.component';
import { AdminAuthService } from '../services/admin-auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, CrestComponent],
  template: `
    <div class="login">
      <form class="login__card" (ngSubmit)="submit()">
        <app-crest [size]="48" />
        <h1>Back Office</h1>
        <p class="login__sub">Enter the organizer passcode to continue.</p>

        <div class="login__field">
          <input
            type="password"
            name="passcode"
            [(ngModel)]="passcode"
            placeholder="Passcode"
            autocomplete="current-password"
            aria-label="Passcode"
            autofocus
          />
        </div>

        @if (error()) {
          <p class="login__error">Incorrect passcode. Please try again.</p>
        }

        <button type="submit" class="login__btn">Enter</button>

        <p class="login__hint">Demo passcode: <code>angels2026</code></p>
      </form>
    </div>
  `,
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  passcode = '';
  error = signal(false);

  constructor(private auth: AdminAuthService, private router: Router) {}

  submit(): void {
    if (this.auth.login(this.passcode)) {
      this.router.navigate(['/admin']);
    } else {
      this.error.set(true);
    }
  }
}
