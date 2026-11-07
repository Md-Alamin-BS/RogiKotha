// The Evidence module on `test-support` fakes, for the module's own tests (U48 Step 29). Reached by
// path as `fakes-test-support.ts` does. The evidence fake is enlisted in the unit of work, so a
// refused intake rolls back the item and its custody. Reviews, accounts and files are synthetic.
import { type Actor } from '@rogikotha/contracts';
import {
  detectImageType,
  type EvidenceCustodyEvent,
  type EvidenceImageMime,
  type EvidenceItemState,
} from '@rogikotha/domain';

import {
  aStoredEvidenceItem,
  imageBytes,
  type StoredEvidenceItem,
} from '../../../../test-support/src/builders/evidence.js';
import { InMemoryEvidenceRepository } from '../../../../test-support/src/fakes/evidence-repository.js';
import { ScriptedEvidenceScanner } from '../../../../test-support/src/fakes/scanner.js';
import {
  MemoryEvidenceStore,
  memoryEvidenceReader,
  memoryEvidenceWriter,
} from '../../../../test-support/src/fakes/storage.js';
import type { CommandCall } from '../../command';
import {
  anAccountActor,
  FakeCrypto,
  makeCommandPorts,
  type FakeAccount,
} from '../../fakes-test-support';
import type { EvidenceByteStream, ScanAbortSignal, Tx } from '../../ports';
import { createEvidenceModule, createEvidenceProcessor, createEvidenceSweep } from './module';
import type { EvidenceReviewSeams, FilenameSeal } from './ports';

export interface FakeReview {
  id: string;
  publicId: string;
  authorAccountId: string;
  published: boolean;
}

/** U47's three seams over a list of reviews; the actor's account stands for its persona. */
export class FakeEvidenceReviewSeams implements EvidenceReviewSeams {
  readonly reviews: FakeReview[] = [];

  reviewIdForPublicId(_tx: Tx, input: { publicId: string }): Promise<string | null> {
    void _tx;
    return Promise.resolve(this.reviews.find((r) => r.publicId === input.publicId)?.id ?? null);
  }

  isReviewAuthor(_tx: Tx, input: { reviewId: string; actor: Actor }): Promise<boolean> {
    void _tx;
    const review = this.reviews.find((r) => r.id === input.reviewId);
    return Promise.resolve(
      review !== undefined &&
        input.actor.kind === 'account' &&
        review.authorAccountId === input.actor.accountId,
    );
  }

  isReviewPublished(_tx: Tx, input: { reviewId: string }): Promise<boolean> {
    void _tx;
    return Promise.resolve(this.reviews.find((r) => r.id === input.reviewId)?.published ?? false);
  }
}

export function fakeFilenameSeal(): FilenameSeal {
  const crypto = new FakeCrypto({ keyByte: 7 });
  return {
    seal: (name) => crypto.encrypt(name),
    open: (sealed) => {
      const opened = crypto.decryptText(sealed);
      return opened.ok ? opened.data : null;
    },
  };
}

export async function* bytesStream(bytes: Uint8Array): EvidenceByteStream {
  await Promise.resolve();
  yield bytes;
}

export interface UploadRequest {
  reviewPublicId: string;
  body?: Uint8Array;
  name?: string;
  mime?: string;
  idempotencyKey?: string;
  /** Overrides the byte count the route measured, for the size limits. */
  bytes?: number;
}

const KEY_PREFIX = '7b3e9a52-1c4d-4e8f-9a0b-';
let keyCounter = 0;

/** A fresh client-generated idempotency key (a UUID, BR2.5). */
export function newIdempotencyKey(): string {
  keyCounter += 1;
  return `${KEY_PREFIX}${keyCounter.toString(16).padStart(12, '0')}`;
}

