// The Community module on `test-support` fakes, over U47's review world (U49 Steps 18-19). The
// comment fake is enlisted in the unit of work, so a refused post rolls back the alias it made.
// Every account, review and comment is synthetic.
import { FakeCommunityModuleRepository } from '../../../../test-support/src/fakes/community-repository.js';
import type { CommandCall } from '../../command';
import { makeReviewModuleWorld, type Member } from '../review/review-test-support';
import { createCommunityModule } from './index';
import type { CommunityIdentitySeams, CommunityModulePorts, CommunityReviewSeams } from './ports';

export {
  anAccountActor,
  anAnonymousActor,
  deepKeys,
  expectErr,
  expectOk,
  TX,
} from '../review/review-test-support';
export { FakeCommunityModuleRepository };
export type { Member };

export interface CommunityWorldOverrides {
  review?: (seams: CommunityReviewSeams) => CommunityReviewSeams;
  identity?: (seams: CommunityIdentitySeams) => CommunityIdentitySeams;
  ownership?: (seams: CommunityModulePorts['ownership']) => CommunityModulePorts['ownership'];
}

export function makeCommunityWorld(overrides: CommunityWorldOverrides = {}) {
  const world = makeReviewModuleWorld();
  const comments = new FakeCommunityModuleRepository();
  world.fakes.unitOfWork.enlist(comments);
  const review = overrides.review ? overrides.review(world.review) : world.review;
  const identity = overrides.identity
    ? overrides.identity(world.identityModule)
    : world.identityModule;
  const ownership = overrides.ownership
    ? overrides.ownership(world.identityModule.ownership)
    : world.identityModule.ownership;
  const community = createCommunityModule({ comments, review, identity, ownership });

  /** The internal id of a review the world published. */
  function reviewIdOf(publicId: string): string {
    const found = world.reviews.reviews.find((r) => r.publicId === publicId);
    if (!found) throw new Error(`no review ${publicId}`);
    return found.id;
  }

  /** Posts through the module and returns the comment's public id. */
  async function posted(
    call: CommandCall,
    reviewPublicId: string,
    body = 'A synthetic comment.',
    parentPublicId?: string,
  ): Promise<string> {
    const result = await community.postComment.execute(
      { reviewPublicId, body, ...(parentPublicId ? { parentPublicId } : {}) },
      call,
    );
    if (!result.ok) throw new Error(`postComment failed: ${result.error.code}`);
    return result.data.publicId;
  }

  /** The stored row behind a public id. */
  function rowOf(publicId: string) {
    const row = [...comments.rows.values()].find((r) => r.publicId === publicId);
    if (!row) throw new Error(`no comment ${publicId}`);
    return row;
  }

  function commentPostHits(): number {
    return world.fakes.rateLimiter.calls.filter((c) => c.key.startsWith('comment.post:')).length;
  }

  return { ...world, comments, community, reviewIdOf, posted, rowOf, commentPostHits };
}

export type CommunityWorld = ReturnType<typeof makeCommunityWorld>;
