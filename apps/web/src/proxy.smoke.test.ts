// @vitest-environment node
// Smoke (U41, design § 8.4): a page and a dotted page path get the nonce CSP, and the Host and
// Origin checks refuse what they must, in a non-development run.
import { describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// next-intl's middleware does not resolve under Vitest; this stand-in hands the request on the
// way next-intl does, so the proxy's own headers are what the test sees.
vi.mock('next-intl/middleware', () => ({
  default: () => (request: NextRequest) =>
    NextResponse.next({ request: { headers: new Headers(request.headers) } }),
}));
vi.mock('./i18n/routing', () => ({ routing: {} }));

import { createProxy } from './proxy';
import { createSecurityGuard } from './security-settings';

const APP = 'http://localhost:3000';
const DOTTED_PAGE = '/en/experiences/smokeexp01-a.b';

const ENV: Record<string, string | undefined> = { APP_URL: APP, NODE_ENV: 'production' };
const silent = { info: () => {}, warn: () => {}, error: () => {} };
const run = createProxy(createSecurityGuard({ read: (name) => ENV[name], logger: silent }));

function request(path: string, headers: Record<string, string> = {}, method = 'GET') {
  return new NextRequest(new URL(path, APP), {
    method,
    headers: { host: 'localhost:3000', ...headers },
  });
}

describe('proxy smoke', () => {
  it.each(['/en', DOTTED_PAGE])('gives %s a nonce CSP without unsafe-eval', (path) => {
    const response = run(request(path));
    const policy = response.headers.get('content-security-policy') ?? '';

    expect(response.status).toBe(200);
    expect(policy).toMatch(/script-src [^;]*'nonce-[A-Za-z0-9+/=]+'/);
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it.each(['/en', DOTTED_PAGE])('refuses %s for Host evil.example', (path) => {
    expect(run(request(path, { host: 'evil.example' })).status).toBe(403);
  });

  it('refuses a cross-origin POST to a dotted page path and lets a same-origin one through', () => {
    const crossOrigin = run(request(DOTTED_PAGE, { origin: 'http://evil.example' }, 'POST'));
    const sameOrigin = run(request(DOTTED_PAGE, { origin: APP }, 'POST'));

    expect(crossOrigin.status).toBe(403);
    expect(sameOrigin.status).toBe(200);
  });
});
