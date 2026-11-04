// BR8.2 (closes ISS-108): audit details are checked at any depth, not only at the top level.
import type { AuditDetails } from '@rogikotha/application';
import { describe, expect, it } from 'vitest';

import { assertAllowlisted } from './audit-writer';

// The checker is a runtime guard against callers that bypass the typed builders, so these cases
// deliberately pass values the `AuditDetails` type would also accept or that only casts produce.
function check(details: unknown): () => void {
  return () => assertAllowlisted(details as AuditDetails);
}

describe('assertAllowlisted accepts what the audit builders produce', () => {
  it('accepts ids, enum values, codes, timestamps, counts, booleans and nulls, nested', () => {
    expect(
      check({
        accountId: '019a3f2e-7c1d-7b2a-9f00-1a2b3c4d5e6f',
        kind: 'passwordChanged',
        revoked: 3,
        emailVerifiedNow: false,
        previous: null,
        at: '2026-11-04T10:00:00.000Z',
        change: { from: 'pending_verification', to: 'active' },
        sessionIds: ['s_1', 's_2'],
      }),
    ).not.toThrow();
  });

  it('accepts a boolean flag under a key that names private data, but not a string', () => {
    expect(check({ emailVerified: true })).not.toThrow();
    expect(check({ emailVerified: 'yes' })).toThrow(/disallowed key/);
  });

  it('accepts an empty details object', () => {
    expect(check({})).not.toThrow();
  });
});

describe('assertAllowlisted refuses the five cases ISS-108 found accepted', () => {
  it('refuses an email nested under another key', () => {
    expect(check({ actor: { email: 'shirin.demo@example.test' } })).toThrow(/disallowed key/);
  });

  it('refuses a body nested in a snapshot', () => {
    expect(check({ snapshot: { body: 'x' } })).toThrow(/disallowed key at details\.snapshot\.body/);
  });

  it('refuses an over-long string inside an array', () => {
    expect(check({ items: ['x'.repeat(201)] })).toThrow(/exceeds 200 chars/);
  });

  it('refuses a key that only contains the word email', () => {
    expect(check({ emailAddress: 'a' })).toThrow(/disallowed key/);
  });

  it('refuses free text under an innocent key', () => {
    expect(check({ reason: 'the doctor was rude to me' })).toThrow(/not an id, code or enum value/);
  });
});

describe('assertAllowlisted refuses other private data', () => {
  it.each([
    'token',
    'resetLink',
    'user_agent',
    'ipAddress',
    'ip',
    'password',
    'fileName',
    'noteText',
  ])('refuses the key %s', (key) => {
    expect(check({ [key]: 'a' })).toThrow(/disallowed key/);
  });

  it('refuses an email-shaped value under any key', () => {
    expect(check({ target: 'shirin.demo@example.test' })).toThrow(/not an id/);
  });

  it('refuses a link-shaped value under any key', () => {
    expect(check({ target: 'http://localhost:3000/verify?token=abc' })).toThrow(/not an id/);
  });

  it('never repeats the refused value in its message', () => {
    let message = '';
    try {
      check({ target: 'shirin.demo@example.test' })();
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/^audit details: value at details\.target/);
    expect(message).not.toContain('shirin');
  });

  it('refuses values that are not JSON scalars, plain objects or arrays', () => {
    expect(check({ at: new Date(0) })).toThrow(/not a string, number, boolean or null/);
    expect(check({ count: Number.NaN })).toThrow(/not finite/);
    expect(check({ missing: undefined })).toThrow(/not a string/);
  });

  it('refuses nesting deeper than six levels', () => {
    expect(check({ a: { b: { c: { d: { e: { f: { g: 1 } } } } } } })).toThrow(/nested deeper/);
  });
});
