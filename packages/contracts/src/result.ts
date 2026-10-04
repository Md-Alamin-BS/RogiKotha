// The shape every command and query returns (01-conventions.md §3).
import { errorMessageKey, type AppError, type ErrorCode } from './errors';
import { newId } from './ids';
import type { PageMeta } from './page';

export type Result<T> = { ok: true; data: T; meta?: PageMeta } | { ok: false; error: AppError };

export function ok<T>(data: T, meta?: PageMeta): Result<T> {
  return meta === undefined ? { ok: true, data } : { ok: true, data, meta };
}

export function err(
  code: ErrorCode,
  opts?: { fieldErrors?: Record<string, string>; correlationId?: string; retryAfterSec?: number },
): Result<never> {
  const error: AppError = {
    code,
    messageKey: errorMessageKey(code),
    correlationId: opts?.correlationId ?? newId(),
  };
  if (opts?.fieldErrors !== undefined) error.fieldErrors = opts.fieldErrors;
  if (opts?.retryAfterSec !== undefined) error.retryAfterSec = opts.retryAfterSec;
  return { ok: false, error };
}

export function isOk<T>(r: Result<T>): r is { ok: true; data: T; meta?: PageMeta } {
  return r.ok;
}

/** Tests only — throws on an error result instead of narrowing it. */
export function unwrap<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(`unwrap on error ${r.error.code}`);
  return r.data;
}
