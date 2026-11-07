// @vitest-environment node
// The patient auth forms on T-101's commands (T-102): the commands themselves are tested in
// `@rogikotha/application`; here only the mapping of form fields, results and cookies is tested.
import type { Command, SessionCookieEffect } from '@rogikotha/application';
import type { AppError, ErrorCode, Locale, Result } from '@rogikotha/contracts';
import { redirect as redirectInLocale } from '@/i18n/routing';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applySessionEffect, runCommand } from '../command-call';
import { getContainer } from '../container';
import {
  changePasswordForm,
  confirmEmail,
  register,
  requestReset,
  resendLink,
  resendOwnLink,
  setNewPassword,
  signIn,
  signOut,
  signOutEverywhereForm,
} from './auth';
import { INITIAL_AUTH_STATE, PENDING_EMAIL_COOKIE } from './auth-form';

interface CookieWrite {
  value: string;
  options: Record<string, unknown>;
}

const jar = vi.hoisted(() => ({
  values: new Map<string, string>(),
  writes: [] as { name: string; value: string; options: Record<string, unknown> }[],
  deleted: [] as string[],
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => {
        const value = jar.values.get(name);
        return value === undefined ? undefined : { name, value };
      },
      set: (name: string, value: string, options: Record<string, unknown>) => {
        jar.writes.push({ name, value, options });
        jar.values.set(name, value);
      },
      delete: (name: string) => {
        jar.deleted.push(name);
        jar.values.delete(name);
      },
    }),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(() => Promise.resolve('en')) }));
