import { describe, expect, it } from 'vitest';

import { checkHost, checkOrigin, checkRequest, isSafeMethod } from '../origin';
import { parseSecuritySettings } from '../settings';

const settings = parseSecuritySettings({
  appUrl: 'http://localhost:3000',
  allowedOrigins: 'http://127.0.0.1:3000',
  nodeEnv: 'production',
});

const httpsSettings = parseSecuritySettings({
  appUrl: 'https://demo.rogikotha.local',
  allowedOrigins: undefined,
  nodeEnv: 'production',
});

function request(method: string, headers: Record<string, string> = {}) {
  return { method, headers: new Headers({ host: 'localhost:3000', ...headers }) };
}

describe('checkRequest (design § 4.1)', () => {
  it('refuses a missing Host (row 2)', () => {
    const headers = new Headers();

    expect(checkHost(headers, settings)).toEqual({ outcome: 'refused', kind: 'host' });
  });

  it('refuses a Host that is not allowed (row 2)', () => {
    expect(checkRequest(request('GET', { host: 'evil.example' }), settings)).toEqual({
      outcome: 'refused',
      kind: 'host',
    });
  });

  it('refuses an X-Forwarded-Host that is not allowed (row 3)', () => {
    expect(checkRequest(request('GET', { 'x-forwarded-host': 'evil.example' }), settings)).toEqual({
      outcome: 'refused',
      kind: 'forwarded_host',
    });
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])(
    'allows a %s on an allowed Host with any Origin (row 4)',
    (m) => {
      expect(checkRequest(request(m, { origin: 'https://evil.example' }), settings)).toEqual({
        outcome: 'allowed',
      });
    },
  );

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('allows a %s from an allowed origin (row 5)', (m) => {
    expect(checkRequest(request(m, { origin: 'http://localhost:3000' }), settings)).toEqual({
      outcome: 'allowed',
    });
  });

  it('refuses Origin: null on a POST (row 6)', () => {
    expect(checkRequest(request('POST', { origin: 'null' }), settings)).toEqual({
      outcome: 'refused',
      kind: 'origin_null',
    });
  });

  it('refuses another origin on a POST (row 7)', () => {
    expect(checkRequest(request('POST', { origin: 'https://evil.example' }), settings)).toEqual({
      outcome: 'refused',
      kind: 'origin',
    });
  });

  it('allows a POST without Origin when Sec-Fetch-Site is same-origin (row 8)', () => {
    expect(checkRequest(request('POST', { 'sec-fetch-site': 'same-origin' }), settings)).toEqual({
      outcome: 'allowed',
    });
  });

  it.each([undefined, 'same-site', 'cross-site', 'none', 'Same-Origin'])(
    'refuses a POST without Origin when Sec-Fetch-Site is %s (row 9)',
    (site) => {
      const headers = site === undefined ? {} : { 'sec-fetch-site': site };

      expect(checkRequest(request('POST', headers), settings)).toEqual({
        outcome: 'refused',
        kind: 'origin_missing',
      });
    },
  );

  it('checks the Host before the Origin', () => {
    expect(
      checkRequest(request('POST', { host: 'evil.example', origin: 'null' }), settings),
    ).toEqual({ outcome: 'refused', kind: 'host' });
  });
});

describe('Host tricks (BR3.2)', () => {
  it('allows an upper-case Host', () => {
    expect(checkHost(new Headers({ host: 'LOCALHOST:3000' }), settings).outcome).toBe('allowed');
  });

  it.each([
    'localhost:3000.evil.example',
    'localhost.:3000',
    'evil.example@localhost:3000',
    'localhost:3001',
    'localhost',
    'localhost:3000/x',
  ])('refuses the Host %j', (host) => {
    expect(checkHost(new Headers({ host }), settings)).toEqual({
      outcome: 'refused',
      kind: 'host',
    });
  });

  it('allows the explicit default port of the app scheme only', () => {
    expect(
      checkHost(new Headers({ host: 'demo.rogikotha.local:443' }), httpsSettings).outcome,
    ).toBe('allowed');
    expect(checkHost(new Headers({ host: 'demo.rogikotha.local:80' }), httpsSettings).outcome).toBe(
      'refused',
    );
  });

  it('checks only the first X-Forwarded-Host value', () => {
    expect(
      checkHost(
        new Headers({ host: 'localhost:3000', 'x-forwarded-host': 'localhost:3000, evil.example' }),
        settings,
      ),
    ).toEqual({ outcome: 'allowed' });
    expect(
      checkHost(
        new Headers({ host: 'localhost:3000', 'x-forwarded-host': 'evil.example, localhost:3000' }),
        settings,
      ),
    ).toEqual({ outcome: 'refused', kind: 'forwarded_host' });
  });

  it('refuses an empty X-Forwarded-Host', () => {
    expect(
      checkHost(new Headers({ host: 'localhost:3000', 'x-forwarded-host': '' }), settings).outcome,
    ).toBe('refused');
  });
});

describe('Origin matching (BR3.3)', () => {
  it('refuses https://localhost:3000 on an http app', () => {
    expect(
      checkOrigin('POST', new Headers({ origin: 'https://localhost:3000' }), settings),
    ).toEqual({ outcome: 'refused', kind: 'origin' });
  });

  it('allows a second allowed origin', () => {
    expect(
      checkRequest(
        request('POST', { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' }),
        settings,
      ),
    ).toEqual({ outcome: 'allowed' });
  });

  it('allows an upper-case origin and an explicit default port', () => {
    expect(
      checkOrigin('POST', new Headers({ origin: 'HTTP://LOCALHOST:3000' }), settings).outcome,
    ).toBe('allowed');
    expect(
      checkOrigin(
        'POST',
        new Headers({ origin: 'https://demo.rogikotha.local:443' }),
        httpsSettings,
      ).outcome,
    ).toBe('allowed');
  });

  it.each([
    'http://localhost:3000/',
    'http://localhost:3000.evil.example',
    'http://evil.example@localhost:3000',
    '',
  ])('refuses the Origin %j', (origin) => {
    expect(checkOrigin('POST', new Headers({ origin }), settings)).toEqual({
      outcome: 'refused',
      kind: 'origin',
    });
  });
});

describe('isSafeMethod', () => {
  it('treats only GET, HEAD and OPTIONS as safe', () => {
    expect(['GET', 'HEAD', 'OPTIONS'].every(isSafeMethod)).toBe(true);
    expect(['POST', 'PUT', 'PATCH', 'DELETE', 'get', 'TRACE'].some(isSafeMethod)).toBe(false);
  });
});
