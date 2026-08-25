import { getCollection, COLLECTIONS } from '@/lib/mongodb';
import { json } from '@/lib/request';
import { PROGRAMS } from '@/lib/programs';
import { isAuthorised } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!isAuthorised(req)) {
    return json({ ok: false, message: 'Invalid or missing admin token.' }, 401);
  }

  const url = new URL(req.url);
  const service = url.searchParams.get('service');
  const limit = Math.min(Number(url.searchParams.get('limit') || 200), 1000);
  const skip = Math.max(Number(url.searchParams.get('skip') || 0), 0);
  const query = service ? { service } : {};

  try {
    const leads = await getCollection(COLLECTIONS.leads);
    const events = await getCollection(COLLECTIONS.events);

    const [rows, total, byService, downloads] = await Promise.all([
      leads
        .find(query, {
          projection: { ipHash: 0, userAgent: 0, referer: 0 },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      leads.countDocuments(query),
      leads.aggregate([{ $group: { _id: '$service', count: { $sum: 1 } } }]).toArray(),
      events.countDocuments({ type: 'brochure_download' }),
    ]);

    const counts = PROGRAMS.reduce((acc, p) => {
      acc[p.key] = byService.find((b) => b._id === p.service)?.count || 0;
      return acc;
    }, {});

    return json({
      ok: true,
      total,
      counts,
      downloads,
      rows: rows.map((r) => ({ ...r, _id: String(r._id) })),
    });
  } catch (err) {
    console.error('admin fetch failed', err);
    return json({ ok: false, message: 'Could not read the database.' }, 503);
  }
}
