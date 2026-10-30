// Input schemas for the `account` command catalogue
// (03-routes-and-contracts.md §4 "account (T-101, T-102, T-103, T-105)").
// Every field failure carries its i18n field-error key as the issue message: the keys are
// exactly T-102's ENT-004 list (T-101 BR1.1), and `parseInput` turns them into `fieldErrors`.
// Each schema has a same-named output type, so `application` never needs zod itself (FD-093).
import { z } from 'zod';

import { LOCALES } from '../enums';

/** Exported so other schema files (e.g. community's block commands) can reuse it. */
export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 256;
export const DISPLAY_NAME_MAX = 60;
export const EMAIL_MAX = 254;
export const FEEDBACK_BODY_MAX = 2000;
// ASSUMPTION(T-101): no library token is longer; a cap keeps a huge string away from the lookup.
const TOKEN_MAX = 2048;

/** The field-error keys of T-102's ENT-004 that a schema emits. */
export const ACCOUNT_FIELD_ERROR_KEYS = {
  emailInvalid: 'errors.auth.emailInvalid',
  passwordTooShort: 'errors.auth.passwordTooShort',
  passwordTooLong: 'errors.auth.passwordTooLong',
  passwordEqualsEmail: 'errors.auth.passwordEqualsEmail',
  usernameInvalid: 'errors.auth.usernameInvalid',
  displayNameRequired: 'errors.auth.displayNameRequired',
  ageRequired: 'errors.auth.ageRequired',
  termsRequired: 'errors.auth.termsRequired',
  invalidCredentials: 'errors.auth.invalidCredentials',
  tokenInvalid: 'errors.auth.tokenInvalid',
  validation: 'errors.common.validation',
} as const;

const K = ACCOUNT_FIELD_ERROR_KEYS;

/** NFC, trimmed, lowercase: what "normalised email" means everywhere in T-101. */
export function normaliseEmail(email: string): string {
  return email.normalize('NFC').trim().toLowerCase();
}

/**
 * True when the password, normalised the same way as an email, equals the normalised email.
 * ASSUMPTION(T-101): the comparison ignores case and surrounding spaces, so `Shirin@Example.test`
 * as a password is refused for `shirin@example.test`.
 */
export function passwordEqualsEmail(password: string, email: string): boolean {
  return normaliseEmail(password) === normaliseEmail(email);
}

const emailField = () =>
  z
    .string({ error: K.emailInvalid })
    .transform(normaliseEmail)
    .pipe(z.email({ error: K.emailInvalid }).max(EMAIL_MAX, { error: K.emailInvalid }));

const newPasswordField = () =>
  z
    .string({ error: K.passwordTooShort })
    .min(PASSWORD_MIN, { error: K.passwordTooShort })
    .max(PASSWORD_MAX, { error: K.passwordTooLong });

const tokenField = () =>
  z
    .string({ error: K.tokenInvalid })
    .min(1, { error: K.tokenInvalid })
    .max(TOKEN_MAX, { error: K.tokenInvalid });

const empty = () => z.object({}).strict();

export const RegisterInput = z
  .object({
    email: emailField(),
    password: newPasswordField(),
    username: z.string({ error: K.usernameInvalid }).regex(USERNAME_RE, { error: K.usernameInvalid }),
    displayName: z
      .string({ error: K.displayNameRequired })
      .trim()
      .min(1, { error: K.displayNameRequired })
      .max(DISPLAY_NAME_MAX, { error: K.displayNameRequired }),
    locale: z.enum(LOCALES, { error: K.validation }),
    // A false value is a well-formed submission refused with its own code (`auth.age_required`,
    // `auth.terms_required`) through `parseInput`'s key-to-code map, as BR1.1 asks.
    ageConfirmed: z.boolean({ error: K.ageRequired }).refine((v) => v, { error: K.ageRequired }),
    termsAccepted: z
      .boolean({ error: K.termsRequired })
      .refine((v) => v, { error: K.termsRequired }),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (passwordEqualsEmail(input.password, input.email)) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: K.passwordEqualsEmail });
    }
  });
