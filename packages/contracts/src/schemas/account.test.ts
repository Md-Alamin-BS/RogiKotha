import { describe, expect, it } from 'vitest';

import { parseInput } from '../parse-input';
import {
  ChangePasswordInput,
  DISPLAY_NAME_MAX,
  FEEDBACK_BODY_MAX,
  GetOwnAccountInput,
  PASSWORD_MAX,
  PASSWORD_MIN,
  RegisterInput,
  ResendOwnVerificationInput,
  ResendVerificationInput,
  ResetPasswordInput,
  SignInInput,
  SubmitFeedbackInput,
  VerifyEmailInput,
  normaliseEmail,
  passwordEqualsEmail,
} from './account';

function registerInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: 'shirin.demo@example.test',
    password: 'correct-horse-battery',
    username: 'shirin_88',
    displayName: 'Shirin Demo',
    locale: 'bn',
    ageConfirmed: true,
    termsAccepted: true,
    ...overrides,
  };
}

function signInInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { email: 'shirin.demo@example.test', password: 'correct-horse-battery', ...overrides };
}

function fieldErrorsOf(result: ReturnType<typeof parseInput>): Record<string, string> | undefined {
  return result.ok ? undefined : result.error.fieldErrors;
}

function codeOf(result: ReturnType<typeof parseInput>): string | undefined {
  return result.ok ? undefined : result.error.code;
}

describe('normaliseEmail and passwordEqualsEmail', () => {
  it('normalises an address to NFC, trimmed and lowercase', () => {
    expect(normaliseEmail('  Shirin.Demo@Example.TEST ')).toBe('shirin.demo@example.test');
    expect(normaliseEmail('Café@example.test')).toBe('café@example.test');
  });

  it('treats a password equal to the address apart from case and spaces as equal', () => {
    expect(passwordEqualsEmail(' Shirin.Demo@example.test', 'shirin.demo@example.test')).toBe(true);
    expect(passwordEqualsEmail('shirin.demo@example.tes', 'shirin.demo@example.test')).toBe(false);
  });
});

