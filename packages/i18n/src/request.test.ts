import { IntlErrorCode } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Both next-intl entry points need a Next.js runtime. The request config under test only needs
// `getRequestConfig` to hand back the callback it is given, and `createNavigation` to exist.
vi.mock('next-intl/server', () => ({
  getRequestConfig: (callback: unknown) => callback,
}));
vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({}),
}));

interface RequestConfig {
  locale: string;
  messages: Record<string, unknown>;
  timeZone: string;
  onError: (error: { code: string }) => void;
  getMessageFallback: (info: { key: string; namespace?: string }) => string;
}
type ConfigFactory = (params: {
  requestLocale: Promise<string | undefined>;
}) => Promise<RequestConfig>;

async function configFor(requested: string | undefined): Promise<RequestConfig> {
  const factory = (await import('./request')).default as unknown as ConfigFactory;
  return factory({ requestLocale: Promise.resolve(requested) });
}

function aMissingMessageError(): { code: string } {
  return { code: IntlErrorCode.MISSING_MESSAGE };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('request config locale', () => {
  it.each(['en', 'bn'])('uses the requested supported locale %s', async (locale) => {
    expect((await configFor(locale)).locale).toBe(locale);
  });

  it('falls back to English for a locale the product does not serve', async () => {
    expect((await configFor('fr')).locale).toBe('en');
  });

  it('falls back to English when no locale was requested', async () => {
    expect((await configFor(undefined)).locale).toBe('en');
  });

  it('loads the dictionary that belongs to the chosen locale', async () => {
    const en = await configFor('en');
    const bn = await configFor('bn');
    expect(Object.keys(en.messages).length).toBeGreaterThan(0);
    expect(Object.keys(bn.messages)).toEqual(Object.keys(en.messages));
    expect(JSON.stringify(bn.messages)).not.toBe(JSON.stringify(en.messages));
  });

  it('formats times in Bangladesh time', async () => {
    expect((await configFor('en')).timeZone).toBe('Asia/Dhaka');
  });
});

describe('request config missing-message handling', () => {
  it('fails loudly on a missing message outside production', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const { onError } = await configFor('en');
    const error = aMissingMessageError();
    expect(() => onError(error)).toThrow();
  });

  it('logs and carries on for a missing message in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { onError } = await configFor('en');
    const error = aMissingMessageError();
    expect(() => onError(error)).not.toThrow();
    expect(log).toHaveBeenCalledWith(error);
  });

  it('only logs an error that is not a missing message, even outside production', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { onError } = await configFor('en');
    const error = { code: IntlErrorCode.INVALID_MESSAGE };
    expect(() => onError(error)).not.toThrow();
    expect(log).toHaveBeenCalledWith(error);
  });

  it('names the missing key, with its namespace, when failing outside production', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const { getMessageFallback } = await configFor('en');
    expect(() => getMessageFallback({ namespace: 'errors.common', key: 'notFound' })).toThrow(
      'Missing i18n message: errors.common.notFound',
    );
  });

  it('shows the dotted key path instead of crashing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { getMessageFallback } = await configFor('en');
    expect(getMessageFallback({ namespace: 'errors.common', key: 'notFound' })).toBe(
      'errors.common.notFound',
    );
  });

  it('shows the bare key in production when there is no namespace', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { getMessageFallback } = await configFor('en');
    expect(getMessageFallback({ key: 'notFound' })).toBe('notFound');
  });
});
