// @vitest-environment node
// U41 plan Step 34, adversarial A1 and A3 (design § 8.5), at the level of the pure helpers: every
// Host, X-Forwarded-Host, Origin and Sec-Fetch-Site trick against the verdicts the proxy and the
// route guard share, and nonce and policy payloads against the CSP builder. Written by a separate
// agent to break the Unit; every value is synthetic.
import { describe, expect, it } from 'vitest';

import { buildCsp, cspDirectives, newNonce } from '../csp';
import { checkDeclaredLength } from '../request-limits';
import { checkHost, checkOrigin, checkRequest } from '../origin';
import { parseSecuritySettings } from '../settings';

const HTTP = parseSecuritySettings({
  appUrl: 'http://localhost:3000',
  allowedOrigins: undefined,
  nodeEnv: 'production',
});
const HTTPS = parseSecuritySettings({
  appUrl: 'https://demo.rogikotha.local',
  allowedOrigins: 'https://staff.rogikotha.local',
  nodeEnv: 'production',
});

function headersOf(entries: [string, string][]): Headers {
  const headers = new Headers();
  for (const [name, value] of entries) headers.append(name, value);
  return headers;
}

function hostVerdict(host: string, extra: [string, string][] = []) {
  return checkHost(headersOf([['host', host], ...extra]), HTTP).outcome;
}

function postVerdict(entries: [string, string][]) {
  return checkRequest(
    { method: 'POST', headers: headersOf([['host', 'localhost:3000'], ...entries]) },
    HTTP,
  ).outcome;
}

describe('A1 header spoofing: Host', () => {
  it.each([
    'localhost:3000.evil.example',
    'evil.localhost:3000',
    'evillocalhost:3000',
    'localhost:30000',
    'localhost:300',
    'localhost:03000',
    'localhost:3000.',
    'localhost.:3000',
    'localhost',
    'localhost:80',
    'evil.example@localhost:3000',
    'localhost:3000@evil.example',
    'user:pass@localhost:3000',
    '[::1]:3000',
    '127.0.0.1:3000',
    '0.0.0.0:3000',
    'localhost:3000/evil',
    'localhost:3000#',
    'localhost:3000\\evil.example',
    'localhost%3a3000',
    'localhost:3000, evil.example',
    'evil.example, localhost:3000',
    'localhost:3000 evil.example',
    '',
  ])('refuses Host %j', (host) => {
    expect(hostVerdict(host)).toBe('refused');
  });

  it('refuses a request with no Host at all', () => {
    expect(checkHost(new Headers(), HTTP).outcome).toBe('refused');
  });

  it('accepts only the exact host, its ASCII case variant and its explicit default-port twin', () => {
    expect(hostVerdict('localhost:3000')).toBe('allowed');
    expect(hostVerdict('LOCALHOST:3000')).toBe('allowed');
    // Headers trims surrounding whitespace, so this is the same value on the wire.
    expect(hostVerdict(' localhost:3000\t')).toBe('allowed');
    const https = (host: string) => checkHost(headersOf([['host', host]]), HTTPS).outcome;
    expect(https('demo.rogikotha.local')).toBe('allowed');
    expect(https('demo.rogikotha.local:443')).toBe('allowed');
    expect(https('demo.rogikotha.local:80')).toBe('refused');
    expect(https('staff.rogikotha.local')).toBe('allowed');
    expect(https('rogikotha.local')).toBe('refused');
  });

  it('refuses a spoofed or second X-Forwarded-Host value that Next.js would read first', () => {
    expect(hostVerdict('localhost:3000', [['x-forwarded-host', 'evil.example']])).toBe('refused');
    expect(hostVerdict('localhost:3000', [['x-forwarded-host', '']])).toBe('refused');
    expect(hostVerdict('localhost:3000', [['x-forwarded-host', ',localhost:3000']])).toBe(
      'refused',
    );
    expect(
      hostVerdict('localhost:3000', [
        ['x-forwarded-host', 'evil.example'],
        ['x-forwarded-host', 'localhost:3000'],
      ]),
    ).toBe('refused');
    expect(
      hostVerdict('localhost:3000', [['x-forwarded-host', 'localhost:3000.evil.example']]),
    ).toBe('refused');
    // Next.js reads only the first value, which is the app's own, so the request is the app's.
    expect(
      hostVerdict('localhost:3000', [
        ['x-forwarded-host', 'localhost:3000'],
        ['x-forwarded-host', 'evil.example'],
      ]),
    ).toBe('allowed');
  });
});

