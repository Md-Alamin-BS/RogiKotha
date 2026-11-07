// @vitest-environment node
import type { LogFields, Logger } from '@rogikotha/application';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// next-intl's middleware imports `next/server` by a path that does not resolve under Vitest, so
// it is replaced by a stand-in that records the request the proxy hands on. The locale
// negotiation itself belongs to next-intl and is not under test here.
const handedOn = vi.hoisted(() => ({
  request: undefined as NextRequest | undefined,
  calls: 0,
  respond: undefined as ((request: NextRequest) => Response) | undefined,
}));
vi.mock('next-intl/middleware', () => ({
  default: () => (request: NextRequest) => {
    handedOn.request = request;
    handedOn.calls += 1;
    return handedOn.respond?.(request) ?? new Response(null, { status: 204 });
  },
}));
vi.mock('./i18n/routing', () => ({ routing: {} }));

// The default export reads the process settings at its first request; these pin them for the file.
vi.stubEnv('APP_URL', 'http://localhost:3000');
vi.stubEnv('APP_ALLOWED_ORIGINS', '');

import proxy, { config, createProxy } from './proxy';
import { createSecurityGuard } from './security-settings';

function request(path: string, headers: Record<string, string> = {}, method = 'GET') {
  return new NextRequest(new URL(path, 'http://localhost:3000'), {
    method,
    headers: { host: 'localhost:3000', ...headers },
  });
}

interface LoggedLine {
  event: string;
  fields: LogFields | undefined;
}

function recordingLogger(): { logger: Logger; lines: LoggedLine[] } {
  const lines: LoggedLine[] = [];
  const record = (event: string, fields?: LogFields) => {
    lines.push({ event, fields });
  };
  return { logger: { info: record, warn: record, error: record }, lines };
}

function proxyFor(env: Record<string, string | undefined>) {
  const { logger, lines } = recordingLogger();
  const guard = createSecurityGuard({ read: (name) => env[name], logger });
  return { run: createProxy(guard), lines };
}

const HTTP_APP = { APP_URL: 'http://localhost:3000', NODE_ENV: 'production' };
const HTTPS_APP = { APP_URL: 'https://demo.rogikotha.local', NODE_ENV: 'production' };
const FORGED_NONCE = 'AAAAAAAAAAAAAAAAAAAAAA==';
const FORGED_POLICY = "script-src 'unsafe-inline'";

function nonceOf(policy: string | null | undefined): string | undefined {
  return /'nonce-([^']+)'/.exec(policy ?? '')?.[1];
}

function httpsRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, 'https://demo.rogikotha.local'), {
    headers: { host: 'demo.rogikotha.local' },
  });
}

// next-intl 4.14.4's own early return when `decodeURI` rejects the pathname.
function likeNextIntl(request: NextRequest): Response {
  try {
    decodeURI(request.nextUrl.pathname);
  } catch {
    return NextResponse.next();
  }
  return NextResponse.next({ request: { headers: new Headers(request.headers) } });
}

function resetHandedOn() {
  handedOn.request = undefined;
  handedOn.calls = 0;
  handedOn.respond = undefined;
}

describe('proxy', () => {
  beforeEach(() => {
    handedOn.request = undefined;
  });

  it('stamps the request pathname on the headers the layouts read', () => {
    proxy(request('/bn/admin/queue'));
    expect(handedOn.request?.headers.get('x-pathname')).toBe('/bn/admin/queue');
  });

  it('keeps the headers the browser sent', () => {
    proxy(request('/en/doctors', { 'accept-language': 'bn' }));
    expect(handedOn.request?.headers.get('accept-language')).toBe('bn');
    expect(handedOn.request?.headers.get('x-pathname')).toBe('/en/doctors');
  });

  it('overwrites a pathname header the browser tried to supply', () => {
    proxy(request('/en/doctors', { 'x-pathname': '/en/admin/queue' }));
    expect(handedOn.request?.headers.get('x-pathname')).toBe('/en/doctors');
  });

  it('returns what the locale middleware returns', () => {
    expect(proxy(request('/en')).status).toBe(204);
  });
});

