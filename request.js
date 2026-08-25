import crypto from 'crypto';
import { getCollection, COLLECTIONS } from './mongodb';

/** Vercel puts the real client IP in x-forwarded-for. */
export function getClientIp(req) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '0.0.0.0';
}

/**
 * The raw IP is never stored. A salted hash is enough to rate limit and to spot
 * a flood of submissions from one device, without keeping personal network data.
 */
export function hashIp(ip) {
  const salt = process.env.IP_HASH_SALT || 'prohealth-default-salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

export function getRequestMeta(req) {
  const ip = getClientIp(req);
  return {
    ipHash: hashIp(ip),
    userAgent: (req.headers.get('user-agent') || '').slice(0, 300),
    referer: (req.headers.get('referer') || '').slice(0, 300),
  };
}

/**
 * Counts recent inserts from the same device hash. Serverless has no shared
 * memory, so the limit lives in Mongo alongside the data it protects.
 */
export async function isRateLimited(ipHash, { windowMinutes = 10, max = 6 } = {}) {
  try {
    const leads = await getCollection(COLLECTIONS.leads);
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const count = await leads.countDocuments({ ipHash, createdAt: { $gte: since } });
    return count >= max;
  } catch (err) {
    // A limiter outage must not block real registrations.
    console.error('rate limit check failed', err);
    return false;
  }
}

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
