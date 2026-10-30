// Turns a command's raw input into a typed value or a `validation`-family error (T-101 BR1.1,
// BR7.11). It lives here because `application` may import no external package (FD-093), so the
// zod parse and the issue mapping stay inside `contracts`.
import type { z } from 'zod';

import type { ErrorCode } from './errors';
import { err, ok, type Result } from './result';

/** A command input schema; `application` only ever passes these to `parseInput`. */
export type InputSchema<T> = z.ZodType<T>;

const GENERIC_FIELD_KEY = 'errors.common.validation';

/**
 * Field-error keys that, when they are the only problem, answer with their own code instead of
 * `validation` ("one problem returns its own code; several return validation", BR1.1).
 */
export const FIELD_KEY_CODES: Readonly<Record<string, ErrorCode>> = {
  'errors.auth.passwordTooShort': 'auth.password_too_short',
  'errors.auth.passwordEqualsEmail': 'auth.password_equals_email',
  'errors.auth.usernameInvalid': 'auth.username_invalid',
  'errors.auth.usernameTaken': 'auth.username_taken',
  'errors.auth.ageRequired': 'auth.age_required',
  'errors.auth.termsRequired': 'auth.terms_required',
  'errors.auth.invalidCredentials': 'auth.invalid_credentials',
  'errors.auth.tokenInvalid': 'auth.token_invalid',
};

function fieldKeyOf(message: string): string {
  // A zod default message is English prose, never an i18n key; it must not reach the page.
  return message.startsWith('errors.') ? message : GENERIC_FIELD_KEY;
}

/** The first problem per field, keyed by the dotted path; issues without a path are dropped. */
export function fieldErrorsFromIssues(issues: z.ZodError['issues']): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    if (issue.path.length === 0) continue;
    const field = issue.path.map(String).join('.');
    fieldErrors[field] ??= fieldKeyOf(issue.message);
  }
  return fieldErrors;
}

export function parseInput<T>(
  schema: InputSchema<T>,
  raw: unknown,
  opts?: { correlationId?: string },
): Result<T> {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return ok(parsed.data);

  const fieldErrors = fieldErrorsFromIssues(parsed.error.issues);
  const keys = Object.values(fieldErrors);
  const hasPathlessIssue = parsed.error.issues.some((issue) => issue.path.length === 0);
  const single = keys.length === 1 && !hasPathlessIssue ? keys[0] : undefined;
  const code: ErrorCode = (single !== undefined ? FIELD_KEY_CODES[single] : undefined) ?? 'validation';

  const errOpts: { fieldErrors?: Record<string, string>; correlationId?: string } = {};
  if (keys.length > 0) errOpts.fieldErrors = fieldErrors;
  if (opts?.correlationId !== undefined) errOpts.correlationId = opts.correlationId;
  return err(code, errOpts);
}
