// @vitest-environment node
import type { LogFields, Logger } from '@rogikotha/application';
import { describe, expect, it, vi } from 'vitest';

import { createSecurityGuard, type EnvReader } from './security-settings';

interface LoggedLine {
  level: 'info' | 'warn' | 'error';
  event: string;
  fields: LogFields | undefined;
}

function recordingLogger(): { logger: Logger; lines: LoggedLine[] } {
  const lines: LoggedLine[] = [];
  const logger: Logger = {
    info: (event, fields) => lines.push({ level: 'info', event, fields }),
    warn: (event, fields) => lines.push({ level: 'warn', event, fields }),
    error: (event, fields) => lines.push({ level: 'error', event, fields }),
  };
  return { logger, lines };
}

function envReader(values: Record<string, string | undefined>) {
  return vi.fn<EnvReader>((name) => values[name]);
}

const VALID = { APP_URL: 'http://localhost:3000', NODE_ENV: 'production' };

function routeRequest(headers: Record<string, string>): Request {
  return new Request('http://localhost:3000/api/evidence/upload', { method: 'POST', headers });
}

describe('getSecuritySettings (BR7.1, BR7.2)', () => {
  it('reads the environment once and memoises the settings', () => {
    const read = envReader({ ...VALID, APP_ALLOWED_ORIGINS: 'http://127.0.0.1:3000' });
    const guard = createSecurityGuard({ read, logger: recordingLogger().logger });

    const first = guard.getSecuritySettings();
    const second = guard.getSecuritySettings();

    expect(second).toBe(first);
    expect(first.allowedHosts).toEqual(['localhost:3000', '127.0.0.1:3000']);
    expect(read.mock.calls.map(([name]) => name)).toEqual([
      'APP_URL',
      'APP_ALLOWED_ORIGINS',
      'NODE_ENV',
    ]);
  });

  it('does not read the environment until first use', () => {
    const read = envReader(VALID);

    createSecurityGuard({ read });

    expect(read).not.toHaveBeenCalled();
  });

  it('throws an error naming the variable, never the value, for an invalid list', () => {
    const guard = createSecurityGuard({
      read: envReader({ ...VALID, APP_ALLOWED_ORIGINS: 'http://*.secret-host.example' }),
    });

    expect(() => guard.getSecuritySettings()).toThrow(/APP_ALLOWED_ORIGINS/);
    expect(() => guard.getSecuritySettings()).not.toThrow(/secret-host/);
  });
});

describe('guardRouteRequest (BR3.4, BR3.6)', () => {
  it('lets a same-origin POST on the app host through', () => {
    const { logger, lines } = recordingLogger();
    const guard = createSecurityGuard({ read: envReader(VALID), logger });

    const refused = guard.guardRouteRequest(
      routeRequest({ host: 'localhost:3000', origin: 'http://localhost:3000' }),
    );

    expect(refused).toBeNull();
    expect(lines).toEqual([]);
  });

  it('answers a cross-origin POST with the 403 AppError and logs one line with its id', async () => {
    const { logger, lines } = recordingLogger();
    const guard = createSecurityGuard({ read: envReader(VALID), logger });

    const refused = guard.guardRouteRequest(
      routeRequest({ host: 'localhost:3000', origin: 'https://evil.example' }),
    );

    expect(refused?.status).toBe(403);
    const body = (await refused?.json()) as {
      code: string;
      messageKey: string;
      correlationId: string;
    };
    expect(body.code).toBe('forbidden');
    expect(body.messageKey).toBe('errors.common.forbidden');
    expect(lines).toEqual([
      {
        level: 'warn',
        event: 'security.request_refused',
        fields: { kind: 'origin', status: '403', correlationId: body.correlationId },
      },
    ]);
    expect(JSON.stringify(lines)).not.toContain('evil.example');
  });

  it('answers an unknown Host with 403 and never logs the Host', () => {
    const { logger, lines } = recordingLogger();
    const guard = createSecurityGuard({ read: envReader(VALID), logger });

    const refused = guard.guardRouteRequest(
      routeRequest({ host: 'evil.example', origin: 'http://localhost:3000' }),
    );

    expect(refused?.status).toBe(403);
    expect(lines.map((line) => line.fields?.kind)).toEqual(['host']);
    expect(JSON.stringify(lines)).not.toContain('evil.example');
  });

  it('answers 500 for invalid settings and logs security.settings_invalid once', async () => {
    const { logger, lines } = recordingLogger();
    const read = envReader({ ...VALID, APP_ALLOWED_ORIGINS: 'ftp://files.example' });
    const guard = createSecurityGuard({ read, logger });
    const valid = { host: 'localhost:3000', origin: 'http://localhost:3000' };

    const first = guard.guardRouteRequest(routeRequest(valid));
    const second = guard.guardRouteRequest(routeRequest(valid));

    expect(first?.status).toBe(500);
    expect(second?.status).toBe(500);
    expect(((await first?.json()) as { code: string }).code).toBe('internal');
    expect(lines).toEqual([
      {
        level: 'error',
        event: 'security.settings_invalid',
        fields: { errorName: 'SecuritySettingsError' },
      },
    ]);
    expect(read).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(lines)).not.toContain('files.example');
  });
});
