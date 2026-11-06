// Form parsing and state shared by the auth actions (`auth.ts`) and the auth forms. Kept out of
// the `'use server'` file, which may export only async functions.
import {
  ACCOUNT_FIELD_ERROR_KEYS,
  ChangePasswordInput,
  DISPLAY_NAME_MAX as CONTRACT_DISPLAY_NAME_MAX,
  LOCALES,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  SignInInput,
  type Locale,
} from '@rogikotha/contracts';

export type RegisterField = 'email' | 'password' | 'username' | 'displayName' | 'age' | 'terms';
export type SignInField = 'email' | 'password';
export type EmailField = 'email';
export type SetPasswordField = 'newPassword' | 'confirmPassword';
export type ChangePasswordField = 'currentPassword' | 'newPassword';

/** An i18n key with raw numbers only; the form formats them for the active locale (R-01). */
export interface AuthMessage {
  key: string;
  params?: Record<string, number>;
}

/**
 * What an auth action returns: message keys, numbers and flags, never a submitted value (BR1.2,
 * BR10.1). `notice` is a confirmation that replaces the form; `expired` asks for the expired panel.
 */
export interface AuthFormState<F extends string = string> {
  status: 'idle' | 'refused' | 'done';
  formError: AuthMessage | null;
  fieldErrors: Partial<Record<F, AuthMessage>>;
  notice?: AuthMessage;
  expired?: true;
}

export type RegisterFormState = AuthFormState<RegisterField>;
export type SignInFormState = AuthFormState<SignInField>;
export type EmailFormState = AuthFormState<EmailField>;
export type SetPasswordFormState = AuthFormState<SetPasswordField>;
export type ChangePasswordFormState = AuthFormState<ChangePasswordField>;

export const INITIAL_AUTH_STATE: AuthFormState<never> = {
  status: 'idle',
  formError: null,
  fieldErrors: {},
};

/** The C16 gate's answer (BR8.1). */
export type { ContributionAccess } from '../auth/contribution-access';

/** The flash cookie that carries the typed address from register to the pending screen (BR2.2). */
export const PENDING_EMAIL_COOKIE = 'rk.pending';
export const PENDING_EMAIL_MAX_AGE_SEC = 1800;

export function message(key: string, params?: Record<string, number>): AuthMessage {
  return params ? { key, params } : { key };
}

/** A form-level refusal. */
export function refusedForm<F extends string = never>(
  key: string,
  params?: Record<string, number>,
): AuthFormState<F> {
  return { status: 'refused', formError: message(key, params), fieldErrors: {} };
}

/** A refusal with one message per field. */
export function refusedFields<F extends string>(
  fieldErrors: Partial<Record<F, AuthMessage>>,
): AuthFormState<F> {
  return { status: 'refused', formError: null, fieldErrors };
}

/** A confirmation that replaces the form. */
export function doneWith<F extends string = never>(key: string): AuthFormState<F> {
  return { status: 'done', formError: null, fieldErrors: {}, notice: message(key) };
}

const RATE_LIMITED_UNKNOWN = 'formErrors.auth.rateLimited';
const SECONDS_PER_MINUTE = 60;

/**
 * BR4.2: the wait in the unit `retryAfterSec` calls for, seconds under a minute and whole minutes
 * (rounded up) from there; without a figure, the unit-free message.
 */
export function rateLimitMessage(retryAfterSec: number | undefined): AuthMessage {
  if (retryAfterSec === undefined || !Number.isFinite(retryAfterSec) || retryAfterSec <= 0) {
    return message(RATE_LIMITED_UNKNOWN);
  }
  if (retryAfterSec < SECONDS_PER_MINUTE) {
    const seconds = Math.ceil(retryAfterSec);
    // ASSUMPTION(U9): under `formErrors`, not the design's `errors.auth.*`, because the parity
    // check refuses an `errors.*` key with no ErrorCode behind it.
    return message('formErrors.auth.rateLimitedSeconds', { count: seconds, seconds });
  }
  const minutes = Math.ceil(retryAfterSec / SECONDS_PER_MINUTE);
  return message('errors.auth.rateLimited', { count: minutes, minutes });
}

/** The visual order of the register form, so the error summary and the tab order agree. */
export const REGISTER_FIELD_ORDER: readonly RegisterField[] = [
  'email',
  'password',
  'username',
  'displayName',
  'age',
  'terms',
];

/** The register form's `maxLength`, from the `account.register` schema. */
export const DISPLAY_NAME_MAX = CONTRACT_DISPLAY_NAME_MAX;

