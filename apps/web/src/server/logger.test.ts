// @vitest-environment node
import type { LogFields } from '@rogikotha/application';
import { describe, expect, it } from 'vitest';

import { createWebLogger, formatLogLine, type LogLevel } from './logger';

describe('the web logger (BR8.1)', () => {
  it('writes one JSON line with the event, its level and the allowlisted fields', () => {
    const line = formatLogLine(
      'warn',
      'auth.profile_missing',
      { correlationId: 'c-1' },
      new Date('2026-11-01T00:00:00Z'),
    );

    expect(JSON.parse(line)).toEqual({
      level: 'warn',
      event: 'auth.profile_missing',
      correlationId: 'c-1',
      at: '2026-11-01T00:00:00.000Z',
    });
  });

  it('drops a field that is not on the list, even one forced in by a cast', () => {
    const forced = { accountId: 'a-1', email: 'shirin.demo@example.test' } as unknown as LogFields;

    const line = formatLogLine('error', 'auth.library_error', forced);

    expect(line).toContain('a-1');
    expect(line).not.toContain('example.test');
  });

  it('sends each level to its own writer', () => {
    const written: [LogLevel, string][] = [];
    const logger = createWebLogger((level, line) =>
      written.push([level, (JSON.parse(line) as { event: string }).event]),
    );

    logger.info('a');
    logger.warn('b');
    logger.error('c');

    expect(written).toEqual([
      ['info', 'a'],
      ['warn', 'b'],
      ['error', 'c'],
    ]);
  });
});
