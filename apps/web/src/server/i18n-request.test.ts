// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

// The i18n package's next-intl build does not resolve under Vitest (see i18n/routing.test.ts), so
// the package factory is a stand-in that hands back the options, and the test checks the wiring.
vi.mock('@rogikotha/i18n/request', () => ({
  createRequestConfig: (options: unknown) => options,
}));

import appConfig from './i18n-request';

interface WiredOptions {
  onIntlError: (code: string) => void;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('app request config', () => {
  it('writes a missing key as i18n.message_error with only its error code', () => {
    const errorLines: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((line: unknown) => {
      errorLines.push(String(line));
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    (appConfig as unknown as WiredOptions).onIntlError('MISSING_MESSAGE');

    expect(errorLines).toHaveLength(1);
    const line = JSON.parse(errorLines[0] ?? '{}') as Record<string, unknown>;
    expect(Object.keys(line).sort()).toEqual(['at', 'errorCode', 'event', 'level']);
    expect(line).toMatchObject({
      level: 'error',
      event: 'i18n.message_error',
      errorCode: 'MISSING_MESSAGE',
    });
    expect(warn).not.toHaveBeenCalled();
    expect(stdout).not.toHaveBeenCalled();
  });
});
