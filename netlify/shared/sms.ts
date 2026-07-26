/**
 * SMS sending via Twilio (https://twilio.com).
 *
 * Requires env:
 *   TWILIO_ACCOUNT_SID — your Account SID (starts "AC…")
 *   TWILIO_AUTH_TOKEN  — your Auth Token
 * plus ONE sender, either:
 *   TWILIO_MESSAGING_SERVICE_SID — a Messaging Service SID (starts "MG…").
 *                                  Recommended: handles sender pools and
 *                                  approved alphanumeric sender IDs.
 *   TWILIO_FROM        — a Twilio phone number in E.164 (e.g. +14155552671)
 *                        or an approved alphanumeric sender ID.
 *
 * Note: sending to Nigerian (+234) numbers with an alphanumeric sender ID
 * requires that ID to be pre-registered with the carriers via Twilio.
 */

export class SmsError extends Error {}

/**
 * Normalise a (mostly Nigerian) phone number to E.164 for Twilio, e.g.
 * "+2348012345678". Returns '' if there are no usable digits.
 */
export function toInternational(raw: string): string {
  const d = (raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('234')) return '+' + d;
  if (d.startsWith('0')) return '+234' + d.slice(1); // 08012345678 -> +2348012345678
  if (d.length === 10) return '+234' + d; // 8012345678 (no leading zero)
  return '+' + d; // already international / non-NG
}

interface TwilioConfig {
  sid: string;
  token: string;
  /** Either From=<number/senderId> or MessagingServiceSid=<MG…>. */
  sender: { key: 'From' | 'MessagingServiceSid'; value: string };
}

function config(): TwilioConfig {
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

async function postOne(cfg: TwilioConfig, to: string, message: string): Promise<void> {
  const body = new URLSearchParams({
    To: to,
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

/** Send one SMS to a single recipient. */
export async function sendSms(opts: { to: string; message: string }): Promise<void> {
  const cfg = config();
  const to = toInternational(opts.to);
  if (!to) throw new SmsError('This recipient has no valid phone number.');
  await postOne(cfg, to, opts.message);
}

/**
 * Send the same message to many recipients. Twilio has no bulk endpoint, so we
 * fan out with bounded concurrency and tally results — a few bad numbers don't
 * sink the whole broadcast. `numbers` must already be normalised (E.164).
 * Throws SmsError only when Twilio isn't configured.
 */
export async function sendBulkSms(
  numbers: string[],
  message: string,
): Promise<{ sent: number; failed: number }> {
  const cfg = config(); // throws if unconfigured — the caller turns this into a 502
  const CONCURRENCY = 12;
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < numbers.length; i += CONCURRENCY) {
    const batch = numbers.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((n) => postOne(cfg, n, message)));
    for (const r of results) {
      if (r.status === 'fulfilled') sent++;
      else failed++;
    }
  }
  return { sent, failed };
}