// The schema's own password keys, shown as they are; any other password issue reads as too short.
const PASSWORD_ISSUE_KEYS: ReadonlySet<string> = new Set([
  ACCOUNT_FIELD_ERROR_KEYS.passwordTooLong,
  ACCOUNT_FIELD_ERROR_KEYS.passwordEqualsEmail,
]);

/** The register form's own key per field, also used when the command refuses a field. */
export const REGISTER_FIELD_MESSAGE: Record<RegisterField, string> = {
  email: 'formErrors.auth.emailInvalid',
  password: 'errors.auth.passwordTooShort',
  username: 'errors.auth.usernameInvalid',
  displayName: 'formErrors.auth.displayNameInvalid',
  age: 'errors.auth.ageRequired',
  terms: 'errors.auth.termsRequired',
};

/** The register schema's paths, by form field. */
export const REGISTER_SCHEMA_PATH_FIELD: Record<string, RegisterField> = {
  email: 'email',
  password: 'password',
  username: 'username',
  displayName: 'displayName',
  ageConfirmed: 'age',
  termsAccepted: 'terms',
};

export type RegistrationInput = RegisterInput;

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

type Parsed<T, F extends string> = { ok: true; data: T } | { ok: false; state: AuthFormState<F> };

/** Validates the register form with the `account.register` schema plus the form's own limits. */
export function parseRegistration(
  form: FormData,
  fallbackLocale: Locale,
): Parsed<RegistrationInput, RegisterField> {
  const locale = text(form, 'locale');
  const raw = {
    email: text(form, 'email').trim(),
    password: text(form, 'password'),
    // ASSUMPTION(demo-slice): the username is lowercased for the reader rather than refused, since
    // the hint names letters and the stored form is lowercase anyway.
    username: text(form, 'username').trim().toLowerCase(),
    displayName: text(form, 'displayName').trim(),
    locale: isLocale(locale) ? locale : fallbackLocale,
    ageConfirmed: form.get('age') === 'on',
    termsAccepted: form.get('terms') === 'on',
  };
  const result = RegisterInput.safeParse(raw);
  const fieldErrors = formLimitErrors(raw);
  for (const issue of result.success ? [] : result.error.issues) {
    const field = REGISTER_SCHEMA_PATH_FIELD[String(issue.path[0])];
    if (!field || fieldErrors[field]) continue;
    fieldErrors[field] =
      field === 'password' && PASSWORD_ISSUE_KEYS.has(issue.message)
        ? issue.message
        : REGISTER_FIELD_MESSAGE[field];
  }
  if (result.success && Object.keys(fieldErrors).length === 0) {
    return { ok: true, data: result.data };
  }
  return { ok: false, state: refusedFields(orderRegisterFields(fieldErrors)) };
}

/** The ticks the form refuses with their own keys, even when another field already failed. */
function formLimitErrors(raw: {
  ageConfirmed: boolean;
  termsAccepted: boolean;
}): Partial<Record<RegisterField, string>> {
  const errors: Partial<Record<RegisterField, string>> = {};
  if (!raw.ageConfirmed) errors.age = REGISTER_FIELD_MESSAGE.age;
  if (!raw.termsAccepted) errors.terms = REGISTER_FIELD_MESSAGE.terms;
  return errors;
}

/** The register field errors in the form's order, as messages. */
export function orderRegisterFields(
  errors: Partial<Record<RegisterField, string>>,
): Partial<Record<RegisterField, AuthMessage>> {
  const ordered: Partial<Record<RegisterField, AuthMessage>> = {};
  for (const field of REGISTER_FIELD_ORDER) {
    const key = errors[field];
    if (key) ordered[field] = message(key);
  }
  return ordered;
}

/**
 * Validates the sign-in form. Any malformed input gets the same neutral refusal as a wrong
 * password, so the form never says which half was wrong (BR4.1).
 */
export function parseSignIn(
  form: FormData,
): Parsed<{ email: string; password: string }, SignInField> {
  const result = SignInInput.safeParse({
    email: text(form, 'email').trim(),
    password: text(form, 'password'),
  });
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, state: refusedForm('errors.auth.invalidCredentials') };
}

/** The resend and reset-request forms: one address, normalised by the account email schema. */
export function parseEmailOnly(form: FormData): Parsed<{ email: string }, EmailField> {
  const result = ResendVerificationInput.safeParse({ email: text(form, 'email') });
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    state: refusedFields<EmailField>({ email: message(ACCOUNT_FIELD_ERROR_KEYS.emailInvalid) }),
  };
}

