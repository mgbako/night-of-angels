import { Component, afterNextRender, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import { AuthService, AuthUser } from '../../services/auth.service';
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, Role } from '../../services/permissions';

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
                <div style="display:flex; gap:.35rem; align-items:center">
                  <select
                    class="adm-select adm-select--sm team-role"
                    [ngModel]="u.role"
                    (ngModelChange)="changeRole(u, $event)"
                    [disabled]="u.id === meId() || busy()"
                    [title]="u.id === meId() ? 'You cannot change your own role' : 'Change role'"
                  >
                    @for (r of roles; track r) {
                      <option [value]="r">{{ roleLabels[r] }}</option>
                    }
                  </select>
                  <button
                    class="adm-btn adm-btn--sm"
                    (click)="resetPassword(u)"
                    [disabled]="busy()"
                    title="Set a new password"
                  >
                    <adm-icon name="shield" [size]="15" />
                  </button>
                  <button
                    class="adm-btn adm-btn--sm adm-btn--danger"
                    (click)="remove(u)"
                    [disabled]="u.id === meId() || users().length <= 1 || busy()"
                    title="Remove"
                  >
                    <adm-icon name="trash" [size]="15" />
                  </button>
                </div>
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
          <div class="adm-field">
            <label for="t-role">Role</label>
            <select id="t-role" name="role" class="adm-select" [(ngModel)]="role">
              @for (r of roles; track r) {
                <option [value]="r">{{ roleLabels[r] }}</option>
              }
            </select>
            <span class="adm-hint">{{ roleDescriptions[role] }}</span>
          </div>

          @if (error()) { <p class="adm-error">{{ error() }}</p> }
          @if (added()) { <p class="team-ok">✓ {{ added() }}</p> }

          <div>
            <button type="submit" class="adm-btn adm-btn--primary" [disabled]="busy()">
              <adm-icon name="register" [size]="17" /> {{ busy() ? 'Adding…' : 'Add teammate' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    @if (isOwner() && archived().length) {
      <div class="adm-card adm-card--pad team-archived">
        <h3 class="team-title">Deactivated ({{ archived().length }})</h3>
        <ul class="team-list">
          @for (u of archived(); track u.id) {
            <li>
              <div class="team-info">
                <span class="team-name">{{ u.name }}</span>
                <span class="team-email">{{ u.email }} · {{ roleLabels[u.role] }}</span>
              </div>
              <div style="display:flex; gap:.35rem; align-items:center">
                <button class="adm-btn adm-btn--sm" (click)="restore(u)" [disabled]="busy()">
                  Restore
                </button>
                <button
                  class="adm-btn adm-btn--sm adm-btn--danger"
                  (click)="permanentDelete(u)"
                  [disabled]="busy()"
                  title="Delete permanently"
                >
                  <adm-icon name="trash" [size]="15" /> Delete
                </button>
              </div>
            </li>
          }
        </ul>
      </div>
    }
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
      .team-role { min-width: 118px; }
      .adm-select--sm { padding: 0.4rem 0.55rem; font-size: 0.8rem; }
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

  readonly roles = ROLES;
  readonly roleLabels = ROLE_LABELS;
  readonly roleDescriptions = ROLE_DESCRIPTIONS;

  users = signal<AuthUser[]>([]);
  archived = signal<AuthUser[]>([]);
  loading = signal(true);
  busy = signal(false);
  error = signal<string | null>(null);
  added = signal<string | null>(null);

  name = '';
  email = '';
  password = '';
  role: Role = 'coordinator';

  meId = () => this.auth.user()?.id ?? '';
  isOwner = () => this.auth.isOwner();

  constructor() {
    afterNextRender(() => this.load());
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.users.set(await this.auth.listUsers());
      if (this.auth.isOwner()) {
        this.archived.set(await this.auth.listArchivedUsers());
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load team');
    } finally {
      this.loading.set(false);
    }
  }

  async restore(u: AuthUser): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.restoreUser(u.id);
      this.added.set(`${u.name} reactivated`);
      await this.load();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not restore member');
    } finally {
      this.busy.set(false);
    }
  }

  async permanentDelete(u: AuthUser): Promise<void> {
    if (!confirm(`Permanently delete ${u.name}? This cannot be undone.`)) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.permanentDeleteUser(u.id);
      await this.load();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not delete member');
    } finally {
      this.busy.set(false);
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
        role: this.role,
      });
      this.added.set(`${user.name} added as ${this.roleLabels[this.role]}`);
      this.name = this.email = this.password = '';
      this.role = 'coordinator';
      await this.load();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not add teammate');
    } finally {
      this.busy.set(false);
    }
  }

  async changeRole(u: AuthUser, role: Role): Promise<void> {
    if (role === u.role) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.updateUserRole(u.id, role);
      this.added.set(`${u.name} is now ${this.roleLabels[role]}`);
      await this.load();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not change role');
      await this.load(); // revert the select to the stored value
    } finally {
      this.busy.set(false);
    }
  }

  async resetPassword(u: AuthUser): Promise<void> {
    const pw = prompt(`Set a new password for ${u.name} (at least 8 characters):`);
    if (pw === null) return;
    if (pw.length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.setUserPassword(u.id, pw);
      this.added.set(`${u.name}'s password updated`);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not reset password');
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
