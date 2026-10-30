'use server';

// Comment server actions of the demo slice (FR6.2, FR6.3). Each action checks the signed-in
// account on the server and validates its form with the contracts' zod schemas; ownership of a
// deletion is enforced by the data function, which only matches the caller's own comment.
import { CommentDeleteInput, CommentPostInput, LOCALES, PUBLIC_ID_RE } from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAccount } from '@/server/auth/session';
import { comments, reviews } from '@/server/data';

/** The state a comment form keeps between submissions; message keys are i18n keys. */
export type CommentActionState =
  | { status: 'idle' }
  | { status: 'done'; messageKey: string; at: number }
  | {
      status: 'error';
      messageKey: string;
      values?: Record<string, number>;
      /** The submitted text, so the form keeps it after a refusal. */
      body?: string;
    };

// FR6.2 allows 1–2000 characters, narrower than the contract's 4000. The comment form repeats
// the 2000 as its `maxLength`; a 'use server' module may export only async functions.
const COMMENT_BODY_MIN = 1;
const COMMENT_BODY_MAX = 2000;

const PostCommentForm = CommentPostInput.extend({
  reviewId: CommentPostInput.shape.reviewId.regex(PUBLIC_ID_RE),
  parentId: CommentPostInput.shape.parentId.unwrap().regex(PUBLIC_ID_RE).optional(),
  body: CommentPostInput.shape.body.max(COMMENT_BODY_MAX),
});

const DeleteCommentForm = CommentDeleteInput.extend({
  commentId: CommentDeleteInput.shape.commentId.regex(PUBLIC_ID_RE),
  reviewId: z.string().regex(PUBLIC_ID_RE),
});

const REFUSAL_KEYS = {
  parent_not_found: 'errors.common.notFound',
  reply_depth: 'errors.community.replyDepth',
  not_found: 'errors.common.notFound',
} as const;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

/** The sign-in return path, only for a well-formed public id so nothing else reaches `?next=`. */
function returnTo(reviewPublicId: string): { returnTo?: string } {
  return PUBLIC_ID_RE.test(reviewPublicId) ? { returnTo: `/experiences/${reviewPublicId}` } : {};
}

function revalidateExperience(reviewPublicId: string): void {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/experiences/${reviewPublicId}`);
  }
}

/** Posts a comment, or a reply when `parentPublicId` is set, as the account's named persona. */
export async function postComment(
  _previous: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const reviewPublicId = field(formData, 'reviewPublicId');
  const account = await requireAccount(returnTo(reviewPublicId));

  const body = field(formData, 'body').trim();
  const parsed = PostCommentForm.safeParse({
    reviewId: reviewPublicId,
    parentId: field(formData, 'parentPublicId') || undefined,
    body,
  });
  if (!parsed.success) {
    const bodyRefused = parsed.error.issues.some((issue) => issue.path[0] === 'body');
    return bodyRefused
      ? {
          status: 'error',
          messageKey: 'experience.commentLength',
          values: { min: COMMENT_BODY_MIN, max: COMMENT_BODY_MAX },
          body,
        }
      : { status: 'error', messageKey: 'errors.common.validation', body };
  }

  const review = await reviews.getReviewByPublicId(parsed.data.reviewId, account.locale);
  if (!review) return { status: 'error', messageKey: 'errors.common.notFound', body };

  // ASSUMPTION(demo-slice): comments are written under the account's current named persona; the
  // slice offers no pseudonymous or anonymous commenting.
  const outcome = await comments.addComment({
    reviewId: review.id,
    parentPublicId: parsed.data.parentId ?? null,
    authorPersonaId: account.currentPersonaId,
    body: parsed.data.body,
  });
  if (!outcome.ok) return { status: 'error', messageKey: REFUSAL_KEYS[outcome.reason], body };

  revalidateExperience(parsed.data.reviewId);
  return { status: 'done', messageKey: 'experience.commentPosted', at: Date.now() };
}

/** Deletes the signed-in account's own comment; anyone else's comment reads as not found. */
export async function deleteComment(
  _previous: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const reviewPublicId = field(formData, 'reviewPublicId');
  const account = await requireAccount(returnTo(reviewPublicId));

  const parsed = DeleteCommentForm.safeParse({
    commentId: field(formData, 'commentPublicId'),
    reviewId: reviewPublicId,
  });
  if (!parsed.success) return { status: 'error', messageKey: 'errors.common.validation' };

  const outcome = await comments.deleteOwnComment(parsed.data.commentId, account.accountId);
  if (!outcome.ok) return { status: 'error', messageKey: REFUSAL_KEYS[outcome.reason] };

  revalidateExperience(parsed.data.reviewId);
  return { status: 'done', messageKey: 'experience.commentDeleted', at: Date.now() };
}
