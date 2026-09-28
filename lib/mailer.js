import sgMail from '@sendgrid/mail';
import { getProgramByService } from './programs';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

function splitList(value) {
  return String(value || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function recipientsFor(service) {
  const program = getProgramByService(service);

  const perProgram = program
    ? splitList(
        process.env[`NOTIFY_EMAILS_${program.key.toUpperCase()}`]
      )
    : [];

  const common = splitList(process.env.NOTIFY_EMAILS);
  const cc = splitList(process.env.NOTIFY_CC);

  const to = Array.from(new Set([...perProgram, ...common]));

  return { to, cc };
}

const esc = (s) =>
  String(s == null ? '' : s).replace(
    /[&<>"]/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
      })[c]
  );

function row(label, value) {
  return `<tr>
    <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#666;font:600 13px/1.5 Arial,sans-serif;white-space:nowrap">
      ${esc(label)}
    </td>
    <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#241A33;font:400 14px/1.5 Arial,sans-serif">
      ${esc(value) || '-'}
    </td>
  </tr>`;
}

function internalHtml(lead, kind) {
  const when = new Date(lead.createdAt || Date.now()).toLocaleString(
    'en-IN',
    { timeZone: 'Asia/Kolkata' }
  );

  const heading =
    kind === 'brochure'
      ? 'Brochure downloaded'
      : 'New interest registered';

  return `<div style="background:#FFFFFF;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#FFFFFF;color:#241A33;border-radius:16px;overflow:hidden;border:1px solid #E7E2F0">

      <div style="background:linear-gradient(115deg,#1F63B4,#5DA4FB);padding:20px 24px;color:#fff">

        <div style="font:700 12px/1.4 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#FFFFFF !important;">
          ProHealth Programs
        </div>

        <div style="font:700 20px/1.3 Arial,sans-serif;margin-top:6px;color:#FFFFFF !important;">
          ${esc(heading)}
        </div>

      </div>

      <table style="width:100%;border-collapse:collapse">

        ${row('Program', lead.service)}
        ${row('Name', lead.name)}
        ${row('Mobile', lead.mobile)}
        ${row('Employee ID', lead.employeeId)}
        ${row('Email', lead.email)}
        ${row('Location', lead.location)}
        ${row('Received', `${when} IST`)}
        ${row('Reference', lead._id)}

        <tr>
          <td colspan="2" style="padding:16px 24px;color:#666;font:400 12px/1.6 Arial,sans-serif;text-align:left;">
            Sent automatically by the ProHealth interest microsite.
          </td>
        </tr>

      </table>
    </div>
  </div>`;
}

function internalText(lead, kind) {
  return [
    kind === 'brochure'
      ? 'Brochure downloaded'
      : 'New interest registered',

    `Program: ${lead.service}`,
    `Name: ${lead.name}`,
    `Mobile: ${lead.mobile}`,
    `Employee ID: ${lead.employeeId}`,
    `Email: ${lead.email}`,
    `Location: ${lead.location}`,
    `Received: ${new Date(lead.createdAt || Date.now()).toISOString()}`,
    `Reference: ${lead._id}`,
  ].join('\n');
}

function userHtml(lead) {
  const program = getProgramByService(lead.service);

  const firstName = String(lead.name || '').split(' ')[0];

  return `<div style="background:#F5F3FB;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E7E2F0">

      <div style="background:linear-gradient(115deg,#1F63B4,#5DA4FB);padding:22px 24px;color:#fff">
        <div style="font:700 20px/1.3 Arial,sans-serif">
          Thank you for your interest
        </div>
      </div>

      <div style="padding:22px 24px;color:#241A33;font:400 15px/1.65 Arial,sans-serif">

        <p style="margin:0 0 14px">
          Hi ${esc(firstName)},
        </p>

        <p style="margin:0 0 14px">
          We have received your interest in
          <b>${esc(lead.service)}</b>
          ${
            program
              ? ` (${esc(program.duration)}, ${esc(program.price)})`
              : ''
          }.
          Our care team will reach out to you within 48 working hours.
        </p>

        <p style="margin:0 0 14px">
          Reference number: <b>${esc(lead._id)}</b>
        </p>

        <p style="margin:0;color:#6B6480;font-size:13px">
          Need us sooner? Call +91 9599105133,
          Monday to Saturday, 9:30 AM to 5:30 PM,
          or write to careplan@hclhealthcare.in.
        </p>

      </div>
    </div>
  </div>`;
}

/**
 * Sends registration/brochure notification to the Care Plan team.
 */
export async function sendLeadNotification(
  lead,
  { kind = 'registration' } = {}
) {
  if (!process.env.SENDGRID_API_KEY) {
    return {
      sent: false,
      reason: 'sendgrid_not_configured',
    };
  }

  const { to, cc } = recipientsFor(lead.service);

  if (!to.length) {
    return {
      sent: false,
      reason: 'no_recipients',
    };
  }

  const from = process.env.MAIL_FROM;

  if (!from) {
    return {
      sent: false,
      reason: 'mail_from_not_configured',
    };
  }

  const results = {
    sent: false,
    to,
    acknowledged: false,
  };

  try {
    await sgMail.send({
      to,
      cc: cc.length ? cc : undefined,
      from,
      replyTo: lead.email,
      subject:
        kind === 'brochure'
          ? `Brochure download: ${lead.service} - ${lead.name}`
          : `New ProHealth interest: ${lead.service} - ${lead.name}`,
      text: internalText(lead, kind),
      html: internalHtml(lead, kind),
    });

    results.sent = true;

    console.log('Care Plan notification sent successfully', {
      to,
      service: lead.service,
    });
  } catch (err) {
    console.error('SendGrid internal notification failed', {
      message: err?.message,
      code: err?.code,
      response: err?.response?.body,
    });

    results.error = err?.message || 'send_failed';
  }

  if (
    String(process.env.SEND_USER_ACK || '') === 'true' &&
    kind === 'registration' &&
    lead.email
  ) {
    try {
      await sgMail.send({
        to: lead.email,
        from,
        subject: `We have received your interest in ${lead.service}`,
        text: `Hi ${String(lead.name || '').split(' ')[0]},

We have received your interest in ${lead.service}.
Our care team will reach out within 48 working hours.

Reference: ${lead._id}

HCL Healthcare Care Plan
+91 9599105133
Mon to Sat, 9:30 AM to 5:30 PM`,
        html: userHtml(lead),
      });

      results.acknowledged = true;

      console.log('User acknowledgement sent successfully');
    } catch (err) {
      console.error('SendGrid user acknowledgement failed', {
        message: err?.message,
        code: err?.code,
        response: err?.response?.body,
      });
    }
  }

  return results;
}