const TOKEN_EXPIRED = 'errors.auth.tokenExpired';

/**
 * The set-new-password form (BR5.2): the two fields must match before any command runs, and the
 * new one must pass the schema's password rule. A missing token reads as an expired link.
 */
export function parseSetPassword(
  form: FormData,
): Parsed<{ token: string; newPassword: string }, SetPasswordField> {
  const newPassword = text(form, 'newPassword');
  const result = ResetPasswordInput.safeParse({ token: text(form, 'token'), newPassword });
  const fieldErrors: Partial<Record<SetPasswordField, AuthMessage>> = {};
  let tokenRefused = false;
  for (const issue of result.success ? [] : result.error.issues) {
    if (issue.path[0] === 'token') tokenRefused = true;
    else if (issue.path[0] === 'newPassword' && !fieldErrors.newPassword) {
      fieldErrors.newPassword = message(issue.message);
    }
  }
  if (newPassword !== text(form, 'confirmPassword')) {
    fieldErrors.confirmPassword = message('auth.reset.mismatch');
  }
  if (tokenRefused) {
    return { ok: false, state: { ...refusedForm(TOKEN_EXPIRED), fieldErrors, expired: true } };
  }
  if (result.success && Object.keys(fieldErrors).length === 0) {
    return { ok: true, data: result.data };
  }
  return { ok: false, state: refusedFields(fieldErrors) };
}

/** The change-password form on `/me/security` (BR6.5). */
export function parseChangePassword(
  form: FormData,
): Parsed<{ currentPassword: string; newPassword: string }, ChangePasswordField> {
  const result = ChangePasswordInput.safeParse({
    currentPassword: text(form, 'currentPassword'),
    newPassword: text(form, 'newPassword'),
  });
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Partial<Record<ChangePasswordField, AuthMessage>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if ((field === 'currentPassword' || field === 'newPassword') && !fieldErrors[field]) {
      fieldErrors[field] = message(issue.message);
    }
  }
  return { ok: false, state: refusedFields(fieldErrors) };
}

const NEXT_PATH_MAX = 512;
const PLACEHOLDER_ORIGIN = 'http://rogikotha.invalid';

/**
 * The `?next=` value when it is a path on this site, else null. Refuses absolute and
 * protocol-relative URLs, backslash tricks and control characters, so a link cannot send a reader
 * who signs in to another site.
 */
export function safeNextPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > NEXT_PATH_MAX) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  // eslint-disable-next-line no-control-regex -- control characters are exactly what is refused.
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw, PLACEHOLDER_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return null;
  // Dot segments normalise '/.//evil.example' to '//evil.example', so the raw check above is not enough.
  if (url.pathname.startsWith('//')) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Second path segments a return target may never name: the auth pages, the API and staff. */
const REFUSED_SECTIONS: ReadonlySet<string> = new Set([
  'register',
  'sign-in',
  'verify-email',
  'reset-password',
  'api',
  'admin',
]);

/**
 * BR1.5: a `next` or `returnTo` target is a same-site path with a locale prefix that is not an
 * auth page, `/api` or `/admin`. The path is decoded once and compared in lower case, so
 * `/en/%61dmin` and `/bn/SIGN-IN` are refused; the original, undecoded path is returned.
 */
export function safeAuthNext(raw: unknown): string | null {
  const path = safeNextPath(raw);
  if (path === null) return null;
  const pathname = path.split(/[?#]/, 1)[0] ?? '';
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('%') || decoded.includes('\\') || decoded.includes('//')) return null;
  const segments = decoded.toLowerCase().split('/');
  if (!isLocale(segments[1] ?? '')) return null;
  if (REFUSED_SECTIONS.has(segments[2] ?? '')) return null;
  return path;
}

export interface PendingEmail {
  email: string;
  next: string | null;
}

/** The cookie value register writes: the normalised address and the sanitised `next`. */
export function serialisePendingCookie(pending: PendingEmail): string {
  return JSON.stringify(
    pending.next ? { email: pending.email, next: pending.next } : { email: pending.email },
  );
}

/**
 * BR2.2: reads `rk.pending` on every use. A value that does not parse, or an address the account
 * email schema refuses, makes the whole cookie count as absent; an unsafe `next` is dropped.
 */
export function readPendingCookie(value: string | undefined): PendingEmail | null {
  if (!value) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { email, next } = parsed as { email?: unknown; next?: unknown };
  const checked = ResendVerificationInput.safeParse({ email });
  if (!checked.success) return null;
  return { email: checked.data.email, next: safeAuthNext(next) };
}
