// `evidence.process` (WF2 steps 3–9, BR4.2–BR4.10): validate the quarantined original, then scan
// it, failing closed. Every state change is a compare-and-set from the state just read, in one
// transaction with its custody events and its outbox row (BR4.7); a lost compare-and-set ends the
// attempt without change. A rejection deletes the file before its state change; a move to `failed`
// deletes it after the commit. The worker reads only `ProcessingFacts` (BR4.8).
import { ok } from '@rogikotha/contracts';
import {
  detectImageType,
  EVIDENCE_MAX_FILE_BYTES,
  EVIDENCE_PROCESSING_DEADLINE_SEC,
  imageStructureValid,
  PROCESSING_STATES,
  sweepReason,
  type EvidenceCustodyEvent,
  type EvidenceItemFailReason,
  type EvidenceItemState,
} from '@rogikotha/domain';

import type {
  EvidenceByteStream,
  EvidenceCustodyDetails,
  ProcessingFacts,
  ScanAbortSignal,
  Tx,
} from '../../../ports';
import type { EvidenceProcessorDeps } from '../worker-ports';

export interface ProcessEvidenceInput {
  /** The internal item id from the `evidence.received` payload. */
  itemId: string;
  /** 1-based: pg-boss `retryCount + 1` (BR4.9). */
  attempt: number;
  lastAttempt: boolean;
  /** The job's signal combined with the 120 s attempt budget (BR4.6). */
  signal: ScanAbortSignal;
}

export interface ProcessEvidenceResult {
  /** The state the attempt left the item in; null when the item does not exist. */
  state: EvidenceItemState | null;
}

/** Thrown so pg-boss retries while attempts are left (BR4.5); the item stays in `scanning`. */
export class ScannerUnavailable extends Error {
  override readonly name = 'ScannerUnavailable';
  constructor() {
    super('evidence.process: the scanner is unavailable');
  }
}

/** The attempt budget or the job's own signal ended the attempt outside the scan (BR4.6). */
export class EvidenceAttemptAborted extends Error {
  override readonly name = 'EvidenceAttemptAborted';
  constructor() {
    super('evidence.process: the attempt was aborted');
  }
}

type CheckedState = 'validating' | 'scanning';

interface Item {
  id: string;
  reviewId: string;
  storageKey: string | null;
}

const isProcessing = (state: EvidenceItemState): boolean =>
  (PROCESSING_STATES as readonly EvidenceItemState[]).includes(state);

const errorClassOf = (error: unknown): string => (error instanceof Error ? error.name : 'unknown');

function throwIfAborted(signal: ScanAbortSignal): void {
  if (signal.aborted) throw new EvidenceAttemptAborted();
}

async function* streamOf(bytes: Uint8Array): EvidenceByteStream {
  await Promise.resolve();
  yield bytes;
}

