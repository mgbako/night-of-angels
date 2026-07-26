/**
 * SMS sending with two interchangeable gateways — Twilio (default) and Termii.
 * The active gateway is chosen from event settings (back office → Settings →
 * SMS provider), so it can be switched live without a redeploy.
 *
 * Env vars (only the active provider's are needed):
 *   Twilio  — TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and one of
 *             TWILIO_FROM (E.164 number or approved sender ID) or
 *             TWILIO_MESSAGING_SERVICE_SID.
 *   Termii  — TERMII_API_KEY, TERMII_SENDER_ID (approved ID; defaults to
 *             "N-Alert"), optional TERMII_CHANNEL ("generic" | "dnd" |
 *             "whatsapp").
 */
import { readSettings, type SmsProvider } from './settings';

export class SmsError extends Error {}

/**
 * Canonical international format: digits only, no "+" (e.g. "2348012345678").
 * Each provider adapts this to what its API expects. Returns '' when there are
 * no usable digits.
 */
export function toInternational(raw: string): string {
  const d = (raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('234')) return d;
  if (d.startsWith('0')) return '234' + d.slice(1); // 08012345678 -> 2348012345678
  if (d.length === 10) return '234' + d; // 8012345678 (no leading zero)
  return d; // already international / non-NG
}

/** Resolve the active provider from settings, defaulting to Twilio. */
async function activeProvider(): Promise<SmsProvider> {
  try {
    return (await readSettings()).smsProvider;
  } catch {
    return 'twilio';
  }
}

// ---------------------------------------------------------------- public API

/** Send one SMS to a single recipient through the active provider. */
export async function sendSms(opts: { to: string; message: string }): Promise<void> {
  const to = toInternational(opts.to);
  if (!to) throw new SmsError('This recipient has no valid phone number.');
  if ((await activeProvider()) === 'termii') await termiiSendOne(to, opts.message);
  else await twilioSendOne(to, opts.message);
}

/**
 * Send the same message to many recipients through the active provider. Returns
 * how many were sent vs failed. `numbers` must already be normalised
 * (see toInternational). Throws SmsError only when the provider isn't configured.
 */
export async function sendBulkSms(
  numbers: string[],
  message: string,
): Promise<{ sent: number; failed: number }> {
  if (!numbers.length) return { sent: 0, failed: 0 };
  if ((await activeProvider()) === 'termii') return termiiSendBulk(numbers, message);
  return twilioSendBulk(numbers, message);
}

// ------------------------------------------------------------------- Twilio

interface TwilioConfig {
  sid: string;
  token: string;
  /** Either From=<number/senderId> or MessagingServiceSid=<MG…>. */
  sender: { key: 'From' | 'MessagingServiceSid'; value: string };
}

function twilioConfig(): TwilioConfig {
  const sid = process.env['TWILIO_ACCOUNT_SID'];
  const token = process.env['TWILIO_AUTH_TOKEN'];
  if (!sid || !token) {
    throw new SmsError('SMS is not configured (missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).');
  }
  const svc = process.env['TWILIO_MESSAGING_SERVICE_SID'];
  const from = process.env['TWILIO_FROM'];
  if (svc) return { sid, token, sender: { key: 'MessagingServiceSid', value: svc } };
  if (from) return { sid, token, sender: { key: 'From', value: from } };
  throw new SmsError('SMS is not configured (set TWILIO_FROM or TWILIO_MESSAGING_SERVICE_SID).');
}

/** `to` is canonical (digits only); Twilio wants E.164, so we prepend "+". */
async function twilioPost(cfg: TwilioConfig, to: string, message: string): Promise<void> {
  const body = new URLSearchParams({
    To: '+' + to,
    Body: message,
    [cfg.sender.key]: cfg.sender.value,
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${cfg.sid}:${cfg.token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new SmsError(`SMS send failed: ${data?.message || `HTTP ${res.status}`}`);
  }
}

async function twilioSendOne(to: string, message: string): Promise<void> {
  await twilioPost(twilioConfig(), to, message);
}

// Twilio has no bulk endpoint, so fan out with bounded concurrency and tally.
async function twilioSendBulk(
  numbers: string[],
  message: string,
): Promise<{ sent: number; failed: number }> {
  const cfg = twilioConfig(); // throws if unconfigured — surfaced as 502 by the caller
  const CONCURRENCY = 12;
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < numbers.length; i += CONCURRENCY) {
    const batch = numbers.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((n) => twilioPost(cfg, n, message)));
    for (const r of results) {
      if (r.status === 'fulfilled') sent++;
      else failed++;
    }
  }
  return { sent, failed };
}

// ------------------------------------------------------------------- Termii

interface TermiiConfig {
  key: string;
  from: string;
  channel: string;
}

const TERMII_SEND = 'https://api.ng.termii.com/api/sms/send';
const TERMII_BULK = 'https://api.ng.termii.com/api/sms/send/bulk';

function termiiConfig(): TermiiConfig {
  const key = process.env['TERMII_API_KEY'];
  if (!key) throw new SmsError('SMS is not configured (missing TERMII_API_KEY).');
  return {
    key,
    from: process.env['TERMII_SENDER_ID'] || 'N-Alert',
    channel: process.env['TERMII_CHANNEL'] || 'generic',
  };
}

async function termiiPost(url: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => null)) as
    | { message_id?: string; message?: string; code?: string }
    | null;
  if (!res.ok || !data || (!data.message_id && data.code !== 'ok')) {
    throw new SmsError(`SMS send failed: ${data?.message || `HTTP ${res.status}`}`);
  }
}

async function termiiSendOne(to: string, message: string): Promise<void> {
  const { key, from, channel } = termiiConfig();
  await termiiPost(TERMII_SEND, { to, from, sms: message, type: 'plain', channel, api_key: key });
}

// Termii's bulk endpoint sends the whole list in one request (all-or-nothing).
async function termiiSendBulk(
  numbers: string[],
  message: string,
): Promise<{ sent: number; failed: number }> {
  const { key, from, channel } = termiiConfig();
  await termiiPost(TERMII_BULK, {
    to: numbers,
    from,
    sms: message,
    type: 'plain',
    channel,
    api_key: key,
  });
  return { sent: numbers.length, failed: 0 };
}
