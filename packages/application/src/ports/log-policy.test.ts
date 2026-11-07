import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  INVALID_EVENT,
  LOG_FIELD_NAMES,
  SCRUBBED,
  logEventName,
  scrubLogFields,
  scrubLogValue,
  type LogFieldName,
} from './log-policy';
import type { LogFields } from './logger';

const ALLOWED: ReadonlySet<string> = new Set(LOG_FIELD_NAMES);

describe('LOG_FIELD_NAMES', () => {
  it('holds exactly the keys of LogFields', () => {
    expectTypeOf<LogFieldName>().toEqualTypeOf<keyof LogFields>();
    expect([...LOG_FIELD_NAMES].sort()).toEqual(
      [
        'accountId',
        'attempts',
        'command',
        'correlationId',
        'count',
        'deliveryId',
        'durationMs',
        'errorCode',
        'errorName',
        'jobId',
        'kind',
        'messageKey',
        'purpose',
        'retryAfterSec',
        'sessionId',
        'status',
        // U48 BR7.1: the evidence line's fields.
        'itemId',
        'state',
        'failReason',
        'attempt',
        'errorClass',
      ].sort(),
    );
  });

  it('cannot be changed at runtime', () => {
    expect(Object.isFrozen(LOG_FIELD_NAMES)).toBe(true);
  });
});

describe('scrubLogValue', () => {
  it.each([
    ['a UUID', '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f'],
    ['a command name', 'account.signIn'],
    ['a message key', 'errors.auth.rateLimited'],
    ['an error class name', 'TypeError'],
    ['a pg-boss policy name', 'singleton'],
    ['a recovery code', 'db.reset_required'],
  ])('keeps %s', (_name, value) => {
    expect(scrubLogValue(value)).toBe(value);
  });

  it('keeps finite numbers and booleans', () => {
    expect(scrubLogValue(42)).toBe(42);
    expect(scrubLogValue(0)).toBe(0);
    expect(scrubLogValue(true)).toBe(true);
    expect(scrubLogValue(false)).toBe(false);
  });

  it.each([
    ['an email address', 'shirin.demo@example.test'],
    ['a review sentence', 'The doctor listened and explained the plan.'],
    ['Bengali text', 'ডাক্তার মনোযোগ দিয়ে শুনেছেন'],
    ['a Windows path', 'C:\\x'],
    ['a POSIX path', '/tmp/x'],
    ['a 64-hex hash', '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'],
    ['a 40-character base64 token', 'c3ludGhldGljVG9rZW5Gb3JMb2dTY3J1YlRlc3Rz'],
    ['an English file name', 'report.png'],
    ['a Bengali file name', 'রিপোর্ট.jpg'],
    ['an upper-case file extension', 'SCAN.PDF'],
    ['a quoted error message', 'Unexpected token "x" in JSON'],
    ['an empty string', ''],
    ['a 121-character code', 'a.'.repeat(60) + 'b'],
  ])('scrubs %s', (_name, value) => {
    expect(scrubLogValue(value)).toBe(SCRUBBED);
  });

  it('scrubs objects, NaN, Infinity and other types', () => {
    expect(scrubLogValue({ email: 'shirin.demo@example.test' })).toBe(SCRUBBED);
    expect(scrubLogValue(Number.NaN)).toBe(SCRUBBED);
    expect(scrubLogValue(Number.POSITIVE_INFINITY)).toBe(SCRUBBED);
    expect(scrubLogValue(10n)).toBe(SCRUBBED);
    expect(scrubLogValue(Symbol('x'))).toBe(SCRUBBED);
    expect(scrubLogValue(() => 'x')).toBe(SCRUBBED);
  });

  it('drops undefined and null', () => {
    expect(scrubLogValue(undefined)).toBeUndefined();
    expect(scrubLogValue(null)).toBeUndefined();
  });

  it('keeps at most 20 array items and scrubs each item that is not code-shaped', () => {
    const items = Array.from({ length: 25 }, (_, index) => `job.${index}`);
    items[3] = 'shirin.demo@example.test';

    const written = scrubLogValue(items) as unknown[];

    expect(written).toHaveLength(20);
    expect(written[0]).toBe('job.0');
    expect(written[3]).toBe(SCRUBBED);
    expect(written[19]).toBe('job.19');
    expect(scrubLogValue([{ a: 1 }, null, ['x'], 7])).toEqual([SCRUBBED, SCRUBBED, SCRUBBED, 7]);
  });
});

describe('scrubLogFields', () => {
  it('drops a key that is not allowlisted, such as reporterAccountId', () => {
    const fields = {
      correlationId: 'c-1',
      reporterAccountId: '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f',
      email: 'shirin.demo@example.test',
    };

    expect(scrubLogFields(fields, ALLOWED)).toEqual({ correlationId: 'c-1' });
  });

  it('scrubs kept values and drops undefined and null ones', () => {
    const fields = {
      command: 'review.publish',
      errorCode: 'Unexpected "x"',
      accountId: undefined,
      sessionId: null,
      count: 3,
    };

    expect(scrubLogFields(fields, ALLOWED)).toEqual({
      command: 'review.publish',
      errorCode: SCRUBBED,
      count: 3,
    });
  });

  it('returns an empty object for no fields', () => {
    expect(scrubLogFields(undefined, ALLOWED)).toEqual({});
  });
});

describe('logEventName', () => {
  it.each(['account.signIn', 'worker.crashed', 'i18n.message_error', 'a', 'job.failed.retry'])(
    'keeps the event %s',
    (event) => {
      expect(logEventName(event)).toBe(event);
    },
  );

  it.each([
    ['data interpolated into it', 'Signed in shirin.demo@example.test'],
    ['a leading digit', '1.started'],
    ['more than five segments', 'a.b.c.d.e.f'],
    ['an empty segment', 'a..b'],
    ['a hyphen', 'review-published'],
    ['more than 80 characters', `a${'b'.repeat(80)}`],
    ['an empty string', ''],
  ])('replaces an event with %s', (_name, event) => {
    expect(logEventName(event)).toBe(INVALID_EVENT);
  });

  it('replaces an event that is not a string', () => {
    expect(logEventName(42)).toBe(INVALID_EVENT);
    expect(logEventName(undefined)).toBe(INVALID_EVENT);
  });
});
