'use server';

// The patient auth forms (T-102) on T-101's commands: `account.*` owns the limits, the delay, the
// timing floor, the tokens and the domain rows. These actions only map form fields and results,
// apply the session cookie and keep the `rk.pending` flash cookie (BR2.2).
import {
  changePasswordCommand,
  registerCommand,
  requestPasswordResetCommand,
  resendOwnVerificationCommand,
  resendVerificationCommand,
  resetPasswordCommand,
  signInCommand,
  signOutCommand,
  signOutEverywhereCommand,
  verifyEmailCommand,
} from '@rogikotha/application';
import { type AppError, type Locale } from '@rogikotha/contracts';
import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

// The app's routing re-export rather than @rogikotha/i18n, so tests that stand in for the app's
// routing module (Masthead.test.tsx and the page tests) cover this import too.
import { redirect as redirectInLocale } from '@/i18n/routing';
import { applySessionEffect, runCommand } from '../command-call';
import { getContainer } from '../container';
import {
  PENDING_EMAIL_COOKIE,
  PENDING_EMAIL_MAX_AGE_SEC,
  REGISTER_FIELD_MESSAGE,
  REGISTER_SCHEMA_PATH_FIELD,
  doneWith,
  message,
  orderRegisterFields,
  parseChangePassword,
  parseEmailOnly,
  parseRegistration,
  parseSetPassword,
  parseSignIn,
  rateLimitMessage,
  readPendingCookie,
  refusedFields,
  refusedForm,
  safeAuthNext,
  serialisePendingCookie,
  type AuthFormState,
  type ChangePasswordFormState,
  type EmailFormState,
  type RegisterField,
  type RegisterFormState,
  type SetPasswordFormState,
  type SignInFormState,
} from './auth-form';

const INTERNAL = 'errors.common.internal';
const TOKEN_EXPIRED = 'errors.auth.tokenExpired';

// Typed routes cannot know a `?next=` value; safeAuthNext has already kept it to this site.
function redirectToPath(path: string): never {
  redirect(path as Route);
}

function withNext(path: string, next: string | null, joiner: '?' | '&'): string {
  return next ? `${path}${joiner}next=${encodeURIComponent(next)}` : path;
}

async function activeLocale(): Promise<Locale> {
  return (await getLocale()) as Locale;
}

/** The internal error behind a neutral answer is logged with its code and correlation id only. */
function logInternal(command: string, error: AppError): void {
  getContainer().ports.logger.error('auth.form_internal', {
    command,
    errorCode: error.code,
    correlationId: error.correlationId,
  });
}

async function setPendingCookie(email: string, next: string | null): Promise<void> {
  const store = await cookies();
  store.set(PENDING_EMAIL_COOKIE, serialisePendingCookie({ email, next }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: getContainer().env.appUrl.startsWith('https:'),
    path: '/',
    maxAge: PENDING_EMAIL_MAX_AGE_SEC,
  });
}

async function clearPendingCookie(): Promise<void> {
  (await cookies()).delete(PENDING_EMAIL_COOKIE);
}

function rateLimited<F extends string>(error: AppError): AuthFormState<F> {
  const wait = rateLimitMessage(error.retryAfterSec);
  return refusedForm(wait.key, wait.params);
}

function registerRefusal(error: AppError): RegisterFormState {
  switch (error.code) {
    case 'auth.username_taken':
      return refusedFields<RegisterField>({ username: message('errors.auth.usernameTaken') });
    case 'auth.rate_limited':
      return rateLimited(error);
    case 'internal':
      return refusedForm(INTERNAL);
    default: {
      // The form has already checked the same schema, so this only matters if the two drift.
      const fieldErrors: Partial<Record<RegisterField, string>> = {};
      for (const path of Object.keys(error.fieldErrors ?? {})) {
        const field = REGISTER_SCHEMA_PATH_FIELD[path];
        if (field) fieldErrors[field] = REGISTER_FIELD_MESSAGE[field];
      }
      return Object.keys(fieldErrors).length > 0
        ? refusedFields(orderRegisterFields(fieldErrors))
        : refusedForm(INTERNAL);
    }
  }
}

