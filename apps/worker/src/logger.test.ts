import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JsonLogger } from './logger.js';

describe('JsonLogger', () => {
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

  it('redacts email, token, body, filename and password fields', () => {
    const logger = new JsonLogger();
    logger.info('test.event', {
      email: 'someone@example.com',
      token: 'secret-token',
      body: 'the review text',
      filename: 'photo.jpg',
      password: 'hunter2',
      accountEmail: 'nested@example.com',
      correlationId: 'keep-me',
      count: 3,
    });

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(parsed.email).toBe('[redacted]');
    expect(parsed.token).toBe('[redacted]');
    expect(parsed.body).toBe('[redacted]');
    expect(parsed.filename).toBe('[redacted]');
    expect(parsed.password).toBe('[redacted]');
    // A field whose name merely contains "email" is redacted too — the
    // rule matches by substring, not exact key.
    expect(parsed.accountEmail).toBe('[redacted]');
    expect(parsed.correlationId).toBe('keep-me');
    expect(parsed.count).toBe(3);
  });

  it('writes structured fields with ts, level and event', () => {
    const logger = new JsonLogger();
    logger.warn('worker.heartbeat', { queues: 1 });

    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(parsed.level).toBe('warn');
    expect(parsed.event).toBe('worker.heartbeat');
    expect(parsed.queues).toBe(1);
    expect(typeof parsed.ts).toBe('string');
  });

  it('a field named event, level or ts never overwrites the envelope', () => {
    // Found manually verifying the worker end-to-end: `outbox-relay.ts`
    // originally logged `{ event: outboxEvent.name, ... }` as a *field*,
    // which silently replaced this line's own `event: 'outbox.unmapped'`
    // key when the two objects were merged in the wrong order — the log
    // line reported the outbox event's name as the log event itself.
    const logger = new JsonLogger();
    logger.warn('outbox.unmapped', { event: 'doctor.changed', level: 'nope', ts: 'nope' });

    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(parsed.event).toBe('outbox.unmapped');
    expect(parsed.level).toBe('warn');
    expect(parsed.ts).not.toBe('nope');
  });
});
