import { Component, HostListener, signal } from '@angular/core';
import { CrestComponent } from './crest.component';
import { WHATSAPP_GREETING, WHATSAPP_NUMBER } from '../event.config';

interface QuickReply {
  label: string;
  message: string;
}

@Component({
  selector: 'app-whatsapp-chat',
  standalone: true,
  imports: [CrestComponent],
  template: `
    <!-- Chat card -->
    <div
      class="wa-card"
      [class.open]="open()"
      id="wa-card"
      role="dialog"
      aria-label="Chat with A Night of Angels on WhatsApp"
    >
      <div class="wa-card__head">
        <span class="wa-card__avatar"><app-crest [size]="34" [full]="false" /></span>
        <div class="wa-card__id">
          <span class="wa-card__name">A Night of Angels</span>
          <span class="wa-card__status"><i></i> Typically replies within minutes</span>
        </div>
        <button class="wa-card__close" aria-label="Close chat" (click)="close()">×</button>
      </div>

      <div class="wa-card__body">
        <div class="wa-bubble">
          Welcome! 🤍 How can we help you with the evening? Tap a question below or
          start your own message.
        </div>

        <div class="wa-replies">
          @for (q of quickReplies; track q.label) {
            <a
              class="wa-reply"
              [href]="link(q.message)"
              target="_blank"
              rel="noopener"
              (click)="close()"
            >
              {{ q.label }}
            </a>
          }
        </div>
      </div>

      <a
        class="wa-card__cta"
        [href]="link(greeting)"
        target="_blank"
        rel="noopener"
        (click)="close()"
      >
        <svg class="wa-glyph" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <path [attr.d]="logoPath" />
        </svg>
        Start Chat on WhatsApp
      </a>
    </div>

    <!-- Floating launcher -->
    <button
      class="wa-fab"
      [class.hidden]="open()"
      [attr.aria-expanded]="open()"
      aria-controls="wa-card"
      aria-label="Chat with us on WhatsApp"
      (click)="toggle()"
    >
      <span class="wa-fab__pulse" aria-hidden="true"></span>
      <svg class="wa-glyph" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
        <path [attr.d]="logoPath" />
      </svg>
    </button>
  `,
  styleUrl: './whatsapp-chat.component.scss',
})
export class WhatsappChatComponent {
  open = signal(false);

  readonly greeting = WHATSAPP_GREETING;

  // Inline WhatsApp logo path so it needs no asset request.
  readonly logoPath =
    'M16.004 4.5c-6.35 0-11.5 5.146-11.5 11.494 0 2.026.53 4.005 1.537 5.75L4.5 27.5l5.9-1.546a11.46 11.46 0 0 0 5.6 1.43h.005c6.347 0 11.495-5.147 11.498-11.495A11.42 11.42 0 0 0 24.13 7.86 11.42 11.42 0 0 0 16.004 4.5zm0 20.94h-.004a9.5 9.5 0 0 1-4.84-1.326l-.347-.206-3.5.918.934-3.414-.226-.35a9.45 9.45 0 0 1-1.45-5.062c0-5.27 4.29-9.558 9.563-9.558a9.49 9.49 0 0 1 6.756 2.804 9.46 9.46 0 0 1 2.8 6.762c-.003 5.27-4.292 9.558-9.56 9.558zm5.24-7.156c-.287-.144-1.7-.84-1.964-.936-.263-.096-.455-.144-.647.144-.192.287-.743.936-.91 1.128-.168.192-.335.216-.622.072-.287-.144-1.213-.447-2.31-1.426-.854-.762-1.43-1.703-1.598-1.99-.168-.287-.018-.442.126-.586.13-.13.287-.335.43-.503.144-.168.192-.287.288-.48.096-.192.048-.36-.024-.503-.072-.144-.647-1.56-.886-2.136-.233-.56-.47-.484-.647-.494l-.55-.01c-.192 0-.503.072-.766.36-.263.287-1.006.983-1.006 2.4 0 1.415 1.03 2.78 1.174 2.972.144.192 2.03 3.1 4.92 4.347.688.297 1.224.474 1.642.607.69.22 1.318.188 1.814.114.553-.082 1.7-.695 1.94-1.366.24-.67.24-1.246.168-1.366-.072-.12-.263-.192-.55-.336z';

  quickReplies: QuickReply[] = [
    {
      label: 'Reserve a seat',
      message:
        "Hello! I'd like to reserve a seat for A Night of Angels. Could you share the next steps?",
    },
    {
      label: 'Book a full table',
      message:
        "Hello! I'm interested in booking a full table (seats ten) for A Night of Angels.",
    },
    {
      label: 'Become a partner',
      message:
        "Hello! I'd like to learn about partnership and sponsorship opportunities for A Night of Angels.",
    },
    {
      label: 'Ask a question',
      message: "Hello! I have a question about A Night of Angels.",
    },
  ];

  // wa.me requires digits only — strip "+", spaces, dashes, brackets.
  private readonly number = WHATSAPP_NUMBER.replace(/\D/g, '');

  link(message: string): string {
    return `https://wa.me/${this.number}?text=${encodeURIComponent(message)}`;
  }

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
