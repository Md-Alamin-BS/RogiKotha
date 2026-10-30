'use server';

// Register, sign in and sign out (FR1, plan Step 5). Better Auth owns credentials and the session
// cookie; the demo data functions own the profile and persona rows.
import type { Locale } from '@rogikotha/contracts';
import { isAPIError } from 'better-auth/api';
import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

// The app's routing re-export rather than @rogikotha/i18n, so tests that stand in for the app's
// routing module (Masthead.test.tsx and the page tests) cover this import too.
import { redirect as redirectInLocale } from '@/i18n/routing';
import { getAuth } from '../auth/instance';
import { accounts, session } from '../data';
import { optionalEnv } from '../env';
import {
  parseRegistration,
  parseSignIn,
  safeNextPath,
  type RegisterFormState,
  type SignInFormState,
} from './auth-form';

const INTERNAL = 'errors.common.internal';
// ASSUMPTION(demo-slice): the T-101 design reads the accepted terms version from TERMS_VERSION;
// the seed records '1', so that is the default until the variable exists.
const DEFAULT_TERMS_VERSION = '1';
const PG_UNIQUE_VIOLATION = '23505';

// Typed routes cannot know a `?next=` value; safeNextPath has already kept it to this site.
function redirectToNext(next: string): never {
  redirect(next as Route);
}

function authErrorCode(error: unknown): string | null {
  if (!isAPIError(error)) return null;
  const code = (error as { body?: { code?: unknown } }).body?.code;
  return typeof code === 'string' ? code : null;
}

function isUniqueViolation(error: unknown): boolean {
  const withCode = error as { code?: unknown; cause?: { code?: unknown } } | null;
  return withCode?.code === PG_UNIQUE_VIOLATION || withCode?.cause?.code === PG_UNIQUE_VIOLATION;
}

/** Logs a failure by its code only: messages and inputs can carry an email address (NFR3). */
function logFailure(step: string, error: unknown): void {
  const code = authErrorCode(error) ?? (error instanceof Error ? error.name : 'unknown');
  console.error(`auth action failed: ${step}`, { code });
}

/** Ends a session Better Auth just opened: its row and the cookies the response would set. */
async function endFreshSession(token: string | null | undefined): Promise<void> {
  const context = await getAuth().$context;
  if (token) await context.internalAdapter.deleteSession(token);
  await clearSessionCookies();
}

async function clearSessionCookies(): Promise<void> {
  const context = await getAuth().$context;
  const store = await cookies();
  store.delete(context.authCookies.sessionToken.name);
  store.delete(context.authCookies.sessionData.name);
}

function registerRefusal(code: string | null): RegisterFormState | null {
  switch (code) {
    // FR1.1: a used email gets a message that does not say the email is known.
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return { fieldErrors: {}, formError: 'formErrors.auth.registrationRefused' };
    case 'INVALID_EMAIL':
      return { fieldErrors: { email: 'formErrors.auth.emailInvalid' }, formError: null };
    case 'PASSWORD_TOO_SHORT':
      return { fieldErrors: { password: 'errors.auth.passwordTooShort' }, formError: null };
    case 'PASSWORD_TOO_LONG':
      return { fieldErrors: { password: 'formErrors.auth.passwordTooLong' }, formError: null };
    default:
      return null;
  }
}

/** Creates the profile, or undoes the Better Auth user so a failed registration leaves nothing. */
async function createProfileOrUndo(
  authUserId: string,
  token: string | null | undefined,
  input: { username: string; displayName: string; locale: Locale },
): Promise<RegisterFormState | null> {
  try {
    await accounts.createProfileForAuthUser({
      authUserId,
      ...input,
      termsVersion: optionalEnv('TERMS_VERSION') ?? DEFAULT_TERMS_VERSION,
    });
    return null;
  } catch (error) {
    await endFreshSession(token);
    await accounts.removeAuthUserWithoutProfile(authUserId);
    if (isUniqueViolation(error)) {
      return { fieldErrors: { username: 'errors.auth.usernameTaken' }, formError: null };
    }
    logFailure('create profile', error);
    return { fieldErrors: {}, formError: INTERNAL };
  }
}

