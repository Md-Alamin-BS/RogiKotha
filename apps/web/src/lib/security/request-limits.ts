// The upload request cap (ENT-010, BR4.2, BR4.3, WF3). The route computes the cap from U48's
// EVIDENCE_MAX_FILE_BYTES, because `lib/` may not import the domain package (FD-093 (6)).
import type { OriginDecision } from './origin';

/** Multipart boundaries, part headers and the two small form fields of one upload. */
export const UPLOAD_OVERHEAD_BYTES = 65_536;

const DECLARED_LENGTH = /^[0-9]{1,15}$/;

export type CappedFormData = { ok: FormData } | { refused: 'too_large' } | { malformed: true };

/** Checks Content-Length before any byte of the body is read; absent means chunked (BR4.2). */
export function checkDeclaredLength(headers: Headers, maxBytes: number): OriginDecision {
  const declared = headers.get('content-length');
  if (declared === null) return { outcome: 'allowed' };
  if (!DECLARED_LENGTH.test(declared)) return { outcome: 'refused', kind: 'length_invalid' };
  if (Number(declared) > maxBytes) return { outcome: 'refused', kind: 'too_large' };
  return { outcome: 'allowed' };
}

/**
 * Parses the form through a counting stream that cancels the source and errors once the running
 * total passes `maxBytes`, so the server stops pulling bytes (BR4.3).
 */
export async function readCappedFormData(
  request: Request,
  maxBytes: number,
): Promise<CappedFormData> {
  const source = request.body;
  // A body another reader already holds cannot be counted, so it is not parsed either.
  if (source === null || source.locked) return { malformed: true };
  const reader = source.getReader();
  let total = 0;
  let exceeded = false;
  // A pull-driven wrapper rather than a pipe, so the source is cancelled (and stops being
  // pulled) before the parse rejects, not some ticks later.
  const counted = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        exceeded = true;
        await reader.cancel();
        controller.error(new RangeError('request body limit exceeded'));
        return;
      }
      controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  const headers = new Headers(request.headers);
  // The counted stream is the body now; a stale declared length must not describe it.
  headers.delete('content-length');
  try {
    const form = await new Request(request.url, {
      method: 'POST',
      headers,
      body: counted,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' }).formData();
    return { ok: form };
  } catch {
    return exceeded ? { refused: 'too_large' } : { malformed: true };
  }
}
