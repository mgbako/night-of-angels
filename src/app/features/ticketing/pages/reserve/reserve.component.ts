import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CrestComponent } from '../../../../shared/crest/crest.component';
import { ReservationApiService } from '../../services/reservation-api.service';
import { ReservationDto } from '../../models/reservation.model';
import { TICKET_TYPES, TicketType } from '../../models/attendee.model';
import { PAYMENT } from '../../../../config/event.config';

const ALLOWED = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_BYTES = 4 * 1024 * 1024;

function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const raw = String(control.value ?? '').trim();
  if (!raw) return null;
  if (!/^\+?[0-9\s-]+$/.test(raw)) return { phone: true };
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 14 ? null : { phone: true };
}

@Component({
  selector: 'app-reserve',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CrestComponent],
  template: `
    <section class="rsv">
      <div class="rsv__card">
        <app-crest [size]="46" />

        @if (done()) {
          <span class="rsv__tick">✓</span>
          <h1>Reservation received</h1>
          <p class="rsv__lead">
            Thank you, {{ submittedName() }}. We’ve received your details and proof of
            payment. Our team will confirm and send your ticket shortly — keep an eye on
            WhatsApp and your email.
          </p>
          <a routerLink="/" class="btn btn--outline">Back to site</a>
        } @else {
          <span class="eyebrow">Reserve Your Seat</span>
          <h1>A Night of Angels</h1>
          <p class="rsv__lead">
            Complete your details and upload your proof of payment. We’ll verify it and
            send your ticket.
          </p>

          <form class="rsv__form" [formGroup]="form" (ngSubmit)="submit()">
            <div class="rsv__field" [class.invalid]="invalid('name')">
              <label for="name">Full name *</label>
              <input id="name" type="text" formControlName="name" autocomplete="name" />
              @if (invalid('name')) { <span class="err">Your full name is required.</span> }
            </div>

            <div class="rsv__field" [class.invalid]="invalid('phone')">
              <label for="phone">Phone number *</label>
              <input id="phone" type="tel" formControlName="phone" placeholder="0803 000 0000" />
              @if (invalid('phone')) { <span class="err">Enter a valid phone number.</span> }
            </div>

            <div class="rsv__field" [class.invalid]="invalid('email')">
              <label for="email">Email <span class="opt">(optional)</span></label>
              <input id="email" type="email" formControlName="email" autocomplete="email" />
              @if (invalid('email')) { <span class="err">Enter a valid email address.</span> }
            </div>

            <div class="rsv__field" [class.invalid]="invalid('ticketType')">
              <label for="ticketType">Ticket type *</label>
              <select id="ticketType" formControlName="ticketType">
                <option value="" disabled>Choose a ticket type</option>
                @for (t of ticketTypes; track t.value) {
                  <option [value]="t.value">
                    {{ t.label }} — ₦{{ t.price.toLocaleString() }}
                    ({{ t.seats }} {{ t.seats === 1 ? 'seat' : 'seats' }})
                  </option>
                }
              </select>
              @if (invalid('ticketType')) { <span class="err">Please choose a ticket type.</span> }
            </div>

            <div class="rsv__pay">
              <span class="rsv__pay-title">Make payment to</span>
              <div class="rsv__pay-row">
                <span class="rsv__pay-label">Bank</span>
                <span class="rsv__pay-value">{{ payment.bank }}</span>
              </div>
              <div class="rsv__pay-row">
                <span class="rsv__pay-label">Account</span>
                <span class="rsv__pay-value rsv__pay-acct">
                  {{ payment.accountNumber }}
                  <button
                    type="button"
                    class="rsv__pay-copy"
                    (click)="copyAccount()"
                    [attr.aria-label]="'Copy account number'"
                  >
                    {{ copied() ? '✓ Copied' : 'Copy' }}
                  </button>
                </span>
              </div>
              <div class="rsv__pay-row">
                <span class="rsv__pay-label">Name</span>
                <span class="rsv__pay-value">{{ payment.accountName }}</span>
              </div>
              <p class="rsv__pay-note">
                Transfer the exact amount for your ticket, then upload the receipt below.
              </p>
            </div>

            <div class="rsv__field">
              <label>Proof of payment *</label>
              <label class="dropzone" [class.has-file]="proof()">
                <input type="file" accept="image/jpeg,image/png,application/pdf" (change)="onFile($event)" hidden />
                @if (proof(); as p) {
                  <span class="dropzone__name">📎 {{ p.name }}</span>
                  <span class="dropzone__hint">Tap to replace</span>
                } @else {
                  <span class="dropzone__name">Tap to upload</span>
                  <span class="dropzone__hint">JPG, PNG or PDF · max 4 MB</span>
                }
              </label>
              @if (fileError()) { <span class="err">{{ fileError() }}</span> }
            </div>

            @if (error()) { <p class="rsv__error">{{ error() }}</p> }

            <button type="submit" class="btn btn--solid btn--block" [disabled]="busy()">
              {{ busy() ? 'Submitting…' : 'Submit Reservation' }}
            </button>
          </form>
        }
      </div>
    </section>
  `,
  styleUrl: './reserve.component.scss',
})
export class ReserveComponent {
  private fb = inject(FormBuilder);
  private api = inject(ReservationApiService);

  readonly ticketTypes = TICKET_TYPES;
  readonly payment = PAYMENT;

  busy = signal(false);
  copied = signal(false);
  done = signal(false);
  error = signal<string | null>(null);
  fileError = signal<string | null>(null);
  proof = signal<{ name: string; type: string; dataBase64: string } | null>(null);
  submittedName = signal('');

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, phoneValidator]],
    email: ['', [Validators.email]],
    ticketType: ['' as TicketType | '', [Validators.required]],
  });

  async copyAccount(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.payment.accountNumber);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — the number is still visible to copy manually.
    }
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  onFile(event: Event): void {
    this.fileError.set(null);
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      this.fileError.set('Please upload a JPG, PNG or PDF.');
      this.proof.set(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      this.fileError.set('That file is larger than 4 MB.');
      this.proof.set(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      this.proof.set({ name: file.name, type: file.type, dataBase64: String(reader.result) });
    reader.onerror = () => this.fileError.set('Could not read that file. Try another.');
    reader.readAsDataURL(file);
  }

  async submit(): Promise<void> {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.proof()) {
      this.fileError.set('Proof of payment is required.');
      return;
    }
    this.busy.set(true);
    try {
      const { ticketType, ...rest } = this.form.getRawValue();
      const dto: ReservationDto = {
        ...rest,
        ticketType: ticketType as TicketType,
        proof: this.proof()!,
      };
      await this.api.create(dto);
      this.submittedName.set(rest.name);
      this.done.set(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
