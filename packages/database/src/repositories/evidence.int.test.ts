import type { NewQuarantinedEvidence, OutboxPayloads } from '@rogikotha/application';
import { newId, newPublicId, type EvidenceState } from '@rogikotha/contracts';
import { eq, sql } from 'drizzle-orm';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { createDb, type Db } from '../client';
import { evidenceArtifacts, evidenceCustodyEvents, evidenceItems } from '../schema/evidence';
import { outboxEvents } from '../schema/index';
import { testDb, testPool, workerUrlForTestDb } from '../test-setup';
import { appTxOf } from '../unit-of-work';
import { buildAccount, buildDoctor, buildPersona, buildReview } from './directory-test-support';
import {
  CUSTODY_DETAIL_KEYS,
  PgEvidenceRepository,
  WORKER_ITEM_COLUMNS,
  WORKER_ITEM_SELECT,
} from './evidence';
import { PgOutbox } from './outbox';

const repo = new PgEvidenceRepository();
const outbox = new PgOutbox();
const MAX_PER_REVIEW = 10;

async function reviewWithAuthor() {
  const account = await buildAccount(testDb);
  const doctor = await buildDoctor(testDb);
  const persona = await buildPersona(testDb);
  const review = await buildReview(testDb, doctor.id, persona);
  return { accountId: account.accountId, reviewId: review.id };
}

function newItem(
  reviewId: string,
  accountId: string,
  overrides: Partial<NewQuarantinedEvidence> = {},
): NewQuarantinedEvidence {
  return {
    id: newId(),
    publicId: newPublicId(),
    artifactId: newId(),
    reviewId,
    uploadedByAccountId: accountId,
    declaredMime: 'image/png',
    detectedMime: 'image/png',
    originalBytes: 2048,
    originalSha256: 'b'.repeat(64),
    originalFilenameEnc: new Uint8Array([1, 2, 3, 4]),
    idempotencyKey: newId(),
    storageKey: newId().replaceAll('-', ''),
    now: new Date(),
    ...overrides,
  };
}

async function insert(db: Db, item: NewQuarantinedEvidence): Promise<NewQuarantinedEvidence> {
  await db.transaction((tx) => repo.insertQuarantined(appTxOf(tx), item));
  return item;
}

async function setState(itemId: string, state: EvidenceState, createdAt?: Date): Promise<void> {
  await testDb
    .update(evidenceItems)
    .set({ state, ...(createdAt ? { createdAt } : {}) })
    .where(eq(evidenceItems.id, itemId));
}

function pgCodeOf(error: unknown): unknown {
  let current: unknown = error;
  while (current instanceof Error) {
    if ('code' in current && typeof current.code === 'string') return current.code;
    current = current.cause;
  }
  return undefined;
}

async function asWorker<T>(run: (db: Db) => Promise<T>): Promise<T> {
  const { db, pool } = createDb(workerUrlForTestDb());
  try {
    return await run(db);
  } finally {
    await pool.end();
  }
}

