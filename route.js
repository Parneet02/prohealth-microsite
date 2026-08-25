import { getCollection, COLLECTIONS } from '@/lib/mongodb';
import { isAuthorised } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLUMNS = [
  ['createdAt', 'Timestamp (IST)'],
  ['fullName', 'Full Name'],
  ['mobile', 'Mobile Number'],
  ['empId', 'Employee ID'],
  ['email', 'Email ID'],
  ['location', 'Location'],
  ['service', 'Preferred Service'],
  ['brochureDownloads', 'Brochure Downloads'],
  ['status', 'Status'],
];

const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

export async function GET(req) {
  if (!isAuthorised(req)) {
    return new Response('Invalid or missing admin token.', { status: 401 });
  }

  try {
    const leads = await getCollection(COLLECTIONS.leads);
    const rows = await leads.find({}).sort({ createdAt: -1 }).limit(20000).toArray();

    const body = [COLUMNS.map(([, label]) => q(label)).join(',')]
      .concat(
        rows.map((r) =>
          COLUMNS.map(([key]) => {
            if (key === 'createdAt') {
              return q(new Date(r.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
            }
            return q(r[key]);
          }).join(',')
        )
      )
      .join('\r\n');

    const stamp = new Date().toISOString().slice(0, 10);
    // BOM keeps Excel from mangling names and the rupee symbol.
    return new Response('\uFEFF' + body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="prohealth-registrations-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('csv export failed', err);
    return new Response('Could not build the export.', { status: 503 });
  }
}
