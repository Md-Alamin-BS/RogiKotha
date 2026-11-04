import { describe, expect, it } from 'vitest';

import { ACCOUNT_AUDIT_DETAIL_KEYS, accountAudit } from './account';
import { assertAuditDetails } from './allowlist';

const ACCOUNT_ID = '00000000-0000-7000-8000-000000000001';

describe('the audit details allowlist (ISS-108)', () => {
  // The five shapes ISS-108 found accepted by the old shallow denylist; each key is allowed here,
  // so only the recursive value checks can refuse them.
  const iss108Cases: Array<[string, Record<string, unknown>, string[]]> = [
    [
      'an email nested under an allowed key',
      { actor: { email: 'patient@example.test' } },
      ['actor'],
    ],
    [
      'free text nested under an allowed key',
      { snapshot: { body: 'the doctor said' } },
      ['snapshot', 'body'],
    ],
    ['an over-long string inside an array', { notes: ['a'.repeat(500)] }, ['notes']],
    ['an email-shaped value', { emailAddress: 'patient@example.test' }, ['emailAddress']],
    ['a free-text reason', { reason: '<free text> from a form' }, ['reason']],
  ];

  it.each(iss108Cases)('refuses %s', (_name, details, allowed) => {
    expect(() => assertAuditDetails(details as never, allowed)).toThrow(/audit details refused/);
  });

  it('refuses a key that is not on the list at any depth', () => {
    expect(() => assertAuditDetails({ fields: [{ email: true }] }, ['fields'])).toThrow(
      /fields\[0\]\.email: key not on the allowlist/,
    );
  });

  it('refuses more than four objects nested below the top and arrays longer than 32 items', () => {
    const fourBelow = { a: { a: { a: { a: { a: 1 } } } } };
    const fiveBelow = { a: fourBelow };
    expect(() => assertAuditDetails(fourBelow, ['a'])).not.toThrow();
    expect(() => assertAuditDetails(fiveBelow, ['a'])).toThrow(/nested too deep/);
    expect(() => assertAuditDetails({ a: Array.from({ length: 33 }, () => 1) }, ['a'])).toThrow(
      /array too long/,
    );
  });

  it('refuses a number that is not finite', () => {
    expect(() => assertAuditDetails({ count: Number.NaN }, ['count'])).toThrow(/finite/);
  });

  it('never repeats the refused value in its message', () => {
    let message = '';
    try {
      assertAuditDetails({ emailAddress: 'patient@example.test' }, ['emailAddress']);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toMatch(/emailAddress/);
    expect(message).not.toMatch(/patient/);
  });

  it('accepts ids, enum values, counts, booleans, null and nested lists of them', () => {
    expect(() =>
      assertAuditDetails(
        {
          id: ACCOUNT_ID,
          via: 'reset',
          revoked: 3,
          ok: true,
          none: null,
          fields: ['emailSecurity'],
        },
        ['id', 'via', 'revoked', 'ok', 'none', 'fields'],
      ),
    ).not.toThrow();
  });
});

describe('the account audit builders', () => {
  it('write every action on the account stream with only its listed keys', () => {
    const entries = [
      accountAudit.registered(ACCOUNT_ID, 'bn'),
      accountAudit.existingEmailRegister(ACCOUNT_ID),
      accountAudit.emailVerified(ACCOUNT_ID, 'reset'),
      accountAudit.signedOut(ACCOUNT_ID),
      accountAudit.signedOutEverywhere(ACCOUNT_ID, 2),
      accountAudit.passwordReset(ACCOUNT_ID),
      accountAudit.passwordChanged(ACCOUNT_ID),
      accountAudit.severeSignInActivity(ACCOUNT_ID, 10),
      accountAudit.preferencesUpdated(ACCOUNT_ID, ['interfaceLocale']),
      accountAudit.feedbackSubmitted(ACCOUNT_ID, ACCOUNT_ID),
    ];

    for (const entry of entries) {
      expect(entry.stream).toBe(`account:${ACCOUNT_ID}`);
      const allowed =
        ACCOUNT_AUDIT_DETAIL_KEYS[entry.action as keyof typeof ACCOUNT_AUDIT_DETAIL_KEYS];
      expect(Object.keys(entry.details).every((key) => allowed.includes(key))).toBe(true);
    }
    expect(entries.map((e) => e.action)).toEqual(Object.keys(ACCOUNT_AUDIT_DETAIL_KEYS));
  });

  it('records the holder as the actor of its own changes and anonymous before sign-in', () => {
    expect(accountAudit.passwordChanged(ACCOUNT_ID).actor).toBe(`account:${ACCOUNT_ID}`);
    expect(accountAudit.registered(ACCOUNT_ID, 'en').actor).toBe('anonymous');
    expect(accountAudit.signedOutEverywhere(ACCOUNT_ID, 4).details).toEqual({ revoked: 4 });
  });

  it('refuses a preference field list that carries free text', () => {
    expect(() => accountAudit.preferencesUpdated(ACCOUNT_ID, ['my new address'])).toThrow();
  });
});
