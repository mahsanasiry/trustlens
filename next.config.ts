import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Profile pictures are posted through a server action. The default of 1 MB is
    // below the 2 MB the bucket accepts, and a body over the limit fails the whole
    // request, so leave room for the action to answer an oversized file itself.
    serverActions: { bodySizeLimit: '10mb' },
    // Rendering 135 locale pages with one worker per core exhausted memory on
    // a 16 GB Windows machine; a smaller pool trades a few seconds for stability.
    cpus: 3,
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // A cached copy of the worker would delay every later update to it.
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'text/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
