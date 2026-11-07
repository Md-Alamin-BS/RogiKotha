// U48: an in-memory `EvidenceRepository` with the port's compare-and-set semantics (BR4.2). It
// captures custody events and, through its own `outbox`, the outbox rows the module writes beside
// them, so one `enlist` makes a rollback undo items, custody and outbox together.
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
  Tx,
} from '@rogikotha/application';
import {
  COUNTING_STATES,
  PROCESSING_STATES,
  PUBLIC_EVIDENCE_STATES,
  type EvidenceCustodyEvent,
  type EvidenceItemFailReason,
  type EvidenceItemState,
} from '@rogikotha/domain';

import type { StoredEvidenceItem } from '../builders/evidence.js';
import { ListOutbox, type OutboxRecord } from './outbox.js';
import type { Transactional } from './unit-of-work.js';

const AUTHOR_HIDDEN: readonly EvidenceItemState[] = ['removed', 'original_expired'];

interface Snapshot {
  items: StoredEvidenceItem[];
  custody: NewEvidenceCustody[];
  outbox: OutboxRecord[];
}

const includes = (list: readonly string[], value: string): boolean => list.includes(value);

export class InMemoryEvidenceRepository implements EvidenceRepository, Transactional {
  items = new Map<string, StoredEvidenceItem>();
  custody: NewEvidenceCustody[] = [];
  readonly outbox = new ListOutbox();
  /** Review ids in the order `lockReview` was called. */
  readonly lockedReviews: string[] = [];
  private faultNext: keyof EvidenceRepository | null = null;

  /** Puts an item straight into the store, for tests that start after intake. */
  seed(item: StoredEvidenceItem): StoredEvidenceItem {
    this.items.set(item.id, { ...item });
    return item;
  }

  /** The next call of `method` throws, as a lost connection would. */
  failNext(method: keyof EvidenceRepository): void {
    this.faultNext = method;
  }

  item(id: string): StoredEvidenceItem | undefined {
    return this.items.get(id);
  }

  custodyOf(itemId: string): EvidenceCustodyEvent[] {
    return this.custody.filter((c) => c.itemId === itemId).map((c) => c.event);
  }

