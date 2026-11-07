import { describe, expect, it } from 'vitest';

import { buildCsp, CSP_DIRECTIVE_ORDER, cspDirectives, newNonce, type CspOptions } from '../csp';

const NONCE = 'AAECAwQFBgcICQoLDA0ODw==';

const BASE =
  "default-src 'self'; script-src 'self' 'nonce-AAECAwQFBgcICQoLDA0ODw==' 'strict-dynamic'" +
  "; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'" +
  "; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'" +
  "; form-action 'self'; frame-ancestors 'none'";

function options(overrides: Partial<CspOptions> = {}): CspOptions {
  return { nonce: NONCE, https: false, development: false, ...overrides };
}

function decodedLength(nonce: string): number {
  return atob(nonce).length;
}

describe('buildCsp (BR1.1, BR1.2, design § 4.3)', () => {
  it('builds the development policy over http with unsafe-eval in script-src only', () => {
    expect(buildCsp(options({ development: true }))).toBe(
      BASE.replace("'strict-dynamic'", "'strict-dynamic' 'unsafe-eval'"),
    );
  });

  it('builds the production policy over http with no unsafe-eval and no upgrade', () => {
    expect(buildCsp(options())).toBe(BASE);
  });

  it('builds the production policy over https with upgrade-insecure-requests last', () => {
    expect(buildCsp(options({ https: true }))).toBe(`${BASE}; upgrade-insecure-requests`);
  });

  it('keeps unsafe-inline out of script-src and the nonce out of style-src', () => {
    const directives = cspDirectives(options({ development: true, https: true }));

    expect(directives.get('script-src')).not.toContain("'unsafe-inline'");
    expect(directives.get('style-src')?.some((source) => source.startsWith("'nonce-"))).toBe(false);
  });

  it('writes the nonce exactly once', () => {
    expect(buildCsp(options({ https: true })).split(NONCE)).toHaveLength(2);
  });

  it('writes the directives in CSP_DIRECTIVE_ORDER', () => {
    const names = [...cspDirectives(options({ https: true })).keys()];

    expect(names).toEqual([...CSP_DIRECTIVE_ORDER]);
  });

  it('refuses a nonce that is not newNonce output, so no directive can be smuggled in', () => {
    expect(() => buildCsp(options({ nonce: "x'; script-src *" }))).toThrow();
  });
});

describe('the FR99 guard (BR1.3)', () => {
  const ALLOWED: Readonly<Record<string, readonly string[]>> = {
    'script-src': ["'self'", "'strict-dynamic'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'blob:', 'data:'],
  };

  it.each([
    ['development over http', { development: true, https: false }],
    ['production over http', { development: false, https: false }],
    ['production over https', { development: false, https: true }],
  ])('allows no host, scheme or wildcard source in any directive (%s)', (_label, flags) => {
    for (const [name, sources] of cspDirectives(options({ nonce: newNonce(), ...flags }))) {
      const allowed = ALLOWED[name] ?? ["'self'", "'none'"];
      for (const source of sources) {
        const isNonce = name === 'script-src' && /^'nonce-[A-Za-z0-9+/]{22}=='$/.test(source);
        expect(isNonce || allowed.includes(source), `${name} ${source}`).toBe(true);
        expect(source).not.toContain('*');
      }
    }
  });
});

describe('newNonce (ENT-002)', () => {
  it('returns 16 random bytes as base64, different each time', () => {
    const first = newNonce();
    const second = newNonce();

    expect(first).not.toBe(second);
    expect(first).toHaveLength(24);
    expect(decodedLength(first)).toBe(16);
    expect(decodedLength(second)).toBe(16);
  });
});
