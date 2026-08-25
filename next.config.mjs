/**
 * ALLOWED_FRAME_ANCESTORS controls who may embed this microsite in an iframe.
 * Set it in Vercel to the Habit Health app origins, space separated. Example:
 *   'self' https://app.hclhealthcare.in https://*.hclhealthcare.in
 * Android/iOS webviews that load a remote URL send that page origin, so list
 * the origin of the page that contains the iframe, not the app package name.
 */
const frameAncestors =
  process.env.ALLOWED_FRAME_ANCESTORS || "'self' https://*.hclhealthcare.in";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The font stylesheet is loaded by the browser instead of being inlined at
  // build time, so a build machine behind a corporate proxy still succeeds.
  optimizeFonts: false,
  experimental: {
    // Keeps the PDF flyers next to the serverless function that streams them.
    outputFileTracingIncludes: {
      '/api/brochure/[program]': ['./assets/flyers/**'],
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: `frame-ancestors ${frameAncestors};` },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
      {
        // Admin console must never be embedded anywhere.
        source: '/admin',
        headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'none';" }],
      },
    ];
  },
};

export default nextConfig;
