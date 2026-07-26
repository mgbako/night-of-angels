/**
 * SMS sending via Termii (https://termii.com) — chosen for strong Nigerian
 * deliverability and easy sender-ID registration.
 *
 * Requires env:
 *   TERMII_API_KEY   — your Termii API key
 *   TERMII_SENDER_ID — an approved sender ID (e.g. "NOAngels"). Defaults to
 *                      "N-Alert", Termii's shared generic ID.
 *   TERMII_CHANNEL   — "generic" (default), "dnd", or "whatsapp". Use "dnd"
 *                      (with a registered sender ID) to reach DND-blocked
 *                      Nigerian numbers.
 */

export class SmsError extends Error {}

const SEND_URL = 'https://api.ng.termii.com/api/sms/send';
const BULK_URL = 'https://api.ng.termii.com/api/sms/send/bulk';

/**
 * Normalise a (mostly Nigerian) phone number to Termii's international format:
 * digits only, no leading "+", e.g. "2348012345678". Returns '' if there are
 * no usable digits.
 */
export function toInternational(raw: string): string {
  const d = (raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('234')) return d;
  if (d.startsWith('0')) return '234' + d.slice(1); // 08012345678 -> 2348012345678
  if (d.length === 10) return '234' + d; // 8012345678 (no leading zero)
  return d; // already international / non-NG — send as-is
}

function config(): { key: string; from: string; channel: string } {
  const key = process.env['TERMII_API_KEY'];
  if (!key) throw new SmsError('SMS is not configured (missing TERMII_API_KEY).');
  return {
    key,
    from: process.env['TERMII_SENDER_ID'] || 'N-Alert',
    channel: process.env['TERMII_CHANNEL'] || 'generic',
  };
}

async function post(url: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => null)) as
    | { message_id?: string; message?: string; code?: string }
    | null;
  // Termii returns 200 with a message_id on success; failures carry a message.
  if (!res.ok || !data || (!data.message_id && data.code !== 'ok')) {
    throw new SmsError(`SMS send failed: ${data?.message || `HTTP ${res.status}`}`);
  }
}

/** Send one SMS to a single recipient. */
export async function sendSms(opts: { to: string; message: string }): Promise<void> {
  const { key, from, channel } = config();
  const to = toInternational(opts.to);
  if (!to) throw new SmsError('This recipient has no valid phone number.');
  await post(SEND_URL, {
    to,
    from,
    sms: opts.message,
    type: 'plain',
    channel,
    api_key: key,
  });
}

/**
 * Send the same message to many recipients in one Termii bulk request — avoids
 * the function timing out on large lists. `numbers` must already be normalised
 * (see toInternational).
 */
export async function sendBulkSms(numbers: string[], message: string): Promise<void> {
  const { key, from, channel } = config();
  if (!numbers.length) return;
  await post(BULK_URL, {
    to: numbers,
    from,
    sms: message,
    type: 'plain',
    channel,
    api_key: key,
  });
}
