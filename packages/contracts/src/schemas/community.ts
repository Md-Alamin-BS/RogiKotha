// Input schemas for the `community` command catalogue
// (03-routes-and-contracts.md §4 "community (T-401, T-402)").
import { z } from 'zod';

import { hasControlOrFormatExceptJoiners } from '../doctor-name';
import { REACTION_VALUES } from '../enums';
import { PUBLIC_ID_RE } from '../ids';
import { USERNAME_RE } from './account';

// Release-2 edit limit, kept for the schemas below that U49 does not use (FD-105).
const COMMENT_BODY_MAX = 4000;
// ASSUMPTION(U49): mirrors domain `COMMENT_BODY_MAX` (2000), because `contracts` imports zod only;
// `community.test.ts` pins the value so the two cannot drift silently.
const COMMENT_BODY_MAX_CODE_POINTS = 2000;
const publicId = z.string().regex(PUBLIC_ID_RE);
// `trim()` keeps zero-width characters, so a body of only those would look empty once posted.
const BLANK_RE = /[\s\u{200B}-\u{200D}\u{2060}\u{FEFF}]/gu;
// The keys start with `errors.`, because `parseInput` turns any other message into the generic one.
const COMMENT_LENGTH_KEY = 'errors.community.commentLength';
const COMMENT_HIDDEN_KEY = 'errors.community.commentHidden';
// BR1.2: NFC(trim(raw)), then 1 to 2000 Unicode code points, not UTF-16 units. The author's own
// words follow review text: Bengali joiners and typed line breaks pass, other Cc and Cf characters
// (NUL, bidi overrides and isolates, zero-width space) are refused (FD-114, FD-115).
const commentBody = z
  .string()
  .trim()
  .normalize('NFC')
  .refine((body) => body.replace(BLANK_RE, '').length > 0, { message: COMMENT_LENGTH_KEY })
  .refine((body) => [...body].length <= COMMENT_BODY_MAX_CODE_POINTS, {
    message: COMMENT_LENGTH_KEY,
  })
  .refine((body) => !hasControlOrFormatExceptJoiners(body, { lineBreaks: true }), {
    message: COMMENT_HIDDEN_KEY,
  });
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

export const PostCommentInput = z
  .object({
    reviewPublicId: publicId,
    parentPublicId: publicId.optional(),
    body: commentBody,
  })
  .strict();

export const DeleteCommentInput = z.object({ commentPublicId: publicId }).strict();

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

export const GetThreadInput = z.object({ reviewPublicId: publicId }).strict();

export const ReactionsOfInput = z
  .object({
    targetKind: z.enum(REACTION_TARGET_KINDS),
    targetId: z.string().min(1),
  })
  .strict();

export const communitySchemas = {
  PostCommentInput,
  DeleteCommentInput,
  CommentPostInput,
  CommentEditInput,
  CommentDeleteInput,
  ReactionSetInput,
  BlockSetInput,
  BlockUnsetInput,
  GetThreadInput,
  ReactionsOfInput,
};

export type PostCommentInput = z.output<typeof PostCommentInput>;
export type DeleteCommentInput = z.output<typeof DeleteCommentInput>;
export type GetThreadInput = z.output<typeof GetThreadInput>;