describe('PgEvidenceRepository, web side (Step 24)', () => {
  it('writes the item, its private original, custody and the outbox row in one transaction', async () => {
    const { accountId, reviewId } = await reviewWithAuthor();
    const item = newItem(reviewId, accountId);

    await testDb.transaction(async (drizzleTx) => {
      const tx = appTxOf(drizzleTx);
      await repo.lockReview(tx, reviewId);
      await repo.insertQuarantined(tx, item);
      await repo.appendCustody(tx, {
        itemId: item.id,
        event: 'received',
        actor: `account:${accountId}`,
        details: { bytes: item.originalBytes, mime: item.detectedMime },
        now: item.now,
      });
      await outbox.append(tx, 'evidence.received', { itemId: item.id });
    });

    const [stored] = await testDb.select().from(evidenceItems).where(eq(evidenceItems.id, item.id));
    expect(stored).toMatchObject({
      state: 'quarantined',
      group: 'reviewed',
      detectedMime: 'image/png',
      idempotencyKey: item.idempotencyKey,
      failReason: null,
    });
    const artifacts = await testDb
      .select()
      .from(evidenceArtifacts)
      .where(eq(evidenceArtifacts.itemId, item.id));
    expect(artifacts).toEqual([
      expect.objectContaining({
        id: item.artifactId,
        kind: 'original',
        public: false,
        storageKey: item.storageKey,
        bytes: 2048,
        deletedAt: null,
      }),
    ]);
    const custody = await testDb
      .select()
      .from(evidenceCustodyEvents)
      .where(eq(evidenceCustodyEvents.itemId, item.id));
    expect(custody.map((c) => [c.event, c.details])).toEqual([
      ['received', { bytes: 2048, mime: 'image/png' }],
    ]);
    const events = await testDb
      .select()
      .from(outboxEvents)
      .where(sql`${outboxEvents.payload}->>'itemId' = ${item.id}`);
    expect(events.map((e) => [e.name, e.payload])).toEqual([
      ['evidence.received', { itemId: item.id }],
    ]);
  });

  it('leaves no item, artifact, custody or outbox row when the transaction rolls back', async () => {
    const { accountId, reviewId } = await reviewWithAuthor();
    const item = newItem(reviewId, accountId);

    await expect(
      testDb.transaction(async (drizzleTx) => {
        const tx = appTxOf(drizzleTx);
        await repo.insertQuarantined(tx, item);
        await repo.appendCustody(tx, {
          itemId: item.id,
          event: 'received',
          actor: `account:${accountId}`,
          details: {},
          now: item.now,
        });
        await outbox.append(tx, 'evidence.received', { itemId: item.id });
        throw new Error('storage fault after the insert');
      }),
    ).rejects.toThrow('storage fault');

    expect(await testDb.select().from(evidenceItems).where(eq(evidenceItems.id, item.id))).toEqual(
      [],
    );
    expect(
      await testDb.select().from(evidenceArtifacts).where(eq(evidenceArtifacts.itemId, item.id)),
    ).toEqual([]);
    expect(
      await testDb
        .select()
        .from(outboxEvents)
        .where(sql`${outboxEvents.payload}->>'itemId' = ${item.id}`),
    ).toEqual([]);
  });

  it('lets exactly one of two concurrent intakes take the last slot of a review holding 9 items', async () => {
    const { accountId, reviewId } = await reviewWithAuthor();
    for (let i = 0; i < 9; i += 1) await insert(testDb, newItem(reviewId, accountId));

    async function intake(): Promise<boolean> {
      return testDb.transaction(async (drizzleTx) => {
        const tx = appTxOf(drizzleTx);
        await repo.lockReview(tx, reviewId);
        const { count } = await repo.countCounting(tx, reviewId);
        // Widens the window between the check and the write, so an unlocked pair would both insert.
        await drizzleTx.execute(sql`select pg_sleep(0.2)`);
        if (count >= MAX_PER_REVIEW) return false;
        await repo.insertQuarantined(tx, newItem(reviewId, accountId));
        return true;
      });
    }

    const outcomes = await Promise.all([intake(), intake()]);

    expect(outcomes.filter(Boolean)).toHaveLength(1);
    const totals = await repo.countCounting(appTxOf(testDb), reviewId);
    expect(totals.count).toBe(MAX_PER_REVIEW);
  });

  it('counts and sums only items in the counting states, never rejected, failed or removed ones', async () => {
    const { accountId, reviewId } = await reviewWithAuthor();
    const states: EvidenceState[] = [
      'quarantined',
      'validating',
      'scanning',
      'preview_ready',
      'published',
      'rejected',
      'failed',
      'removed',
    ];
    for (const [index, state] of states.entries()) {
      const item = await insert(
        testDb,
        newItem(reviewId, accountId, { originalBytes: 1000 * (index + 1) }),
      );
      await setState(item.id, state);
    }

    const totals = await repo.countCounting(appTxOf(testDb), reviewId);

    expect(totals).toEqual({ count: 5, bytes: 1000 + 2000 + 3000 + 4000 + 5000 });
    expect(await repo.countCounting(appTxOf(testDb), newId())).toEqual({ count: 0, bytes: 0 });
    expect(await repo.countCounting(appTxOf(testDb), 'not-a-uuid')).toEqual({ count: 0, bytes: 0 });
  });

  it('counts as public only preview_ready and published items, for one review and for many', async () => {
    const { accountId, reviewId } = await reviewWithAuthor();
    const other = await reviewWithAuthor();
    const states: EvidenceState[] = [
      'quarantined',
      'scanning',
      'preview_ready',
      'published',
      'rejected',
      'failed',
      'removed',
    ];
    for (const state of states) {
      const item = await insert(testDb, newItem(reviewId, accountId));
      await setState(item.id, state);
    }

    expect(await repo.countPublic(appTxOf(testDb), reviewId)).toBe(2);
    expect(await repo.countPublic(appTxOf(testDb), other.reviewId)).toBe(0);
    expect(await repo.countPublic(appTxOf(testDb), 'not-a-uuid')).toBe(0);
    const many = await repo.countPublicByReview(appTxOf(testDb), [
      reviewId,
      other.reviewId,
      reviewId,
      'not-a-uuid',
    ]);
    expect([...many.entries()]).toEqual([[reviewId, 2]]);
  });

  it('finds an item by its idempotency key and refuses a second item with the same key', async () => {
    const { accountId, reviewId } = await reviewWithAuthor();
    const first = await insert(testDb, newItem(reviewId, accountId));

    expect(await repo.findByIdempotencyKey(appTxOf(testDb), first.idempotencyKey)).toEqual({
      id: first.id,
      publicId: first.publicId,
      reviewId,
      uploadedByAccountId: accountId,
      state: 'quarantined',
    });
    expect(await repo.findByIdempotencyKey(appTxOf(testDb), newId())).toBeNull();

    const error = await insert(
      testDb,
      newItem(reviewId, accountId, { idempotencyKey: first.idempotencyKey }),
    ).catch((caught: unknown) => caught);
    expect(pgCodeOf(error)).toBe('23505');
  });

  it('lists only the uploader’s own visible items, oldest first, and finds nothing for another account', async () => {
    const { accountId, reviewId } = await reviewWithAuthor();
    const stranger = await buildAccount(testDb);
    const start = Date.now() - 60_000;
    const older = await insert(
      testDb,
      newItem(reviewId, accountId, { now: new Date(start), originalFilenameEnc: Uint8Array.of(9) }),
    );
    const newer = await insert(
      testDb,
      newItem(reviewId, accountId, { now: new Date(start + 1000) }),
    );
    const removed = await insert(testDb, newItem(reviewId, accountId));
    const expired = await insert(testDb, newItem(reviewId, accountId));
    await setState(newer.id, 'rejected');
    await setState(removed.id, 'removed');
    await setState(expired.id, 'original_expired');

    const own = await repo.listForAuthor(appTxOf(testDb), reviewId, accountId);

    expect(own.map((row) => [row.publicId, row.state])).toEqual([
      [older.publicId, 'quarantined'],
      [newer.publicId, 'rejected'],
    ]);
    expect(own[0]?.originalFilenameEnc).toEqual(Uint8Array.of(9));
    expect(await repo.listForAuthor(appTxOf(testDb), reviewId, stranger.accountId)).toEqual([]);
    expect(await repo.findOwned(appTxOf(testDb), older.publicId, stranger.accountId)).toBeNull();
    expect(await repo.findOwned(appTxOf(testDb), older.publicId, accountId)).toEqual({
      id: older.id,
      reviewId,
      state: 'quarantined',
      storageKey: older.storageKey,
    });
  });
});