describe('RegisterInput', () => {
  it('accepts a complete registration and normalises the email', () => {
    const result = parseInput(RegisterInput, registerInput({ email: ' Shirin.Demo@Example.test' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.email).toBe('shirin.demo@example.test');
  });

  it(`accepts passwords of ${PASSWORD_MIN} and ${PASSWORD_MAX} characters`, () => {
    expect(
      parseInput(RegisterInput, registerInput({ password: 'a'.repeat(PASSWORD_MIN) })).ok,
    ).toBe(true);
    expect(
      parseInput(RegisterInput, registerInput({ password: 'a'.repeat(PASSWORD_MAX) })).ok,
    ).toBe(true);
  });

  it('refuses a 9-character password with auth.password_too_short on the password field', () => {
    const result = parseInput(
      RegisterInput,
      registerInput({ password: 'a'.repeat(PASSWORD_MIN - 1) }),
    );
    expect(codeOf(result)).toBe('auth.password_too_short');
    expect(fieldErrorsOf(result)).toEqual({ password: 'errors.auth.passwordTooShort' });
  });

  it('refuses a 257-character password with the too-long key', () => {
    const result = parseInput(
      RegisterInput,
      registerInput({ password: 'a'.repeat(PASSWORD_MAX + 1) }),
    );
    expect(codeOf(result)).toBe('validation');
    expect(fieldErrorsOf(result)).toEqual({ password: 'errors.auth.passwordTooLong' });
  });

  it('refuses a password equal to the email with auth.password_equals_email', () => {
    const result = parseInput(
      RegisterInput,
      registerInput({ password: 'Shirin.Demo@example.test' }),
    );
    expect(codeOf(result)).toBe('auth.password_equals_email');
    expect(fieldErrorsOf(result)).toEqual({ password: 'errors.auth.passwordEqualsEmail' });
  });

  it('refuses a malformed email with the email key', () => {
    const result = parseInput(RegisterInput, registerInput({ email: 'not-an-address' }));
    expect(fieldErrorsOf(result)).toEqual({ email: 'errors.auth.emailInvalid' });
  });

  it(`accepts a display name of ${DISPLAY_NAME_MAX} characters and refuses one more or only spaces`, () => {
    const atMax = parseInput(
      RegisterInput,
      registerInput({ displayName: 'ক'.repeat(DISPLAY_NAME_MAX) }),
    );
    expect(atMax.ok).toBe(true);
    const overMax = parseInput(
      RegisterInput,
      registerInput({ displayName: 'ক'.repeat(DISPLAY_NAME_MAX + 1) }),
    );
    expect(fieldErrorsOf(overMax)).toEqual({ displayName: 'errors.auth.displayNameRequired' });
    const blank = parseInput(RegisterInput, registerInput({ displayName: '   ' }));
    expect(fieldErrorsOf(blank)).toEqual({ displayName: 'errors.auth.displayNameRequired' });
  });

  it('refuses an unconfirmed age with auth.age_required and unaccepted terms with auth.terms_required', () => {
    expect(codeOf(parseInput(RegisterInput, registerInput({ ageConfirmed: false })))).toBe(
      'auth.age_required',
    );
    expect(codeOf(parseInput(RegisterInput, registerInput({ termsAccepted: false })))).toBe(
      'auth.terms_required',
    );
  });

  it('refuses an uppercase username with auth.username_invalid', () => {
    expect(codeOf(parseInput(RegisterInput, registerInput({ username: 'Shirin_88' })))).toBe(
      'auth.username_invalid',
    );
  });

  it('reports every problem at once as validation', () => {
    const result = parseInput(
      RegisterInput,
      registerInput({ password: 'short', username: 'x', ageConfirmed: false }),
    );
    expect(codeOf(result)).toBe('validation');
    expect(Object.keys(fieldErrorsOf(result) ?? {}).sort()).toEqual([
      'ageConfirmed',
      'password',
      'username',
    ]);
  });
});

describe('SignInInput', () => {
  it('accepts an email and any non-empty password, revealing no password policy', () => {
    const result = parseInput(SignInInput, signInInput({ password: 'x' }));
    expect(result.ok).toBe(true);
  });

  it('refuses an empty or over-long password with the invalid-credentials key', () => {
    expect(fieldErrorsOf(parseInput(SignInInput, signInInput({ password: '' })))).toEqual({
      password: 'errors.auth.invalidCredentials',
    });
    expect(
      fieldErrorsOf(
        parseInput(SignInInput, signInInput({ password: 'a'.repeat(PASSWORD_MAX + 1) })),
      ),
    ).toEqual({ password: 'errors.auth.invalidCredentials' });
  });

  it('is strict: an extra field such as a challenge answer is refused', () => {
    expect(parseInput(SignInInput, signInInput({ captcha: 'abc' })).ok).toBe(false);
  });
});

describe('inputs that carry no address', () => {
  it('accepts an empty object for resend-own and get-own-account and refuses an email', () => {
    expect(parseInput(ResendOwnVerificationInput, {}).ok).toBe(true);
    expect(parseInput(GetOwnAccountInput, {}).ok).toBe(true);
    expect(parseInput(ResendOwnVerificationInput, { email: 'shirin.demo@example.test' }).ok).toBe(
      false,
    );
    expect(parseInput(GetOwnAccountInput, { email: 'shirin.demo@example.test' }).ok).toBe(false);
  });
});

describe('token and password-change inputs', () => {
  it('refuses an empty verification token with the token key', () => {
    expect(fieldErrorsOf(parseInput(VerifyEmailInput, { token: '' }))).toEqual({
      token: 'errors.auth.tokenInvalid',
    });
  });

  it('checks the new password of a reset and of a change against the length rules', () => {
    const reset = parseInput(ResetPasswordInput, { token: 'tok', newPassword: 'short' });
    expect(fieldErrorsOf(reset)).toEqual({ newPassword: 'errors.auth.passwordTooShort' });
    const change = parseInput(ChangePasswordInput, {
      currentPassword: 'correct-horse-battery',
      newPassword: 'a'.repeat(PASSWORD_MAX + 1),
    });
    expect(fieldErrorsOf(change)).toEqual({ newPassword: 'errors.auth.passwordTooLong' });
  });

  it('normalises the address of a resend request', () => {
    const result = parseInput(ResendVerificationInput, { email: 'NOBODY.demo@example.test' });
    expect(result.ok && result.data.email).toBe('nobody.demo@example.test');
  });
});

describe('SubmitFeedbackInput', () => {
  it(`accepts up to ${FEEDBACK_BODY_MAX} characters and refuses one more or a blank body`, () => {
    expect(parseInput(SubmitFeedbackInput, { body: 'a'.repeat(FEEDBACK_BODY_MAX) }).ok).toBe(true);
    expect(parseInput(SubmitFeedbackInput, { body: 'a'.repeat(FEEDBACK_BODY_MAX + 1) }).ok).toBe(
      false,
    );
    expect(parseInput(SubmitFeedbackInput, { body: '  ' }).ok).toBe(false);
  });

  it('is text only: a screenshot or category field is refused (FD-097)', () => {
    expect(parseInput(SubmitFeedbackInput, { body: 'Useful', category: 'bug' }).ok).toBe(false);
  });
});