  // A forced fault rejects the returned promise, as an async adapter would, rather than throwing.
  private guard<T>(method: keyof EvidenceRepository, work: () => T): Promise<T> {
    if (this.faultNext === method) {
      this.faultNext = null;
      return Promise.reject(new Error(`InMemoryEvidenceRepository: forced ${method} fault`));
    }
    try {
      return Promise.resolve(work());
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private live(): StoredEvidenceItem[] {
    return [...this.items.values()];
  }

  lockReview(_tx: Tx, reviewId: string): Promise<void> {
    void _tx;
    return this.guard('lockReview', () => {
      this.lockedReviews.push(reviewId);
    });
  }

  countCounting(_tx: Tx, reviewId: string): Promise<EvidenceCountingTotals> {
    void _tx;
    return this.guard('countCounting', () => {
      const rows = this.live().filter(
        (i) => i.reviewId === reviewId && includes(COUNTING_STATES, i.state),
      );
      return {
        count: rows.length,
        bytes: rows.reduce((n, i) => n + i.originalBytes, 0),
      };
    });
  }

  findByIdempotencyKey(_tx: Tx, key: string): Promise<IdempotentEvidenceRecord | null> {
    void _tx;
    return this.guard('findByIdempotencyKey', () => {
      const found = this.live().find((i) => i.idempotencyKey === key);
      if (!found) return null;
      const { id, publicId, reviewId, uploadedByAccountId, state } = found;
      return { id, publicId, reviewId, uploadedByAccountId, state };
    });
  }

  insertQuarantined(_tx: Tx, item: NewQuarantinedEvidence): Promise<void> {
    void _tx;
    return this.guard('insertQuarantined', () => {
      if (this.live().some((i) => i.idempotencyKey === item.idempotencyKey)) {
        throw new Error('InMemoryEvidenceRepository: duplicate idempotency_key');
      }
      this.items.set(item.id, {
        id: item.id,
        publicId: item.publicId,
        reviewId: item.reviewId,
        uploadedByAccountId: item.uploadedByAccountId,
        state: 'quarantined',
        failReason: null,
        declaredMime: item.declaredMime,
        detectedMime: item.detectedMime,
        originalBytes: item.originalBytes,
        originalSha256: item.originalSha256,
        originalFilenameEnc: Uint8Array.from(item.originalFilenameEnc),
        idempotencyKey: item.idempotencyKey,
        storageKey: item.storageKey,
        originalDeletedAt: null,
        createdAt: item.now,
        updatedAt: null,
      });
    });
  }

  listForAuthor(_tx: Tx, reviewId: string, accountId: string): Promise<OwnEvidenceRecord[]> {
    void _tx;
    return this.guard('listForAuthor', () => {
      const rows = this.live()
        .filter(
          (i) =>
            i.reviewId === reviewId &&
            i.uploadedByAccountId === accountId &&
            !AUTHOR_HIDDEN.includes(i.state),
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((i) => ({
          publicId: i.publicId,
          state: i.state,
          failReason: i.failReason,
          originalBytes: i.originalBytes,
          originalFilenameEnc: i.originalFilenameEnc,
          createdAt: i.createdAt,
        }));
      return rows;
    });
  }

  findOwned(_tx: Tx, publicId: string, accountId: string): Promise<OwnedEvidenceRecord | null> {
    void _tx;
    return this.guard('findOwned', () => {
      const found = this.live().find(
        (i) => i.publicId === publicId && i.uploadedByAccountId === accountId,
      );
      if (!found) return null;
      return {
        id: found.id,
        reviewId: found.reviewId,
        state: found.state,
        storageKey: found.originalDeletedAt ? null : found.storageKey,
      };
    });
  }

  private latest(itemId: string): EvidenceCustodyEvent | null {
    return this.custodyOf(itemId).at(-1) ?? null;
  }

  processingFacts(_tx: Tx, itemId: string): Promise<ProcessingFacts | null> {
    void _tx;
    return this.guard('processingFacts', () => {
      const i = this.items.get(itemId);
      if (!i) return null;
      // Exactly the BR4.8 column list: no sealed name and no uploader id.
      return {
        id: i.id,
        reviewId: i.reviewId,
        state: i.state,
        detectedMime: i.detectedMime,
        originalBytes: i.originalBytes,
        originalSha256: i.originalSha256,
        createdAt: i.createdAt,
        storageKey: i.originalDeletedAt ? null : i.storageKey,
        latestCustody: this.latest(i.id),
      };
    });
  }

  stuckItems(_tx: Tx, olderThan: Date, limit: number): Promise<StuckEvidenceRecord[]> {
    void _tx;
    return this.guard('stuckItems', () => {
      const rows = this.live()
        .filter((i) => includes(PROCESSING_STATES, i.state) && i.createdAt < olderThan)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, limit)
        .map((i) => ({
          id: i.id,
          reviewId: i.reviewId,
          state: i.state,
          storageKey: i.originalDeletedAt ? null : i.storageKey,
          latestCustody: this.latest(i.id),
        }));
      return rows;
    });
  }

  latestCustody(_tx: Tx, itemId: string): Promise<EvidenceCustodyEvent | null> {
    void _tx;
    return this.guard('latestCustody', () => {
      return this.latest(itemId);
    });
  }

  transition(
    _tx: Tx,
    itemId: string,
    from: EvidenceItemState,
    to: EvidenceItemState,
    failReason?: EvidenceItemFailReason,
  ): Promise<boolean> {
    void _tx;
    return this.guard('transition', () => {
      const i = this.items.get(itemId);
      if (!i || i.state !== from) return false;
      this.items.set(itemId, {
        ...i,
        state: to,
        failReason: failReason ?? null,
        updatedAt: new Date(),
      });
      return true;
    });
  }

  appendCustody(_tx: Tx, event: NewEvidenceCustody): Promise<void> {
    void _tx;
    return this.guard('appendCustody', () => {
      this.custody.push({ ...event, details: { ...event.details } });
    });
  }

  markOriginalDeleted(_tx: Tx, itemId: string): Promise<void> {
    void _tx;
    return this.guard('markOriginalDeleted', () => {
      const i = this.items.get(itemId);
      if (i) this.items.set(itemId, { ...i, originalDeletedAt: new Date() });
    });
  }

  countPublic(_tx: Tx, reviewId: string): Promise<number> {
    void _tx;
    return this.guard('countPublic', () => {
      return this.live().filter(
        (i) => i.reviewId === reviewId && includes(PUBLIC_EVIDENCE_STATES, i.state),
      ).length;
    });
  }

  countPublicByReview(_tx: Tx, reviewIds: readonly string[]): Promise<ReadonlyMap<string, number>> {
    void _tx;
    return this.guard('countPublicByReview', () => {
      const counts = new Map<string, number>();
      for (const i of this.live()) {
        if (!reviewIds.includes(i.reviewId) || !includes(PUBLIC_EVIDENCE_STATES, i.state)) continue;
        counts.set(i.reviewId, (counts.get(i.reviewId) ?? 0) + 1);
      }
      return counts;
    });
  }

  snapshot(): unknown {
    const state: Snapshot = {
      items: this.live().map((i) => ({ ...i })),
      custody: [...this.custody],
      outbox: this.outbox.snapshot() as OutboxRecord[],
    };
    return state;
  }

  restore(state: unknown): void {
    const s = state as Snapshot;
    this.items = new Map(s.items.map((i) => [i.id, { ...i }]));
    this.custody = [...s.custody];
    this.outbox.restore(s.outbox);
  }
}
