// C17 implemented (BR5.1, BR5.2): how many documents of a review the public may count, items in
// `PUBLIC_EVIDENCE_STATES` only. Callers check publication first; this port says nothing about it.
import type { PublicEvidenceCount } from '../../../ports';
import type { EvidenceModuleDeps } from '../ports';

export function createPublicEvidenceCount(
  deps: Pick<EvidenceModuleDeps, 'unitOfWork' | 'evidenceRepository'>,
): PublicEvidenceCount {
  const repo = deps.evidenceRepository;
  return {
    countPublicEvidence(reviewId) {
      return deps.unitOfWork.read((tx) => repo.countPublic(tx, reviewId));
    },
    countPublicEvidenceByReview(reviewIds) {
      if (reviewIds.length === 0) return Promise.resolve(new Map());
      return deps.unitOfWork.read((tx) => repo.countPublicByReview(tx, reviewIds));
    },
  };
}
