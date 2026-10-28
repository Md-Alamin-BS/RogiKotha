import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JsonLogger } from './logger.js';

describe('JsonLogger levels', () => {
  let lines: string[];

  beforeEach(() => {
    lines = [];
    vi.spyOn(console, 'log').mockImplementation((line: string) => {
      lines.push(line);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['info', 'warn', 'error'] as const)('writes one line at level %s', (level) => {
    new JsonLogger()[level]('worker.test', { count: 2 });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '')).toMatchObject({ level, event: 'worker.test', count: 2 });
  });

  it('writes an event without fields as an envelope only', () => {
    new JsonLogger().error('worker.crashed');

    expect(Object.keys(JSON.parse(lines[0] ?? '') as object).sort()).toEqual([
      'event',
      'level',
      'ts',
    ]);
  });
});
