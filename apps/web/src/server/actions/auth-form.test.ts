// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  parseChangePassword,
  parseEmailOnly,
  parseRegistration,
  parseSetPassword,
  parseSignIn,
  rateLimitMessage,
  readPendingCookie,
  safeAuthNext,
  safeNextPath,
  serialisePendingCookie,
} from './auth-form';

function formOf(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  return form;
}

function registerForm(overrides: Record<string, string | null> = {}): FormData {
  const values: Record<string, string | null> = {
    email: 'new.reader@example.test',
    password: 'a long enough secret',
    username: 'new_reader',
    displayName: 'Nadia Islam',
    locale: 'bn',
    age: 'on',
    terms: 'on',
    ...overrides,
  };
  const form = new FormData();
  for (const [name, value] of Object.entries(values)) {
    if (value !== null) form.set(name, value);
  }
  return form;
}

describe('the register form', () => {
  it('accepts a complete registration in the chosen language', () => {
    expect(parseRegistration(registerForm(), 'en')).toEqual({
      ok: true,
      data: {
        email: 'new.reader@example.test',
        password: 'a long enough secret',
        username: 'new_reader',
        displayName: 'Nadia Islam',
        locale: 'bn',
        ageConfirmed: true,
        termsAccepted: true,
      },
    });
  });

  it('lowercases and trims the username and trims the email and display name', () => {
    const parsed = parseRegistration(
      registerForm({ username: '  New_Reader ', email: ' a@example.test ', displayName: ' N ' }),
      'en',
    );
    expect(parsed.ok && parsed.data).toMatchObject({
      username: 'new_reader',
      email: 'a@example.test',
      displayName: 'N',
    });
  });

  it('falls back to the active language when the form sends none or an unknown one', () => {
    const missing = parseRegistration(registerForm({ locale: null }), 'en');
    const unknown = parseRegistration(registerForm({ locale: 'fr' }), 'bn');
    expect(missing.ok && missing.data.locale).toBe('en');
    expect(unknown.ok && unknown.data.locale).toBe('bn');
  });

  it('names every wrong field with its message key, in the order of the form', () => {
    const parsed = parseRegistration(
      registerForm({
        email: 'not-an-email',
        password: 'short',
        username: 'x',
        displayName: '',
        age: null,
        terms: null,
      }),
      'en',
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.state.formError).toBeNull();
    expect(Object.entries(parsed.state.fieldErrors)).toEqual([
      ['email', { key: 'formErrors.auth.emailInvalid' }],
      ['password', { key: 'errors.auth.passwordTooShort' }],
      ['username', { key: 'errors.auth.usernameInvalid' }],
      ['displayName', { key: 'formErrors.auth.displayNameInvalid' }],
      ['age', { key: 'errors.auth.ageRequired' }],
      ['terms', { key: 'errors.auth.termsRequired' }],
    ]);
  });

  it('refuses an unticked age or terms box even when every text field is valid', () => {
    const parsed = parseRegistration(registerForm({ terms: null }), 'en');
    expect(parsed).toEqual({
      ok: false,
      state: {
        status: 'refused',
        fieldErrors: { terms: { key: 'errors.auth.termsRequired' } },
        formError: null,
      },
    });
  });

  it('refuses a display name over 60 characters and a password over 256', () => {
    const parsed = parseRegistration(
      registerForm({ displayName: 'n'.repeat(61), password: 'p'.repeat(257) }),
      'en',
    );
    expect(parsed.ok || parsed.state.fieldErrors).toEqual({
      password: { key: 'errors.auth.passwordTooLong' },
      displayName: { key: 'formErrors.auth.displayNameInvalid' },
    });
  });

  it('accepts a password of exactly 256 characters, the account.register maximum', () => {
    expect(parseRegistration(registerForm({ password: 'p'.repeat(256) }), 'en').ok).toBe(true);
  });

  it('refuses a password that is the email address, whatever its case', () => {
    const parsed = parseRegistration(
      registerForm({ email: 'new.reader@example.test', password: ' New.Reader@Example.test ' }),
      'en',
    );
    expect(parsed.ok || parsed.state.fieldErrors).toEqual({
      password: { key: 'errors.auth.passwordEqualsEmail' },
    });
  });

  it('never returns what was typed, so no email or password travels back to the page', () => {
    const parsed = parseRegistration(registerForm({ username: 'x' }), 'en');
    expect(JSON.stringify(parsed)).not.toMatch(/new\.reader@example\.test|a long enough secret/);
  });
});

