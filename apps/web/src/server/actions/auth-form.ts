// Form parsing and state shared by the auth actions (`auth.ts`) and the auth forms. Kept out of
// the `'use server'` file, which may export only async functions.
import { LOCALES, RegisterInput, type Locale } from '@rogikotha/contracts';

export type RegisterField = 'email' | 'password' | 'username' | 'displayName' | 'age' | 'terms';
export type SignInField = 'email' | 'password';

/** What a failed submission returns: i18n message keys, never the submitted values (NFR3). */
export interface AuthFormState<F extends string = string> {
  fieldErrors: Partial<Record<F, string>>;
  formError: string | null;
}

export type RegisterFormState = AuthFormState<RegisterField>;
export type SignInFormState = AuthFormState<SignInField>;

export const INITIAL_AUTH_STATE: AuthFormState<never> = { fieldErrors: {}, formError: null };

/** The visual order of the register form, so the error summary and the tab order agree. */
export const REGISTER_FIELD_ORDER: readonly RegisterField[] = [
  'email',
  'password',
  'username',
  'displayName',
  'age',
  'terms',
];

export const DISPLAY_NAME_MAX = 60;
// Better Auth's default `maxPasswordLength`; checked here so the refusal names the field.
export const PASSWORD_MAX = 128;

const FIELD_MESSAGE: Record<RegisterField, string> = {
  email: 'formErrors.auth.emailInvalid',
  password: 'errors.auth.passwordTooShort',
  username: 'errors.auth.usernameInvalid',
  displayName: 'formErrors.auth.displayNameInvalid',
  age: 'errors.auth.ageRequired',
  terms: 'errors.auth.termsRequired',
};

const SCHEMA_PATH_FIELD: Record<string, RegisterField> = {
  email: 'email',
  password: 'password',
  username: 'username',
  displayName: 'displayName',
  ageConfirmed: 'age',
  termsAccepted: 'terms',
};

const SignInForm = RegisterInput.pick({ email: true, password: true });

export type RegistrationInput = ReturnType<typeof RegisterInput.parse>;

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
    const field = SCHEMA_PATH_FIELD[String(issue.path[0])];
    if (field && !fieldErrors[field]) fieldErrors[field] = FIELD_MESSAGE[field];
  }
  if (result.success && Object.keys(fieldErrors).length === 0) {
    return { ok: true, data: result.data };
  }
  return { ok: false, state: { fieldErrors: orderFields(fieldErrors), formError: null } };
}

/** The limits the form adds to the schema: a false tick is well-formed but refused (schema note). */
function formLimitErrors(raw: {
  password: string;
  displayName: string;
  ageConfirmed: boolean;
  termsAccepted: boolean;
}): Partial<Record<RegisterField, string>> {
  const errors: Partial<Record<RegisterField, string>> = {};
  if (raw.password.length > PASSWORD_MAX) errors.password = 'formErrors.auth.passwordTooLong';
  if (raw.displayName.length > DISPLAY_NAME_MAX) errors.displayName = FIELD_MESSAGE.displayName;
  if (!raw.ageConfirmed) errors.age = FIELD_MESSAGE.age;
  if (!raw.termsAccepted) errors.terms = FIELD_MESSAGE.terms;
  return errors;
}

function orderFields(
  errors: Partial<Record<RegisterField, string>>,
): Partial<Record<RegisterField, string>> {
  const ordered: Partial<Record<RegisterField, string>> = {};
  for (const field of REGISTER_FIELD_ORDER) {
    const message = errors[field];
    if (message) ordered[field] = message;
  }
  return ordered;
}

/**
 * Validates the sign-in form. Any malformed input gets the same neutral refusal as a wrong
 * password, so the form never says which half was wrong (FR1.2).
 */
export function parseSignIn(
  form: FormData,
): Parsed<{ email: string; password: string }, SignInField> {
  const result = SignInForm.safeParse({
    email: text(form, 'email').trim(),
    password: text(form, 'password'),
  });
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, state: { fieldErrors: {}, formError: 'errors.auth.invalidCredentials' } };
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
