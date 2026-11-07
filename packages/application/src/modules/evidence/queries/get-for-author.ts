// `evidence.getForAuthor` (WF3b, BR1.3, BR6.1, BR6.2): the author's own items on their own review,
// published or not. Anyone else gets `null`, so the page renders no author list. File names are
// opened only here, for their uploader (BR2.6).
import {
  GetForAuthorInput,
  ok,
  type OwnEvidenceFile,
  type OwnEvidenceList,
} from '@rogikotha/contracts';
import {
  authorStatusOf,
  EVIDENCE_MAX_FILE_BYTES,
  EVIDENCE_MAX_PER_REVIEW,
  type EvidenceItemFailReason,
} from '@rogikotha/domain';

import { defineQuery } from '../../../command';
import type { OwnEvidenceRecord } from '../../../ports';
import { accountIdOf } from '../access';
import type { EvidenceModuleDeps, FilenameSeal } from '../ports';

const COULD_NOT_CHECK = 'ev.reason.couldNotCheck';

/** BR6.2; the release-2 reasons read as "could not check" until release 2 words them. */
export const EVIDENCE_REASON_KEYS: Readonly<Record<EvidenceItemFailReason, string>> = {
  malware: 'ev.reason.malware',
  type_mismatch: 'ev.reason.notImage',
  malformed: 'ev.reason.notImage',
  too_large: 'ev.reason.tooLarge',
  scanner_unavailable: COULD_NOT_CHECK,
  processing_timeout: COULD_NOT_CHECK,
  unknown: COULD_NOT_CHECK,
  // ASSUMPTION(U48): BR6.2 maps no release-1 copy for these PDF-only reasons.
  too_many_pages: COULD_NOT_CHECK,
  encrypted: COULD_NOT_CHECK,
};

function toFile(row: OwnEvidenceRecord, seal: FilenameSeal): OwnEvidenceFile | null {
  const status = authorStatusOf(row.state);
  if (status === null) return null;
  const opened = seal.open(row.originalFilenameEnc);
  const file: OwnEvidenceFile = {
    publicId: row.publicId,
    name: opened === null || opened === '' ? null : opened,
    status,
    size: row.originalBytes,
  };
  if (status === 'rejected' || status === 'failed') {
    file.reasonKey = row.failReason ? EVIDENCE_REASON_KEYS[row.failReason] : COULD_NOT_CHECK;
  }
  return file;
}

export function getForAuthorQuery(deps: EvidenceModuleDeps) {
  return defineQuery<GetForAuthorInput, OwnEvidenceList | null>({
    name: 'evidence.getForAuthor',
    input: GetForAuthorInput,
    requires: { authenticated: true, verifiedEmail: true },
    async handle({ input, tx, actor }) {
      const reviewId = await deps.review.reviewIdForPublicId(tx, {
        publicId: input.reviewPublicId,
      });
      if (reviewId === null) return ok(null);
      if (!(await deps.review.isReviewAuthor(tx, { reviewId, actor }))) return ok(null);
      const rows = await deps.evidenceRepository.listForAuthor(tx, reviewId, accountIdOf(actor));
      const files = rows
        .map((row) => toFile(row, deps.filenameSeal))
        .filter((f): f is OwnEvidenceFile => f !== null);
      return ok({
        reviewPublicId: input.reviewPublicId,
        files,
        maxFiles: EVIDENCE_MAX_PER_REVIEW,
        maxBytes: EVIDENCE_MAX_FILE_BYTES,
      });
    },
  });
}