function signInRefusal(error: AppError): SignInFormState {
  switch (error.code) {
    case 'auth.invalid_credentials':
    case 'validation':
      return refusedForm('errors.auth.invalidCredentials');
    case 'auth.account_suspended':
      return refusedForm('errors.auth.accountSuspended');
    case 'auth.rate_limited':
      return rateLimited(error);
    default:
      return refusedForm(INTERNAL);
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
 * WF1, BR2.1: registers through `account.register`, keeps the typed address in `rk.pending` and
 * sends the browser to the pending screen in the language chosen on the form. A new and an
 * already-registered address get the same cookie and redirect, and the action never signs in.
 */
export async function register(
  _previous: RegisterFormState,
  form: FormData,
): Promise<RegisterFormState> {
  const parsed = parseRegistration(form, await activeLocale());
  if (!parsed.ok) return parsed.state;
  const { email, locale } = parsed.data;

  const registered = await runCommand(registerCommand, parsed.data);
  if (!registered.ok) return registerRefusal(registered.error);

  const next = safeAuthNext(form.get('next'));
  await setPendingCookie(email, next);
  return redirectToPath(withNext(`/${locale}/verify-email`, next, '?'));
}

/**
 * WF4: signs in through `account.signIn`. Every wrong combination gets one neutral message (BR4.1);
 * on `ok` the session is applied, `rk.pending` goes, and the browser goes to `next` or `/me` in the
 * account's language (BR4.4).
 */
export async function signIn(_previous: SignInFormState, form: FormData): Promise<SignInFormState> {
  const parsed = parseSignIn(form);
  if (!parsed.ok) return parsed.state;

  const result = await runCommand(signInCommand, parsed.data);
  if (!result.ok) return signInRefusal(result.error);
  await applySessionEffect(result.data.session);
  await clearPendingCookie();

  revalidatePath('/', 'layout');
  const next = safeAuthNext(form.get('next'));
  if (next) redirectToPath(next);
  const locale = (await localeOfAccount(parsed.data.email)) ?? (await activeLocale());
  return redirectInLocale({ href: '/me', locale });
}

/** WF8: ends the session through `account.signOut`, drops `rk.pending` and returns home. */
export async function signOut(): Promise<void> {
  const result = await runCommand(signOutCommand, {});
  // Signed out already (an anonymous Actor is refused) is the wanted end state; the cookie goes
  // either way.
  await applySessionEffect(result.ok ? result.data.session : { kind: 'clear' });
  await clearPendingCookie();
  revalidatePath('/', 'layout');
  redirectInLocale({ href: '/', locale: await getLocale() });
}

/**
 * WF3, BR3.1-BR3.3: the confirm button's POST. On `ok` the session is applied, `rk.pending` goes
 * and the browser lands on the done panel with the `next` it carried; every bad token gets one
 * expired answer.
 */
export async function confirmEmail(
  _previous: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const token = form.get('token');
  const result = await runCommand(verifyEmailCommand, {
    token: typeof token === 'string' ? token : '',
  });
  if (!result.ok) {
    if (result.error.code === 'internal') return refusedForm(INTERNAL);
    return { ...refusedForm(TOKEN_EXPIRED), expired: true };
  }
  const pending = readPendingCookie((await cookies()).get(PENDING_EMAIL_COOKIE)?.value);
  await applySessionEffect(result.data.session);
  await clearPendingCookie();
  revalidatePath('/', 'layout');
  const locale = await activeLocale();
  return redirectToPath(
    withNext(`/${locale}/verify-email?confirmed=1`, pending?.next ?? null, '&'),
  );
}

/**
 * BR2.4: a signed-out resend answers "a new link is on its way" whatever the address; only a
 * malformed address or a rate limit changes the answer.
 */
export async function resendLink(
  _previous: EmailFormState,
  form: FormData,
): Promise<EmailFormState> {
  const parsed = parseEmailOnly(form);
  if (!parsed.ok) return parsed.state;
  const result = await runCommand(resendVerificationCommand, parsed.data);
  if (!result.ok) {
    if (result.error.code === 'auth.rate_limited') return rateLimited(result.error);
    if (result.error.code === 'internal') logInternal(resendVerificationCommand.name, result.error);
  }
  return doneWith('auth.verify.resent');
}

/** BR2.5: a signed-in, unconfirmed holder resends without typing or seeing an address. */
export async function resendOwnLink(): Promise<AuthFormState> {
  const result = await runCommand(resendOwnVerificationCommand, {});
  if (result.ok) return doneWith('auth.verify.resent');
  if (result.error.code === 'auth.rate_limited') return rateLimited(result.error);
  return refusedForm(INTERNAL);
}

/**
 * BR5.1: a reset request answers "sent" whether or not the address has an account. An internal
 * error is logged and still answers "sent", because only an existing account can fail there.
 */
export async function requestReset(
  _previous: EmailFormState,
  form: FormData,
): Promise<EmailFormState> {
  const parsed = parseEmailOnly(form);
  if (!parsed.ok) return parsed.state;
  const result = await runCommand(requestPasswordResetCommand, parsed.data);
  if (!result.ok) {
    if (result.error.code === 'auth.rate_limited') return rateLimited(result.error);
    if (result.error.code === 'internal') {
      logInternal(requestPasswordResetCommand.name, result.error);
    }
  }
  return doneWith('auth.reset.sent');
}

/** The refusals both password forms share, or null for the caller's own mapping. */
function passwordRefusal(error: AppError): AuthFormState<'newPassword'> | null {
  if (error.code === 'auth.password_equals_email') {
    return refusedFields({ newPassword: message('errors.auth.passwordEqualsEmail') });
  }
  if (error.code === 'auth.rate_limited') return rateLimited(error);
  const key = error.code === 'validation' ? error.fieldErrors?.newPassword : undefined;
  return key ? refusedFields({ newPassword: message(key) }) : null;
}

/**
 * WF6, BR5.2, BR5.3: sets the new password from the emailed link. On `ok` every session is
 * cleared and the browser goes to sign in; a used or expired link changes nothing.
 */
export async function setNewPassword(
  _previous: SetPasswordFormState,
  form: FormData,
): Promise<SetPasswordFormState> {
  const parsed = parseSetPassword(form);
  if (!parsed.ok) return parsed.state;
  const result = await runCommand(resetPasswordCommand, parsed.data);
  if (!result.ok) {
    const { code } = result.error;
    if (code === 'auth.token_expired' || code === 'auth.token_invalid') {
      return { ...refusedForm(TOKEN_EXPIRED), expired: true };
    }
    return passwordRefusal(result.error) ?? refusedForm(INTERNAL);
  }
  await applySessionEffect(result.data.session);
  await clearPendingCookie();
  revalidatePath('/', 'layout');
  return redirectInLocale({
    href: { pathname: '/sign-in', query: { reset: 'done' } },
    locale: await getLocale(),
  });
}

/**
 * WF7 step 3, BR6.5: changes the password; on `ok` the rotated session replaces the old one and
 * the browser goes back to the security page with `?changed=1`, which shows the notice.
 */
export async function changePasswordForm(
  _previous: ChangePasswordFormState,
  form: FormData,
): Promise<ChangePasswordFormState> {
  const parsed = parseChangePassword(form);
  if (!parsed.ok) return parsed.state;
  const result = await runCommand(changePasswordCommand, parsed.data);
  if (!result.ok) {
    if (result.error.code === 'auth.invalid_credentials') {
      return refusedFields({ currentPassword: message('errors.auth.invalidCredentials') });
    }
    return passwordRefusal(result.error) ?? refusedForm(INTERNAL);
  }
  await applySessionEffect(result.data.session);
  revalidatePath('/', 'layout');
  // ISS-778: a page rendered in this response still reads the revoked session from the request's
  // headers, so only the next request, carrying the rotated cookie, can render signed in.
  return redirectInLocale({
    href: { pathname: '/me/security', query: { changed: '1' } },
    locale: await getLocale(),
  });
}

/**
 * WF7 step 5, BR6.4: ends every session after the explicit `confirm=yes` step, then goes to sign
 * in. Without the confirmation nothing runs.
 */
export async function signOutEverywhereForm(
  previous: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  if (form.get('confirm') !== 'yes') return previous;
  const result = await runCommand(signOutEverywhereCommand, {});
  if (!result.ok) return refusedForm(INTERNAL);
  await applySessionEffect(result.data.session);
  await clearPendingCookie();
  revalidatePath('/', 'layout');
  return redirectInLocale({
    href: { pathname: '/sign-in', query: { signedOut: 'all' } },
    locale: await getLocale(),
  });
}