vi.mock('@/i18n/routing', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('../command-call', () => ({ runCommand: vi.fn(), applySessionEffect: vi.fn() }));
vi.mock('../container', () => ({ getContainer: vi.fn() }));

const EMAIL = 'nadia.islam@example.test';
const PASSWORD = 'a long enough secret';
const NEW_PASSWORD = 'a brand new secret 2026';
const SESSION: SessionCookieEffect = { kind: 'set', setCookies: ['rk.session_token=t; Path=/'] };
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

type Outcomes = Record<string, Result<unknown>>;

function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

function refused(code: ErrorCode, extra: Partial<AppError> = {}): Result<never> {
  const error: AppError = { code, messageKey: `errors.${code}`, correlationId: 'corr-1', ...extra };
  return { ok: false, error };
}

/** Answers each command by its name; a command with no outcome fails the test loudly. */
function commandsAnswer(outcomes: Outcomes): void {
  vi.mocked(runCommand).mockImplementation((command: Command<unknown, unknown>) => {
    const outcome = outcomes[command.name];
    if (!outcome) throw new Error(`unexpected command ${command.name}`);
    return Promise.resolve(outcome as Result<never>);
  });
}

function calledCommands(): string[] {
  return vi.mocked(runCommand).mock.calls.map(([command]) => command.name);
}

function containerWith(locale: Locale | null, appUrl = 'http://localhost:3000'): void {
  const accounts = {
    findByEmail: vi.fn(() => Promise.resolve(locale ? { accountId: 'account-1' } : null)),
    findProfileById: vi.fn(() => Promise.resolve(locale ? { locale } : null)),
  };
  vi.mocked(getContainer).mockReturnValue({
    env: { appUrl },
    ports: { accounts, logger, unitOfWork: { read: (work: (tx: unknown) => unknown) => work({}) } },
  } as unknown as ReturnType<typeof getContainer>);
}

function formOf(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  return form;
}

function registerForm(overrides: Record<string, string> = {}): FormData {
  return formOf({
    email: EMAIL,
    password: PASSWORD,
    username: 'nadia_i',
    displayName: 'Nadia Islam',
    locale: 'bn',
    age: 'on',
    terms: 'on',
    ...overrides,
  });
}

function signInForm(extra: Record<string, string> = {}): FormData {
  return formOf({ email: EMAIL, password: PASSWORD, ...extra });
}

function pendingWrite(): CookieWrite | undefined {
  const write = jar.writes.find((entry) => entry.name === PENDING_EMAIL_COOKIE);
  return write && { value: write.value, options: write.options };
}

beforeEach(() => {
  vi.clearAllMocks();
  jar.values.clear();
  jar.writes.length = 0;
  jar.deleted.length = 0;
  containerWith('bn');
  commandsAnswer({
    'account.register': ok({ accountId: 'account-1' }),
    'account.signIn': ok({ session: SESSION }),
    'account.signOut': ok({ session: { kind: 'clear' } }),
    'account.verifyEmail': ok({ session: SESSION }),
    'account.resendVerification': ok({}),
    'account.resendOwnVerification': ok({}),
    'account.requestPasswordReset': ok({}),
    'account.resetPassword': ok({ session: { kind: 'clear' } }),
    'account.changePassword': ok({ session: SESSION }),
    'account.signOutEverywhere': ok({ revoked: 2, session: { kind: 'clear' } }),
  });
});

describe('registering', () => {
  it('registers, keeps the typed address in rk.pending and goes to the pending screen in the chosen language', async () => {
    await expect(register(INITIAL_AUTH_STATE, registerForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(calledCommands()).toEqual(['account.register']);
    expect(vi.mocked(runCommand).mock.calls[0]?.[1]).toEqual({
      email: EMAIL,
      password: PASSWORD,
      username: 'nadia_i',
      displayName: 'Nadia Islam',
      locale: 'bn',
      ageConfirmed: true,
      termsAccepted: true,
    });
    expect(applySessionEffect).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/bn/verify-email');
    expect(pendingWrite()).toEqual({
      value: JSON.stringify({ email: EMAIL }),
      options: { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 1800 },
    });
  });

  it('marks the cookie Secure when the site runs on https', async () => {
    containerWith('bn', 'https://rogikotha.example');
    await expect(register(INITIAL_AUTH_STATE, registerForm())).rejects.toThrow('NEXT_REDIRECT');
    expect(pendingWrite()?.options).toMatchObject({ secure: true });
  });

  it('carries a safe page to return to into the cookie and the redirect', async () => {
    await expect(register(INITIAL_AUTH_STATE, registerForm({ next: '/bn/write' }))).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(redirect).toHaveBeenCalledWith('/bn/verify-email?next=%2Fbn%2Fwrite');
    expect(pendingWrite()?.value).toBe(JSON.stringify({ email: EMAIL, next: '/bn/write' }));
  });

  it.each(['//evil.example/me', '/en/admin', '/sign-in'])(
    'drops the unsafe return target %s',
    async (next) => {
      await expect(register(INITIAL_AUTH_STATE, registerForm({ next }))).rejects.toThrow(
        'NEXT_REDIRECT',
      );
      expect(redirect).toHaveBeenCalledWith('/bn/verify-email');
      expect(pendingWrite()?.value).toBe(JSON.stringify({ email: EMAIL }));
    },
  );

  it('gives a new and an already-registered address the same cookie and redirect, and never signs in', async () => {
    commandsAnswer({ 'account.register': ok({ accountId: 'fresh-1' }) });
    await expect(register(INITIAL_AUTH_STATE, registerForm())).rejects.toThrow('NEXT_REDIRECT');
    const first = { write: pendingWrite(), target: vi.mocked(redirect).mock.calls[0] };

    jar.writes.length = 0;
    vi.mocked(redirect).mockClear();
    commandsAnswer({ 'account.register': ok({ accountId: 'never-persisted' }) });
    await expect(register(INITIAL_AUTH_STATE, registerForm())).rejects.toThrow('NEXT_REDIRECT');

    expect({ write: pendingWrite(), target: vi.mocked(redirect).mock.calls[0] }).toEqual(first);
    expect(calledCommands()).not.toContain('account.signIn');
    expect(applySessionEffect).not.toHaveBeenCalled();
  });

  it('shows field errors, sets no cookie and runs no command when the form is incomplete', async () => {
    const state = await register(INITIAL_AUTH_STATE, registerForm({ password: 'short' }));

    expect(state).toEqual({
      status: 'refused',
      fieldErrors: { password: { key: 'errors.auth.passwordTooShort' } },
      formError: null,
    });
    expect(runCommand).not.toHaveBeenCalled();
    expect(pendingWrite()).toBeUndefined();
  });

  it('names a taken username on its field', async () => {
    commandsAnswer({ 'account.register': refused('auth.username_taken') });

    await expect(register(INITIAL_AUTH_STATE, registerForm())).resolves.toEqual({
      status: 'refused',
      fieldErrors: { username: { key: 'errors.auth.usernameTaken' } },
      formError: null,
    });
    expect(pendingWrite()).toBeUndefined();
  });

  it('names the wait of a rate limit in minutes', async () => {
    commandsAnswer({ 'account.register': refused('auth.rate_limited', { retryAfterSec: 600 }) });

    await expect(register(INITIAL_AUTH_STATE, registerForm())).resolves.toEqual({
      status: 'refused',
      fieldErrors: {},
      formError: { key: 'errors.auth.rateLimited', params: { count: 10, minutes: 10 } },
    });
  });

  it('maps a field the command refused back onto the form field', async () => {
    commandsAnswer({
      'account.register': refused('validation', { fieldErrors: { ageConfirmed: 'x' } }),
    });

    await expect(register(INITIAL_AUTH_STATE, registerForm())).resolves.toEqual({
      status: 'refused',
      fieldErrors: { age: { key: 'errors.auth.ageRequired' } },
      formError: null,
    });
  });

  it('shows the internal error when the command fails unexpectedly', async () => {
    commandsAnswer({ 'account.register': refused('internal') });

    await expect(register(INITIAL_AUTH_STATE, registerForm())).resolves.toEqual({
      status: 'refused',
      fieldErrors: {},
      formError: { key: 'errors.common.internal' },
    });
  });

  it('never returns what was typed', async () => {
    commandsAnswer({ 'account.register': refused('auth.username_taken') });
    const state = await register(INITIAL_AUTH_STATE, registerForm());
    expect(JSON.stringify(state)).not.toMatch(/nadia|a long enough secret/i);
  });
});

describe('signing in', () => {
  it('signs in, clears rk.pending and opens /me in the account’s language', async () => {
    jar.values.set(PENDING_EMAIL_COOKIE, JSON.stringify({ email: EMAIL }));

    await expect(signIn(INITIAL_AUTH_STATE, signInForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(calledCommands()).toEqual(['account.signIn']);
    expect(applySessionEffect).toHaveBeenCalledWith(SESSION);
    expect(jar.deleted).toContain(PENDING_EMAIL_COOKIE);
    expect(redirectInLocale).toHaveBeenCalledWith({ href: '/me', locale: 'bn' });
  });

  it('falls back to the active language when the account has no profile language', async () => {
    containerWith(null);

    await expect(signIn(INITIAL_AUTH_STATE, signInForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectInLocale).toHaveBeenCalledWith({ href: '/me', locale: 'en' });
  });

  it('returns to a safe page but ignores another site, an auth page and staff routes', async () => {
    await expect(signIn(INITIAL_AUTH_STATE, signInForm({ next: '/en/write' }))).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith('/en/write');

    for (const next of ['https://evil.example/', '/en/sign-in', '/en/%61dmin']) {
      vi.mocked(redirect).mockClear();
      await expect(signIn(INITIAL_AUTH_STATE, signInForm({ next }))).rejects.toThrow();
      expect(redirect).not.toHaveBeenCalled();
      expect(redirectInLocale).toHaveBeenLastCalledWith({ href: '/me', locale: 'bn' });
    }
  });

  it.each([
    ['auth.invalid_credentials', { key: 'errors.auth.invalidCredentials' }],
    ['validation', { key: 'errors.auth.invalidCredentials' }],
    ['auth.account_suspended', { key: 'errors.auth.accountSuspended' }],
    ['internal', { key: 'errors.common.internal' }],
  ] as const)('answers %s with its message and sets no cookie', async (code, formError) => {
    commandsAnswer({ 'account.signIn': refused(code) });

    await expect(signIn(INITIAL_AUTH_STATE, signInForm())).resolves.toEqual({
      status: 'refused',
      fieldErrors: {},
      formError,
    });
    expect(applySessionEffect).not.toHaveBeenCalled();
  });

  it('names the wait of the progressive delay in seconds', async () => {
    commandsAnswer({ 'account.signIn': refused('auth.rate_limited', { retryAfterSec: 5 }) });

    await expect(signIn(INITIAL_AUTH_STATE, signInForm())).resolves.toMatchObject({
      formError: { key: 'formErrors.auth.rateLimitedSeconds', params: { count: 5, seconds: 5 } },
    });
  });

  it('gives a malformed email the neutral refusal without running the command', async () => {
    await expect(signIn(INITIAL_AUTH_STATE, signInForm({ email: 'nobody' }))).resolves.toEqual({
      status: 'refused',
      fieldErrors: {},
      formError: { key: 'errors.auth.invalidCredentials' },
    });
    expect(runCommand).not.toHaveBeenCalled();
  });
});

describe('signing out', () => {
  it('ends the session, clears the cookies and goes home', async () => {
    await expect(signOut()).rejects.toThrow('NEXT_REDIRECT');

    expect(calledCommands()).toEqual(['account.signOut']);
    expect(applySessionEffect).toHaveBeenCalledWith({ kind: 'clear' });
    expect(jar.deleted).toContain(PENDING_EMAIL_COOKIE);
    expect(redirectInLocale).toHaveBeenCalledWith({ href: '/', locale: 'en' });
  });

  it('still clears the cookie when there was no session to end', async () => {
    commandsAnswer({ 'account.signOut': refused('forbidden') });

    await expect(signOut()).rejects.toThrow('NEXT_REDIRECT');

    expect(applySessionEffect).toHaveBeenCalledWith({ kind: 'clear' });
  });
});

describe('confirming the email', () => {
  const tokenForm = () => formOf({ token: 'tok-1' });

  it('confirms by POST, applies the session, clears rk.pending and lands on the done panel with next', async () => {
    jar.values.set(PENDING_EMAIL_COOKIE, JSON.stringify({ email: EMAIL, next: '/en/write' }));

    await expect(confirmEmail(INITIAL_AUTH_STATE, tokenForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(vi.mocked(runCommand).mock.calls[0]?.[1]).toEqual({ token: 'tok-1' });
    expect(applySessionEffect).toHaveBeenCalledWith(SESSION);
    expect(jar.deleted).toContain(PENDING_EMAIL_COOKIE);
    expect(redirect).toHaveBeenCalledWith('/en/verify-email?confirmed=1&next=%2Fen%2Fwrite');
  });

  it('lands on the done panel without next in a browser that has no rk.pending', async () => {
    await expect(confirmEmail(INITIAL_AUTH_STATE, tokenForm())).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/en/verify-email?confirmed=1');
  });

  it.each(['auth.token_expired', 'auth.token_invalid', 'validation'] as const)(
    'answers %s with the one expired panel and no cookie',
    async (code) => {
      commandsAnswer({ 'account.verifyEmail': refused(code) });

      await expect(confirmEmail(INITIAL_AUTH_STATE, tokenForm())).resolves.toEqual({
        status: 'refused',
        fieldErrors: {},
        formError: { key: 'errors.auth.tokenExpired' },
        expired: true,
      });
      expect(applySessionEffect).not.toHaveBeenCalled();
      expect(jar.deleted).toEqual([]);
    },
  );

  it('shows the internal error when confirming fails unexpectedly', async () => {
    commandsAnswer({ 'account.verifyEmail': refused('internal') });
    await expect(confirmEmail(INITIAL_AUTH_STATE, tokenForm())).resolves.toMatchObject({
      formError: { key: 'errors.common.internal' },
    });
  });
});

describe('resending the link while signed out (BR2.4)', () => {
  it.each([
    ['sent', ok({})],
    ['refused for any other reason', refused('forbidden')],
  ])('answers the same when the command is %s', async (_label, outcome) => {
    commandsAnswer({ 'account.resendVerification': outcome });

    await expect(resendLink(INITIAL_AUTH_STATE, formOf({ email: EMAIL }))).resolves.toEqual({
      status: 'done',
      formError: null,
      fieldErrors: {},
      notice: { key: 'auth.verify.resent' },
    });
  });

  it('logs an internal error with its code and correlation id only, and still answers sent', async () => {
    commandsAnswer({ 'account.resendVerification': refused('internal') });

    await expect(resendLink(INITIAL_AUTH_STATE, formOf({ email: EMAIL }))).resolves.toMatchObject({
      notice: { key: 'auth.verify.resent' },
    });
    expect(logger.error).toHaveBeenCalledWith('auth.form_internal', {
      command: 'account.resendVerification',
      errorCode: 'internal',
      correlationId: 'corr-1',
    });
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(EMAIL);
  });

  it('names a rate limit and refuses a malformed address on its field', async () => {
    commandsAnswer({
      'account.resendVerification': refused('auth.rate_limited', { retryAfterSec: 120 }),
    });
    await expect(resendLink(INITIAL_AUTH_STATE, formOf({ email: EMAIL }))).resolves.toMatchObject({
      formError: { key: 'errors.auth.rateLimited', params: { count: 2, minutes: 2 } },
    });

    await expect(resendLink(INITIAL_AUTH_STATE, formOf({ email: 'nope' }))).resolves.toMatchObject({
      fieldErrors: { email: { key: 'errors.auth.emailInvalid' } },
    });
  });
});

describe('resending the link while signed in (BR2.5)', () => {
  it('resends with no address and answers sent', async () => {
    await expect(resendOwnLink()).resolves.toMatchObject({
      status: 'done',
      notice: { key: 'auth.verify.resent' },
    });
    expect(vi.mocked(runCommand).mock.calls[0]?.[1]).toEqual({});
  });

  it('names a rate limit and shows the internal error otherwise', async () => {
    commandsAnswer({
      'account.resendOwnVerification': refused('auth.rate_limited', { retryAfterSec: 30 }),
    });
    await expect(resendOwnLink()).resolves.toMatchObject({
      formError: { key: 'formErrors.auth.rateLimitedSeconds', params: { count: 30, seconds: 30 } },
    });

    commandsAnswer({ 'account.resendOwnVerification': refused('internal') });
    await expect(resendOwnLink()).resolves.toMatchObject({
      formError: { key: 'errors.common.internal' },
    });
  });
});

describe('asking for a reset link (BR5.1)', () => {
  it.each([
    ['ok', ok({})],
    ['internal', refused('internal')],
  ])('answers sent when the command returns %s', async (_label, outcome) => {
    commandsAnswer({ 'account.requestPasswordReset': outcome });

    await expect(requestReset(INITIAL_AUTH_STATE, formOf({ email: EMAIL }))).resolves.toEqual({
      status: 'done',
      formError: null,
      fieldErrors: {},
      notice: { key: 'auth.reset.sent' },
    });
  });

  it('names a rate limit', async () => {
    commandsAnswer({
      'account.requestPasswordReset': refused('auth.rate_limited', { retryAfterSec: 900 }),
    });
    await expect(requestReset(INITIAL_AUTH_STATE, formOf({ email: EMAIL }))).resolves.toMatchObject(
      { formError: { key: 'errors.auth.rateLimited', params: { count: 15, minutes: 15 } } },
    );
  });
});

describe('setting a new password (BR5.2, BR5.3)', () => {
  const resetForm = (confirm = NEW_PASSWORD) =>
    formOf({ token: 'tok-r', newPassword: NEW_PASSWORD, confirmPassword: confirm });

  it('resets, clears every session and goes to sign in with the done notice', async () => {
    await expect(setNewPassword(INITIAL_AUTH_STATE, resetForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(vi.mocked(runCommand).mock.calls[0]?.[1]).toEqual({
      token: 'tok-r',
      newPassword: NEW_PASSWORD,
    });
    expect(applySessionEffect).toHaveBeenCalledWith({ kind: 'clear' });
    expect(redirectInLocale).toHaveBeenCalledWith({
      href: { pathname: '/sign-in', query: { reset: 'done' } },
      locale: 'en',
    });
  });

  it('runs no command when the two passwords differ', async () => {
    await expect(
      setNewPassword(INITIAL_AUTH_STATE, resetForm('different secret 99')),
    ).resolves.toMatchObject({ fieldErrors: { confirmPassword: { key: 'auth.reset.mismatch' } } });
    expect(runCommand).not.toHaveBeenCalled();
  });

  it.each(['auth.token_expired', 'auth.token_invalid'] as const)(
    'refuses a %s link and changes nothing',
    async (code) => {
      commandsAnswer({ 'account.resetPassword': refused(code) });

      await expect(setNewPassword(INITIAL_AUTH_STATE, resetForm())).resolves.toEqual({
        status: 'refused',
        fieldErrors: {},
        formError: { key: 'errors.auth.tokenExpired' },
        expired: true,
      });
      expect(applySessionEffect).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      refused('auth.password_equals_email'),
      { newPassword: { key: 'errors.auth.passwordEqualsEmail' } },
    ],
    [
      refused('validation', { fieldErrors: { newPassword: 'errors.auth.passwordTooLong' } }),
      { newPassword: { key: 'errors.auth.passwordTooLong' } },
    ],
  ])('names a refused new password on its field', async (outcome, fieldErrors) => {
    commandsAnswer({ 'account.resetPassword': outcome });
    await expect(setNewPassword(INITIAL_AUTH_STATE, resetForm())).resolves.toMatchObject({
      fieldErrors,
    });
  });

  it('shows the internal error for anything else', async () => {
    commandsAnswer({ 'account.resetPassword': refused('internal') });
    await expect(setNewPassword(INITIAL_AUTH_STATE, resetForm())).resolves.toMatchObject({
      formError: { key: 'errors.common.internal' },
    });
  });
});

describe('changing the password (BR6.5)', () => {
  const changeForm = () => formOf({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });

  it.each(['en', 'bn'] as const)(
    'applies the rotated session, then redirects to the %s security page with changed=1 (ISS-778)',
    async (locale) => {
      vi.mocked(getLocale).mockResolvedValueOnce(locale);

      await expect(changePasswordForm(INITIAL_AUTH_STATE, changeForm())).rejects.toThrow(
        'NEXT_REDIRECT',
      );

      expect(applySessionEffect).toHaveBeenCalledWith(SESSION);
      expect(vi.mocked(applySessionEffect).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(redirectInLocale).mock.invocationCallOrder[0] ?? 0,
      );
      expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
      expect(redirectInLocale).toHaveBeenCalledWith({
        href: { pathname: '/me/security', query: { changed: '1' } },
        locale,
      });
      expect(redirect).not.toHaveBeenCalled();
    },
  );

  it('names a wrong current password on its field and keeps no password in the state', async () => {
    commandsAnswer({ 'account.changePassword': refused('auth.invalid_credentials') });

    const state = await changePasswordForm(INITIAL_AUTH_STATE, changeForm());

    expect(state).toEqual({
      status: 'refused',
      formError: null,
      fieldErrors: { currentPassword: { key: 'errors.auth.invalidCredentials' } },
    });
    expect(JSON.stringify(state)).not.toMatch(/secret/);
    expect(applySessionEffect).not.toHaveBeenCalled();
    expect(redirectInLocale).not.toHaveBeenCalled();
  });

  it.each([
    [
      refused('auth.rate_limited', { retryAfterSec: 61 }),
      { formError: { key: 'errors.auth.rateLimited', params: { count: 2, minutes: 2 } } },
    ],
    [
      refused('auth.password_equals_email'),
      { fieldErrors: { newPassword: { key: 'errors.auth.passwordEqualsEmail' } } },
    ],
    [
      refused('validation', { fieldErrors: { newPassword: 'errors.auth.passwordTooShort' } }),
      { fieldErrors: { newPassword: { key: 'errors.auth.passwordTooShort' } } },
    ],
    [refused('forbidden'), { formError: { key: 'errors.common.internal' } }],
  ])('maps each other refusal in place, without a redirect', async (outcome, expected) => {
    commandsAnswer({ 'account.changePassword': outcome });
    await expect(changePasswordForm(INITIAL_AUTH_STATE, changeForm())).resolves.toMatchObject(
      expected,
    );
    expect(applySessionEffect).not.toHaveBeenCalled();
    expect(redirectInLocale).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('a weak new password is refused before the command runs, without a redirect', async () => {
    await expect(
      changePasswordForm(
        INITIAL_AUTH_STATE,
        formOf({ currentPassword: PASSWORD, newPassword: 'short' }),
      ),
    ).resolves.toMatchObject({ status: 'refused', fieldErrors: { newPassword: {} } });
    expect(runCommand).not.toHaveBeenCalled();
    expect(redirectInLocale).not.toHaveBeenCalled();
  });
});

describe('signing out everywhere (BR6.4)', () => {
  it('does nothing without the explicit confirmation', async () => {
    await expect(signOutEverywhereForm(INITIAL_AUTH_STATE, new FormData())).resolves.toBe(
      INITIAL_AUTH_STATE,
    );
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('ends every session, clears rk.pending and goes to sign in after confirm=yes', async () => {
    await expect(
      signOutEverywhereForm(INITIAL_AUTH_STATE, formOf({ confirm: 'yes' })),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(calledCommands()).toEqual(['account.signOutEverywhere']);
    expect(applySessionEffect).toHaveBeenCalledWith({ kind: 'clear' });
    expect(jar.deleted).toContain(PENDING_EMAIL_COOKIE);
    expect(redirectInLocale).toHaveBeenCalledWith({
      href: { pathname: '/sign-in', query: { signedOut: 'all' } },
      locale: 'en',
    });
  });

  it('shows the internal error when the command refuses', async () => {
    commandsAnswer({ 'account.signOutEverywhere': refused('forbidden') });
    await expect(
      signOutEverywhereForm(INITIAL_AUTH_STATE, formOf({ confirm: 'yes' })),
    ).resolves.toMatchObject({ formError: { key: 'errors.common.internal' } });
  });
});
