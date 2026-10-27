// Stubs only (task step 13) — every method throws `NotImplemented`, naming
// the task that fills it in. Method names are this implementer's reading of
// the `community` command catalogue (03-routes-and-contracts.md §4), not
// literal task text (same precedent as `ISS-091`). `block.set`/`unset` are
// already stubbed on `PgAccountRepository` (T-004) since `blocks` lives in
// `schema/account.ts`.
import { NotImplemented } from './not-implemented';

export class PgCommunityRepository {
  postComment(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-401', { input });
  }

  editComment(commentId: string, body: string): Promise<unknown> {
    throw new NotImplemented('T-401', { commentId, body });
  }

  deleteComment(commentId: string): Promise<unknown> {
    throw new NotImplemented('T-401', { commentId });
  }

  setReaction(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-401', { input });
  }

  thread(reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-402', { reviewId });
  }

  reactionsOf(targetKind: string, targetId: string): Promise<unknown> {
    throw new NotImplemented('T-402', { targetKind, targetId });
  }
}
