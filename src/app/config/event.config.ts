/**
 * Central place for the values you'll swap in before launch.
 * Everything here is a PLACEHOLDER.
 */

// PLACEHOLDER event date — swap in the real date once announced.
// Format: YYYY-MM-DDTHH:MM:SS (local time).
export const EVENT_DATE = new Date('2026-10-24T17:00:00');

// When guests should start arriving (doors open). Kept as a short label so it
// can be shown on tickets, emails and the reserve flow.
export const EVENT_ARRIVAL_TIME = '5:00 PM';
export const EVENT_ARRIVAL_NOTE = `Arrivals from ${EVENT_ARRIVAL_TIME}`;

// PLACEHOLDER contact details
export const RSVP_EMAIL = 'rsvp@nightofangels.example';
export const PARTNERSHIPS_EMAIL = 'partnerships@nightofangels.example';
export const PHONE_DISPLAY = '+234 4803 786 6963';
export const PHONE_TEL = '+2348037866963';
export const INSTAGRAM_HANDLE = '@nightofangels';
export const INSTAGRAM_URL = 'https://instagram.com/';

// Bank / transfer details guests pay into before uploading proof of payment.
export const PAYMENT = {
  bank: 'PalmPay',
  accountNumber: '8037866963',
  accountName: 'Charles Ukasoanya',
};

// PLACEHOLDER WhatsApp number for the floating chat widget.
// Digits only, country code first, NO "+", spaces or dashes (wa.me format).
// e.g. Nigeria: '2348012345678'
export const WHATSAPP_NUMBER = '2348037866963';
// Default greeting pre-filled into the chat when a guest taps the button.
export const WHATSAPP_GREETING =
  "Hello! I'd love to learn more about A Night of Angels.";
