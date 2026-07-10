import { Component, afterNextRender, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import { AuthService, AuthUser } from '../../services/auth.service';

@Component({
  selector: 'app-admin-team',
  standalone: true,
  imports: [FormsModule, AdminIconComponent],
  template: `
    <div class="adm-page-head">
      <div>
        <h2>Team</h2>
        <p>People who can sign in and manage tickets.</p>
      </div>
    </div>

    <div class="team-grid">
      <!-- Members -->
      <div class="adm-card adm-card--pad">
        <h3 class="team-title">Members ({{ users().length }})</h3>
        @if (loading()) {
          <div class="adm-loading"><div class="adm-spinner"></div><p>Loading…</p></div>
        } @else {
          <ul class="team-list">
            @for (u of users(); track u.id) {
              <li>
                <div class="team-info">
                  <span class="team-name">
                    {{ u.name }}
                    @if (u.id === meId()) { <span class="team-you">you</span> }
                  </span>
                  <span class="team-email">{{ u.email }}</span>
                </div>
                <button
                  class="adm-btn adm-btn--sm adm-btn--danger"
                  (click)="remove(u)"
                  [disabled]="u.id === meId() || users().length <= 1 || busy()"
                  title="Remove"
                >
                  <adm-icon name="trash" [size]="15" />
                </button>
              </li>
            } @empty {
              <li class="team-empty">No members yet.</li>
            }
          </ul>
        }
      </div>

      <!-- Add member -->
      <div class="adm-card adm-card--pad">
        <h3 class="team-title">Add a teammate</h3>
        <form class="adm-form" (ngSubmit)="add()" style="max-width:none">
          <div class="adm-field">
            <label for="t-name">Full name</label>
            <input id="t-name" name="name" [(ngModel)]="name" required />
          </div>
          <div class="adm-field">
            <label for="t-email">Email</label>
            <input id="t-email" name="email" type="email" [(ngModel)]="email" required autocomplete="off" />
          </div>
          <div class="adm-field">
            <label for="t-pass">Temporary password</label>
            <input id="t-pass" name="password" type="text" [(ngModel)]="password" required />
            <span class="adm-hint">At least 8 characters. Share it with them to sign in.</span>
          </div>

          @if (error()) { <p class="adm-error">{{ error() }}</p> }
          @if (added()) { <p class="team-ok">✓ {{ added() }} added.</p> }

          <div>
            <button type="submit" class="adm-btn adm-btn--primary" [disabled]="busy()">
              <adm-icon name="register" [size]="17" /> {{ busy() ? 'Adding…' : 'Add teammate' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .team-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .team-title {
        font-family: var(--display);
        font-size: 1.2rem;
        margin: 0 0 1rem;
        color: #23201a;
      }
      .team-list { list-style: none; margin: 0; padding: 0; }
      .team-list li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.7rem 0;
        border-bottom: 1px solid #efeade;
      }
      .team-list li:last-child { border-bottom: none; }
      .team-info { display: flex; flex-direction: column; min-width: 0; }
      .team-name { font-weight: 600; color: #23201a; display: flex; align-items: center; gap: 0.4rem; }
      .team-email { font-size: 0.82rem; color: #8a8270; }
      .team-you {
        font-size: 0.62rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #9a7d1f;
        border: 1px solid #e7d9a6;
        background: #fbf6e6;
        border-radius: 999px;
        padding: 0.05rem 0.4rem;
      }
      .team-empty { color: #8a8270; padding: 0.7rem 0; }
      .adm-hint { font-size: 0.74rem; color: #8a8270; }
      .team-ok { color: #1c7a41; font-size: 0.86rem; }
      @media (max-width: 860px) {
        .team-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class TeamComponent {
  private auth = inject(AuthService);

  users = signal<AuthUser[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal<string | null>(null);
  added = signal<string | null>(null);

  name = '';
  email = '';
  password = '';

  meId = () => this.auth.user()?.id ?? '';

  constructor() {
    afterNextRender(() => this.load());
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.users.set(await this.auth.listUsers());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load team');
    } finally {
      this.loading.set(false);
    }
  }

  async add(): Promise<void> {
    this.error.set(null);
    this.added.set(null);
    if (!this.name || !this.email || !this.password) {
      this.error.set('Name, email and password are required.');
      return;
    }
    if (this.password.length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }
    this.busy.set(true);
    try {
      const user = await this.auth.addUser({
        name: this.name.trim(),
        email: this.email.trim(),
        password: this.password,
      });
      this.added.set(user.name);
      this.name = this.email = this.password = '';
      await this.load();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not add teammate');
    } finally {
      this.busy.set(false);
    }
  }

  async remove(u: AuthUser): Promise<void> {
    if (!confirm(`Remove ${u.name}? They will no longer be able to sign in.`)) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.removeUser(u.id);
      await this.load();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not remove member');
    } finally {
      this.busy.set(false);
    }
  }
}
