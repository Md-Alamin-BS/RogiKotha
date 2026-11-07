// The page Content-Security-Policy (ENT-003, BR1.1-BR1.3). Adding any host, scheme or wildcard
// source needs an FD row first (FR99); `__tests__/csp.test.ts` enumerates every directive.

const NONCE_BYTES = 16;
const NONCE_SHAPE = /^[A-Za-z0-9+/]{22}==$/;

export const CSP_DIRECTIVE_ORDER = [
  'default-src',
  'script-src',
  'style-src',
  'img-src',
  'font-src',
  'connect-src',
  'frame-src',
  'object-src',
  'base-uri',
  'form-action',
  'frame-ancestors',
  'upgrade-insecure-requests',
] as const;

export type CspDirective = (typeof CSP_DIRECTIVE_ORDER)[number];

export interface CspOptions {
  nonce: string;
  https: boolean;
  development: boolean;
}

/** 128 random bits from Web Crypto, base64 (24 characters). */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** The directive map in `CSP_DIRECTIVE_ORDER`; a flag directive has no sources. */
export function cspDirectives(options: CspOptions): ReadonlyMap<CspDirective, readonly string[]> {
  // A nonce is only ever `newNonce()` output; anything else could smuggle a `;` into the header.
  if (!NONCE_SHAPE.test(options.nonce)) throw new Error('CSP nonce is not a 16-byte base64 value');
  const scriptSrc = ["'self'", `'nonce-${options.nonce}'`, "'strict-dynamic'"];
  // Next.js dev tooling evaluates code; production never gets 'unsafe-eval' (BR1.2).
  if (options.development) scriptSrc.push("'unsafe-eval'");
  const directives = new Map<CspDirective, readonly string[]>([
    ['default-src', ["'self'"]],
    ['script-src', scriptSrc],
    // No nonce here: a nonce makes browsers ignore 'unsafe-inline', and the ported markup and React
    // style props render style attributes.
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'blob:', 'data:']],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'"]],
    ['frame-src', ["'none'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ]);
  if (options.https) directives.set('upgrade-insecure-requests', []);
  return directives;
}

export function buildCsp(options: CspOptions): string {
  return [...cspDirectives(options)]
    .map(([name, sources]) => (sources.length === 0 ? name : `${name} ${sources.join(' ')}`))
    .join('; ');
}
