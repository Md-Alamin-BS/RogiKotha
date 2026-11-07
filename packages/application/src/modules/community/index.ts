// The release-1 Community module (U49, C10 release 1, FD-105): post, delete own, read the thread.
// Mentions, reactions, blocks, reports, editing and the discussion email are release 2.
import type {
  DeleteCommentInput,
  GetThreadInput,
  PostCommentInput,
  ThreadVM,
} from '@rogikotha/contracts';

import type { Command } from '../../command';
import { deleteCommentCommand, type DeleteCommentOutput } from './commands/delete-comment';
import { postCommentCommand, type PostCommentOutput } from './commands/post-comment';
import type { CommunityModulePorts } from './ports';
import { getThreadQuery } from './queries/get-thread';

export interface CommunityModule {
  postComment: Command<PostCommentInput, PostCommentOutput>;
  deleteComment: Command<DeleteCommentInput, DeleteCommentOutput>;
  getThread: Command<GetThreadInput, ThreadVM>;
}

export function createCommunityModule(deps: CommunityModulePorts): CommunityModule {
  return {
    postComment: postCommentCommand(deps),
    deleteComment: deleteCommentCommand(deps),
    getThread: getThreadQuery(deps),
  };
}

export { COMMUNITY_AUDIT_DETAIL_KEYS } from './audit';
export { commentPostKey, type PostCommentOutput } from './commands/post-comment';
export type { DeleteCommentOutput } from './commands/delete-comment';
export type { CommunityIdentitySeams, CommunityModulePorts, CommunityReviewSeams } from './ports';
