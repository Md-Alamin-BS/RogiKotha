// Attachment data functions of the demo slice (FR5). Signatures fixed by the foundation step;
// bodies written by the attachments step (plan Step 9).
import {
  newPublicId,
  type CustodyEvent,
  type DemoAddEvidenceInput,
  type DemoOwnEvidenceRow,
  type DemoScanResult,
  type EvidenceFailReason,
  type EvidenceState,
} from '@rogikotha/contracts';
import { and, asc, count, eq, inArray } from 'drizzle-orm';

import type { Db } from '../client';
import { evidenceArtifacts, evidenceCustodyEvents, evidenceItems } from '../schema/evidence';

/**
 * The evidence state the demo treats as "ready": shown to the author and counted publicly.
 * ASSUMPTION(demo-slice): `preview_ready`, not `published`, because the slice publishes no
 * redacted derivative; the public sees only the note and the count (Q3).
 */
export const DEMO_READY_EVIDENCE_STATE = 'preview_ready' satisfies EvidenceState;

/**
 * Every state counted as a ready file: a clean upload (`DEMO_READY_EVIDENCE_STATE`) and the
 * seeded files, which are already `published`.
 * ASSUMPTION(demo-slice): `published` is the end of the full pipeline, so it is at least as ready.
 */
export const DEMO_READY_EVIDENCE_STATES = [
  DEMO_READY_EVIDENCE_STATE,
  'published',
] as const satisfies readonly EvidenceState[];

// Custody actor for the scan result: the web process runs the scan, not the worker.
const SCANNER_ACTOR = 'system:scanner';

interface ScanTransition {
  state: EvidenceState;
  failReason: EvidenceFailReason | null;
  events: CustodyEvent[];
}

const SCAN_TRANSITIONS: Record<DemoScanResult, ScanTransition> = {
  clean: {
    state: DEMO_READY_EVIDENCE_STATE,
    failReason: null,
    events: ['scan_clean', 'preview_ready'],
  },
  infected: { state: 'rejected', failReason: 'malware', events: ['scan_detected'] },
  // Fail closed (FD-035, Q3): the item never advances when the scan could not run.
  error: { state: 'quarantined', failReason: 'scanner_unavailable', events: ['scan_unavailable'] },
};

/**
 * Inserts an `evidence_items` row (`group = 'reviewed'`, `state = 'quarantined'`, declared and
 * detected MIME = `mime`, a new public id), its `evidence_artifacts` original (`kind = 'original'`,
 * `public = false`) and a `received` custody event, in one transaction.
 */
export async function addEvidenceItem(
  db: Db,
  input: DemoAddEvidenceInput,
): Promise<{ id: string; publicId: string }> {
  return db.transaction(async (tx) => {
    const [item] = await tx
      .insert(evidenceItems)
      .values({
        publicId: newPublicId(),
        reviewId: input.reviewId,
        group: 'reviewed',
        state: 'quarantined',
        declaredMime: input.mime,
        detectedMime: input.mime,
        originalBytes: input.size,
        originalSha256: input.sha256,
        originalFilenameEnc: Buffer.from(input.originalFilenameEnc),
        uploadedByAccountId: input.ownerAccountId,
      })
      .returning({ id: evidenceItems.id, publicId: evidenceItems.publicId });
    await tx.insert(evidenceArtifacts).values({
      itemId: item!.id,
      kind: 'original',
      storageKey: input.storageKey,
      sha256: input.sha256,
      bytes: input.size,
      mime: input.mime,
      public: false,
    });
    // No file name in the custody details: it is private (02-data-model.md §7).
    await tx.insert(evidenceCustodyEvents).values({
      itemId: item!.id,
      event: 'received',
      actor: `account:${input.ownerAccountId}`,
      details: { bytes: input.size, mime: input.mime },
    });
    return item!;
  });
}

/**
 * Records the ClamAV result and its custody event. `clean` moves the item to
 * `DEMO_READY_EVIDENCE_STATE`; `infected` to `rejected` with `fail_reason = 'malware'`; `error`
 * leaves it `quarantined` with `fail_reason = 'scanner_unavailable'` (fail closed, Q3).
 * Only a `quarantined` item takes a scan result; any other item is left as it is.
 */
export async function markScanResult(
  db: Db,
  evidenceId: string,
  result: DemoScanResult,
): Promise<void> {
  const transition = SCAN_TRANSITIONS[result];
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(evidenceItems)
      .set({ state: transition.state, failReason: transition.failReason, updatedAt: new Date() })
      .where(and(eq(evidenceItems.id, evidenceId), eq(evidenceItems.state, 'quarantined')))
      .returning({ id: evidenceItems.id });
    if (updated.length === 0) return;
    await tx.insert(evidenceCustodyEvents).values(
      transition.events.map((event) => ({
        itemId: evidenceId,
        event,
        actor: SCANNER_ACTOR,
        details: { result },
      })),
    );
  });
}

/** The author's files on one experience, oldest first; empty when `accountId` did not upload them. */
export async function listOwnEvidence(
  db: Db,
  reviewId: string,
  accountId: string,
): Promise<DemoOwnEvidenceRow[]> {
  const rows = await db
    .select({
      id: evidenceItems.id,
      publicId: evidenceItems.publicId,
      state: evidenceItems.state,
      declaredMime: evidenceItems.declaredMime,
      detectedMime: evidenceItems.detectedMime,
      size: evidenceItems.originalBytes,
      originalFilenameEnc: evidenceItems.originalFilenameEnc,
      createdAt: evidenceItems.createdAt,
    })
    .from(evidenceItems)
    .where(
      and(eq(evidenceItems.reviewId, reviewId), eq(evidenceItems.uploadedByAccountId, accountId)),
    )
    .orderBy(asc(evidenceItems.createdAt), asc(evidenceItems.id));
  return rows.map(({ declaredMime, detectedMime, ...row }) => ({
    ...row,
    mime: detectedMime ?? declaredMime,
  }));
}

/** Files in `DEMO_READY_EVIDENCE_STATES` on one experience: the only count the public sees. */
export async function countReadyEvidence(db: Db, reviewId: string): Promise<number> {
  const [row] = await db
    .select({ ready: count() })
    .from(evidenceItems)
    .where(
      and(
        eq(evidenceItems.reviewId, reviewId),
        inArray(evidenceItems.state, DEMO_READY_EVIDENCE_STATES),
      ),
    );
  return row?.ready ?? 0;
}
