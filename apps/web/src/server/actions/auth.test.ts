// @vitest-environment node
// The demo's auth forms on T-101's commands (ISS-391): the commands themselves are tested in
// `@rogikotha/application`; here only the mapping of form fields and results is under test.
import type { Command, SessionCookieEffect } from '@rogikotha/application';
import type { AppError, ErrorCode, Locale, Result } from '@rogikotha/contracts';
import { redirect as redirectInLocale } from '@/i18n/routing';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applySessionEffect, runCommand } from '../command-call';
import { getContainer } from '../container';
import { register, signIn, signOut } from './auth';
import { INITIAL_AUTH_STATE } from './auth-form';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
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
const SESSION: SessionCookieEffect = { kind: 'set', setCookies: ['rk.session_token=t; Path=/'] };

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

function accountLocale(locale: Locale | null): void {
  const accounts = {
    findByEmail: vi.fn(() => Promise.resolve(locale ? { accountId: 'account-1' } : null)),
    findProfileById: vi.fn(() => Promise.resolve(locale ? { locale } : null)),
  };
  vi.mocked(getContainer).mockReturnValue({
    ports: { accounts, unitOfWork: { read: (work: (tx: unknown) => unknown) => work({}) } },
  } as unknown as ReturnType<typeof getContainer>);
}

function registerForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const values = {
    email: EMAIL,
    password: PASSWORD,
    username: 'nadia_i',
    displayName: 'Nadia Islam',
    locale: 'bn',
    age: 'on',
    terms: 'on',
    ...overrides,
  };
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  return form;
}

function signInForm(extra: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.set('email', EMAIL);
  form.set('password', PASSWORD);
  for (const [name, value] of Object.entries(extra)) form.set(name, value);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  accountLocale('bn');
  commandsAnswer({
    'account.register': ok({ accountId: 'account-1' }),
    'account.signIn': ok({ session: SESSION }),
    'account.signOut': ok({ session: { kind: 'clear' } }),
  });
});

