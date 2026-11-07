// The Evidence repository port (U48 functional-spec § 5). The web tier uses the intake, author and
// count methods; the worker uses `processingFacts`, `stuckItems`, `latestCustody`, `transition`,
// `appendCustody` and `markOriginalDeleted`, whose records never carry the sealed file name or the
// uploader's account id (BR4.8). Every state change is a compare-and-set (BR4.2).
import type {
  EvidenceCustodyEvent,
  EvidenceImageMime,
  EvidenceItemFailReason,
  EvidenceItemState,
} from '@rogikotha/domain';

import type { Tx } from '../unit-of-work';

/** The review's items in `COUNTING_STATES`, for the per-review limits (BR2.3, BR2.4). */
export interface EvidenceCountingTotals {
  count: number;
  bytes: number;
}

/** The item an idempotency key already names (BR2.5); web tier only. */
export interface IdempotentEvidenceRecord {
  id: string;
  publicId: string;
  reviewId: string;
  uploadedByAccountId: string;
  state: EvidenceItemState;
}

/** One new item and its original artifact, written by `evidence.intake` in one transaction. */
export interface NewQuarantinedEvidence {
  id: string;
  publicId: string;
  artifactId: string;
  reviewId: string;
  uploadedByAccountId: string;
  declaredMime: string;
  detectedMime: EvidenceImageMime;
  originalBytes: number;
  /** 64 lowercase hex. */
  originalSha256: string;
  /** The cleaned name, sealed before it reaches the repository (BR2.6). */
  originalFilenameEnc: Uint8Array;
  idempotencyKey: string;
  /** `^[0-9a-f]{32}$` from the file writer (BR3.1). */
  storageKey: string;
  now: Date;
}

/** One row of the author's own list (BR6.1); never returned to anyone but the uploader. */
export interface OwnEvidenceRecord {
  publicId: string;
  state: EvidenceItemState;
  failReason: EvidenceItemFailReason | null;
  originalBytes: number;
  originalFilenameEnc: Uint8Array;
  createdAt: Date;
}

/** An item found by its public id for its own uploader, for removal (BR6.3). */
export interface OwnedEvidenceRecord {
  id: string;
  reviewId: string;
  state: EvidenceItemState;
  /** Null once the original file is gone. */
  storageKey: string | null;
}

/** What the worker may read about an item (BR4.8): no file name and no account id. */
export interface ProcessingFacts {
  id: string;
  reviewId: string;
  state: EvidenceItemState;
  detectedMime: EvidenceImageMime | null;
  originalBytes: number;
  originalSha256: string;
  createdAt: Date;
  /** The original artifact's key; null when no live original artifact is recorded. */
  storageKey: string | null;
  latestCustody: EvidenceCustodyEvent | null;
}

/** An item the sweep ends (BR4.11). */
export interface StuckEvidenceRecord {
  id: string;
  reviewId: string;
  state: EvidenceItemState;
  storageKey: string | null;
  latestCustody: EvidenceCustodyEvent | null;
}

/** Custody details carry only these fields (BR4.7): never the file name, key or an account id. */
export interface EvidenceCustodyDetails {
  failReason?: EvidenceItemFailReason;
  attempt?: number;
  bytes?: number;
  mime?: string;
  scannerVersion?: string;
  cause?: 'original_missing';
}

export interface NewEvidenceCustody {
  itemId: string;
  event: EvidenceCustodyEvent;
  /** `worker` for the job and the sweep, `account:<id>` for the author (custody is private). */
  actor: 'worker' | `account:${string}`;
  details: EvidenceCustodyDetails;
  now: Date;
}

export interface EvidenceRepository {
  /** Takes the per-review lock that serialises the limit checks and the insert (BR2.3). */
  lockReview(tx: Tx, reviewId: string): Promise<void>;
  countCounting(tx: Tx, reviewId: string): Promise<EvidenceCountingTotals>;
  findByIdempotencyKey(tx: Tx, key: string): Promise<IdempotentEvidenceRecord | null>;
  /**
   * `key_taken` when another transaction committed the same idempotency key first; the caller's
   * transaction stays usable and nothing was written (the unique index spans all reviews).
   */
  insertQuarantined(tx: Tx, item: NewQuarantinedEvidence): Promise<'inserted' | 'key_taken'>;
  /** Oldest first; `removed` and `original_expired` are left out. */
  listForAuthor(tx: Tx, reviewId: string, accountId: string): Promise<OwnEvidenceRecord[]>;
  findOwned(tx: Tx, publicId: string, accountId: string): Promise<OwnedEvidenceRecord | null>;
  processingFacts(tx: Tx, itemId: string): Promise<ProcessingFacts | null>;
  /** Up to `limit` items in `PROCESSING_STATES` created before `olderThan`, oldest first. */
  stuckItems(tx: Tx, olderThan: Date, limit: number): Promise<StuckEvidenceRecord[]>;
  latestCustody(tx: Tx, itemId: string): Promise<EvidenceCustodyEvent | null>;
  /** Moves the item only when it is still in `from`; false when another writer got there first. */
  transition(
    tx: Tx,
    itemId: string,
    from: EvidenceItemState,
    to: EvidenceItemState,
    failReason?: EvidenceItemFailReason,
  ): Promise<boolean>;
  appendCustody(tx: Tx, event: NewEvidenceCustody): Promise<void>;
  /** Sets `deleted_at` on the item's original artifact after its file is deleted. */
  markOriginalDeleted(tx: Tx, itemId: string): Promise<void>;
  /** Items of the review in `PUBLIC_EVIDENCE_STATES` (C17). */
  countPublic(tx: Tx, reviewId: string): Promise<number>;
  /** The same for many reviews; a review with none is missing from the map. */
  countPublicByReview(tx: Tx, reviewIds: readonly string[]): Promise<ReadonlyMap<string, number>>;
}
