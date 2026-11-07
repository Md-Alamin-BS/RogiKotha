// `evidence.intake` (WF1 step 8, BR1.1, BR1.2, BR2.*, BR4.1): records a file the route already
// wrote to quarantine. One transaction, in this order: type and size, the review, the idempotency
// key, the per-review lock, the count, the total, then the item, its original artifact, custody
// `received` and outbox `evidence.received`. The caller deletes its quarantined key on any `err`
// and whenever `created` is false (BR3.4).
import { IntakeCommandInput, ok, type ErrorCode } from '@rogikotha/contracts';
import {
  cleanFilename,
  EVIDENCE_IMAGE_MIMES,
  EVIDENCE_MAX_FILE_BYTES,
  extensionMatches,
  type EvidenceImageMime,
} from '@rogikotha/domain';

import { defineCommand } from '../../../command';
import {
  accountIdOf,
  existingForKey,
  limitRefusal,
  ownPublishedReviewId,
  refused,
  type EvidenceUploadAnswer,
} from '../access';
import type { EvidenceModuleDeps } from '../ports';

// ASSUMPTION(U48): `created` is added to § 2's `{itemId, state}` so the route can tell an
// idempotent answer, whose file it must delete, from a new item.
export interface IntakeOutput extends EvidenceUploadAnswer {
  created: boolean;
}

type TypeCheck =
  { ok: true; name: string; mime: EvidenceImageMime } | { ok: false; code: ErrorCode };

const isImageMime = (mime: string): mime is EvidenceImageMime =>
  (EVIDENCE_IMAGE_MIMES as readonly string[]).includes(mime);

/** BR2.1 and BR2.2 on the facts the route measured; the full structure check is the worker's. */
function checkFile(input: IntakeCommandInput): TypeCheck {
  const name = cleanFilename(input.declaredName);
  const declared = input.declaredMime.toLowerCase();
  if (input.file.bytes === 0) return { ok: false, code: 'evidence.type_rejected' };
  if (
    name === null ||
    !isImageMime(declared) ||
    input.file.detectedMime !== declared ||
    !extensionMatches(name, declared)
  ) {
    return { ok: false, code: 'evidence.type_rejected' };
  }
  if (input.file.bytes > EVIDENCE_MAX_FILE_BYTES) return { ok: false, code: 'evidence.too_large' };
  return { ok: true, name, mime: declared };
}

export function intakeEvidenceCommand(deps: EvidenceModuleDeps) {
  const repo = deps.evidenceRepository;
  return defineCommand<IntakeCommandInput, IntakeOutput>({
    name: 'evidence.intake',
    input: IntakeCommandInput,
    requires: { authenticated: true, verifiedEmail: true },
    async handle({ input, tx, actor, ports }) {
      const file = checkFile(input);
      if (!file.ok) return refused(file.code, actor);

      const reviewId = await ownPublishedReviewId(deps.review, tx, input.reviewPublicId, actor);
      if (reviewId === null) return refused('not_found', actor);
      const existing = await existingForKey(repo, tx, input.idempotencyKey, reviewId, actor);
      if (!existing.ok) return existing;
      if (existing.data !== null) return ok({ ...existing.data, created: false });

      await repo.lockReview(tx, reviewId);
      const limit = await limitRefusal(repo, tx, reviewId, input.file.bytes);
      if (limit !== null) return refused(limit, actor);

      const accountId = accountIdOf(actor);
      const now = deps.clock.now();
      const id = ports.ids.newId();
      const publicId = ports.ids.newPublicId();
      await repo.insertQuarantined(tx, {
        id,
        publicId,
        artifactId: ports.ids.newId(),
        reviewId,
        uploadedByAccountId: accountId,
        declaredMime: input.declaredMime,
        detectedMime: file.mime,
        originalBytes: input.file.bytes,
        originalSha256: input.file.sha256,
        originalFilenameEnc: deps.filenameSeal.seal(file.name),
        idempotencyKey: input.idempotencyKey,
        storageKey: input.file.key,
        now,
      });
      await repo.appendCustody(tx, {
        itemId: id,
        event: 'received',
        actor: `account:${accountId}`,
        details: { bytes: input.file.bytes, mime: file.mime },
        now,
      });
      await ports.outbox.append(tx, 'evidence.received', { itemId: id });
      deps.logger.info('evidence.received', { itemId: id, state: 'quarantined' });
      return ok({ itemId: publicId, state: 'quarantined', created: true });
    },
  });
}
