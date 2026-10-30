// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { parseRegistration, parseSignIn, safeNextPath } from './auth-form';

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
      ['email', 'formErrors.auth.emailInvalid'],
      ['password', 'errors.auth.passwordTooShort'],
      ['username', 'errors.auth.usernameInvalid'],
      ['displayName', 'formErrors.auth.displayNameInvalid'],
      ['age', 'errors.auth.ageRequired'],
      ['terms', 'errors.auth.termsRequired'],
    ]);
  });

  it('refuses an unticked age or terms box even when every text field is valid', () => {
    const parsed = parseRegistration(registerForm({ terms: null }), 'en');
    expect(parsed).toEqual({
      ok: false,
      state: { fieldErrors: { terms: 'errors.auth.termsRequired' }, formError: null },
    });
  });

  it('refuses a display name over 60 characters and a password over 128', () => {
    const parsed = parseRegistration(
      registerForm({ displayName: 'n'.repeat(61), password: 'p'.repeat(129) }),
      'en',
    );
    expect(parsed.ok || parsed.state.fieldErrors).toEqual({
      password: 'formErrors.auth.passwordTooLong',
      displayName: 'formErrors.auth.displayNameInvalid',
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
      state: { fieldErrors: {}, formError: 'errors.auth.invalidCredentials' },
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
