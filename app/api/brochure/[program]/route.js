import fs from 'fs/promises';
import path from 'path';
import { ObjectId } from 'mongodb';
import { getCollection, COLLECTIONS } from '@/lib/mongodb';
import { getRequestMeta } from '@/lib/request';
import { getProgramByKey } from '@/lib/programs';
import { sendLeadNotification } from '@/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One request does three things: records the download, optionally emails the
 * team, and returns the file. Tracking through a separate beacon call would be
 * lost whenever the webview kills the page during navigation.
 */
export async function GET(req, { params }) {
  const program = getProgramByKey(params.program);
  if (!program) {
    return new Response('Flyer not found', { status: 404 });
  }

  const url = new URL(req.url);
  const leadParam = url.searchParams.get('lead');
  const meta = getRequestMeta(req);

  let lead = null;
  try {
    const events = await getCollection(COLLECTIONS.events);
    const leads = await getCollection(COLLECTIONS.leads);

    if (leadParam && ObjectId.isValid(leadParam)) {
      lead = await leads.findOne({ _id: new ObjectId(leadParam) });
      if (lead) {
        await leads.updateOne(
          { _id: lead._id },
          { $inc: { brochureDownloads: 1 }, $set: { lastDownloadAt: new Date(), updatedAt: new Date() } }
        );
      }
    }

    await events.insertOne({
      type: 'brochure_download',
      programKey: program.key,
      service: program.service,
      leadId: lead ? lead._id : null,
      email: lead ? lead.email : null,
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
      createdAt: new Date(),
    });
  } catch (err) {
    // Never block the file because logging is down.
    console.error('download logging failed', err?.message);
  }

  if (lead && String(process.env.NOTIFY_ON_DOWNLOAD || '') === 'true') {
    await sendLeadNotification({ ...lead, _id: String(lead._id) }, { kind: 'brochure' });
  }

  try {
    const filePath = path.join(process.cwd(), 'assets', 'flyers', program.pdfFile);
    const file = await fs.readFile(filePath);
    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(file.length),
        'Content-Disposition': `attachment; filename="${program.downloadName}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (err) {
    console.error('flyer read failed', err?.message);
    return new Response('Flyer is temporarily unavailable. Please try again shortly.', { status: 500 });
  }
}
