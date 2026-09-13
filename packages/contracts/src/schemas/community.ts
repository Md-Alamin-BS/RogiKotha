// Input schemas for the `community` command catalogue
// (03-routes-and-contracts.md §4 "community (T-401, T-402)").
import { z } from 'zod';

import { REACTION_VALUES } from '../enums.js';
import { USERNAME_RE } from './account.js';

const COMMENT_BODY_MAX = 4000;
// data-model.md §8 `reactions.target_kind ('review'|'facility_review'|'comment')`
// — narrower than the general `TARGET_KINDS` enum (which also covers
// evidence/profile, used by moderation reports).
const REACTION_TARGET_KINDS = ['review', 'facility_review', 'comment'] as const;

export const CommentPostInput = z
  .object({
    reviewId: z.string().min(1),
    parentId: z.string().min(1).optional(),
    body: z.string().min(1).max(COMMENT_BODY_MAX),
  })
  .strict();

export const CommentEditInput = z
  .object({
    commentId: z.string().min(1),
    body: z.string().min(1).max(COMMENT_BODY_MAX),
  })
  .strict();

export const CommentDeleteInput = z.object({ commentId: z.string().min(1) }).strict();

export const ReactionSetInput = z
  .object({
    targetKind: z.enum(REACTION_TARGET_KINDS),
    targetId: z.string().min(1),
    value: z.enum(REACTION_VALUES).nullable(),
  })
  .strict();

export const BlockSetInput = z.object({ username: z.string().regex(USERNAME_RE) }).strict();

export const BlockUnsetInput = z.object({ username: z.string().regex(USERNAME_RE) }).strict();

export const GetThreadInput = z.object({ reviewId: z.string().min(1) }).strict();

export const ReactionsOfInput = z
  .object({
    targetKind: z.enum(REACTION_TARGET_KINDS),
    targetId: z.string().min(1),
  })
  .strict();

export const communitySchemas = {
  CommentPostInput,
  CommentEditInput,
  CommentDeleteInput,
  ReactionSetInput,
  BlockSetInput,
  BlockUnsetInput,
  GetThreadInput,
  ReactionsOfInput,
};
