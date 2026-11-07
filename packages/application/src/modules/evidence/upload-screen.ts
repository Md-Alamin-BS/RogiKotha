// BR2.1 and BR2.2 on what the route measured before it writes anything, shared by the route and
// `evidence.intake` so the two cannot drift. The web tier may not import `domain` (T-010 matrix),
// so the route reaches these through the application layer.
import type { ErrorCode } from '@rogikotha/contracts';
import {
  cleanFilename,
  detectImageType,
  EVIDENCE_IMAGE_MIMES,
  EVIDENCE_MAX_FILE_BYTES,
  EVIDENCE_UPLOAD_CONTENT_LENGTH_CAP,
  extensionMatches,
  type EvidenceImageMime,
} from '@rogikotha/domain';

export { detectImageType, EVIDENCE_MAX_FILE_BYTES, EVIDENCE_UPLOAD_CONTENT_LENGTH_CAP };
export type { EvidenceImageMime };

/** How many leading bytes `detectImageType` reads (WF1 step 5). */
export const EVIDENCE_HEAD_BYTES = 16;

export interface UploadFileFacts {
  /** The browser-sent name, uncleaned. */
  declaredName: string;
  declaredMime: string;
  /** `detectImageType` over the head; null when it is neither PNG nor JPEG. */
  detectedMime: EvidenceImageMime | null;
  bytes: number;
}

export type UploadScreen =
  | { ok: true; name: string; mime: EvidenceImageMime }
  | { ok: false; code: Extract<ErrorCode, 'evidence.type_rejected' | 'evidence.too_large'> };

const isImageMime = (mime: string): mime is EvidenceImageMime =>
  (EVIDENCE_IMAGE_MIMES as readonly string[]).includes(mime);

/** An empty file is `type_rejected`; the type is judged before the size (BR2.1, BR2.2). */
export function screenUploadFile(facts: UploadFileFacts): UploadScreen {
  const name = cleanFilename(facts.declaredName);
  const declared = facts.declaredMime.toLowerCase();
  if (facts.bytes === 0) return { ok: false, code: 'evidence.type_rejected' };
  if (
    name === null ||
    !isImageMime(declared) ||
    facts.detectedMime !== declared ||
    !extensionMatches(name, declared)
  ) {
    return { ok: false, code: 'evidence.type_rejected' };
  }
  if (facts.bytes > EVIDENCE_MAX_FILE_BYTES) return { ok: false, code: 'evidence.too_large' };
  return { ok: true, name, mime: declared };
}
