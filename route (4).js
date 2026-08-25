import { getCollection, COLLECTIONS } from '@/lib/mongodb';
import { validateLead, isBot } from '@/lib/validate';
import { getRequestMeta, isRateLimited, json } from '@/lib/request';
import { sendLeadNotification } from '@/lib/mailer';
import { getProgramByService } from '@/lib/programs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: 'Send a JSON body.' }, 400);
  }

  // Silent success for bots. Telling them they were caught invites a retry.
  if (isBot(body)) return json({ ok: true, id: null });

  const { ok, errors, data } = validateLead(body);
  if (!ok) return json({ ok: false, errors, message: 'Check the highlighted fields.' }, 422);

  const meta = getRequestMeta(req);

  if (await isRateLimited(meta.ipHash)) {
    return json(
      { ok: false, message: 'Too many submissions from this device. Try again in a few minutes.' },
      429
    );
  }

  const program = getProgramByService(data.service);
  const now = new Date();

  const doc = {
    ...data,
    programKey: program?.key || null,
    status: 'new',
    source: 'habit-health-app',
    ipHash: meta.ipHash,
    userAgent: meta.userAgent,
    referer: meta.referer,
    notification: { sent: false },
    brochureDownloads: 0,
    createdAt: now,
    updatedAt: now,
  };

  let insertedId;
  try {
    const leads = await getCollection(COLLECTIONS.leads);

    // Same person, same program, same day counts as one lead. The team should
    // not get three emails because someone tapped submit on a slow network.
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const existing = await leads.findOne({
      email: data.email,
      service: data.service,
      createdAt: { $gte: dayAgo },
    });

    if (existing) {
      const flyer = program ? `/api/brochure/${program.key}?lead=${existing._id}` : null;
      return json({ ok: true, id: String(existing._id), duplicate: true, flyerUrl: flyer });
    }

    const result = await leads.insertOne(doc);
    insertedId = result.insertedId;
  } catch (err) {
    console.error('lead insert failed', err);
    return json(
      { ok: false, message: 'We could not save your details. Please try again in a moment.' },
      503
    );
  }

  // The lead is already stored, so mail problems degrade rather than fail.
  const mail = await sendLeadNotification({ ...doc, _id: String(insertedId) });

  try {
    const leads = await getCollection(COLLECTIONS.leads);
    await leads.updateOne(
      { _id: insertedId },
      { $set: { notification: { ...mail, at: new Date() }, updatedAt: new Date() } }
    );
  } catch (err) {
    console.error('notification status update failed', err?.message);
  }

  return json({
    ok: true,
    id: String(insertedId),
    flyerUrl: program ? `/api/brochure/${program.key}?lead=${insertedId}` : null,
  });
}
