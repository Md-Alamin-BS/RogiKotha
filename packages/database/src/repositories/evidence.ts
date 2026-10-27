// Stubs only (task step 13) — every method throws `NotImplemented`, naming
// the task that fills it in. Method names are this implementer's reading of
// the `evidence`/`retention`/`hold` command catalogue
// (03-routes-and-contracts.md §4), not literal task text (same precedent as
// `ISS-091`).
import { NotImplemented } from './not-implemented';

export class PgEvidenceRepository {
  intake(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-303', { input });
  }

  updateState(itemId: string, state: string, failReason?: string): Promise<unknown> {
    throw new NotImplemented('T-304', { itemId, state, failReason });
  }

  insertArtifact(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-304', { input });
  }

  recordCustodyEvent(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-304', { input });
  }

  applyRedaction(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-305', { input });
  }

  confirmPrivacy(itemId: string): Promise<unknown> {
    throw new NotImplemented('T-305', { itemId });
  }

  publish(reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-301', { reviewId });
  }

  remove(itemId: string): Promise<unknown> {
    throw new NotImplemented('T-305', { itemId });
  }

  getForAuthor(draftId: string): Promise<unknown> {
    throw new NotImplemented('T-306', { draftId });
  }

  listForStaff(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-407', { input });
  }

  getPublic(reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-308', { reviewId });
  }

  readOriginal(itemId: string, reason: string): Promise<unknown> {
    throw new NotImplemented('T-407', { itemId, reason });
  }
}
