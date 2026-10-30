'use server';

import {
  PUBLIC_ID_RE,
  type DemoEvidenceMime,
  type DemoOwnEvidenceRow,
  type DemoScanResult,
} from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getCurrentAccount } from '@/server/auth/session';
import { scanBytes } from '@/server/clamav';
import { decryptToString, encrypt } from '@/server/crypto';
import { DEMO_READY_EVIDENCE_STATES, evidence, reviews } from '@/server/data';
import {
  MAX_EVIDENCE_BYTES,
  MAX_EVIDENCE_PER_REVIEW,
  detectImageMime,
  removeOriginal,
  storeOriginal,
} from '@/server/storage';

// Attachments on an experience (FR5). Only the experience's author uploads and sees the files;
// the public sees the ready count alone (FR5.3). Originals never leave the server.

export type OwnEvidenceStatus = 'ready' | 'pending' | 'rejected';

/** One of the author's files, as the uploader shows it. No storage key, hash or id. */
export interface OwnEvidenceFile {
  publicId: string;
  /** The decrypted original file name; null when it is empty or cannot be decrypted. */
  name: string | null;
  status: OwnEvidenceStatus;
  size: number;
}

export interface OwnEvidenceList {
  reviewPublicId: string;
  files: OwnEvidenceFile[];
  maxFiles: number;
  maxBytes: number;
}

export type EvidenceMessageKey =
  | 'ev.upload.errors.signedOut'
  | 'ev.upload.errors.notFound'
  | 'ev.upload.errors.noFile'
  | 'ev.upload.errors.tooLarge'
  | 'ev.upload.errors.tooMany'
  | 'ev.upload.errors.failed'
  | 'errors.evidence.typeRejected'
  | 'ev.upload.done.ready'
  | 'ev.upload.done.pending'
  | 'ev.upload.done.rejected';

export type EvidenceUploadState =
  | { status: 'idle' }
  | { status: 'error'; messageKey: EvidenceMessageKey }
  | { status: 'uploaded'; scan: DemoScanResult; messageKey: EvidenceMessageKey };

const reviewPublicIdSchema = z.string().regex(PUBLIC_ID_RE);
const uploadSchema = z.object({ reviewPublicId: reviewPublicIdSchema, file: z.instanceof(File) });

const MAX_FILENAME_LENGTH = 200;
const DONE_MESSAGE: Record<DemoScanResult, EvidenceMessageKey> = {
  clean: 'ev.upload.done.ready',
  error: 'ev.upload.done.pending',
  infected: 'ev.upload.done.rejected',
};

function statusOf(row: DemoOwnEvidenceRow): OwnEvidenceStatus {
  if ((DEMO_READY_EVIDENCE_STATES as readonly string[]).includes(row.state)) return 'ready';
  if (row.state === 'rejected') return 'rejected';
  return 'pending';
}

function decryptedName(sealed: Uint8Array): string | null {
  try {
    return decryptToString(sealed) || null;
  } catch {
    // A rotated or wrong key must not break the author's page; the name then reads "Not provided".
    return null;
  }
}

/** Only the last path segment of the browser-sent name, trimmed and bounded. */
function cleanFilename(name: string): string {
  return (name.split(/[\\/]/).pop() ?? '').trim().slice(0, MAX_FILENAME_LENGTH);
}

/** Files that count towards the per-experience limit: everything not rejected by the scan. */
function countsTowardsLimit(row: DemoOwnEvidenceRow): boolean {
  return row.state !== 'rejected';
}

async function findOwnReview(reviewPublicId: string, accountId: string) {
  return reviews.getOwnReviewForEdit(reviewPublicId, accountId);
}

/**
 * The signed-in author's files on their experience, or null for anyone else (signed out, not the
 * author, unknown or malformed id). Pages render the uploader only when this is not null.
 */
