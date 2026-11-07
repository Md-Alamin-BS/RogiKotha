// `POST /api/evidence/upload` (U48 WF1, C14): one JPEG or PNG into private quarantine for the
// actor's own published review. Answers `200 [{itemId, state}]` or `{error: {code, messageKey,
// correlationId}}` with the statuses of functional-spec § 4 "Upload request outcome". No route
// reads an original back (BR3.5); scanning is the worker's (BR8.2).
import {
  detectImageType,
  EVIDENCE_HEAD_BYTES,
  EVIDENCE_MAX_FILE_BYTES,
  EVIDENCE_UPLOAD_CONTENT_LENGTH_CAP,
  screenUploadFile,
  type EvidenceByteStream,
  type EvidenceUploadAnswer,
} from '@rogikotha/application';
import { EvidenceUploadFields, newId, PUBLIC_ID_RE, type ErrorCode } from '@rogikotha/contracts';

import { getRequestContext } from '@/server/auth';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';

/** The uploader's copy keys (frontend-components § Upload errors). */
type UploadMessageKey =
  | 'errors.evidence.typeRejected'
  | 'errors.evidence.tooLarge'
  | 'errors.evidence.tooMany'
  | 'errors.evidence.totalTooLarge'
  | 'ev.upload.errors.noFile'
  | 'ev.upload.errors.signedOut'
  | 'ev.upload.errors.unconfirmed'
  | 'ev.upload.errors.notFound'
  | 'ev.upload.errors.rateLimited'
  | 'ev.upload.errors.failed';

interface Refusal {
  status: number;
  code: ErrorCode;
  messageKey: UploadMessageKey;
}

const NO_STORE = { 'Cache-Control': 'no-store' };

const SIGNED_OUT: Refusal = {
  status: 401,
  code: 'forbidden',
  messageKey: 'ev.upload.errors.signedOut',
};
const UNCONFIRMED: Refusal = {
  status: 403,
  code: 'auth.email_unverified',
  messageKey: 'ev.upload.errors.unconfirmed',
};
const NOT_FOUND: Refusal = {
  status: 404,
  code: 'not_found',
  messageKey: 'ev.upload.errors.notFound',
};
const NO_FILE: Refusal = { status: 400, code: 'validation', messageKey: 'ev.upload.errors.noFile' };
// ASSUMPTION(U48): a malformed idempotency key or field is a client fault with the generic copy;
// the design names no key for it.
const BAD_FIELDS: Refusal = {
  status: 400,
  code: 'validation',
  messageKey: 'ev.upload.errors.failed',
};
const FAILED: Refusal = {
  status: 500,
  code: 'evidence.upload_failed',
  messageKey: 'ev.upload.errors.failed',
};
const TOO_LARGE: Refusal = {
  status: 400,
  code: 'evidence.too_large',
  messageKey: 'errors.evidence.tooLarge',
};

const REFUSAL_OF: Partial<Record<ErrorCode, Refusal>> = {
  forbidden: SIGNED_OUT,
  'auth.email_unverified': UNCONFIRMED,
  not_found: NOT_FOUND,
  validation: BAD_FIELDS,
  'evidence.type_rejected': {
    status: 400,
    code: 'evidence.type_rejected',
    messageKey: 'errors.evidence.typeRejected',
  },
  'evidence.too_large': TOO_LARGE,
  'evidence.too_many': {
    status: 400,
    code: 'evidence.too_many',
    messageKey: 'errors.evidence.tooMany',
  },
  'evidence.total_too_large': {
    status: 400,
    code: 'evidence.total_too_large',
    messageKey: 'errors.evidence.totalTooLarge',
  },
  'evidence.rate_limited': {
    status: 429,
    code: 'evidence.rate_limited',
    messageKey: 'ev.upload.errors.rateLimited',
  },
};

function refuse(refusal: Refusal, correlationId: string, retryAfterSec?: number): Response {
  const headers: Record<string, string> = { ...NO_STORE };
  if (retryAfterSec !== undefined) headers['Retry-After'] = String(retryAfterSec);
  return Response.json(
    {
      error: {
        code: refusal.code,
        messageKey: refusal.messageKey,
        correlationId,
        ...(retryAfterSec === undefined ? {} : { retryAfterSec }),
      },
    },
    { status: refusal.status, headers },
  );
}

function refuseCode(code: ErrorCode, correlationId: string, retryAfterSec?: number): Response {
  return refuse(REFUSAL_OF[code] ?? FAILED, correlationId, retryAfterSec);
}

function answer(item: EvidenceUploadAnswer): Response {
  return Response.json([{ itemId: item.itemId, state: item.state }], {
    status: 200,
    headers: NO_STORE,
  });
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown';
}

