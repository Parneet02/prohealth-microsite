/**
 * End to end check against a running deployment. Run it after every deploy:
 *   BASE_URL=https://prohealth.example.com ADMIN_TOKEN=... node scripts/smoke-test.mjs
 *
 * It registers a throwaway lead, so point it at staging, or delete the
 * "Smoke Test" rows afterwards. Nothing here writes to the repo.
 */
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TOKEN = process.env.ADMIN_TOKEN || '';
const stamp = Date.now();
const lead = {
  fullName: 'Smoke Test',
  mobile: '9' + String(stamp).slice(-9),
  empId: `SMOKE${stamp}`,
  email: `smoke.test+${stamp}@example.com`,
  location: 'Test',
  service: 'ProHealth Plus',
};

let failures = 0;
const check = (name, pass, detail = '') => {
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
};
const post = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
check('health: database connected', health.checks?.database === 'connected', health.checks?.database);
check('health: SMTP configured', health.checks?.smtp === 'configured');
check('health: recipients configured', health.checks?.recipients === 'configured');

const bad = await post('/api/leads', { fullName: 'A', mobile: '1', email: 'x', service: 'Free' });
const badBody = await bad.json();
check('invalid lead rejected with per field errors', bad.status === 422 && Object.keys(badBody.errors || {}).length >= 5);

const botRes = await post('/api/leads', { ...lead, company: 'spam' });
check('honeypot accepted silently, nothing stored', botRes.status === 200 && (await botRes.json()).id === null);

const created = await post('/api/leads', lead).then((r) => r.json());
check('lead stored', created.ok === true && Boolean(created.id), created.id || created.message);

const dupe = await post('/api/leads', lead).then((r) => r.json());
check('same email and program within a day is one lead', dupe.duplicate === true && dupe.id === created.id);

if (created.id) {
  const pdf = await fetch(`${BASE}/api/brochure/plus?lead=${created.id}`);
  const type = pdf.headers.get('content-type');
  check('flyer downloads as a PDF', pdf.status === 200 && type === 'application/pdf', type || '');
  check('flyer filename set', /ProHealth_Plus_Flyer\.pdf/.test(pdf.headers.get('content-disposition') || ''));
}

check('unknown program 404s', (await fetch(`${BASE}/api/brochure/nope`)).status === 404);
check('admin API refuses an unauthenticated read', (await fetch(`${BASE}/api/admin/leads`)).status === 401);

if (TOKEN) {
  const admin = await fetch(`${BASE}/api/admin/leads`, { headers: { 'x-admin-token': TOKEN } }).then((r) => r.json());
  const row = admin.rows?.find((r) => r._id === created.id);
  check('lead readable in the admin API', Boolean(row));
  check('notification email accepted by the mail server', row?.notification?.sent === true, row?.notification?.reason || row?.notification?.error || '');
  check('download counted on the lead', (row?.brochureDownloads || 0) >= 1);
  check('admin API does not return the IP hash', row ? !('ipHash' in row) : false);
} else {
  console.log('SKIP  admin checks (set ADMIN_TOKEN to include them)');
}

console.log(`\n${failures ? `${failures} check(s) failed` : 'All checks passed'} against ${BASE}`);
process.exit(failures ? 1 : 0);
