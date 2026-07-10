/**
 * Helpers for sharing a ticket to a guest's WhatsApp number.
 */

/**
 * Normalise a phone number to wa.me international format (digits only, no +).
 * Defaults to Nigeria (+234) since the event is in Lagos:
 *   08030000000  -> 2348030000000
 *   +234803...   -> 234803...
 *   8030000000   -> 2348030000000
 */
export function toWhatsappNumber(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0')) return '234' + digits.slice(1);
  if (digits.length === 10) return '234' + digits;
  return digits;
}

export interface TicketShareInput {
  name: string;
  phone: string;
  ticketType: string;
  url: string;
}

/** Build a wa.me link that opens a chat to the guest with their ticket link. */
export function ticketShareUrl(input: TicketShareInput): string {
  const message =
    `Hello ${input.name}! 🤍\n\n` +
    `Here is your ticket for *A Night of Angels* — ${input.ticketType}.\n\n` +
    `View & save it here:\n${input.url}\n\n` +
    `Please present the QR code at the door. See you there!`;
  return `https://wa.me/${toWhatsappNumber(input.phone)}?text=${encodeURIComponent(message)}`;
}
