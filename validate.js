import { SERVICES } from './programs';

const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(value, max = 120) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

/**
 * Never trust the browser. The same rules run again here because the form can
 * be bypassed with a direct POST to the API.
 */
export function validateLead(body = {}) {
  const errors = {};

  const fullName = clean(body.fullName, 80);
  const mobile = clean(body.mobile, 15).replace(/\D/g, '');
  const empId = clean(body.empId, 40);
  const email = clean(body.email, 120).toLowerCase();
  const location = clean(body.location, 80);
  const service = clean(body.service, 60);

  if (fullName.length < 2) errors.fullName = 'Enter your full name.';
  if (!MOBILE_RE.test(mobile)) errors.mobile = 'Enter a valid 10 digit mobile number.';
  if (empId.length < 1) errors.empId = 'Enter your Employee ID.';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (location.length < 1) errors.location = 'Enter your location.';
  if (!SERVICES.includes(service)) errors.service = 'Choose a program.';

  const utm = {};
  if (body.utm && typeof body.utm === 'object') {
    for (const k of ['source', 'medium', 'campaign', 'content']) {
      const v = clean(body.utm[k], 60);
      if (v) utm[k] = v;
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: { fullName, mobile, empId, email, location, service, utm },
  };
}

/** Bots fill hidden inputs. Humans do not. */
export function isBot(body = {}) {
  return Boolean(clean(body.company, 100));
}
