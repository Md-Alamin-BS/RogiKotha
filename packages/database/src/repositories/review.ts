// Stubs only (task step 13) — every method throws `NotImplemented`, naming
// the task that fills it in. Method names are this implementer's reading of
// the `review`/`facilityReview` command catalogue (03-routes-and-contracts.md
// §4), not literal task text (same precedent as `ISS-091`).
import { NotImplemented } from './not-implemented';

export class PgReviewRepository {
  saveDraft(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-301', { input });
  }

  getDraft(draftId: string): Promise<unknown> {
    throw new NotImplemented('T-301', { draftId });
  }

  deleteDraft(draftId: string): Promise<unknown> {
    throw new NotImplemented('T-301', { draftId });
  }

  insertReview(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-301', { input });
  }

  getByPublicId(publicId: string): Promise<unknown> {
    throw new NotImplemented('T-301', { publicId });
  }

  getById(reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-301', { reviewId });
  }

  updateState(reviewId: string, state: string): Promise<unknown> {
    throw new NotImplemented('T-301', { reviewId, state });
  }

  addFollowUp(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-302', { input });
  }

  correctReview(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-302', { input });
  }

  softDeleteReview(reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-302', { reviewId });
  }

  restoreReview(reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-302', { reviewId });
  }

  listForDoctor(doctorId: string): Promise<unknown> {
    throw new NotImplemented('T-301', { doctorId });
  }

  listForBranch(branchId: string): Promise<unknown> {
    throw new NotImplemented('T-301', { branchId });
  }

  listForCondition(conditionId: string): Promise<unknown> {
    throw new NotImplemented('T-301', { conditionId });
  }

  listExperiences(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-301', { input });
  }

  // Ownership note (03-routes-and-contracts.md §4): created by T-201 (the
  // directory pages need these first); T-301 extends but may not rewrite.
  sentimentDistribution(doctorId: string): Promise<unknown> {
    throw new NotImplemented('T-201', { doctorId });
  }

  outcomeDistribution(doctorId: string): Promise<unknown> {
    throw new NotImplemented('T-201', { doctorId });
  }

  criteriaDistribution(branchId: string): Promise<unknown> {
    throw new NotImplemented('T-201', { branchId });
  }

  insertFacilityReview(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-301', { input });
  }

  softDeleteFacilityReview(reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-302', { reviewId });
  }

  restoreFacilityReview(reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-302', { reviewId });
  }
}