export function makeEvidenceWorld() {
  const world = makeCommandPorts();
  const repo = new InMemoryEvidenceRepository();
  world.fakes.unitOfWork.enlist(repo);
  const store = new MemoryEvidenceStore();
  const files = memoryEvidenceWriter(store);
  const review = new FakeEvidenceReviewSeams();
  const seal = fakeFilenameSeal();
  const evidence = createEvidenceModule({
    unitOfWork: world.ports.unitOfWork,
    evidenceRepository: repo,
    files,
    filenameSeal: seal,
    rateLimiter: world.ports.rateLimiter,
    clock: world.ports.clock,
    logger: world.ports.logger,
    review,
  });

  function addReview(author: FakeAccount, opts: { published?: boolean } = {}): FakeReview {
    const r: FakeReview = {
      id: world.fakes.ids.newId(),
      publicId: world.fakes.ids.newPublicId(),
      authorAccountId: author.accountId,
      published: opts.published ?? true,
    };
    review.reviews.push(r);
    return r;
  }

  /** Items already on the review, e.g. to fill it to a limit. */
  function seedItems(
    r: FakeReview,
    count: number,
    overrides: Partial<StoredEvidenceItem> = {},
  ): StoredEvidenceItem[] {
    return Array.from({ length: count }, () =>
      repo.seed(
        aStoredEvidenceItem({
          reviewId: r.id,
          uploadedByAccountId: r.authorAccountId,
          ...overrides,
        }),
      ),
    );
  }

  async function confirmedCall(spec: Parameters<typeof world.addAccount>[0] = {}) {
    const account = await world.addAccount(spec);
    return { account, call: world.callAs(anAccountActor(account)) };
  }

  /**
   * The route's caller contract (WF1 steps 5–9): write to quarantine, intake, then delete the key
   * on any `err` or an idempotent answer (BR3.4).
   */
  async function upload(call: CommandCall, req: UploadRequest) {
    const body = req.body ?? imageBytes({ kind: 'png' });
    const put = await files.putQuarantined(bytesStream(body), {
      maxBytes: Number.MAX_SAFE_INTEGER,
    });
    if (!put.ok) throw new Error('upload: the fake writer refused');
    const result = await evidence.intake.execute(
      {
        reviewPublicId: req.reviewPublicId,
        declaredMime: req.mime ?? 'image/png',
        declaredName: req.name ?? 'clinic-receipt.png',
        idempotencyKey: req.idempotencyKey ?? newIdempotencyKey(),
        file: {
          key: put.data.key,
          bytes: req.bytes ?? put.data.bytes,
          sha256: put.data.sha256,
          detectedMime: detectImageType(body.subarray(0, 16)),
        },
      },
      call,
    );
    if (!result.ok || !result.data.created) await files.delete(put.data.key);
    return { result, key: put.data.key };
  }

  return {
    ...world,
    repo,
    store,
    files,
    review,
    seal,
    evidence,
    addReview,
    seedItems,
    confirmedCall,
    upload,
  };
}

/** A `ScanAbortSignal` the test aborts by hand, standing in for the job's combined signal. */
export class FakeAbortSignal implements ScanAbortSignal {
  aborted = false;
  private readonly listeners = new Set<() => void>();

  abort(): void {
    this.aborted = true;
    for (const listener of [...this.listeners]) listener();
    this.listeners.clear();
  }

  addEventListener(_type: 'abort', listener: () => void): void {
    void _type;
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'abort', listener: () => void): void {
    void _type;
    this.listeners.delete(listener);
  }
}

export interface ProcessingSeed {
  state?: EvidenceItemState;
  body?: Uint8Array;
  /** Overrides the recorded sha256, to make it disagree with the stored bytes. */
  sha256?: string;
  detectedMime?: EvidenceImageMime;
  /** Seconds before the clock's now; 0 by default, well inside the deadline. */
  ageSec?: number;
  /** Custody already on the item, oldest first, as an earlier attempt left it. */
  custody?: EvidenceCustodyEvent[];
}

/**
 * The worker side on the same fakes (U48 Steps 30–33): the processor and the sweep hold the
 * reader over the world's store and a scripted scanner, never the writer or the filename seal.
 */
export function makeEvidenceWorkerWorld(world = makeEvidenceWorld()) {
  const reader = memoryEvidenceReader(world.store);
  const scanner = new ScriptedEvidenceScanner();
  const shared = {
    unitOfWork: world.ports.unitOfWork,
    evidenceRepository: world.repo,
    files: reader,
    outbox: world.ports.outbox,
    clock: world.ports.clock,
    logger: world.ports.logger,
  };
  const processor = createEvidenceProcessor({ ...shared, scanner, hasher: world.fakes.crypto });
  const sweeper = createEvidenceSweep(shared);

  /** An item with its original in the store and the matching size and hash recorded. */
  function seedProcessing(seed: ProcessingSeed = {}): StoredEvidenceItem {
    const body = seed.body ?? imageBytes({ kind: 'png' });
    const storageKey = world.store.seed(body);
    const now = world.ports.clock.now();
    const item = world.repo.seed(
      aStoredEvidenceItem({
        state: seed.state ?? 'quarantined',
        detectedMime: seed.detectedMime ?? detectImageType(body.subarray(0, 16)) ?? 'image/png',
        originalBytes: body.length,
        originalSha256: seed.sha256 ?? world.fakes.crypto.hash(body),
        storageKey,
        createdAt: new Date(now.getTime() - (seed.ageSec ?? 0) * 1000),
      }),
    );
    for (const event of seed.custody ?? []) {
      world.repo.custody.push({ itemId: item.id, event, actor: 'worker', details: {}, now });
    }
    return item;
  }

  function process(
    itemId: string,
    opts: { attempt?: number; lastAttempt?: boolean; signal?: ScanAbortSignal } = {},
  ) {
    const attempt = opts.attempt ?? 1;
    return processor.process({
      itemId,
      attempt,
      lastAttempt: opts.lastAttempt ?? attempt >= 4,
      signal: opts.signal ?? new FakeAbortSignal(),
    });
  }

  /** Custody of one item as `[event, details]`, without the seeded history before `since`. */
  function custodyOf(itemId: string, since = 0) {
    return world.repo.custody
      .filter((c) => c.itemId === itemId)
      .slice(since)
      .map((c) => [c.event, c.details] as const);
  }

  function stateChanges() {
    return world.fakes.outbox.events.filter((e) => e.name === 'evidence.stateChanged');
  }

  return {
    ...world,
    reader,
    scanner,
    processor,
    sweeper,
    seedProcessing,
    process,
    custodyOf,
    stateChanges,
  };
}