describe('A1 header spoofing: Origin and Sec-Fetch-Site on an unsafe method', () => {
  it.each([
    'http://localhost:3000.evil.example',
    'http://evil.localhost:3000',
    'http://localhost:30000',
    'https://localhost:3000',
    'http://localhost:3000.',
    'http://localhost',
    'http://localhost:80',
    'http://user@localhost:3000',
    'http://evil.example@localhost:3000',
    'http://localhost:3000@evil.example',
    'http://[::1]:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3000/',
    'http://localhost:3000/en',
    'ws://localhost:3000',
    'localhost:3000',
    '//localhost:3000',
    'http://localhost:3000, http://evil.example',
    'http://evil.example, http://localhost:3000',
    'null',
    'NULL',
    '',
  ])('refuses Origin %j', (origin) => {
    expect(postVerdict([['origin', origin]])).toBe('refused');
  });

  it('refuses two Origin header lines even when one is the app', () => {
    expect(
      postVerdict([
        ['origin', 'http://localhost:3000'],
        ['origin', 'http://evil.example'],
      ]),
    ).toBe('refused');
  });

  it.each(['same-site', 'cross-site', 'none', 'Same-Origin', ''])(
    'refuses a missing Origin with Sec-Fetch-Site %j',
    (site) => {
      expect(postVerdict([['sec-fetch-site', site]])).toBe('refused');
    },
  );

  it('refuses a missing Origin with no Sec-Fetch-Site', () => {
    expect(postVerdict([])).toBe('refused');
  });

  it('accepts only the exact origin and its ASCII case variant', () => {
    expect(postVerdict([['origin', 'http://localhost:3000']])).toBe('allowed');
    expect(postVerdict([['origin', 'HTTP://LOCALHOST:3000']])).toBe('allowed');
    // A browser sends no Origin on some same-origin requests and always a true Sec-Fetch-Site;
    // a script cannot set a `Sec-` header (BR3.3).
    expect(postVerdict([['sec-fetch-site', 'same-origin']])).toBe('allowed');
  });

  it('treats every method but the exact GET, HEAD and OPTIONS as unsafe', () => {
    const cross = headersOf([
      ['host', 'localhost:3000'],
      ['origin', 'http://evil.example'],
    ]);
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'PROPFIND', 'get', 'Head', 'TRACE']) {
      expect(checkOrigin(method, cross, HTTP).outcome, method).toBe('refused');
    }
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      expect(checkOrigin(method, cross, HTTP).outcome, method).toBe('allowed');
    }
  });

  it('checks Host before Origin, so an allowed Origin never rescues a forged Host', () => {
    const decision = checkRequest(
      {
        method: 'POST',
        headers: headersOf([
          ['host', 'evil.example'],
          ['origin', 'http://localhost:3000'],
        ]),
      },
      HTTP,
    );
    expect(decision).toEqual({ outcome: 'refused', kind: 'host' });
  });
});

describe('A2 declared length tricks', () => {
  it.each(['-1', '+100', '1e9', '0x10', '1.5', '100 ', ' 100', '100, 100', '9999999999999999'])(
    'refuses Content-Length %j without reading the body',
    (declared) => {
      const headers = new Headers();
      // Headers trims the outer whitespace, so ' 100' and '100 ' arrive as '100'.
      headers.set('content-length', declared);
      const verdict = checkDeclaredLength(headers, 15_794_176);
      if (declared.trim() === '100') expect(verdict.outcome).toBe('allowed');
      else expect(verdict.outcome).toBe('refused');
    },
  );
});

describe('A3 nonce and policy payloads', () => {
  it.each([
    "abc' 'unsafe-inline",
    'AAAAAAAAAAAAAAAAAAAAAA==; script-src *',
    'AAAAAAAAAAAAAAAAAAAAAA== ',
    "AAAAAAAAAAAAAAAAAAAAAA=='",
    '',
    'AAAAAAAAAAAAAAAAAAAAAAAA',
  ])('refuses to build a policy around the nonce %j', (nonce) => {
    expect(() => buildCsp({ nonce, https: false, development: false })).toThrow();
  });

  it('never repeats a nonce over 10 000 draws, and each is 16 random bytes', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i += 1) seen.add(newNonce());
    expect(seen.size).toBe(10_000);
    for (const nonce of [...seen].slice(0, 50)) expect(atob(nonce)).toHaveLength(16);
  });

  it('gives script, base, form, frame and object no way to an inline or foreign source', () => {
    const directives = cspDirectives({ nonce: newNonce(), https: true, development: false });
    const script = directives.get('script-src') ?? [];
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(script.some((source) => source.startsWith("'nonce-"))).toBe(true);
    // A `<base href>` or a `<form action>` payload cannot point anywhere but the app.
    expect(directives.get('base-uri')).toEqual(["'self'"]);
    expect(directives.get('form-action')).toEqual(["'self'"]);
    expect(directives.get('object-src')).toEqual(["'none'"]);
    expect(directives.get('frame-ancestors')).toEqual(["'none'"]);
    for (const [name, sources] of directives) {
      for (const source of sources) {
        expect(source, name).not.toMatch(/^\*|^https?:|^\*\.|javascript:/);
      }
    }
  });
});