/**
 * FR1.1: registers with Better Auth, creates the active profile and its named persona, and leaves
 * the new user signed in on the page they came from, else on `/me` in the language they chose.
 */
export async function register(
  _previous: RegisterFormState,
  form: FormData,
): Promise<RegisterFormState> {
  const parsed = parseRegistration(form, (await getLocale()) as Locale);
  if (!parsed.ok) return parsed.state;
  const { email, password, username, displayName, locale } = parsed.data;

  // ASSUMPTION(demo-slice): a taken username is named on its field, because usernames are public
  // on every named experience; only the email stays neutral (FR1.1).
  if (await accounts.isUsernameTaken(username)) {
    return { fieldErrors: { username: 'errors.auth.usernameTaken' }, formError: null };
  }

  let created: { authUserId: string; token: string | null | undefined };
  try {
    // ASSUMPTION(demo-slice): Better Auth's `name` stays empty; the display name lives only in
    // account_profiles and personas, so the auth tables hold no second copy of it.
    const result = await getAuth().api.signUpEmail({
      body: { email, password, name: '' },
      headers: await headers(),
    });
    created = { authUserId: result.user.id, token: result.token };
  } catch (error) {
    const refusal = registerRefusal(authErrorCode(error));
    if (refusal) return refusal;
    logFailure('sign up', error);
    return { fieldErrors: {}, formError: INTERNAL };
  }

  const failed = await createProfileOrUndo(created.authUserId, created.token, {
    username,
    displayName,
    locale,
  });
  if (failed) return failed;

  revalidatePath('/', 'layout');
  const next = safeNextPath(form.get('next'));
  if (next) redirectToNext(next);
  return redirectInLocale({ href: '/me', locale });
}

/**
 * FR1.2: signs in with email and password. Every wrong combination gets one neutral message; a
 * session whose account is not active is closed again at once.
 */
export async function signIn(_previous: SignInFormState, form: FormData): Promise<SignInFormState> {
  const parsed = parseSignIn(form);
  if (!parsed.ok) return parsed.state;

  let signedIn: { authUserId: string; token: string | null | undefined };
  try {
    const result = await getAuth().api.signInEmail({
      body: parsed.data,
      headers: await headers(),
    });
    signedIn = { authUserId: result.user.id, token: result.token };
  } catch (error) {
    if (authErrorCode(error) === 'INVALID_EMAIL_OR_PASSWORD') {
      return { fieldErrors: {}, formError: 'errors.auth.invalidCredentials' };
    }
    logFailure('sign in', error);
    return { fieldErrors: {}, formError: INTERNAL };
  }

  const account = await session.getCurrentAccountByAuthUserId(signedIn.authUserId);
  if (!account || account.status !== 'active') {
    await endFreshSession(signedIn.token);
    return {
      fieldErrors: {},
      formError:
        account?.status === 'suspended'
          ? 'errors.auth.accountSuspended'
          : 'errors.auth.invalidCredentials',
    };
  }

  revalidatePath('/', 'layout');
  const next = safeNextPath(form.get('next'));
  if (next) redirectToNext(next);
  // FR2.3: with no page to return to, the site opens in the account's preferred language.
  return redirectInLocale({ href: '/', locale: account.locale });
}

/** FR1.3: ends the session and returns to the home page in the active language. */
export async function signOut(): Promise<void> {
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch (error) {
    // Signing out without a session is already the wanted end state.
    if (!isAPIError(error)) logFailure('sign out', error);
  }
  await clearSessionCookies();
  revalidatePath('/', 'layout');
  redirectInLocale({ href: '/', locale: await getLocale() });
}
