import { getDb } from '@/lib/mongodb';
import { json } from '@/lib/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Hit this after every deploy to confirm env vars actually landed. */
export async function GET() {
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

  const healthy = checks.database === 'connected';
  return json({ ok: healthy, checks, time: new Date().toISOString() }, healthy ? 200 : 503);
}
