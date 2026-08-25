import nodemailer from 'nodemailer';
import { getProgramByService } from './programs';

let cachedTransport = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;
  if (!process.env.SMTP_HOST) return null;

  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    // 465 is implicit TLS, 587 upgrades with STARTTLS.
    secure: String(process.env.SMTP_SECURE || '') === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    pool: false,
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
  return cachedTransport;
}

function splitList(value) {
  return String(value || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Routing rules, in order of precedence:
 *   NOTIFY_EMAILS_PLUS / _DIET / _LAB  -> program specific inbox
 *   NOTIFY_EMAILS                      -> catch all, always included
 * So marketing can add a program owner without touching the code.
 */
export function recipientsFor(service) {
  const program = getProgramByService(service);
  const perProgram = program ? splitList(process.env[`NOTIFY_EMAILS_${program.key.toUpperCase()}`]) : [];
  const common = splitList(process.env.NOTIFY_EMAILS);
  const cc = splitList(process.env.NOTIFY_CC);
  const to = Array.from(new Set([...perProgram, ...common]));
  return { to, cc };
}

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function row(label, value) {
  return `<tr>
    <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#6B6480;font:600 13px/1.5 Arial,sans-serif;white-space:nowrap">${esc(label)}</td>
    <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#241A33;font:400 14px/1.5 Arial,sans-serif">${esc(value) || '-'}</td>
  </tr>`;
}

function internalHtml(lead, kind) {
  const when = new Date(lead.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const heading = kind === 'brochure' ? 'Brochure downloaded' : 'New interest registered';
  return `<div style="background:#F5F3FB;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E7E2F0">
      <div style="background:linear-gradient(115deg,#4B1E73,#6A2C91 45%,#B0338C);padding:20px 24px;color:#fff">
        <div style="font:700 12px/1.4 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.85">ProHealth Programs</div>
        <div style="font:700 20px/1.3 Arial,sans-serif;margin-top:6px">${heading}</div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${row('Program', lead.service)}
        ${row('Name', lead.fullName)}
        ${row('Mobile', lead.mobile)}
        ${row('Employee ID', lead.empId)}
        ${row('Email', lead.email)}
        ${row('Location', lead.location)}
        ${row('Received', `${when} IST`)}
        ${row('Reference', lead._id)}
      </table>
      <div style="padding:16px 24px;color:#938CA6;font:400 12px/1.6 Arial,sans-serif">
        Sent automatically by the ProHealth interest microsite. Full list and CSV export are in the admin console.
      </div>
    </div>
  </div>`;
}

function internalText(lead, kind) {
  return [
    kind === 'brochure' ? 'Brochure downloaded' : 'New interest registered',
    `Program: ${lead.service}`,
    `Name: ${lead.fullName}`,
    `Mobile: ${lead.mobile}`,
    `Employee ID: ${lead.empId}`,
    `Email: ${lead.email}`,
    `Location: ${lead.location}`,
    `Received: ${new Date(lead.createdAt).toISOString()}`,
    `Reference: ${lead._id}`,
  ].join('\n');
}

function userHtml(lead) {
  const program = getProgramByService(lead.service);
  return `<div style="background:#F5F3FB;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E7E2F0">
      <div style="background:linear-gradient(115deg,#4B1E73,#6A2C91 45%,#B0338C);padding:22px 24px;color:#fff">
        <div style="font:700 20px/1.3 Arial,sans-serif">Thank you for your interest</div>
      </div>
      <div style="padding:22px 24px;color:#241A33;font:400 15px/1.65 Arial,sans-serif">
        <p style="margin:0 0 14px">Hi ${esc(lead.fullName.split(' ')[0])},</p>
        <p style="margin:0 0 14px">We have received your interest in <b>${esc(lead.service)}</b>${
          program ? ` (${esc(program.duration)}, ${esc(program.price)})` : ''
        }. Our care team will reach out to you within 48 working hours.</p>
        <p style="margin:0 0 14px">Reference number: <b>${esc(lead._id)}</b></p>
        <p style="margin:0;color:#6B6480;font-size:13px">Need us sooner? Call +91 9599105133, Monday to Saturday, 9:30 AM to 5:30 PM, or write to careplan@hclhealthcare.in.</p>
      </div>
    </div>
  </div>`;
}

/**
 * Notifies the internal inbox, and optionally acknowledges to the member.
 * Failures are reported, never thrown, so a mail server problem cannot lose a
 * lead that is already safe in the database.
 */
export async function sendLeadNotification(lead, { kind = 'registration' } = {}) {
  const transport = getTransport();
  const { to, cc } = recipientsFor(lead.service);

  if (!transport) return { sent: false, reason: 'smtp_not_configured' };
  if (!to.length) return { sent: false, reason: 'no_recipients' };

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const results = { sent: false, to, acknowledged: false };

  try {
    await transport.sendMail({
      from,
      to,
      cc: cc.length ? cc : undefined,
      replyTo: lead.email,
      subject:
        kind === 'brochure'
          ? `Brochure download: ${lead.service} - ${lead.fullName}`
          : `New ProHealth interest: ${lead.service} - ${lead.fullName}`,
      text: internalText(lead, kind),
      html: internalHtml(lead, kind),
    });
    results.sent = true;
  } catch (err) {
    console.error('internal notification failed', err?.message);
    results.error = err?.message || 'send_failed';
  }

  if (String(process.env.SEND_USER_ACK || '') === 'true' && kind === 'registration') {
    try {
      await transport.sendMail({
        from,
        to: lead.email,
        subject: `We have received your interest in ${lead.service}`,
        text: `Hi ${lead.fullName.split(' ')[0]},\n\nWe have received your interest in ${lead.service}. Our care team will reach out within 48 working hours.\nReference: ${lead._id}\n\nHCL Healthcare Care Plan\n+91 9599105133 (Mon to Sat, 9:30 AM to 5:30 PM)`,
        html: userHtml(lead),
      });
      results.acknowledged = true;
    } catch (err) {
      console.error('user acknowledgement failed', err?.message);
    }
  }

  return results;
}