export type RegisterInput = z.output<typeof RegisterInput>;

export const ResendVerificationInput = z.object({ email: emailField() }).strict();
export type ResendVerificationInput = z.output<typeof ResendVerificationInput>;

/** Signed-in, pending holder: no address is typed or posted back (BR2.7, FD-096). */
export const ResendOwnVerificationInput = empty();
export type ResendOwnVerificationInput = z.output<typeof ResendOwnVerificationInput>;

export const VerifyEmailInput = z.object({ token: tokenField() }).strict();
export type VerifyEmailInput = z.output<typeof VerifyEmailInput>;

/**
 * Sign-in reveals no password policy: any non-empty password up to the maximum is checked.
 * ASSUMPTION(T-101): an empty or over-long password answers `errors.auth.invalidCredentials`.
 */
export const SignInInput = z
  .object({
    email: emailField(),
    password: z
      .string({ error: K.invalidCredentials })
      .min(1, { error: K.invalidCredentials })
      .max(PASSWORD_MAX, { error: K.invalidCredentials }),
  })
  .strict();
export type SignInInput = z.output<typeof SignInInput>;

export const SignOutInput = empty();
export type SignOutInput = z.output<typeof SignOutInput>;

export const SignOutEverywhereInput = empty();
export type SignOutEverywhereInput = z.output<typeof SignOutEverywhereInput>;

export const RequestPasswordResetInput = z.object({ email: emailField() }).strict();
export type RequestPasswordResetInput = z.output<typeof RequestPasswordResetInput>;

/** "Equals email" is checked by the command against the token's account (review point 1). */
export const ResetPasswordInput = z
  .object({
    token: tokenField(),
    newPassword: newPasswordField(),
  })
  .strict();
export type ResetPasswordInput = z.output<typeof ResetPasswordInput>;

/** "Equals email" is checked by the command against the holder's own address. */
export const ChangePasswordInput = z
  .object({
    currentPassword: z
      .string({ error: K.invalidCredentials })
      .min(1, { error: K.invalidCredentials })
      .max(PASSWORD_MAX, { error: K.invalidCredentials }),
    newPassword: newPasswordField(),
  })
  .strict();
export type ChangePasswordInput = z.output<typeof ChangePasswordInput>;

export const ListSessionsInput = empty();
export type ListSessionsInput = z.output<typeof ListSessionsInput>;

export const GetOwnAccountInput = empty();
export type GetOwnAccountInput = z.output<typeof GetOwnAccountInput>;

export const UpdatePreferencesInput = z
  .object({
    interfaceLocale: z.enum(LOCALES, { error: K.validation }).optional(),
    emailSecurity: z.boolean({ error: K.validation }).optional(),
    emailModeration: z.boolean({ error: K.validation }).optional(),
    emailEvidence: z.boolean({ error: K.validation }).optional(),
    emailDiscussion: z.boolean({ error: K.validation }).optional(),
  })
  .strict();
export type UpdatePreferencesInput = z.output<typeof UpdatePreferencesInput>;

/** Text only in release 1 (FD-097). */
export const SubmitFeedbackInput = z
  .object({
    body: z
      .string({ error: K.validation })
      .trim()
      .min(1, { error: K.validation })
      .max(FEEDBACK_BODY_MAX, { error: K.validation }),
  })
  .strict();
export type SubmitFeedbackInput = z.output<typeof SubmitFeedbackInput>;

export const StepUpInput = z.object({ password: z.string().min(1) }).strict();
export type StepUpInput = z.output<typeof StepUpInput>;

export const accountSchemas = {
  RegisterInput,
  ResendVerificationInput,
  ResendOwnVerificationInput,
  VerifyEmailInput,
  SignInInput,
  SignOutInput,
  SignOutEverywhereInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  ChangePasswordInput,
  ListSessionsInput,
  GetOwnAccountInput,
  UpdatePreferencesInput,
  SubmitFeedbackInput,
  StepUpInput,
};