describe('proxy page flow (WF1)', () => {
  beforeEach(resetHandedOn);

  it('puts the same nonce on the response policy and on the handed-on request', () => {
    const { run } = proxyFor(HTTP_APP);
    const policy = run(request('/en')).headers.get('content-security-policy');
    const nonce = nonceOf(policy);

    expect(nonce).toBeDefined();
    expect(handedOn.request?.headers.get('x-nonce')).toBe(nonce);
    expect(handedOn.request?.headers.get('content-security-policy')).toBe(policy);
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it('overwrites a nonce or policy header the browser tried to supply', () => {
    const { run } = proxyFor(HTTP_APP);
    run(request('/en', { 'x-nonce': FORGED_NONCE, 'content-security-policy': FORGED_POLICY }));
    const handedNonce = handedOn.request?.headers.get('x-nonce');
    const handedPolicy = handedOn.request?.headers.get('content-security-policy');

    expect(handedNonce).not.toBe(FORGED_NONCE);
    expect(handedPolicy).not.toBe(FORGED_POLICY);
    expect(nonceOf(handedPolicy)).toBe(handedNonce);
  });

  it('gives two requests different nonces', () => {
    const { run } = proxyFor(HTTP_APP);
    const first = nonceOf(run(request('/en')).headers.get('content-security-policy'));
    const second = nonceOf(run(request('/en')).headers.get('content-security-policy'));
    expect(first).not.toBe(second);
  });

  it('sends HSTS only when APP_URL is https', () => {
    const http = proxyFor(HTTP_APP).run(request('/en'));
    const https = proxyFor(HTTPS_APP).run(httpsRequest('/en'));

    expect(http.headers.get('strict-transport-security')).toBeNull();
    expect(https.headers.get('strict-transport-security')).toBe('max-age=31536000');
    expect(https.headers.get('content-security-policy')).toContain('upgrade-insecure-requests');
  });

  it('refuses an unknown Host with an empty 403 and never calls the locale middleware', async () => {
    const { run, lines } = proxyFor(HTTP_APP);
    const response = run(request('/en', { host: 'evil.example' }));

    expect(response.status).toBe(403);
    expect(await response.text()).toBe('');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(handedOn.calls).toBe(0);
    expect(lines).toEqual([
      { event: 'security.request_refused', fields: { kind: 'host', status: '403' } },
    ]);
  });

  it('refuses a cross-origin POST before the locale middleware', () => {
    const { run } = proxyFor(HTTP_APP);
    const response = run(request('/en/doctors', { origin: 'http://evil.example' }, 'POST'));
    expect(response.status).toBe(403);
    expect(handedOn.calls).toBe(0);
  });

  it('lets a same-origin POST and a GET without Origin through', () => {
    const { run } = proxyFor(HTTP_APP);
    const post = run(request('/en/doctors', { origin: 'http://localhost:3000' }, 'POST'));
    const get = run(request('/en/doctors'));

    expect(post.status).toBe(204);
    expect(get.status).toBe(204);
    expect(handedOn.calls).toBe(2);
  });

  it('answers an empty 500 when the settings are invalid and logs it once', async () => {
    const { run, lines } = proxyFor({ ...HTTP_APP, APP_ALLOWED_ORIGINS: 'ftp://x.example' });
    const first = run(request('/en'));
    run(request('/en'));

    expect(first.status).toBe(500);
    expect(await first.text()).toBe('');
    expect(handedOn.calls).toBe(0);
    expect(lines.map((line) => line.event)).toEqual(['security.settings_invalid']);
  });

  it('treats a dotted slug as a page with a CSP and the Host and Origin checks', () => {
    const { run } = proxyFor(HTTP_APP);
    const path = '/en/experiences/abcdefghij-a.b';

    expect(run(request(path)).headers.get('content-security-policy')).toContain("'nonce-");
    expect(run(request(path, { host: 'evil.example' })).status).toBe(403);
    expect(run(request(path, { origin: 'http://evil.example' }, 'POST')).status).toBe(403);
  });

  it('hands on its own nonce and policy when next-intl passes a malformed path through bare', () => {
    handedOn.respond = likeNextIntl;
    const { run } = proxyFor(HTTP_APP);
    const response = run(
      request('/en/%E0%A4%A', {
        'x-nonce': FORGED_NONCE,
        'content-security-policy': FORGED_POLICY,
      }),
    );
    const policy = response.headers.get('content-security-policy');

    expect(response.headers.get('x-middleware-override-headers')).toContain('x-nonce');
    expect(response.headers.get('x-middleware-request-x-nonce')).toBe(nonceOf(policy));
    expect(response.headers.get('x-middleware-request-content-security-policy')).toBe(policy);
    expect(response.headers.get('x-middleware-request-x-pathname')).toBe('/en/%E0%A4%A');
  });

  it('keeps the override next-intl built for a well-formed path', () => {
    handedOn.respond = likeNextIntl;
    const { run } = proxyFor(HTTP_APP);
    const response = run(request('/en/doctors'));

    expect(response.headers.get('x-middleware-request-x-nonce')).toBe(
      nonceOf(response.headers.get('content-security-policy')),
    );
  });
});

describe('proxy api and internals (WF2, WF2b)', () => {
  beforeEach(resetHandedOn);

  it('passes /api/health on without next-intl and without a page CSP', () => {
    const { run } = proxyFor(HTTP_APP);
    const response = run(request('/api/health'));

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('content-security-policy')).toBeNull();
    expect(handedOn.calls).toBe(0);
  });

  it('checks Host and Origin on /api requests and adds HSTS on https', () => {
    const { run } = proxyFor(HTTP_APP);
    const badHost = run(request('/api/health', { host: 'evil.example' }));
    const crossOrigin = run(request('/api/auth/ok', { origin: 'http://evil.example' }, 'POST'));
    const https = proxyFor(HTTPS_APP).run(httpsRequest('/api/health'));

    expect(badHost.status).toBe(403);
    expect(crossOrigin.status).toBe(403);
    expect(https.headers.get('strict-transport-security')).toBe('max-age=31536000');
  });

  // U41 adversarial A1 (ISS-696): an unsafe method also needs the Origin rule here, because Next.js
  // runs a server action posted to an internal path; the POST below therefore carries the Origin.
  it('gives /_next/webpack-hmr the Host check only and keeps it away from next-intl', () => {
    const { run } = proxyFor(HTTP_APP);
    const passed = run(request('/_next/webpack-hmr', { origin: 'http://localhost:3000' }, 'POST'));
    const badHost = run(request('/_next/webpack-hmr', { host: 'evil.example' }));
    const overlay = run(request('/__nextjs_original-stack-frames', { host: 'evil.example' }));

    expect(passed.headers.get('x-middleware-next')).toBe('1');
    expect(passed.headers.get('content-security-policy')).toBeNull();
    expect(badHost.status).toBe(403);
    expect(overlay.status).toBe(403);
    expect(handedOn.calls).toBe(0);
  });
});

describe('proxy matcher', () => {
  const [pattern] = config.matcher;
  const matches = (path: string) => new RegExp(`^${pattern}$`).test(path);

  it('covers page paths', () => {
    expect(matches('/en/doctors')).toBe(true);
  });

  it.each([
    '/en',
    '/en/experiences/abcdefghij-a.b',
    '/en/doctors/abcdefghij-dr.x',
    '/bn/x.json',
    '/api/health',
    '/api/auth/ok',
    '/_next/webpack-hmr',
  ])('matches %s', (path) => {
    expect(matches(path)).toBe(true);
  });

  it.each([
    '/api/evidence/upload',
    '/_next/static/chunk.js',
    '/_next/image',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.webmanifest',
  ])('skips exactly %s', (path) => {
    expect(matches(path)).toBe(false);
  });

  it('is one entry that excludes no file extension', () => {
    expect(config.matcher).toHaveLength(1);
    expect(pattern).not.toContain('.*\\..*');
  });
});
