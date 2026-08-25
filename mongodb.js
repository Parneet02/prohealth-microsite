import { MongoClient } from 'mongodb';

/**
 * Serverless functions get frozen and thawed, so the client is cached on the
 * global object. Without this, every request opens a new pool and Atlas hits
 * its connection cap during a campaign spike.
 */
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'prohealth';

const options = {
  maxPoolSize: 10,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 8000,
  retryWrites: true,
};

let clientPromise;

if (!uri) {
  clientPromise = null;
} else if (process.env.NODE_ENV === 'development') {
  if (!global._prohealthMongoClientPromise) {
    global._prohealthMongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = global._prohealthMongoClientPromise;
} else {
  if (!global._prohealthMongoClientPromise) {
    global._prohealthMongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = global._prohealthMongoClientPromise;
}

export async function getDb() {
  if (!clientPromise) {
    throw new Error('MONGODB_URI is not set');
  }
  const client = await clientPromise;
  return client.db(dbName);
}

export async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}

export const COLLECTIONS = {
  leads: 'leads',
  events: 'events',
};