/** `File.stream()` read chunk by chunk, so the writer keeps its own byte counter (BR2.2). */
async function* bytesOf(stream: ReadableStream<Uint8Array>): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

/** BR3.4: the quarantined key goes on every refusal; a failed delete is logged and left to retention. */
async function deleteQuietly(key: string, correlationId: string): Promise<void> {
  const { evidence, ports } = getContainer();
  try {
    await evidence.files.delete(key);
  } catch (error) {
    ports.logger.error('evidence.quarantine_delete_failed', {
      correlationId,
      errorCode: errorName(error),
    });
  }
}

// ASSUMPTION(U48): U41 owns the origin check and the Content-Length cap (WF1 step 1). Its lines
// are not on the base yet, so the cap is enforced here and a missing length is refused, which
// keeps the in-memory body bounded; U41 replaces these lines.
function contentLengthRefusal(request: Request, correlationId: string): Response | null {
  const declared = request.headers.get('content-length');
  const length = declared === null || !/^\d+$/.test(declared) ? null : Number(declared);
  if (length === null) {
    return refuse(
      { status: 411, code: 'validation', messageKey: 'ev.upload.errors.failed' },
      correlationId,
    );
  }
  return length > EVIDENCE_UPLOAD_CONTENT_LENGTH_CAP ? refuse(TOO_LARGE, correlationId) : null;
}

async function upload(request: Request, trace: { correlationId: string }): Promise<Response> {
  const capped = contentLengthRefusal(request, trace.correlationId);
  if (capped) return capped;

  const { actor } = await getRequestContext();
  // The commands log under the actor's id, so the answer and the logs share it.
  trace.correlationId = actor.correlationId;
  const { correlationId } = trace;
  if (actor.kind !== 'account') return refuse(SIGNED_OUT, correlationId);
  if (actor.emailVerified !== true) return refuse(UNCONFIRMED, correlationId);

  const { evidence } = getContainer();
  const admitted = await runCommand(evidence.admitUpload, {});
  if (!admitted.ok) {
    return refuseCode(admitted.error.code, correlationId, admitted.error.retryAfterSec);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return refuse(NO_FILE, correlationId);
  }
  const reviewPublicId = form.get('reviewPublicId');
  if (typeof reviewPublicId !== 'string' || !PUBLIC_ID_RE.test(reviewPublicId)) {
    return refuse(NOT_FOUND, correlationId);
  }
  const fields = EvidenceUploadFields.safeParse({
    reviewPublicId,
    idempotencyKey: form.get('idempotencyKey'),
  });
  if (!fields.success) return refuse(BAD_FIELDS, correlationId);
  // Q7: exactly one file part per request.
  const parts = form.getAll('file');
  const file = parts.length === 1 ? parts[0] : undefined;
  if (!(file instanceof File)) return refuse(NO_FILE, correlationId);

  const head = new Uint8Array(await file.slice(0, EVIDENCE_HEAD_BYTES).arrayBuffer());
  const detectedMime = detectImageType(head);
  const screen = screenUploadFile({
    declaredName: file.name,
    declaredMime: file.type,
    detectedMime,
    bytes: file.size,
  });
  if (!screen.ok) return refuseCode(screen.code, correlationId);

  const { idempotencyKey } = fields.data;
  const checked = await runCommand(evidence.checkUpload, {
    reviewPublicId,
    idempotencyKey,
    bytes: file.size,
  });
  if (!checked.ok) return refuseCode(checked.error.code, correlationId);
  if ('existing' in checked.data) return answer(checked.data.existing);

  const stream: EvidenceByteStream = bytesOf(file.stream());
  const stored = await evidence.files.putQuarantined(stream, {
    maxBytes: EVIDENCE_MAX_FILE_BYTES,
  });
  if (!stored.ok) return refuse(TOO_LARGE, correlationId);
  const { key } = stored.data;

  try {
    const intake = await runCommand(evidence.intake, {
      reviewPublicId,
      idempotencyKey,
      declaredMime: file.type,
      declaredName: file.name,
      file: { key, bytes: stored.data.bytes, sha256: stored.data.sha256, detectedMime },
    });
    if (!intake.ok) {
      await deleteQuietly(key, correlationId);
      return refuseCode(intake.error.code, correlationId);
    }
    if (!intake.data.created) await deleteQuietly(key, correlationId);
    return answer(intake.data);
  } catch (error) {
    await deleteQuietly(key, correlationId);
    throw error;
  }
}

export async function POST(request: Request): Promise<Response> {
  const trace = { correlationId: newId() };
  try {
    return await upload(request, trace);
  } catch (error) {
    getContainer().ports.logger.error('evidence.upload_failed', {
      correlationId: trace.correlationId,
      errorCode: errorName(error),
    });
    return refuse(FAILED, trace.correlationId);
  }
}
