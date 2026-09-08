import { getDb } from '@/lib/mongodb';
import { json } from '@/lib/request';
import { verifyTransport } from '@/lib/mailer';
import { isAuthorised } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Hit this after every deploy to confirm env vars actually landed.
 *
 * `?smtp=verify` additionally opens a connection to the mail server and
 * returns what it said. That is behind the admin token because the reply
 * names the account and the recipients.
 */
export async function GET(req) {
  const checks = {
    database: 'unknown',
    smtp: process.env.SMTP_HOST ? 'configured' : 'missing',
    recipients: process.env.NOTIFY_EMAILS ? 'configured' : 'missing',
    adminToken: process.env.ADMIN_TOKEN ? 'configured' : 'missing',
  };

  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    checks.database = 'connected';
  } catch (err) {
    checks.database = `error: ${err?.message || 'unknown'}`;
  }

  const body = { ok: checks.database === 'connected', checks, time: new Date().toISOString() };

  if (new URL(req.url).searchParams.get('smtp') === 'verify') {
    body.smtpVerify = isAuthorised(req)
      ? await verifyTransport()
      : { ok: false, reason: 'admin_token_required' };
  }

  return json(body, body.ok ? 200 : 503);
}