/** The whole original, or `null` once it passes the per-file limit, so it is never held whole. */
async function readBounded(stream: EvidenceByteStream, limit: number): Promise<Uint8Array | null> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of stream) {
    total += chunk.length;
    if (total > limit) return null;
    chunks.push(chunk);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

type Validation = { ok: true } | { ok: false; reason: EvidenceItemFailReason };

// ASSUMPTION(U48): BR4.3 lists sha256 first, then size; the size is checked while reading so an
// oversized file is never held in memory, and the remaining checks keep the BR4.3 order.
function validate(
  facts: ProcessingFacts,
  bytes: Uint8Array,
  hash: (bytes: Uint8Array) => string,
): Validation {
  if (hash(bytes) !== facts.originalSha256) return { ok: false, reason: 'malformed' };
  const magic = detectImageType(bytes.subarray(0, 16));
  if (magic === null || magic !== facts.detectedMime) return { ok: false, reason: 'type_mismatch' };
  const structure = imageStructureValid(bytes);
  if (!structure.ok) return { ok: false, reason: structure.reason };
  if (structure.mime !== facts.detectedMime) return { ok: false, reason: 'type_mismatch' };
  return { ok: true };
}

export function createProcessEvidence(deps: EvidenceProcessorDeps) {
  const repo = deps.evidenceRepository;

  async function custody(
    tx: Tx,
    itemId: string,
    event: EvidenceCustodyEvent,
    details: EvidenceCustodyDetails = {},
  ): Promise<void> {
    await repo.appendCustody(tx, {
      itemId,
      event,
      actor: 'worker',
      details,
      now: deps.clock.now(),
    });
  }

  async function stateChanged(tx: Tx, item: Item, state: EvidenceItemState): Promise<void> {
    await deps.outbox.append(tx, 'evidence.stateChanged', {
      itemId: item.id,
      reviewId: item.reviewId,
      state,
    });
  }

  /** One transaction: compare-and-set, then custody and outbox only when the move happened. */
  async function move(
    item: Item,
    from: EvidenceItemState,
    to: EvidenceItemState,
    opts: {
      failReason?: EvidenceItemFailReason;
      custody: readonly [EvidenceCustodyEvent, EvidenceCustodyDetails][];
      outbox: boolean;
      originalDeleted?: boolean;
    },
  ): Promise<boolean> {
    const result = await deps.unitOfWork.run(async (tx) => {
      const moved = await repo.transition(tx, item.id, from, to, opts.failReason);
      // The file is already gone after a rejection, whoever won the race.
      if (opts.originalDeleted === true) await repo.markOriginalDeleted(tx, item.id);
      if (!moved) return ok(false);
      for (const [event, details] of opts.custody) await custody(tx, item.id, event, details);
      if (opts.outbox) await stateChanged(tx, item, to);
      return ok(true);
    });
    return result.ok && result.data;
  }

  /** After a commit to `failed`: delete the original; a failed delete is left to retention (S4). */
  async function deleteAfterFailure(item: Item): Promise<void> {
    if (item.storageKey === null) return;
    try {
      await deps.files.delete(item.storageKey);
      await deps.unitOfWork.run(async (tx) => {
        await repo.markOriginalDeleted(tx, item.id);
        return ok(null);
      });
    } catch (error) {
      deps.logger.warn('evidence.original_delete_failed', {
        itemId: item.id,
        errorClass: errorClassOf(error),
      });
    }
  }

  async function fail(
    item: Item,
    from: EvidenceItemState,
    failReason: EvidenceItemFailReason,
    custodyEvents: readonly [EvidenceCustodyEvent, EvidenceCustodyDetails][],
  ): Promise<EvidenceItemState | null> {
    const moved = await move(item, from, 'failed', {
      failReason,
      custody: custodyEvents,
      outbox: true,
    });
    if (!moved) return currentState(item.id);
    await deleteAfterFailure(item);
    deps.logger.info('evidence.failed', { itemId: item.id, state: 'failed', failReason });
    return 'failed';
  }

  async function currentState(itemId: string): Promise<EvidenceItemState | null> {
    const facts = await deps.unitOfWork.read((tx) => repo.processingFacts(tx, itemId));
    return facts?.state ?? null;
  }

  async function reject(
    item: Item,
    from: CheckedState,
    failReason: EvidenceItemFailReason,
    event: 'validation_failed' | 'scan_detected',
  ): Promise<EvidenceItemState | null> {
    // Deleted before the state change, so a failed write never keeps rejected bytes (WF2 step 9).
    if (item.storageKey !== null) await deps.files.delete(item.storageKey);
    const details: EvidenceCustodyDetails = event === 'validation_failed' ? { failReason } : {};
    const moved = await move(item, from, 'rejected', {
      failReason,
      custody: [[event, details]],
      outbox: true,
      originalDeleted: item.storageKey !== null,
    });
    if (!moved) return currentState(item.id);
    deps.logger.info('evidence.rejected', { itemId: item.id, state: 'rejected', failReason });
    return 'rejected';
  }

  async function scanUnavailable(
    item: Item,
    input: ProcessEvidenceInput,
  ): Promise<EvidenceItemState | null> {
    const unavailable: [EvidenceCustodyEvent, EvidenceCustodyDetails] = [
      'scan_unavailable',
      { attempt: input.attempt },
    ];
    deps.logger.warn('evidence.scan_unavailable', { itemId: item.id, attempt: input.attempt });
    if (input.lastAttempt) {
      return fail(item, 'scanning', 'scanner_unavailable', [
        unavailable,
        ['failed', { failReason: 'scanner_unavailable' }],
      ]);
    }
    // Item unchanged and no outbox row; custody only while the item is still ours to retry.
    const stillScanning = await deps.unitOfWork.run(async (tx) => {
      const facts = await repo.processingFacts(tx, item.id);
      if (facts?.state !== 'scanning') return ok(false);
      await custody(tx, item.id, ...unavailable);
      return ok(true);
    });
    if (stillScanning.ok && stillScanning.data) throw new ScannerUnavailable();
    return currentState(item.id);
  }

  async function attempt(
    facts: ProcessingFacts,
    input: ProcessEvidenceInput,
  ): Promise<EvidenceItemState | null> {
    const item: Item = { id: facts.id, reviewId: facts.reviewId, storageKey: facts.storageKey };
    let state: CheckedState;
    if (facts.state === 'quarantined') {
      const started = await move(item, 'quarantined', 'validating', { custody: [], outbox: false });
      if (!started) return currentState(item.id);
      state = 'validating';
    } else {
      state = facts.state === 'validating' ? 'validating' : 'scanning';
    }

    throwIfAborted(input.signal);
    const read =
      item.storageKey === null ? null : await deps.files.readQuarantined(item.storageKey);
    if (read === null || !read.ok) {
      return fail(item, state, 'unknown', [
        ['failed', { failReason: 'unknown', cause: 'original_missing' }],
      ]);
    }
    const bytes = await readBounded(read.data, EVIDENCE_MAX_FILE_BYTES);
    throwIfAborted(input.signal);
    if (bytes === null) return reject(item, state, 'too_large', 'validation_failed');

    const checked = validate(facts, bytes, (b) => deps.hasher.hash(b));
    if (!checked.ok) return reject(item, state, checked.reason, 'validation_failed');

    const toScan =
      state === 'validating'
        ? await move(item, 'validating', 'scanning', {
            custody: [
              ['validated', {}],
              ['scan_started', {}],
            ],
            outbox: false,
          })
        : await move(item, 'scanning', 'scanning', {
            custody: [['scan_started', {}]],
            outbox: false,
          });
    if (!toScan) return currentState(item.id);
    throwIfAborted(input.signal);

    const report = await deps.scanner.scan(streamOf(bytes), { signal: input.signal });
    switch (report.result) {
      case 'clean': {
        const scanClean: EvidenceCustodyDetails =
          report.scannerVersion === undefined ? {} : { scannerVersion: report.scannerVersion };
        const ready = await move(item, 'scanning', 'preview_ready', {
          custody: [
            ['scan_clean', scanClean],
            ['preview_ready', {}],
          ],
          outbox: true,
        });
        if (!ready) return currentState(item.id);
        deps.logger.info('evidence.processed', { itemId: item.id, state: 'preview_ready' });
        return 'preview_ready';
      }
      case 'infected':
        return reject(item, 'scanning', 'malware', 'scan_detected');
      case 'unavailable':
        return scanUnavailable(item, input);
    }
  }

  return async function processEvidence(
    input: ProcessEvidenceInput,
  ): Promise<ProcessEvidenceResult> {
    const facts = await deps.unitOfWork.read((tx) => repo.processingFacts(tx, input.itemId));
    if (facts === null) return { state: null };
    if (!isProcessing(facts.state)) return { state: facts.state };
    const item: Item = { id: facts.id, reviewId: facts.reviewId, storageKey: facts.storageKey };

    const ageMs = deps.clock.now().getTime() - facts.createdAt.getTime();
    if (ageMs > EVIDENCE_PROCESSING_DEADLINE_SEC * 1000) {
      // The deadline row of § 4: the reason follows the latest custody event, as in the sweep.
      const failReason = sweepReason(facts.latestCustody);
      return { state: await fail(item, facts.state, failReason, [['failed', { failReason }]]) };
    }

    try {
      return { state: await attempt(facts, input) };
    } catch (error) {
      if (error instanceof ScannerUnavailable || !input.lastAttempt) throw error;
      // BR4.10: the last attempt always leaves a final state, written in a new transaction.
      try {
        const now = await currentState(item.id);
        if (now === null || !isProcessing(now)) return { state: now };
        deps.logger.warn('evidence.last_attempt_failed', {
          itemId: item.id,
          attempt: input.attempt,
          errorClass: errorClassOf(error),
        });
        return {
          state: await fail(item, now, 'processing_timeout', [
            ['failed', { failReason: 'processing_timeout' }],
          ]),
        };
      } catch (writeError) {
        // The sweep ends the item past its deadline (BR4.11).
        deps.logger.error('evidence.fail_write_failed', {
          itemId: item.id,
          errorClass: errorClassOf(writeError),
        });
        throw error;
      }
    }
  };
}
