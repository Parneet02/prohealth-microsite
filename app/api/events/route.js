import { getCollection, COLLECTIONS } from '@/lib/mongodb';
import { getRequestMeta, json } from '@/lib/request';
import { getProgramByKey } from '@/lib/programs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Funnel steps worth counting. Anything else is discarded.
const ALLOWED = new Set(['page_view', 'programs_view', 'flyer_view', 'form_open']);

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false }, 400);
  }

  const type = String(body.type || '');
  if (!ALLOWED.has(type)) return json({ ok: false, message: 'Unknown event type.' }, 400);

  const program = body.programKey ? getProgramByKey(String(body.programKey)) : null;
  const meta = getRequestMeta(req);

  try {
    const events = await getCollection(COLLECTIONS.events);
    await events.insertOne({
      type,
      programKey: program?.key || null,
      service: program?.service || null,
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('event insert failed', err?.message);
  }

  return json({ ok: true });
}
