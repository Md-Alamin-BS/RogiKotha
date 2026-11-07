// Host and Origin verdicts (ENT-008, BR3.2, BR3.3, design § 4.1). Comparison is exact after ASCII
// lower-casing and default-port removal; nothing is parsed with `URL`, which would strip a
// userinfo prefix such as `evil.example@localhost:3000` and let it match.
import type { SecuritySettings } from './settings';

export type RefusalKind =
  | 'host'
  | 'forwarded_host'
  | 'origin'
  | 'origin_null'
  | 'origin_missing'
  | 'length_invalid'
  | 'too_large';

export type OriginDecision = { outcome: 'allowed' } | { outcome: 'refused'; kind: RefusalKind };

export type RefusedDecision = Extract<OriginDecision, { outcome: 'refused' }>;

const ALLOWED: OriginDecision = { outcome: 'allowed' };

const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

const DEFAULT_PORT: Readonly<Record<string, string>> = { 'http:': '80', 'https:': '443' };

function refused(kind: RefusalKind): OriginDecision {
  return { outcome: 'refused', kind };
}

/** Only ASCII letters: `toLowerCase` would fold e.g. U+212A KELVIN SIGN into `k`. */
function asciiLower(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

// Each allowed origin also matches its explicit default port, so `localhost:80` equals
// `localhost` on an http app, but `:443` never stands in for an http origin.
function acceptedHosts(settings: SecuritySettings): ReadonlySet<string> {
  const hosts = new Set<string>(settings.allowedHosts);
  for (const origin of settings.allowedOrigins) {
    const scheme = origin.slice(0, origin.indexOf('//'));
    const host = origin.slice(origin.indexOf('//') + 2);
    const port = DEFAULT_PORT[scheme];
    if (port !== undefined && !/:\d+$/.test(host)) hosts.add(`${host}:${port}`);
  }
  return hosts;
}

function acceptedOrigins(settings: SecuritySettings): ReadonlySet<string> {
  const origins = new Set<string>(settings.allowedOrigins);
  for (const origin of settings.allowedOrigins) {
    const scheme = origin.slice(0, origin.indexOf('//'));
    const port = DEFAULT_PORT[scheme];
    if (port !== undefined && !/:\d+$/.test(origin.slice(scheme.length + 2))) {
      origins.add(`${origin}:${port}`);
    }
  }
  return origins;
}

/** Methods are case-sensitive in HTTP, so only the exact upper-case names are safe. */
export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method);
}

export function checkHost(headers: Headers, settings: SecuritySettings): OriginDecision {
  const hosts = acceptedHosts(settings);
  const host = headers.get('host');
  if (host === null || !hosts.has(asciiLower(host))) return refused('host');
  const forwarded = headers.get('x-forwarded-host');
  if (forwarded !== null) {
    // Next.js's server-action check reads the first X-Forwarded-Host value before Host.
    const first = asciiLower((forwarded.split(',')[0] ?? '').trim());
    if (!hosts.has(first)) return refused('forwarded_host');
  }
  return ALLOWED;
}

export function checkOrigin(
  method: string,
  headers: Headers,
  settings: SecuritySettings,
): OriginDecision {
  if (isSafeMethod(method)) return ALLOWED;
  const origin = headers.get('origin');
  if (origin === null) {
    // Stricter than Next.js, which lets a request without Origin through (BR3.3).
    return headers.get('sec-fetch-site') === 'same-origin' ? ALLOWED : refused('origin_missing');
  }
  if (origin === 'null') return refused('origin_null');
  return acceptedOrigins(settings).has(asciiLower(origin)) ? ALLOWED : refused('origin');
}

export function checkRequest(
  request: { method: string; headers: Headers },
  settings: SecuritySettings,
): OriginDecision {
  const host = checkHost(request.headers, settings);
  if (host.outcome === 'refused') return host;
  return checkOrigin(request.method, request.headers, settings);
}
