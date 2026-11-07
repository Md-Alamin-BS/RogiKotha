// Static security headers that `next.config.ts` `headers()` applies (ENT-004 to ENT-006, BR1.6,
// BR2.1, BR2.2). HSTS is not here: it depends on APP_URL, and `headers()` is evaluated at build
// time, so the proxy sets it at runtime (BR2.4).

export interface SecurityHeader {
  key: string;
  value: string;
}

export interface SecurityHeaderRoute {
  source: string;
  headers: SecurityHeader[];
}

export const HSTS_VALUE = 'max-age=31536000';

export const API_CSP = "default-src 'none'; frame-ancestors 'none'";

export const STATIC_SECURITY_HEADERS: readonly SecurityHeader[] = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

export const ROBOTS_HEADER: SecurityHeader = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };

/** Every page that exports `noindex()`, plus the staff console and `/api` (ENT-006). */
export const PRIVATE_PATH_PATTERNS: readonly string[] = [
  '/:locale(en|bn)/admin/:path*',
  '/:locale(en|bn)/admin',
  '/:locale(en|bn)/me/:path*',
  '/:locale(en|bn)/me',
  '/:locale(en|bn)/:page(register|sign-in|verify-email|reset-password|notifications|saved|write)',
  '/:locale(en|bn)/experiences/:id/edit',
  '/:locale(en|bn)/authors/:path*',
  '/api/:path*',
];

/** The array `next.config.ts` returns from `headers()`. */
export function securityHeaderRoutes(): SecurityHeaderRoute[] {
  return [
    { source: '/:path*', headers: STATIC_SECURITY_HEADERS.map((header) => ({ ...header })) },
    { source: '/api/:path*', headers: [{ key: 'Content-Security-Policy', value: API_CSP }] },
    ...PRIVATE_PATH_PATTERNS.map((source) => ({ source, headers: [{ ...ROBOTS_HEADER }] })),
  ];
}
