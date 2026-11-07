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

  // Step 8 (U41): this case replaced "redacts email, token, body, filename and password fields",
  // because the shared allowlist (BR6.1) drops those keys instead of writing them as [redacted].
  it('drops email, token, body, filename and password fields', () => {
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
    for (const key of ['email', 'token', 'body', 'filename', 'password', 'accountEmail']) {
      expect(parsed).not.toHaveProperty(key);
    }
    expect(parsed.correlationId).toBe('keep-me');
    expect(parsed.count).toBe(3);
    expect(lines[0]).not.toContain('example.com');
  });

  it('keeps a worker-only field name such as eventName', () => {
    new JsonLogger().warn('outbox.unmapped', { eventName: 'doctor.changed', eventId: 'e-1' });

    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(parsed.eventName).toBe('doctor.changed');
    expect(parsed.eventId).toBe('e-1');
  });

  it('writes a message that holds a path or quotes as [scrubbed]', () => {
    const logger = new JsonLogger();
    logger.error('job.failed', { job: 'mail.send', message: 'ENOENT: open C:\\tmp\\x.png' });
    logger.error('job.failed', { job: 'mail.send', message: 'Unexpected "shirin"' });

    const parsed = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(parsed.map((line) => line.message)).toEqual(['[scrubbed]', '[scrubbed]']);
    expect(parsed[0]?.job).toBe('mail.send');
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