export async function listOwnEvidenceFiles(
  reviewPublicId: string,
): Promise<OwnEvidenceList | null> {
  const parsedId = reviewPublicIdSchema.safeParse(reviewPublicId);
  if (!parsedId.success) return null;
  const account = await getCurrentAccount();
  if (!account) return null;
  const review = await findOwnReview(parsedId.data, account.accountId);
  if (!review) return null;

  const rows = await evidence.listOwnEvidence(review.id, account.accountId);
  return {
    reviewPublicId: parsedId.data,
    files: rows.map((row) => ({
      publicId: row.publicId,
      name: decryptedName(row.originalFilenameEnc),
      status: statusOf(row),
      size: row.size,
    })),
    maxFiles: MAX_EVIDENCE_PER_REVIEW,
    maxBytes: MAX_EVIDENCE_BYTES,
  };
}

async function storeScanAndRecord(
  input: { reviewId: string; accountId: string; bytes: Uint8Array; filename: string },
  mime: DemoEvidenceMime,
): Promise<DemoScanResult> {
  const stored = await storeOriginal(input.bytes);
  let item: { id: string };
  try {
    item = await evidence.addEvidenceItem({
      reviewId: input.reviewId,
      ownerAccountId: input.accountId,
      storageKey: stored.storageKey,
      mime,
      size: stored.size,
      sha256: stored.sha256,
      originalFilenameEnc: encrypt(input.filename),
    });
  } catch (error) {
    await removeOriginal(stored.storageKey);
    throw error;
  }

  const scan = await scanBytes(input.bytes);
  // ASSUMPTION(demo-slice): an infected original is deleted from disk at once, before its result
  // is recorded so a failed write cannot keep it; its rejected row and custody events stay.
  if (scan === 'infected') await removeOriginal(stored.storageKey);
  try {
    await evidence.markScanResult(item.id, scan);
  } catch (error) {
    // The item stays quarantined, so a lost result fails closed; report it as pending.
    console.error('evidence scan result not recorded', {
      evidenceId: item.id,
      error: errorName(error),
    });
    return 'error';
  }
  return scan;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown';
}

/**
 * Uploads one JPEG or PNG to the signed-in author's experience, scans it with ClamAV and records
 * the result. Form fields: `reviewPublicId` and `file`.
 */
export async function uploadEvidence(
  _previous: EvidenceUploadState,
  formData: FormData,
): Promise<EvidenceUploadState> {
  const account = await getCurrentAccount();
  if (!account) return { status: 'error', messageKey: 'ev.upload.errors.signedOut' };

  const parsed = uploadSchema.safeParse({
    reviewPublicId: formData.get('reviewPublicId'),
    file: formData.get('file'),
  });
  if (!parsed.success) {
    const idIsValid = reviewPublicIdSchema.safeParse(formData.get('reviewPublicId')).success;
    return {
      status: 'error',
      messageKey: idIsValid ? 'ev.upload.errors.noFile' : 'ev.upload.errors.notFound',
    };
  }
  const { reviewPublicId, file } = parsed.data;
  if (file.size === 0) return { status: 'error', messageKey: 'ev.upload.errors.noFile' };
  if (file.size > MAX_EVIDENCE_BYTES) {
    return { status: 'error', messageKey: 'ev.upload.errors.tooLarge' };
  }

  const review = await findOwnReview(reviewPublicId, account.accountId);
  if (!review) return { status: 'error', messageKey: 'ev.upload.errors.notFound' };

  const existing = await evidence.listOwnEvidence(review.id, account.accountId);
  // ASSUMPTION(demo-slice): the limit is checked before the insert, so two uploads sent at the
  // same instant could both pass; acceptable for the local demo.
  if (existing.filter(countsTowardsLimit).length >= MAX_EVIDENCE_PER_REVIEW) {
    return { status: 'error', messageKey: 'ev.upload.errors.tooMany' };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectImageMime(bytes);
  if (!mime) return { status: 'error', messageKey: 'errors.evidence.typeRejected' };

  let scan: DemoScanResult;
  try {
    scan = await storeScanAndRecord(
      {
        reviewId: review.id,
        accountId: account.accountId,
        bytes,
        filename: cleanFilename(file.name),
      },
      mime,
    );
  } catch (error) {
    console.error('evidence upload failed', { error: errorName(error) });
    return { status: 'error', messageKey: 'ev.upload.errors.failed' };
  }

  revalidatePath('/[locale]/experiences/[id]', 'page');
  revalidatePath('/[locale]/experiences/[id]/edit', 'page');
  return { status: 'uploaded', scan, messageKey: DONE_MESSAGE[scan] };
}
