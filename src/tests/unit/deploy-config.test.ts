import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const headers = readFileSync(join(root, 'public/_headers'), 'utf8');
const nextConfig = readFileSync(join(root, 'next.config.ts'), 'utf8');

// Cloudflare serves static files without going through Next.js, so the header
// list in public/_headers has to repeat the one in next.config.ts.
describe('static file headers', () => {
  const securityHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'Strict-Transport-Security',
  ];

  it.each(securityHeaders)('sends %s, as next.config.ts does', (name) => {
    expect(nextConfig).toContain(`'${name}'`);
    expect(headers).toContain(`${name}:`);
  });

  it('repeats the same values', () => {
    for (const line of headers.split('\n')) {
      const match =
        /^\s+(X-Content-Type-Options|X-Frame-Options|Referrer-Policy): (.+)$/.exec(line);
      if (match) expect(nextConfig).toContain(`'${match[2]}'`);
    }
  });

  it('caches hashed build files for a year and never the worker script', () => {
    expect(headers).toMatch(/\/_next\/static\/\*\n\s+Cache-Control: .*immutable/);
    expect(headers).toMatch(/\/sw\.js\n\s+Cache-Control: no-cache/);
  });
});
