// ErrorCode union — copied verbatim from docs/implementation/03-routes-and-contracts.md
// §2. Do not invent codes here; a new code is added to that doc first, then
// copied here in the same commit.
export const ERROR_CODES = [
  'auth.invalid_credentials',
  'auth.email_unverified',
  'auth.rate_limited',
  'auth.token_invalid',
  'auth.token_expired',
  'auth.step_up_required',
  'auth.device_unapproved',
  'auth.password_too_short',
  'auth.username_taken',
  'auth.username_invalid',
  'auth.age_required',
  'auth.terms_required',
  'forbidden',
  'not_found',
  'conflict',
  'validation',
  'rate_limited',
  'internal',
  'review.min_fields',
  'review.attestation_required',
  'review.not_editable',
  'review.restore_expired',
  'evidence.too_many',
  'evidence.too_large',
  'evidence.total_too_large',
  'evidence.type_rejected',
  'evidence.not_previewable',
  'evidence.confirmation_required',
  'community.reply_depth',
  'community.blocked',
  'community.mention_anonymous',
  'moderation.duplicate_report',
  'moderation.narrative_locked',
  'moderation.self_appeal_review',
  'config.invariant',
  'config.out_of_range',
  'retention.preview_drift',
  'hold.active',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface AppError {
  /** Stable, e.g. 'auth.invalid_credentials'. */
  code: ErrorCode;
  /** i18n key, e.g. 'errors.auth.invalidCredentials' (exists in en.json and bn.json). */
  messageKey: string;
  /** field -> messageKey */
  fieldErrors?: Record<string, string>;
  correlationId: string;
  /** present on rate-limit errors */
  retryAfterSec?: number;
}

function snakeToCamel(name: string): string {
  return name.replace(/_([a-z0-9])/g, (_match, c: string) => c.toUpperCase());
}

/**
 * Derives the i18n message key for a code: codes without a `prefix.` part
 * map to `errors.common.<camelCaseName>`; codes with a prefix map to
 * `errors.<prefix>.<camelCaseName>` (e.g. `auth.invalid_credentials` ->
 * `errors.auth.invalidCredentials`).
 */
export function errorMessageKey(code: ErrorCode): string {
  const dotIndex = code.indexOf('.');
  if (dotIndex === -1) {
    return `errors.common.${snakeToCamel(code)}`;
  }
  const prefix = code.slice(0, dotIndex);
  const name = code.slice(dotIndex + 1);
  return `errors.${prefix}.${snakeToCamel(name)}`;
}

/**
 * Thrown only for programmer errors (invariant violations, malformed
 * internal data). Never thrown for expected failures — those return
 * `err(...)` (see result.ts). Route handlers and server actions convert an
 * uncaught throw into `err('internal', …)` with a fresh correlation id.
 */
export class InternalError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'InternalError';
  }
}
