'use server';

// The demo's register, sign-in and sign-out forms (FR1, FD-099), now on T-101's commands
// (ISS-391): `account.register`, `account.signIn` and `account.signOut` own the limits, the
// delay, the timing floor and the domain rows. These actions only map form fields and results.
import { registerCommand, signInCommand, signOutCommand } from '@rogikotha/application';
import { type AppError, type Locale } from '@rogikotha/contracts';
import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

// The app's routing re-export rather than @rogikotha/i18n, so tests that stand in for the app's
// routing module (Masthead.test.tsx and the page tests) cover this import too.
import { redirect as redirectInLocale } from '@/i18n/routing';
import { applySessionEffect, runCommand } from '../command-call';
import { getContainer } from '../container';
import {
  parseRegistration,
  parseSignIn,
  safeNextPath,
  type RegisterField,
  type RegisterFormState,
  type SignInFormState,
} from './auth-form';

const INTERNAL = 'errors.common.internal';
// The existing `errors.auth.rateLimited` needs `{minutes}`, which a form error cannot pass (F4).
const RATE_LIMITED = 'formErrors.auth.rateLimited';

// Typed routes cannot know a `?next=` value; safeNextPath has already kept it to this site.
function redirectToNext(next: string): never {
  redirect(next as Route);
}

const COMMAND_PATH_FIELD: Record<string, RegisterField> = {
  email: 'email',
  password: 'password',
  username: 'username',
  displayName: 'displayName',
  ageConfirmed: 'age',
  termsAccepted: 'terms',
};

// The form's own keys for a field the command refused; the form has already checked the same
// schema, so this only matters if the two drift.
const FORM_FIELD_MESSAGE: Record<RegisterField, string> = {
  email: 'formErrors.auth.emailInvalid',
  password: 'errors.auth.passwordTooShort',
  username: 'errors.auth.usernameInvalid',
  displayName: 'formErrors.auth.displayNameInvalid',
  age: 'errors.auth.ageRequired',
  terms: 'errors.auth.termsRequired',
};

function registerRefusal(error: AppError): RegisterFormState {
  switch (error.code) {
    case 'auth.username_taken':
      return { fieldErrors: { username: 'errors.auth.usernameTaken' }, formError: null };
    case 'auth.rate_limited':
      return { fieldErrors: {}, formError: RATE_LIMITED };
    case 'internal':
      return { fieldErrors: {}, formError: INTERNAL };
    default: {
      const fieldErrors: Partial<Record<RegisterField, string>> = {};
      for (const path of Object.keys(error.fieldErrors ?? {})) {
        const field = COMMAND_PATH_FIELD[path];
        if (field) fieldErrors[field] = FORM_FIELD_MESSAGE[field];
      }
      return Object.keys(fieldErrors).length > 0
        ? { fieldErrors, formError: null }
        : { fieldErrors: {}, formError: INTERNAL };
    }
  }
}

function signInRefusal(error: AppError): SignInFormState {
  switch (error.code) {
    case 'auth.invalid_credentials':
    case 'validation':
      return { fieldErrors: {}, formError: 'errors.auth.invalidCredentials' };
    case 'auth.account_suspended':
      return { fieldErrors: {}, formError: 'errors.auth.accountSuspended' };
    case 'auth.rate_limited':
      return { fieldErrors: {}, formError: RATE_LIMITED };
    default:
      return { fieldErrors: {}, formError: INTERNAL };
  }
}

/** The preferred interface language of the account behind an address, for FR2.3. */
async function localeOfAccount(email: string): Promise<Locale | null> {
  const { ports } = getContainer();
  return ports.unitOfWork.read(async (tx) => {
    const account = await ports.accounts.findByEmail(tx, email);
    if (!account) return null;
    return (await ports.accounts.findProfileById(tx, account.accountId))?.locale ?? null;
  });
}

/**
 * FR1.1: registers through `account.register`, then sends the browser to sign-in in the language
 * they chose, returning afterwards to `/me` (or the page they came from).
 *
 * BR1.4: a new and an already-registered address get the same redirect, and the action never
 * signs in, because a sign-in with the submitted password succeeds only for a new address and
 * would tell an attacker which addresses have accounts (S1, T-101 Step 15).
 * ASSUMPTION(T-101): this replaces FD-099's sign-in right after registering; T-102's "check your
 * email" screen later takes the sign-in page's place here.
 */
export async function register(
  _previous: RegisterFormState,
  form: FormData,
): Promise<RegisterFormState> {
  const parsed = parseRegistration(form, (await getLocale()) as Locale);
  if (!parsed.ok) return parsed.state;
  const { locale } = parsed.data;

  const registered = await runCommand(registerCommand, parsed.data);
  if (!registered.ok) return registerRefusal(registered.error);

  const next = safeNextPath(form.get('next')) ?? `/${locale}/me`;
  return redirectToNext(`/${locale}/sign-in?next=${encodeURIComponent(next)}`);
}

/**
 * FR1.2: signs in through `account.signIn`. Every wrong combination gets one neutral message; a
 * suspended or banned account gets no session (BR3.6).
 */
export async function signIn(_previous: SignInFormState, form: FormData): Promise<SignInFormState> {
  const parsed = parseSignIn(form);
  if (!parsed.ok) return parsed.state;

  const result = await runCommand(signInCommand, parsed.data);
  if (!result.ok) return signInRefusal(result.error);
  await applySessionEffect(result.data.session);

  revalidatePath('/', 'layout');
  const next = safeNextPath(form.get('next'));
  if (next) redirectToNext(next);
  // FR2.3: with no page to return to, the site opens in the account's preferred language.
  const locale = (await localeOfAccount(parsed.data.email)) ?? ((await getLocale()) as Locale);
  return redirectInLocale({ href: '/', locale });
}

/** FR1.3: ends the session through `account.signOut` and returns to the home page. */
export async function signOut(): Promise<void> {
  const result = await runCommand(signOutCommand, {});
  // Signed out already (an anonymous Actor is refused) is the wanted end state; the cookie goes
  // either way.
  await applySessionEffect(result.ok ? result.data.session : { kind: 'clear' });
  revalidatePath('/', 'layout');
  redirectInLocale({ href: '/', locale: await getLocale() });
}