describe('the sign-in form', () => {
  function signInForm(email: string, password: string) {
    const form = new FormData();
    form.set('email', email);
    form.set('password', password);
    return form;
  }

  it('passes a well-formed email and password on', () => {
    expect(parseSignIn(signInForm(' abba@example.test ', 'demo-pass-2026!'))).toEqual({
      ok: true,
      data: { email: 'abba@example.test', password: 'demo-pass-2026!' },
    });
  });

  it('gives a malformed email the same neutral refusal as a wrong password', () => {
    expect(parseSignIn(signInForm('nobody', 'demo-pass-2026!'))).toEqual({
      ok: false,
      state: {
        status: 'refused',
        fieldErrors: {},
        formError: { key: 'errors.auth.invalidCredentials' },
      },
    });
  });
});

describe('the page to return to after signing in', () => {
  it.each(['/bn/write', '/en/doctors/doc-1?tab=reviews', '/en/experiences/x#comments'])(
    'keeps the same-site path %s',
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    'https://evil.example/',
    '//evil.example/',
    '/\\evil.example',
    'javascript:alert(1)',
    'en/write',
    '/en/write\n',
    '',
    `/${'a'.repeat(600)}`,
  ])('refuses %j', (path) => {
    expect(safeNextPath(path)).toBeNull();
  });

  it('refuses anything that is not a single string', () => {
    expect(safeNextPath(['/en/write'])).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});

describe('a return target after an auth step (BR1.5)', () => {
  it.each([
    '/sign-in',
    '/admin',
    '/en/Admin',
    '/en/%61dmin',
    '/bn/SIGN-IN',
    '/en/register?next=/en/me',
    '/bn/verify-email',
    '/en/reset-password',
    '/en/api/health',
    '/en/%2561dmin',
    '/en/%E0%A4%A',
    '/fr/write',
    '//x',
    'https://evil.example',
  ])('refuses %j', (target) => {
    expect(safeAuthNext(target)).toBeNull();
  });

  it.each(['/en/experiences/abc', '/bn/write', '/en', '/en/doctors/d-1?tab=reviews#top'])(
    'keeps %j as it was written',
    (target) => {
      expect(safeAuthNext(target)).toBe(target);
    },
  );
});

describe('the pending-email cookie (BR2.2)', () => {
  it('reads back the address and the return target that register wrote', () => {
    const value = serialisePendingCookie({ email: 'nadia@example.test', next: '/en/write' });
    expect(readPendingCookie(value)).toEqual({ email: 'nadia@example.test', next: '/en/write' });
  });

  it('counts a value that is not JSON as no cookie', () => {
    expect(readPendingCookie('{not json')).toBeNull();
    expect(readPendingCookie('"just a string"')).toBeNull();
    expect(readPendingCookie(undefined)).toBeNull();
  });

  it('counts a cookie with an address the account schema refuses as no cookie', () => {
    expect(readPendingCookie(JSON.stringify({ email: 'not-an-address', next: '/en/me' }))).toBe(
      null,
    );
  });

  it('keeps the address but drops a return target that is not safe', () => {
    expect(
      readPendingCookie(JSON.stringify({ email: 'Nadia@Example.test', next: '/en/admin' })),
    ).toEqual({ email: 'nadia@example.test', next: null });
  });
});

describe('the rate-limit message (BR4.2)', () => {
  it.each([
    [1, { key: 'formErrors.auth.rateLimitedSeconds', params: { count: 1, seconds: 1 } }],
    [59, { key: 'formErrors.auth.rateLimitedSeconds', params: { count: 59, seconds: 59 } }],
    [60, { key: 'errors.auth.rateLimited', params: { count: 1, minutes: 1 } }],
    [61, { key: 'errors.auth.rateLimited', params: { count: 2, minutes: 2 } }],
  ])('names a wait of %i seconds in the right unit', (seconds, expected) => {
    expect(rateLimitMessage(seconds)).toEqual(expected);
  });

  it('falls back to the unit-free message when no wait is known', () => {
    expect(rateLimitMessage(undefined)).toEqual({ key: 'formErrors.auth.rateLimited' });
    expect(rateLimitMessage(0)).toEqual({ key: 'formErrors.auth.rateLimited' });
  });
});

describe('the one-address forms (resend, reset request)', () => {
  it('normalises a valid address', () => {
    expect(parseEmailOnly(formOf({ email: ' Rafi@Example.test ' }))).toEqual({
      ok: true,
      data: { email: 'rafi@example.test' },
    });
  });

  it('refuses a malformed address on its field without echoing it', () => {
    const parsed = parseEmailOnly(formOf({ email: 'rafi-at-example' }));
    expect(parsed).toEqual({
      ok: false,
      state: {
        status: 'refused',
        formError: null,
        fieldErrors: { email: { key: 'errors.auth.emailInvalid' } },
      },
    });
    expect(JSON.stringify(parsed)).not.toContain('rafi-at-example');
  });
});

describe('the set-new-password form (BR5.2)', () => {
  const NEW = 'a brand new secret 2026';

  it('passes the token and the new password on when both fields match', () => {
    expect(
      parseSetPassword(formOf({ token: 'tok-1', newPassword: NEW, confirmPassword: NEW })),
    ).toEqual({ ok: true, data: { token: 'tok-1', newPassword: NEW } });
  });

  it('refuses two different passwords on the confirm field', () => {
    const parsed = parseSetPassword(
      formOf({ token: 'tok-1', newPassword: NEW, confirmPassword: `${NEW}!` }),
    );
    expect(parsed.ok || parsed.state.fieldErrors).toEqual({
      confirmPassword: { key: 'auth.reset.mismatch' },
    });
    expect(JSON.stringify(parsed)).not.toContain(NEW);
  });

  it('names a password that is too short on the new-password field', () => {
    const parsed = parseSetPassword(
      formOf({ token: 'tok-1', newPassword: 'short', confirmPassword: 'short' }),
    );
    expect(parsed.ok || parsed.state.fieldErrors).toEqual({
      newPassword: { key: 'errors.auth.passwordTooShort' },
    });
  });

  it('reads a missing token as an expired link', () => {
    const parsed = parseSetPassword(formOf({ newPassword: NEW, confirmPassword: NEW }));
    expect(parsed.ok || parsed.state).toEqual({
      status: 'refused',
      formError: { key: 'errors.auth.tokenExpired' },
      fieldErrors: {},
      expired: true,
    });
  });
});

describe('the change-password form (BR6.5)', () => {
  it('passes the current and the new password on', () => {
    expect(
      parseChangePassword(
        formOf({ currentPassword: 'the old secret', newPassword: 'a new long secret' }),
      ),
    ).toEqual({
      ok: true,
      data: { currentPassword: 'the old secret', newPassword: 'a new long secret' },
    });
  });

  it('refuses an empty current password and a short new one, each on its field', () => {
    const parsed = parseChangePassword(formOf({ currentPassword: '', newPassword: 'short' }));
    expect(parsed.ok || parsed.state.fieldErrors).toEqual({
      currentPassword: { key: 'errors.auth.invalidCredentials' },
      newPassword: { key: 'errors.auth.passwordTooShort' },
    });
    expect(JSON.stringify(parsed)).not.toContain('short');
  });
});
