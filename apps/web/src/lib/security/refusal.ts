// What a refused request receives (ENT-009, BR3.6): never an echo of the request. The proxy form
// has an empty body; the route form is the C14 AppError body.
import { errorMessageKey, type AppError, type ErrorCode } from '@rogikotha/contracts';
import type { RefusalKind } from './origin';

/** `settings_invalid` is the 500 of BR7.1; the other reasons are request verdicts. */
export type RefusalReason = RefusalKind | 'settings_invalid';

export const REFUSAL_MESSAGE_KEYS = {
  forbidden: 'errors.common.forbidden',
  validation: 'errors.common.validation',
  internal: 'errors.common.internal',
} as const;

interface RefusalShape {
  status: number;
  code: ErrorCode;
}

const SHAPES: Readonly<Record<RefusalReason, RefusalShape>> = {
  host: { status: 403, code: 'forbidden' },
  forwarded_host: { status: 403, code: 'forbidden' },
  origin: { status: 403, code: 'forbidden' },
  origin_null: { status: 403, code: 'forbidden' },
  origin_missing: { status: 403, code: 'forbidden' },
  length_invalid: { status: 400, code: 'validation' },
  too_large: { status: 413, code: 'evidence.too_large' },
  settings_invalid: { status: 500, code: 'internal' },
};

export function refusalStatus(reason: RefusalReason): number {
  return SHAPES[reason].status;
}

/**
 * Without `correlationId` this is the proxy form (empty body); with it, the route-handler form.
 * `messageKey` overrides the derived key, for the upload route's too-large key (design § 5).
 */
export function refusalResponse(
  reason: RefusalReason,
  correlationId?: string,
  messageKey?: string,
): Response {
  const shape = SHAPES[reason];
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  // BR4.2: the server stops reading a body it has refused by its declared length.
  if (reason === 'length_invalid' || reason === 'too_large') headers.set('Connection', 'close');
  if (correlationId === undefined) {
    return new Response(null, { status: shape.status, headers });
  }
  const body: AppError = {
    code: shape.code,
    messageKey: messageKey ?? errorMessageKey(shape.code),
    correlationId,
  };
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { status: shape.status, headers });
}
