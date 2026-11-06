// SecuritySettings (ENT-001, BR3.1, BR7.1): pure parsing only; `server/security-settings.ts`
// reads the environment and memoises the result (BR7.3).

export const MAX_EXTRA_ALLOWED_ORIGINS = 10;

export interface SecuritySettings {
  /** The origin of APP_URL, always first in `allowedOrigins`. */
  readonly appOrigin: string;
  readonly allowedOrigins: readonly string[];
  /** `URL.host` of each allowed origin, the form Host, X-Forwarded-Host and Next.js compare. */
  readonly allowedHosts: readonly string[];
  readonly https: boolean;
  /** Only `NODE_ENV=development` adds `'unsafe-eval'` (BR1.2). */
  readonly development: boolean;
}

export interface SecuritySettingsInput {
  appUrl: string | undefined;
  allowedOrigins: string | undefined;
  nodeEnv: string | undefined;
}

export type SecuritySettingsVariable = 'APP_URL' | 'APP_ALLOWED_ORIGINS';

/** Names the variable and never its value, which may be anything an operator pasted (BR7.1). */
export class SecuritySettingsError extends Error {
  constructor(
    readonly variable: SecuritySettingsVariable,
    reason: string,
  ) {
    super(`${variable} is not usable: ${reason}`);
    this.name = 'SecuritySettingsError';
  }
}

const HTTP_ORIGIN_PREFIX = /^https?:\/\//i;

function parseOrigin(raw: string, variable: SecuritySettingsVariable, strict: boolean): URL {
  if (!HTTP_ORIGIN_PREFIX.test(raw)) {
    throw new SecuritySettingsError(variable, 'each entry must start with http:// or https://');
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SecuritySettingsError(variable, 'each entry must be an absolute http(s) URL');
  }
  if (url.username !== '' || url.password !== '' || raw.includes('@')) {
    throw new SecuritySettingsError(variable, 'an entry may not carry credentials');
  }
  if (raw.includes('*')) {
    throw new SecuritySettingsError(variable, 'an entry may not be a wildcard');
  }
  // `URL` drops an empty `?` or `#`, so the raw text is checked as well.
  if (strict && (url.search !== '' || url.hash !== '' || /[?#]/.test(raw))) {
    throw new SecuritySettingsError(variable, 'an entry may not carry a query or fragment');
  }
  if (strict && url.pathname !== '/') {
    throw new SecuritySettingsError(variable, 'an entry may not carry a path');
  }
  return url;
}

/**
 * Validates APP_URL and APP_ALLOWED_ORIGINS. `URL` already lower-cases the host and removes a
 * default port, so `origin` and `host` are in the exact form the checks compare.
 */
export function parseSecuritySettings(input: SecuritySettingsInput): SecuritySettings {
  const appUrlRaw = (input.appUrl ?? '').trim();
  if (appUrlRaw === '') throw new SecuritySettingsError('APP_URL', 'it is not set');
  const app = parseOrigin(appUrlRaw, 'APP_URL', false);

  const entries = (input.allowedOrigins ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  if (entries.length > MAX_EXTRA_ALLOWED_ORIGINS) {
    throw new SecuritySettingsError(
      'APP_ALLOWED_ORIGINS',
      `at most ${MAX_EXTRA_ALLOWED_ORIGINS} entries are allowed`,
    );
  }

  const origins: URL[] = [app];
  for (const entry of entries) {
    const url = parseOrigin(entry, 'APP_ALLOWED_ORIGINS', true);
    if (!origins.some((known) => known.origin === url.origin)) origins.push(url);
  }

  return {
    appOrigin: app.origin,
    allowedOrigins: origins.map((url) => url.origin),
    allowedHosts: [...new Set(origins.map((url) => url.host))],
    https: app.protocol === 'https:',
    development: input.nodeEnv === 'development',
  };
}
