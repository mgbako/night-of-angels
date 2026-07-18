import { Component, afterNextRender, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminIconComponent } from '../../shared/admin-icon.component';
import {
  ApiError,
  AttendeeApiService,
} from '../../../features/ticketing/services/attendee-api.service';
import { ticketShareUrl } from '../../../features/ticketing/share.util';
import {
  Attendee,
  TICKET_TYPES,
  TicketType,
  TicketTypeMeta,
  effectivePrice,
  ticketTypeMeta,
} from '../../../features/ticketing/models/attendee.model';
import { EventSettingsService } from '../../../shared/event-settings.service';

// Accepts Nigerian formats: 0803..., +234803..., with spaces/dashes. 10–14 digits.
function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const raw = String(control.value ?? '').trim();
  if (!raw) return null;
  if (!/^\+?[0-9\s-]+$/.test(raw)) return { phone: true };
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 14 ? null : { phone: true };
}

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AdminIconComponent],
  template: `
    <div class="adm-page-head">
      <div>
        <h2>Register Attendee</h2>
        <p>Add a guest and generate their ticket code.</p>
      </div>
    </div>

    <div class="adm-card adm-card--pad" style="max-width:620px">
      @if (created(); as att) {
        <div class="reg-success">
          <span class="reg-success__mark"><adm-icon name="check" [size]="30" /></span>
          <h3>{{ att.name }} is registered</h3>
          <p>Ticket code</p>
          <div class="reg-code">{{ att.ticketCode }}</div>
          <div class="reg-success__actions">
            <a [href]="waLink(att)" target="_blank" rel="noopener" class="adm-btn wa-share">
              <adm-icon name="whatsapp" [size]="17" /> Send on WhatsApp
            </a>
            <button class="adm-btn" (click)="emailTicket(att)" [disabled]="emailing()">
              <adm-icon name="mail" [size]="17" /> {{ emailing() ? 'Sending…' : 'Email ticket' }}
            </button>
            <a [routerLink]="['/tickets', att.ticketCode]" target="_blank" class="adm-btn adm-btn--primary">
              <adm-icon name="ticket" [size]="17" /> Open ticket
            </a>
            <button class="adm-btn" (click)="reset()">Register another</button>
          </div>
          @if (emailedTo()) {
            <p class="reg-note reg-note--ok">✓ Ticket emailed to {{ emailedTo() }}</p>
          }
          @if (emailErr()) {
            <p class="reg-note reg-note--err">{{ emailErr() }}</p>
          }
        </div>
      } @else {
        <form class="adm-form" [formGroup]="form" (ngSubmit)="submit()" style="max-width:none">
          <div class="adm-field" [class.adm-field--invalid]="invalid('name')">
            <label for="r-name">Full name</label>
            <input id="r-name" type="text" formControlName="name" autocomplete="name" />
            @if (invalid('name')) { <span class="adm-error">Name is required.</span> }
          </div>

          <div class="adm-field" [class.adm-field--invalid]="invalid('phone')">
            <label for="r-phone">Phone number</label>
            <input id="r-phone" type="tel" formControlName="phone" placeholder="0803 000 0000 or +234…" />
            @if (invalid('phone')) { <span class="adm-error">Enter a valid phone number (10–14 digits).</span> }
          </div>

          <div class="adm-field" [class.adm-field--invalid]="invalid('email')">
            <label for="r-email">Email</label>
            <input id="r-email" type="email" formControlName="email" autocomplete="email" />
            @if (invalid('email')) { <span class="adm-error">Enter a valid email address.</span> }
          </div>

          <div class="adm-field">
            <label>Ticket type</label>
            <div class="adm-radio-row">
              @for (t of ticketTypes; track t.value) {
                <label class="adm-radio">
                  <input type="radio" formControlName="ticketType" [value]="t.value" />
                  <strong>{{ t.label }}</strong>
                  <span>₦{{ price(t).toLocaleString() }} · {{ t.seats }} seat(s)</span>
                </label>
              }
            </div>
          </div>

          <div class="adm-field">
            <label for="r-table">Table number <span style="opacity:.6">(optional)</span></label>
            <input id="r-table" type="text" formControlName="tableNumber" placeholder="e.g. 12 or VIP 3" />
          </div>

          @if (error()) {
            <p class="adm-error" style="font-size:.85rem" role="alert">{{ error() }}</p>
          }

          <div>
            <button type="submit" class="adm-btn adm-btn--primary" [disabled]="submitting()">
              @if (submitting()) { Registering… } @else { <adm-icon name="register" [size]="17" /> Register attendee }
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [
    `
      .reg-success { text-align: center; padding: 1rem 0; }
      .reg-success__mark {
        display: inline-grid;
        place-items: center;
        width: 62px; height: 62px;
        border-radius: 50%;
        background: #e7f6ec; color: #1c7a41;
        margin-bottom: 0.6rem;
      }
      .reg-success h3 { font-family: var(--display); font-size: 1.4rem; margin: 0 0 0.6rem; color: #23201a; }
      .reg-success p { color: #8a8270; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; margin: 0; }
      .reg-code {
        font-family: ui-monospace, Menlo, monospace;
        font-size: 1.8rem;
        letter-spacing: 0.2em;
        color: #23201a;
        margin: 0.3rem 0 1.2rem;
      }
      .reg-success__actions { display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap; }
      .reg-note { margin: 1rem 0 0; font-size: 0.86rem; }
      .reg-note--ok { color: #1c7a41; }
      .reg-note--err { color: #a83a2c; }
    `,
  ],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private api = inject(AttendeeApiService);
  private settings = inject(EventSettingsService);

  readonly ticketTypes = TICKET_TYPES;

  constructor() {
    afterNextRender(() => this.settings.load());
  }

  price(t: TicketTypeMeta): number {
    return effectivePrice(t, this.settings.isEarlyBird());
  }

  submitting = signal(false);
  error = signal<string | null>(null);
  created = signal<Attendee | null>(null);

  emailing = signal(false);
  emailedTo = signal<string | null>(null);
  emailErr = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, phoneValidator]],
    email: ['', [Validators.required, Validators.email]],
    ticketType: ['SINGLES' as TicketType, Validators.required],
    tableNumber: [''],
  });

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  async submit(): Promise<void> {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    try {
      const attendee = await this.api.register(this.form.getRawValue());
      this.created.set(attendee);
    } catch (e) {
      this.error.set(
        e instanceof ApiError ? e.message : 'Could not register. Please try again.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  waLink(a: Attendee): string {
    return ticketShareUrl({
      name: a.name,
      phone: a.phone,
      ticketType: ticketTypeMeta(a.ticketType).label,
      url: this.api.ticketUrl(a.ticketCode),
    });
  }

  async emailTicket(a: Attendee): Promise<void> {
    if (this.emailing()) return;
    this.emailErr.set(null);
    this.emailedTo.set(null);
    this.emailing.set(true);
    try {
      this.emailedTo.set(await this.api.emailTicket(a.ticketCode));
    } catch (e) {
      this.emailErr.set(e instanceof Error ? e.message : 'Could not send email');
    } finally {
      this.emailing.set(false);
    }
  }

  reset(): void {
    this.created.set(null);
    this.error.set(null);
    this.form.reset({ name: '', phone: '', email: '', ticketType: 'SINGLES', tableNumber: '' });
  }
}
