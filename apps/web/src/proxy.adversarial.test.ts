// @vitest-environment node
// U41 plan Step 34, adversarial A1, A3 and A5 (design § 8.5) through the proxy itself: header
// tricks against a page, a server-action POST, `/api/auth/ok`, the dotted and malformed page paths
// and the Next.js internal prefixes; chosen `x-nonce` and `content-security-policy` request headers.
// Written by a separate agent to break the Unit; every value is synthetic.
// ASSUMPTION(U41): the plan lists three adversarial files; this fourth one sits beside `proxy.ts`,
// because `lib/` (`web-shared`) may not import the proxy (the boundary reason of plan Step 18).
import type { LogFields, Logger } from '@rogikotha/application';
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const handedOn = vi.hoisted(() => ({ requests: [] as NextRequest[] }));
// The same stand-in as `proxy.test.ts`: next-intl 4.14.4's pass-through, including its bare
// `NextResponse.next()` when `decodeURI` rejects the path.
vi.mock('next-intl/middleware', () => ({
  default: () => (request: NextRequest) => {
    handedOn.requests.push(request);
    try {
      decodeURI(request.nextUrl.pathname);
    } catch {
      return NextResponse.next();
    }
    return NextResponse.next({ request: { headers: new Headers(request.headers) } });
  },
}));
vi.mock('./i18n/routing', () => ({ routing: {} }));

import { createProxy } from './proxy';
import { createSecurityGuard } from './security-settings';

const APP = 'http://localhost:3000';
const HOST = 'localhost:3000';
const PAGE_ID = 'abcdefghij';
// A Next.js server-action id is a hex string sent in the `Next-Action` header.
const ACTION_ID = '7f3a9c0d1e2b3a4c5d6e7f8091a2b3c4d5e6f708';
const FORGED_NONCE = 'AAAAAAAAAAAAAAAAAAAAAA==';
const FORGED_POLICY = "script-src 'unsafe-inline' 'unsafe-eval' *";

const PAGE_PATHS = [
  '/en',
  '/bn',
  `/en/experiences/${PAGE_ID}-a.b`,
  `/en/experiences/${PAGE_ID}-x.png`,
  `/bn/doctors/${PAGE_ID}-dr.x`,
  '/en/%E0%A4%A',
];
// Every path the matcher still sees that is not a locale page.
const NON_PAGE_PATHS = [
  '/api/auth/ok',
  '/api/health',
  '/_next/webpack-hmr',
  '/_next/data/x.json',
  '/__nextjs_original-stack-frames',
  '/__nextjsx/en',
];

let lines: { event: string; fields: LogFields | undefined }[] = [];

function proxyFor(env: Record<string, string>) {
  const record = (event: string, fields?: LogFields) => {
    lines.push({ event, fields });
  };
  const logger: Logger = { info: record, warn: record, error: record };
  return createProxy(createSecurityGuard({ read: (name) => env[name], logger }));
}

const run = proxyFor({ APP_URL: APP, NODE_ENV: 'production' });
const runDev = proxyFor({ APP_URL: APP, NODE_ENV: 'development' });

function request(path: string, headers: [string, string][], method = 'GET'): NextRequest {
  const all = new Headers();
  for (const [name, value] of headers) all.append(name, value);
  return new NextRequest(new URL(path, APP), { method, headers: all });
}

function action(path: string, headers: [string, string][]): NextRequest {
  return request(path, [['next-action', ACTION_ID], ...headers], 'POST');
}

function nonceOf(policy: string | null | undefined): string | undefined {
  return /'nonce-([^']+)'/.exec(policy ?? '')?.[1];
}

beforeEach(() => {
  handedOn.requests = [];
  lines = [];
});

