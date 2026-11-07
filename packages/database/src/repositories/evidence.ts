// U48 (T-303, T-304): the Evidence repository (functional-spec § 5). The web tier uses the intake,
// author and count methods; the worker uses `processingFacts`, `stuckItems`, `latestCustody`,
// `transition`, `appendCustody` and `markOriginalDeleted`, whose SQL names its columns so the sealed
// file name and the uploader's account id never leave the database for the worker (BR4.8).
// ASSUMPTION(U48): as the Step 14 port and the Step 15 fake define it, `insertQuarantined` writes
// the item and its original artifact only; the command appends custody `received` and the outbox
// rows through `appendCustody` and the `Outbox` port in the same transaction, so nothing is written
// twice. The release-2 methods at the end stay stubs that name their task.
import type {
  EvidenceCountingTotals,
  EvidenceRepository,
  IdempotentEvidenceRecord,
  NewEvidenceCustody,
  NewQuarantinedEvidence,
  OwnEvidenceRecord,
  OwnedEvidenceRecord,
  ProcessingFacts,
  StuckEvidenceRecord,
  Tx as AppTx,
} from '@rogikotha/application';
import type { CustodyEvent, EvidenceFailReason, EvidenceState } from '@rogikotha/contracts';
import { and, asc, count, desc, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm';

import { uniqueViolationConstraint } from '../pg-error';
import { evidenceArtifacts, evidenceCustodyEvents, evidenceItems } from '../schema/evidence';
import { executorOf } from '../unit-of-work';
import { isUuid } from './identity';
import { NotImplemented } from './not-implemented';

const IDEMPOTENCY_KEY_UNIQUE_CONSTRAINT = 'evidence_items_idempotency_key_unique';

// `database` may not import `domain` (eslint.boundaries.mjs), so the domain lists are restated;
// the integration tests pin which states each one counts.
const COUNTING_STATES = [
  'quarantined',
  'validating',
  'scanning',
  'preview_ready',
  'published',
] as const satisfies readonly EvidenceState[];
const PUBLIC_EVIDENCE_STATES = [
  'preview_ready',
  'published',
] as const satisfies readonly EvidenceState[];
const PROCESSING_STATES = [
  'quarantined',
  'validating',
  'scanning',
] as const satisfies readonly EvidenceState[];
const AUTHOR_HIDDEN_STATES = [
  'removed',
  'original_expired',
] as const satisfies readonly EvidenceState[];

/** The custody `details` keys a row may carry (BR4.7); anything else is dropped before the write. */
export const CUSTODY_DETAIL_KEYS = [
  'failReason',
  'attempt',
  'bytes',
  'mime',
  'scannerVersion',
  'cause',
] as const;

/** The only `evidence_items` columns the worker's SQL reads (BR4.8). */
export const WORKER_ITEM_COLUMNS = [
  'id',
  'review_id',
  'state',
  'created_at',
  'declared_mime',
  'detected_mime',
  'original_bytes',
  'original_sha256',
] as const;

// PostgreSQL 18's `uuidv7()` is monotonic within a session, so `id` orders events of one transaction.
/** The worker's select (BR4.8): the column list, the live original's key and the latest custody. */
export const WORKER_ITEM_SELECT = `select ${WORKER_ITEM_COLUMNS.map((c) => `i.${c}`).join(', ')},
  (select a.storage_key from evidence_artifacts a
    where a.item_id = i.id and a.kind = 'original' and a.deleted_at is null
    order by a.created_at asc, a.id asc limit 1) as storage_key,
  (select c.event from evidence_custody_events c
    where c.item_id = i.id order by c.created_at desc, c.id desc limit 1) as latest_custody
  from evidence_items i`;

interface WorkerItemRow {
  id: string;
  review_id: string;
  state: EvidenceState;
  // A raw `execute` returns timestamptz as text, not as a Date.
  created_at: Date | string;
  declared_mime: string;
  detected_mime: 'image/jpeg' | 'image/png' | null;
  original_bytes: string | number;
  original_sha256: string;
  storage_key: string | null;
  latest_custody: CustodyEvent | null;
}

function custodyDetails(details: NewEvidenceCustody['details']): Record<string, unknown> {
  // No loop at class-body indentation: `repositories-superset.test.ts` reads methods by indent.
  const kept = CUSTODY_DETAIL_KEYS.filter((key) => details[key] !== undefined).map((key) => [
    key,
    details[key],
  ]);
  return Object.fromEntries(kept) as Record<string, unknown>;
}

const workerSelect = sql.raw(WORKER_ITEM_SELECT);

export class PgEvidenceRepository implements EvidenceRepository {
  async lockReview(tx: AppTx, reviewId: string): Promise<void> {
    // An advisory lock needs no UPDATE grant on `reviews` and ends with the transaction.
    await executorOf(tx).execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`evidence.review:${reviewId}`}, 0))`,
    );
  }

  async countCounting(tx: AppTx, reviewId: string): Promise<EvidenceCountingTotals> {
    if (!isUuid(reviewId)) return { count: 0, bytes: 0 };
    const [row] = await executorOf(tx)
      .select({
        count: count(),
        bytes: sql<string>`coalesce(sum(${evidenceItems.originalBytes}), 0)`,
      })
      .from(evidenceItems)
      .where(
        and(eq(evidenceItems.reviewId, reviewId), inArray(evidenceItems.state, COUNTING_STATES)),
      );
    return { count: row?.count ?? 0, bytes: Number(row?.bytes ?? 0) };
  }

  async findByIdempotencyKey(tx: AppTx, key: string): Promise<IdempotentEvidenceRecord | null> {
    const [row] = await executorOf(tx)
      .select({
        id: evidenceItems.id,
        publicId: evidenceItems.publicId,
        reviewId: evidenceItems.reviewId,
        uploadedByAccountId: evidenceItems.uploadedByAccountId,
        state: evidenceItems.state,
      })
      .from(evidenceItems)
      .where(eq(evidenceItems.idempotencyKey, key));
    return row ?? null;
  }

  async insertQuarantined(
    tx: AppTx,
    item: NewQuarantinedEvidence,
  ): Promise<'inserted' | 'key_taken'> {
    try {
      // A savepoint, so a lost idempotency-key race leaves the caller's transaction usable.
      await executorOf(tx).transaction(async (savepoint) => {
        await savepoint.insert(evidenceItems).values({
          id: item.id,
          publicId: item.publicId,
          reviewId: item.reviewId,
          group: 'reviewed',
          state: 'quarantined',
          // The command admits only JPEG and PNG; the table's CHECK refuses anything else.
          declaredMime: item.declaredMime as 'image/jpeg' | 'image/png',
          detectedMime: item.detectedMime,
          originalBytes: item.originalBytes,
          originalSha256: item.originalSha256,
          originalFilenameEnc: Buffer.from(item.originalFilenameEnc),
          uploadedByAccountId: item.uploadedByAccountId,
          idempotencyKey: item.idempotencyKey,
          createdAt: item.now,
        });
        await savepoint.insert(evidenceArtifacts).values({
          id: item.artifactId,
          itemId: item.id,
          kind: 'original',
          storageKey: item.storageKey,
          sha256: item.originalSha256,
          bytes: item.originalBytes,
          mime: item.detectedMime,
          public: false,
          createdAt: item.now,
        });
      });
    } catch (error) {
      if (uniqueViolationConstraint(error) === IDEMPOTENCY_KEY_UNIQUE_CONSTRAINT) {
        return 'key_taken';
      }
      throw error;
    }
    return 'inserted';
  }

  async listForAuthor(
    tx: AppTx,
    reviewId: string,
    accountId: string,
  ): Promise<OwnEvidenceRecord[]> {
    if (!isUuid(reviewId) || !isUuid(accountId)) return [];
    const rows = await executorOf(tx)
      .select({
        publicId: evidenceItems.publicId,
        state: evidenceItems.state,
        failReason: evidenceItems.failReason,
        originalBytes: evidenceItems.originalBytes,
        originalFilenameEnc: evidenceItems.originalFilenameEnc,
        createdAt: evidenceItems.createdAt,
      })
      .from(evidenceItems)
      .where(
        and(
          eq(evidenceItems.reviewId, reviewId),
          eq(evidenceItems.uploadedByAccountId, accountId),
          notInArray(evidenceItems.state, [...AUTHOR_HIDDEN_STATES]),
        ),
      )
      .orderBy(asc(evidenceItems.createdAt), asc(evidenceItems.id));
    return rows.map((row) => ({
      ...row,
      originalFilenameEnc: new Uint8Array(row.originalFilenameEnc),
    }));
  }

  async findOwned(
    tx: AppTx,
    publicId: string,
    accountId: string,
  ): Promise<OwnedEvidenceRecord | null> {
    if (!isUuid(accountId)) return null;
    const [row] = await executorOf(tx)
      .select({
        id: evidenceItems.id,
        reviewId: evidenceItems.reviewId,
        state: evidenceItems.state,
        storageKey: evidenceArtifacts.storageKey,
      })
      .from(evidenceItems)
      .leftJoin(
        evidenceArtifacts,
        and(
          eq(evidenceArtifacts.itemId, evidenceItems.id),
          eq(evidenceArtifacts.kind, 'original'),
          isNull(evidenceArtifacts.deletedAt),
        ),
      )
      .where(
        and(eq(evidenceItems.publicId, publicId), eq(evidenceItems.uploadedByAccountId, accountId)),
      )
      .limit(1);
    return row ?? null;
  }

  async processingFacts(tx: AppTx, itemId: string): Promise<ProcessingFacts | null> {
    if (!isUuid(itemId)) return null;
    const result = await executorOf(tx).execute(sql`${workerSelect} where i.id = ${itemId}`);
    const row = (result.rows as unknown as WorkerItemRow[])[0];
    if (row === undefined) return null;
    return {
      id: row.id,
      reviewId: row.review_id,
      state: row.state,
      detectedMime: row.detected_mime,
      originalBytes: Number(row.original_bytes),
      originalSha256: row.original_sha256,
      createdAt: new Date(row.created_at),
      storageKey: row.storage_key,
      latestCustody: row.latest_custody,
    };
  }

  async stuckItems(tx: AppTx, olderThan: Date, limit: number): Promise<StuckEvidenceRecord[]> {
    const states = sql.join(
      PROCESSING_STATES.map((state) => sql`${state}`),
      sql`, `,
    );
    const result = await executorOf(tx).execute(
      sql`${workerSelect}
        where i.state in (${states}) and i.created_at < ${olderThan.toISOString()}
        order by i.created_at asc, i.id asc
        limit ${limit}
        for update of i skip locked`,
    );
    return (result.rows as unknown as WorkerItemRow[]).map((row) => ({
      id: row.id,
      reviewId: row.review_id,
      state: row.state,
      storageKey: row.storage_key,
      latestCustody: row.latest_custody,
    }));
  }

  async latestCustody(tx: AppTx, itemId: string): Promise<CustodyEvent | null> {
    if (!isUuid(itemId)) return null;
    const [row] = await executorOf(tx)
      .select({ event: evidenceCustodyEvents.event })
      .from(evidenceCustodyEvents)
      .where(eq(evidenceCustodyEvents.itemId, itemId))
      .orderBy(desc(evidenceCustodyEvents.createdAt), desc(evidenceCustodyEvents.id))
      .limit(1);
    return row?.event ?? null;
  }

  async transition(
    tx: AppTx,
    itemId: string,
    from: EvidenceState,
    to: EvidenceState,
    failReason?: EvidenceFailReason,
  ): Promise<boolean> {
    if (!isUuid(itemId)) return false;
    const changed = await executorOf(tx)
      .update(evidenceItems)
      .set({ state: to, failReason: failReason ?? null, updatedAt: sql`now()` })
      .where(and(eq(evidenceItems.id, itemId), eq(evidenceItems.state, from)))
      .returning({ id: evidenceItems.id });
    return changed.length === 1;
  }

  async appendCustody(tx: AppTx, event: NewEvidenceCustody): Promise<void> {
    await executorOf(tx)
      .insert(evidenceCustodyEvents)
      .values({
        itemId: event.itemId,
        event: event.event,
        actor: event.actor,
        details: custodyDetails(event.details),
        createdAt: event.now,
      });
  }

  async markOriginalDeleted(tx: AppTx, itemId: string): Promise<void> {
    if (!isUuid(itemId)) return;
    await executorOf(tx)
      .update(evidenceArtifacts)
      .set({ deletedAt: sql`now()` })
      .where(
        and(
          eq(evidenceArtifacts.itemId, itemId),
          eq(evidenceArtifacts.kind, 'original'),
          isNull(evidenceArtifacts.deletedAt),
        ),
      );
  }

  async countPublic(tx: AppTx, reviewId: string): Promise<number> {
    if (!isUuid(reviewId)) return 0;
    const [row] = await executorOf(tx)
      .select({ n: count() })
      .from(evidenceItems)
      .where(
        and(
          eq(evidenceItems.reviewId, reviewId),
          inArray(evidenceItems.state, PUBLIC_EVIDENCE_STATES),
        ),
      );
    return row?.n ?? 0;
  }

  async countPublicByReview(
    tx: AppTx,
    reviewIds: readonly string[],
  ): Promise<ReadonlyMap<string, number>> {
    const wanted = [...new Set(reviewIds)].filter(isUuid);
    const counts = new Map<string, number>();
    if (wanted.length === 0) return counts;
    const rows = await executorOf(tx)
      .select({ reviewId: evidenceItems.reviewId, n: count() })
      .from(evidenceItems)
      .where(
        and(
          inArray(evidenceItems.reviewId, wanted),
          inArray(evidenceItems.state, PUBLIC_EVIDENCE_STATES),
        ),
      )
      .groupBy(evidenceItems.reviewId);
    for (const row of rows) counts.set(row.reviewId, row.n);
    return counts;
  }

  applyRedaction(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-305', { input });
  }

  confirmPrivacy(itemId: string): Promise<unknown> {
    throw new NotImplemented('T-305', { itemId });
  }

  publish(reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-301', { reviewId });
  }

  remove(itemId: string): Promise<unknown> {
    throw new NotImplemented('T-305', { itemId });
  }

  getForAuthor(draftId: string): Promise<unknown> {
    throw new NotImplemented('T-306', { draftId });
  }

  listForStaff(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-407', { input });
  }

  getPublic(reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-308', { reviewId });
  }

  readOriginal(itemId: string, reason: string): Promise<unknown> {
    throw new NotImplemented('T-407', { itemId, reason });
  }
}
