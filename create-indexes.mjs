/**
 * Run once after pointing MONGODB_URI at a fresh cluster:
 *   node --env-file=.env.local scripts/create-indexes.mjs
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'prohealth';

if (!uri) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);

  await db.collection('leads').createIndexes([
    { key: { createdAt: -1 }, name: 'createdAt_desc' },
    { key: { email: 1, service: 1, createdAt: -1 }, name: 'dedupe_lookup' },
    { key: { service: 1, createdAt: -1 }, name: 'service_createdAt' },
    { key: { ipHash: 1, createdAt: -1 }, name: 'rate_limit' },
    { key: { mobile: 1 }, name: 'mobile' },
  ]);

  await db.collection('events').createIndexes([
    { key: { createdAt: -1 }, name: 'createdAt_desc' },
    { key: { type: 1, createdAt: -1 }, name: 'type_createdAt' },
    { key: { leadId: 1 }, name: 'leadId' },
    // Funnel events are only useful for a quarter. Leads are never auto deleted.
    { key: { createdAt: 1 }, name: 'ttl_90_days', expireAfterSeconds: 60 * 60 * 24 * 90 },
  ]);

  console.log(`Indexes created on ${dbName}.`);
} catch (err) {
  console.error('Index creation failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
