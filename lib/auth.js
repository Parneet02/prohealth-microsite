/** Shared admin token check for the admin API routes. */
export function isAuthorised(req) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const header = req.headers.get('x-admin-token');
  const url = new URL(req.url);
  const token = header || url.searchParams.get('token');
  return Boolean(token) && token === expected;
}
