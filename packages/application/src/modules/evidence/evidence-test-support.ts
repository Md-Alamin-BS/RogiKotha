// The Evidence module on `test-support` fakes, for the module's own tests (U48 Step 29). Reached by
// path as `fakes-test-support.ts` does. The evidence fake is enlisted in the unit of work, so a
// refused intake rolls back the item and its custody. Reviews, accounts and files are synthetic.
import { type Actor } from '@rogikotha/contracts';
import { detectImageType } from '@rogikotha/domain';

import {
  aStoredEvidenceItem,
  imageBytes,
  type StoredEvidenceItem,
} from '../../../../test-support/src/builders/evidence.js';
import { InMemoryEvidenceRepository } from '../../../../test-support/src/fakes/evidence-repository.js';
import {
  MemoryEvidenceStore,
  memoryEvidenceWriter,
} from '../../../../test-support/src/fakes/storage.js';
import type { CommandCall } from '../../command';
import {
  anAccountActor,
  FakeCrypto,
  makeCommandPorts,
  type FakeAccount,
} from '../../fakes-test-support';
import type { EvidenceByteStream, Tx } from '../../ports';
import { createEvidenceModule } from './module';
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