describe('registering', () => {
  it('registers through account.register and sends the browser to sign-in in the chosen language, returning to /me', async () => {
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
    expect(redirect).toHaveBeenCalledWith('/bn/sign-in?next=%2Fbn%2Fme');
  });

  it('carries the same-site page it was sent from on to sign-in', async () => {
    await expect(register(INITIAL_AUTH_STATE, registerForm({ next: '/bn/write' }))).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(redirect).toHaveBeenCalledWith('/bn/sign-in?next=%2Fbn%2Fwrite');
  });

  it('drops a next path that leaves the site and returns to /me instead', async () => {
    await expect(
      register(INITIAL_AUTH_STATE, registerForm({ next: '//evil.example/me' })),
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/bn/sign-in?next=%2Fbn%2Fme');
  });

  it('shows field errors and runs no command when the form is incomplete', async () => {
    const state = await register(INITIAL_AUTH_STATE, registerForm({ password: 'short' }));

    expect(state).toEqual({
      fieldErrors: { password: 'errors.auth.passwordTooShort' },
      formError: null,
    });
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('names a taken username on its field and does not sign in', async () => {
    commandsAnswer({ 'account.register': refused('auth.username_taken') });

    const state = await register(INITIAL_AUTH_STATE, registerForm());

    expect(state).toEqual({
      fieldErrors: { username: 'errors.auth.usernameTaken' },
      formError: null,
    });
    expect(calledCommands()).toEqual(['account.register']);
  });

  it('answers the rate limit with the form-level message', async () => {
    commandsAnswer({ 'account.register': refused('auth.rate_limited') });

    const state = await register(INITIAL_AUTH_STATE, registerForm());

    expect(state).toEqual({ fieldErrors: {}, formError: 'formErrors.auth.rateLimited' });
  });

  it('maps a field the command refused back onto the form field', async () => {
    commandsAnswer({
      'account.register': refused('validation', { fieldErrors: { ageConfirmed: 'x' } }),
    });

    const state = await register(INITIAL_AUTH_STATE, registerForm());

    expect(state).toEqual({ fieldErrors: { age: 'errors.auth.ageRequired' }, formError: null });
  });

  it('never signs in from the register form, so an already-registered address looks like a new one', async () => {
    commandsAnswer({
      'account.register': ok({ accountId: 'never-persisted' }),
      'account.signIn': refused('auth.invalid_credentials'),
    });

    await expect(register(INITIAL_AUTH_STATE, registerForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(calledCommands()).toEqual(['account.register']);
    expect(applySessionEffect).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/bn/sign-in?next=%2Fbn%2Fme');
  });

  it('shows the internal error when the command fails unexpectedly', async () => {
    commandsAnswer({ 'account.register': refused('internal') });

    const state = await register(INITIAL_AUTH_STATE, registerForm());

    expect(state).toEqual({ fieldErrors: {}, formError: 'errors.common.internal' });
  });
});

describe('signing in', () => {
  it('signs in through account.signIn and opens the home page in the account’s language', async () => {
    await expect(signIn(INITIAL_AUTH_STATE, signInForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(calledCommands()).toEqual(['account.signIn']);
    expect(applySessionEffect).toHaveBeenCalledWith(SESSION);
    expect(redirectInLocale).toHaveBeenCalledWith({ href: '/', locale: 'bn' });
  });

  it('falls back to the active language when the account has no profile language', async () => {
    accountLocale(null);

    await expect(signIn(INITIAL_AUTH_STATE, signInForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectInLocale).toHaveBeenCalledWith({ href: '/', locale: 'en' });
  });

  it('returns to a same-site page but ignores a link to another site', async () => {
    await expect(signIn(INITIAL_AUTH_STATE, signInForm({ next: '/en/write' }))).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith('/en/write');

    vi.mocked(redirect).mockClear();
    await expect(
      signIn(INITIAL_AUTH_STATE, signInForm({ next: '//evil.example/' })),
    ).rejects.toThrow();
    expect(redirect).not.toHaveBeenCalled();
    expect(redirectInLocale).toHaveBeenLastCalledWith({ href: '/', locale: 'bn' });
  });

  it.each([
    ['auth.invalid_credentials', 'errors.auth.invalidCredentials'],
    ['validation', 'errors.auth.invalidCredentials'],
    ['auth.account_suspended', 'errors.auth.accountSuspended'],
    ['auth.rate_limited', 'formErrors.auth.rateLimited'],
    ['internal', 'errors.common.internal'],
  ] as const)('answers %s with %s and sets no cookie', async (code, key) => {
    commandsAnswer({ 'account.signIn': refused(code) });

    await expect(signIn(INITIAL_AUTH_STATE, signInForm())).resolves.toEqual({
      fieldErrors: {},
      formError: key,
    });
    expect(applySessionEffect).not.toHaveBeenCalled();
  });

  it('gives a malformed email the neutral refusal without running the command', async () => {
    const form = signInForm();
    form.set('email', 'nobody');

    await expect(signIn(INITIAL_AUTH_STATE, form)).resolves.toEqual({
      fieldErrors: {},
      formError: 'errors.auth.invalidCredentials',
    });
    expect(runCommand).not.toHaveBeenCalled();
  });
});

describe('signing out', () => {
  it('ends the session through account.signOut, clears the cookie and goes home', async () => {
    await expect(signOut()).rejects.toThrow('NEXT_REDIRECT');

    expect(calledCommands()).toEqual(['account.signOut']);
    expect(applySessionEffect).toHaveBeenCalledWith({ kind: 'clear' });
    expect(redirectInLocale).toHaveBeenCalledWith({ href: '/', locale: 'en' });
  });

  it('still clears the cookie when there was no session to end', async () => {
    commandsAnswer({ 'account.signOut': refused('forbidden') });

    await expect(signOut()).rejects.toThrow('NEXT_REDIRECT');

    expect(applySessionEffect).toHaveBeenCalledWith({ kind: 'clear' });
  });
});
