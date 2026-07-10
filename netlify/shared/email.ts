/**
 * Email sending via Resend (https://resend.com), plus branded templates.
 * Requires env: RESEND_API_KEY, and MAIL_FROM (a verified sender, e.g.
 * "A Night of Angels <tickets@yourdomain>"). Without a verified domain,
 * Resend's test sender can only deliver to your own account email.
 */

export class EmailError extends Error {}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const key = process.env['RESEND_API_KEY'];
  const from = process.env['MAIL_FROM'] || 'A Night of Angels <onboarding@resend.dev>';
  if (!key) throw new EmailError('Email is not configured (missing RESEND_API_KEY).');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new EmailError(`Email send failed (${res.status}). ${detail}`);
  }
}

// ---------- templates (email-safe inline styles) ----------
function shell(heading: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0b0b0a;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0a;padding:28px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#161310;border:1px solid rgba(201,162,39,.35);border-radius:14px;overflow:hidden;">
        <tr><td style="padding:26px 30px;background:#0b0b0a;border-bottom:1px solid rgba(201,162,39,.25);">
          <div style="font-size:22px;font-weight:600;color:#f4f1e7;letter-spacing:.5px;">A Night of Angels</div>
          <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9a227;">Harvest of Internal Peace</div>
        </td></tr>
        <tr><td style="padding:30px;color:#ece6d6;font-size:16px;line-height:1.6;">
          <h1 style="font-size:24px;color:#f4f1e7;margin:0 0 16px;">${heading}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 30px;background:#0b0b0a;border-top:1px solid rgba(201,162,39,.2);color:#8a8270;font-size:12px;">
          Saints Peter and Paul Catholic Church, Oke Afa · Lagos, Nigeria
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr>
    <td style="border-radius:6px;background:#c9a227;">
      <a href="${url}" style="display:inline-block;padding:13px 26px;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#1a1813;text-decoration:none;">${label}</a>
    </td></tr></table>`;
}

export function ticketEmailHtml(name: string, ticketType: string, url: string): string {
  return shell(
    'Your ticket is ready',
    `<p>Hello ${escapeHtml(name)},</p>
     <p>Thank you for reserving your place at <strong>A Night of Angels</strong>. Here is your <strong>${escapeHtml(ticketType)}</strong> ticket.</p>
     ${button('View Your Ticket', url)}
     <p style="font-size:14px;color:#c9c2b0;">Open the link above to see your QR code, then present it at the door. You can save or print the page.</p>
     <p style="font-size:13px;color:#8a8270;word-break:break-all;">${url}</p>`,
  );
}

export function resetEmailHtml(name: string, url: string): string {
  return shell(
    'Reset your password',
    `<p>Hello ${escapeHtml(name)},</p>
     <p>We received a request to reset your Back Office password. Click below to choose a new one.</p>
     ${button('Reset Password', url)}
     <p style="font-size:14px;color:#c9c2b0;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
     <p style="font-size:13px;color:#8a8270;word-break:break-all;">${url}</p>`,
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}
