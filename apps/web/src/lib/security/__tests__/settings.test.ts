import { describe, expect, it } from 'vitest';

import {
  parseSecuritySettings,
  SecuritySettingsError,
  type SecuritySettingsInput,
} from '../settings';

function input(overrides: Partial<SecuritySettingsInput> = {}): SecuritySettingsInput {
  return {
    appUrl: 'http://localhost:3000',
    allowedOrigins: undefined,
    nodeEnv: 'production',
    ...overrides,
  };
}

function refusalOf(overrides: Partial<SecuritySettingsInput>): SecuritySettingsError {
  try {
    parseSecuritySettings(input(overrides));
  } catch (error) {
    if (error instanceof SecuritySettingsError) return error;
    throw error;
  }
  throw new Error('expected the settings to be refused');
}

describe('parseSecuritySettings (BR3.1, BR7.1)', () => {
  it("puts APP_URL's origin first and always allows it", () => {
    const settings = parseSecuritySettings(input({ appUrl: 'http://localhost:3000/' }));

    expect(settings.appOrigin).toBe('http://localhost:3000');
    expect(settings.allowedOrigins).toEqual(['http://localhost:3000']);
    expect(settings.allowedHosts).toEqual(['localhost:3000']);
    expect(settings.https).toBe(false);
  });

  it('reads a comma list with spaces and empty entries', () => {
    const settings = parseSecuritySettings(
      input({ allowedOrigins: ' http://127.0.0.1:3000 , ,https://demo.rogikotha.local,' }),
    );

    expect(settings.allowedOrigins).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://demo.rogikotha.local',
    ]);
    expect(settings.allowedHosts).toEqual([
      'localhost:3000',
      '127.0.0.1:3000',
      'demo.rogikotha.local',
    ]);
  });

  it('removes default ports, lower-cases hosts and collapses duplicates', () => {
    const settings = parseSecuritySettings(
      input({
        appUrl: 'https://Demo.RogiKotha.local:443',
        allowedOrigins: 'HTTPS://demo.rogikotha.local,http://Other.Example:80,http://other.example',
      }),
    );

    expect(settings.allowedOrigins).toEqual([
      'https://demo.rogikotha.local',
      'http://other.example',
    ]);
    expect(settings.allowedHosts).toEqual(['demo.rogikotha.local', 'other.example']);
    expect(settings.https).toBe(true);
  });

  it.each([
    ['a path', 'http://localhost:4000/app'],
    ['a query', 'http://localhost:4000?x=1'],
    ['an empty query', 'http://localhost:4000/?'],
    ['a fragment', 'http://localhost:4000#top'],
    ['credentials', 'http://demo:secret@localhost:4000'],
    ['a wildcard', 'http://*.rogikotha.local'],
    ['a bare wildcard', '*'],
    ['an ftp origin', 'ftp://localhost:4000'],
    ['a bare host', 'localhost:4000'],
    ['a scheme without slashes', 'http:localhost:4000'],
  ])('refuses an entry with %s and names the variable, never the value', (_label, entry) => {
    const error = refusalOf({ allowedOrigins: `http://127.0.0.1:3000,${entry}` });

    expect(error.variable).toBe('APP_ALLOWED_ORIGINS');
    expect(error.message).toContain('APP_ALLOWED_ORIGINS');
    expect(error.message).not.toContain(entry);
    expect(error.message).not.toContain('127.0.0.1');
  });

  it('refuses eleven entries and accepts ten', () => {
    const origins = (count: number) =>
      Array.from({ length: count }, (_, i) => `http://host-${i}.example`).join(',');

    expect(
      parseSecuritySettings(input({ allowedOrigins: origins(10) })).allowedOrigins,
    ).toHaveLength(11);
    expect(refusalOf({ allowedOrigins: origins(11) }).variable).toBe('APP_ALLOWED_ORIGINS');
  });

  it('refuses a missing or non-http APP_URL and names APP_URL', () => {
    expect(refusalOf({ appUrl: undefined }).variable).toBe('APP_URL');
    expect(refusalOf({ appUrl: 'ftp://localhost:3000' }).variable).toBe('APP_URL');
    expect(refusalOf({ appUrl: 'not a url' }).message).not.toContain('not a url');
  });

  it('turns development on only for NODE_ENV=development', () => {
    expect(parseSecuritySettings(input({ nodeEnv: 'development' })).development).toBe(true);
    expect(parseSecuritySettings(input({ nodeEnv: 'production' })).development).toBe(false);
    expect(parseSecuritySettings(input({ nodeEnv: 'test' })).development).toBe(false);
    expect(parseSecuritySettings(input({ nodeEnv: undefined })).development).toBe(false);
  });
});