describe('PgEvidenceRepository, worker side as rk_worker (Step 25)', () => {
  it('moves an item only from the state it is still in, and stamps updated_at', async () => {
    const { accountId, reviewId } = await reviewWithAuthor();
    const item = await insert(testDb, newItem(reviewId, accountId));

    await asWorker(async (db) => {
      const tx = appTxOf(db);
      expect(await repo.transition(tx, item.id, 'quarantined', 'validating')).toBe(true);
      expect(await repo.transition(tx, item.id, 'quarantined', 'validating')).toBe(false);
      expect(await repo.transition(tx, item.id, 'scanning', 'preview_ready')).toBe(false);
      expect(await repo.transition(tx, item.id, 'validating', 'rejected', 'malformed')).toBe(true);
      expect(await repo.transition(tx, newId(), 'quarantined', 'validating')).toBe(false);
    });

    const [stored] = await testDb.select().from(evidenceItems).where(eq(evidenceItems.id, item.id));
    expect(stored?.state).toBe('rejected');
    expect(stored?.failReason).toBe('malformed');
    expect(stored?.updatedAt).toBeInstanceOf(Date);
  });

  it('sweeps old processing items oldest first, skipping a locked row, a younger item and a final one', async () => {
    const { accountId, reviewId } = await reviewWithAuthor();
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000);
    const oldest = await insert(testDb, newItem(reviewId, accountId));
    const old = await insert(testDb, newItem(reviewId, accountId));
    const locked = await insert(testDb, newItem(reviewId, accountId));
    const young = await insert(testDb, newItem(reviewId, accountId));
    const final = await insert(testDb, newItem(reviewId, accountId));
    await setState(oldest.id, 'scanning', new Date(twoHoursAgo.getTime() - 60_000));
    await setState(old.id, 'quarantined', twoHoursAgo);
    await setState(locked.id, 'validating', twoHoursAgo);
    await setState(final.id, 'rejected', twoHoursAgo);
    const olderThan = new Date(Date.now() - 3600_000);

    const holder = await testPool.connect();
    try {
      await holder.query('begin');
      await holder.query('select id from evidence_items where id = $1 for update', [locked.id]);

      const swept = await asWorker((db) =>
        db.transaction((tx) => repo.stuckItems(appTxOf(tx), olderThan, 1000)),
      );
      const ours = swept.filter((row) =>
        [oldest.id, old.id, locked.id, young.id, final.id].includes(row.id),
      );
      expect(ours.map((row) => [row.id, row.state])).toEqual([
        [oldest.id, 'scanning'],
        [old.id, 'quarantined'],
      ]);
      expect(ours[0]).toEqual({
        id: oldest.id,
        reviewId,
        state: 'scanning',
        storageKey: oldest.storageKey,
        latestCustody: null,
      });
    } finally {
      await holder.query('rollback');
      holder.release();
    }
  });

  it('reads processing facts without the sealed file name or the uploader’s account id (BR4.8)', async () => {
    const { accountId, reviewId } = await reviewWithAuthor();
    const item = await insert(testDb, newItem(reviewId, accountId));

    const facts = await asWorker(async (db) => {
      const tx = appTxOf(db);
      await repo.appendCustody(tx, {
        itemId: item.id,
        event: 'scan_unavailable',
        actor: 'worker',
        details: { attempt: 1 },
        now: new Date(),
      });
      return repo.processingFacts(tx, item.id);
    });

    expect(Object.keys(facts ?? {}).sort()).toEqual(
      [
        'createdAt',
        'detectedMime',
        'id',
        'latestCustody',
        'originalBytes',
        'originalSha256',
        'reviewId',
        'state',
        'storageKey',
      ].sort(),
    );
    expect(facts).toMatchObject({
      id: item.id,
      reviewId,
      state: 'quarantined',
      originalBytes: 2048,
      storageKey: item.storageKey,
      latestCustody: 'scan_unavailable',
    });
    expect(WORKER_ITEM_COLUMNS).not.toContain('original_filename_enc');
    expect(WORKER_ITEM_COLUMNS).not.toContain('uploaded_by_account_id');
    expect(WORKER_ITEM_SELECT).not.toMatch(/original_filename_enc|uploaded_by_account_id|\*/);
    expect(await asWorker((db) => repo.processingFacts(appTxOf(db), newId()))).toBeNull();
  });

  it('reports the latest custody event and forgets the original key once it is deleted', async () => {
    const { accountId, reviewId } = await reviewWithAuthor();
    const item = await insert(testDb, newItem(reviewId, accountId));

    const [latest, facts] = await asWorker((db) =>
      db.transaction(async (drizzleTx) => {
        const tx = appTxOf(drizzleTx);
        // Same transaction, same timestamp: the order must still be the write order.
        const now = new Date();
        await repo.appendCustody(tx, {
          itemId: item.id,
          event: 'scan_clean',
          actor: 'worker',
          details: {},
          now,
        });
        await repo.appendCustody(tx, {
          itemId: item.id,
          event: 'preview_ready',
          actor: 'worker',
          details: {},
          now,
        });
        await repo.markOriginalDeleted(tx, item.id);
        return [await repo.latestCustody(tx, item.id), await repo.processingFacts(tx, item.id)];
      }),
    );

    expect(latest).toBe('preview_ready');
    expect(facts?.storageKey).toBeNull();
    const [artifact] = await testDb
      .select()
      .from(evidenceArtifacts)
      .where(eq(evidenceArtifacts.itemId, item.id));
    expect(artifact?.deletedAt).toBeInstanceOf(Date);
    expect(await repo.latestCustody(appTxOf(testDb), newId())).toBeNull();
  });

  it('appends evidence.stateChanged with exactly itemId, reviewId and state', async () => {
    expectTypeOf<keyof OutboxPayloads['evidence.stateChanged']>().toEqualTypeOf<
      'itemId' | 'reviewId' | 'state'
    >();
    const { accountId, reviewId } = await reviewWithAuthor();
    const item = await insert(testDb, newItem(reviewId, accountId));

    await asWorker((db) =>
      db.transaction(async (drizzleTx) => {
        const tx = appTxOf(drizzleTx);
        await repo.transition(tx, item.id, 'quarantined', 'failed', 'processing_timeout');
        await outbox.append(tx, 'evidence.stateChanged', {
          itemId: item.id,
          reviewId,
          state: 'failed',
        });
      }),
    );

    const [event] = await testDb
      .select()
      .from(outboxEvents)
      .where(sql`${outboxEvents.payload}->>'itemId' = ${item.id}`);
    expect(event?.name).toBe('evidence.stateChanged');
    expect(Object.keys(event?.payload as object).sort()).toEqual(['itemId', 'reviewId', 'state']);
  });

  it('keeps only the allowlisted custody details: no file name, storage key or account id', async () => {
    const { accountId, reviewId } = await reviewWithAuthor();
    const item = await insert(testDb, newItem(reviewId, accountId));
    const smuggled = {
      failReason: 'malware',
      scannerVersion: 'ClamAV 1.5.4',
      filename: 'scan.png',
      storageKey: item.storageKey,
      accountId,
    } as unknown as { failReason: 'malware'; scannerVersion: string };

    await asWorker((db) =>
      repo.appendCustody(appTxOf(db), {
        itemId: item.id,
        event: 'scan_detected',
        actor: 'worker',
        details: smuggled,
        now: new Date(),
      }),
    );

    const [row] = await testDb
      .select()
      .from(evidenceCustodyEvents)
      .where(eq(evidenceCustodyEvents.itemId, item.id));
    expect(row?.details).toEqual({ failReason: 'malware', scannerVersion: 'ClamAV 1.5.4' });
    const written = JSON.stringify(row);
    expect(written).not.toContain('scan.png');
    expect(written).not.toContain(item.storageKey);
    expect(written).not.toContain(accountId);
    expect(CUSTODY_DETAIL_KEYS).toEqual([
      'failReason',
      'attempt',
      'bytes',
      'mime',
      'scannerVersion',
      'cause',
    ]);
  });
});
