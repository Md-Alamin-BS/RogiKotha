// Input schemas for the `account` command catalogue
// (03-routes-and-contracts.md §4 "account (T-101, T-102, T-103, T-105)").
// `account.signIn` has no schema here: it is handled directly by Better
// Auth (01-conventions.md §1/§2); the application hook that maps a Better
// Auth session to an `Actor` is not itself a zod-validated command input.
import { z } from 'zod';

import { LOCALES } from '../enums.js';

/** Exported so other schema files (e.g. community's block commands) can reuse it. */
export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
const PASSWORD_MIN = 10;

export const RegisterInput = z
  .object({
    email: z.string().email(),
    password: z.string().min(PASSWORD_MIN),
    username: z.string().regex(USERNAME_RE),
    displayName: z.string().min(1),
    locale: z.enum(LOCALES),
    // Not `z.literal(true)`: a false value is a valid, well-formed
    // submission that the command refuses with `auth.age_required` /
    // `auth.terms_required`, not a schema-validation failure.
    ageConfirmed: z.boolean(),
    termsAccepted: z.boolean(),
  })
  .strict();

export const ResendVerificationInput = z.object({ email: z.string().email() }).strict();

export const VerifyEmailInput = z.object({ token: z.string().min(1) }).strict();

export const SignOutInput = z.object({}).strict();

export const SignOutEverywhereInput = z.object({}).strict();

export const RequestPasswordResetInput = z.object({ email: z.string().email() }).strict();

export const ResetPasswordInput = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(PASSWORD_MIN),
  })
  .strict();

export const ChangePasswordInput = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(PASSWORD_MIN),
  })
  .strict();

export const ListSessionsInput = z.object({}).strict();

export const UpdatePreferencesInput = z
  .object({
    interfaceLocale: z.enum(LOCALES).optional(),
    emailSecurity: z.boolean().optional(),
    emailModeration: z.boolean().optional(),
    emailEvidence: z.boolean().optional(),
    emailDiscussion: z.boolean().optional(),
  })
  .strict();

export const SubmitFeedbackInput = z.object({ body: z.string().min(1) }).strict();

export const StepUpInput = z.object({ password: z.string().min(1) }).strict();

export const accountSchemas = {
  RegisterInput,
  ResendVerificationInput,
  VerifyEmailInput,
  SignOutInput,
  SignOutEverywhereInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  ChangePasswordInput,
  ListSessionsInput,
  UpdatePreferencesInput,
  SubmitFeedbackInput,
  StepUpInput,
};
