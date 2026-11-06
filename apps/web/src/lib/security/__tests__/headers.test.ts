import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { describe, expect, it } from 'vitest';

import {
  API_CSP,
  HSTS_VALUE,
  PRIVATE_PATH_PATTERNS,
  securityHeaderRoutes,
  STATIC_SECURITY_HEADERS,
} from '../headers';

// The headers Next.js would apply to a path, using its own route matcher.
function headersFor(pathname: string): Map<string, string> {
  const applied = new Map<string, string>();
  for (const route of securityHeaderRoutes()) {
    if (getPathMatch(route.source)(pathname) === false) continue;
    for (const header of route.headers) applied.set(header.key, header.value);
  }
  return applied;
}

describe('securityHeaderRoutes (BR1.6, BR2.1, BR2.2)', () => {
  it('puts the six static headers on every path', () => {
    const keys = STATIC_SECURITY_HEADERS.map((header) => header.key);

    expect(keys).toEqual([
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'X-Frame-Options',
      'Cross-Origin-Opener-Policy',
      'Cross-Origin-Resource-Policy',
    ]);
    for (const path of ['/en', '/bn/doctors', '/favicon.ico', '/_next/static/chunk.js']) {
      const applied = headersFor(path);
      for (const header of STATIC_SECURITY_HEADERS) {
        expect(applied.get(header.key), `${path} ${header.key}`).toBe(header.value);
      }
    }
  });

  it('puts the API policy on /api paths only', () => {
    expect(API_CSP).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(headersFor('/api/health').get('Content-Security-Policy')).toBe(API_CSP);
    expect(headersFor('/api/evidence/upload').get('Content-Security-Policy')).toBe(API_CSP);
    expect(headersFor('/en').has('Content-Security-Policy')).toBe(false);
  });

  it.each([
    '/en/admin',
    '/bn/admin/reports/r-1',
    '/en/me',
    '/bn/me/security',
    '/en/register',
    '/en/sign-in',
    '/bn/verify-email',
    '/en/reset-password',
    '/en/notifications',
    '/bn/saved',
    '/en/write',
    '/en/experiences/abcdefghij/edit',
    '/bn/authors/mitu-demo',
    '/api/health',
  ])('marks the private surface %s noindex, nofollow', (path) => {
    expect(headersFor(path).get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it.each(['/en', '/bn', '/en/doctors', '/en/experiences/x', '/en/facilities', '/en/topics'])(
    'leaves the public page %s indexable by header',
    (path) => {
      expect(headersFor(path).has('X-Robots-Tag')).toBe(false);
    },
  );

  it('gives every private pattern its own route', () => {
    const sources = securityHeaderRoutes().map((route) => route.source);

    for (const pattern of PRIVATE_PATH_PATTERNS) expect(sources).toContain(pattern);
  });

  it('never puts HSTS in the build-time list (BR2.4)', () => {
    const values = securityHeaderRoutes().flatMap((route) => route.headers);

    expect(values.some((header) => header.key === 'Strict-Transport-Security')).toBe(false);
    expect(values.some((header) => header.value === HSTS_VALUE)).toBe(false);
    expect(HSTS_VALUE).toBe('max-age=31536000');
  });
});