describe('A1 header spoofing through the proxy', () => {
  const HOST_TRICKS: [string, string][][] = [
    [['host', 'localhost:3000.evil.example']],
    [['host', 'evil.localhost:3000']],
    [['host', 'localhost:3000.']],
    [['host', 'evil.example@localhost:3000']],
    [['host', '[::1]:3000']],
    [['host', 'localhost']],
    [
      ['host', HOST],
      ['x-forwarded-host', 'evil.example'],
    ],
    [
      ['host', HOST],
      ['x-forwarded-host', 'evil.example'],
      ['x-forwarded-host', HOST],
    ],
  ];

  it.each([...PAGE_PATHS, ...NON_PAGE_PATHS])(
    'refuses every Host trick on %s with an empty 403 and hands nothing on',
    (path) => {
      for (const headers of HOST_TRICKS) {
        for (const method of ['GET', 'POST']) {
          const response = run(request(path, [...headers, ['origin', APP]], method));
          expect(response.status, JSON.stringify(headers)).toBe(403);
          expect(response.headers.get('x-middleware-next')).toBeNull();
        }
      }
      expect(handedOn.requests).toHaveLength(0);
    },
  );

  const ORIGIN_TRICKS: [string, string][][] = [
    [['origin', 'http://evil.example']],
    [['origin', 'https://localhost:3000']],
    [['origin', 'http://localhost:3000.']],
    [['origin', 'http://localhost:3000.evil.example']],
    [['origin', 'null']],
    [['sec-fetch-site', 'same-site']],
    [['sec-fetch-site', 'cross-site']],
    [],
  ];

  it.each([...PAGE_PATHS, '/api/auth/ok', '/api/health'])(
    'refuses a server-action POST on %s for every Origin trick, before next-intl',
    (path) => {
      for (const headers of ORIGIN_TRICKS) {
        const response = run(action(path, [['host', HOST], ...headers]));
        expect(response.status, JSON.stringify(headers)).toBe(403);
        expect(bodyKind(response)).toBe('');
      }
      expect(handedOn.requests).toHaveLength(0);
      expect(lines.every((line) => line.event === 'security.request_refused')).toBe(true);
    },
  );

  // Found by this file (ISS-696): the internal prefixes had the Host check only, and a production
  // server ran the `setTheme` action posted with no Origin to `/_next/x` and `/__nextjsx/en`.
  it.each(NON_PAGE_PATHS.filter((path) => !path.startsWith('/api/')))(
    'refuses a cross-site or Origin-less POST to the internal path %s as well',
    (path) => {
      for (const proxy of [run, runDev]) {
        for (const headers of ORIGIN_TRICKS) {
          const response = proxy(action(path, [['host', HOST], ...headers]));
          expect(response.status, `${path} ${JSON.stringify(headers)}`).toBe(403);
        }
        // A same-origin POST, as the development overlay sends, still passes.
        const same = proxy(
          action(path, [
            ['host', HOST],
            ['origin', APP],
          ]),
        );
        expect(same.status).toBe(200);
      }
    },
  );

  it('passes a same-origin server-action POST on every page path', () => {
    for (const path of PAGE_PATHS) {
      const response = run(
        action(path, [
          ['host', HOST],
          ['origin', APP],
        ]),
      );
      expect(response.status, path).toBe(200);
      expect(nonceOf(response.headers.get('content-security-policy'))).toBeDefined();
    }
  });
});

function bodyKind(response: Response): string {
  // Every proxy refusal is built with a null body (ENT-009).
  return response.body === null ? '' : 'non-empty';
}

describe('A3 chosen nonce and policy request headers', () => {
  it.each(PAGE_PATHS)(
    'on %s the client nonce and policy never reach the page or the response',
    (path) => {
      const seen = new Set<string>();
      for (let i = 0; i < 25; i += 1) {
        const response = run(
          request(path, [
            ['host', HOST],
            ['x-nonce', FORGED_NONCE],
            ['content-security-policy', FORGED_POLICY],
            ['x-pathname', '/en/evil'],
          ]),
        );
        const policy = response.headers.get('content-security-policy');
        const nonce = nonceOf(policy);
        expect(nonce).toBeDefined();
        expect(nonce).not.toBe(FORGED_NONCE);
        expect(policy).not.toContain("'unsafe-inline' 'unsafe-eval'");
        seen.add(nonce ?? '');
        // What the renderer reads: Next.js takes the override headers from the response.
        expect(response.headers.get('x-middleware-request-x-nonce')).toBe(nonce);
        expect(response.headers.get('x-middleware-request-content-security-policy')).toBe(policy);
        expect(response.headers.get('x-middleware-request-x-pathname')).not.toBe('/en/evil');
      }
      expect(seen.size).toBe(25);
    },
  );

  it('two x-nonce header lines are both replaced by the one proxy nonce', () => {
    const response = run(
      request('/bn', [
        ['host', HOST],
        ['x-nonce', FORGED_NONCE],
        ['x-nonce', 'BBBBBBBBBBBBBBBBBBBBBB=='],
      ]),
    );
    const handed = response.headers.get('x-middleware-request-x-nonce');
    expect(handed).toBe(nonceOf(response.headers.get('content-security-policy')));
    expect(handed).not.toContain(',');
  });
});

describe('A5 cross-site use of a signed-in session', () => {
  const COOKIE: [string, string] = ['cookie', 'better-auth.session_token=synthetic.session.value'];

  it('refuses a cross-site form POST and a credentialed fetch to a server action', () => {
    // A form POST from another site: Origin of that site, Sec-Fetch-Site cross-site.
    const form = run(
      action('/en/experiences/new', [
        ['host', HOST],
        ['origin', 'http://127.0.0.1:3129'],
        ['sec-fetch-site', 'cross-site'],
        ['content-type', 'application/x-www-form-urlencoded'],
        COOKIE,
      ]),
    );
    // A fetch with credentials from an opaque (sandboxed) document sends `Origin: null`.
    const fetchNull = run(
      action('/bn/me', [
        ['host', HOST],
        ['origin', 'null'],
        ['sec-fetch-site', 'cross-site'],
        COOKIE,
      ]),
    );
    expect(form.status).toBe(403);
    expect(fetchNull.status).toBe(403);
    expect(handedOn.requests).toHaveLength(0);
  });

  it('refuses a cross-site POST to the auth API with the session cookie', () => {
    const response = run(
      request(
        '/api/auth/sign-out',
        [['host', HOST], ['origin', 'http://evil.example'], COOKIE],
        'POST',
      ),
    );
    expect(response.status).toBe(403);
  });
});
