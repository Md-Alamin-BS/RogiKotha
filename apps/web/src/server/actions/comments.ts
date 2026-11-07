'use server';

// Comment server actions (U49, FR6.2, FR6.3). Each action hands the form to the Community module
// through `runCommand`, which parses, authorizes (BR1.1) and decides; the action only maps the
// answer to an i18n message key and refreshes the experience page. Results carry public ids only.
import { LOCALES, PUBLIC_ID_RE, type AppError } from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';

import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';

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

// The comment form repeats the 2000 as its `maxLength`; a 'use server' module may export only
// async functions. The authoritative limit is the contracts' `PostCommentInput` (BR1.2).
const COMMENT_BODY_MIN = 1;
const COMMENT_BODY_MAX = 2000;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

/** Only a well-formed public id may reach a revalidated path. */
function revalidateExperience(reviewPublicId: string): void {
  if (!PUBLIC_ID_RE.test(reviewPublicId)) return;
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/experiences/${reviewPublicId}`);
  }
}

type Refusal = Extract<CommentActionState, { status: 'error' }>;

/**
 * The refusal as the form shows it. The signed-out and restricted cases read as `forbidden`: the
 * contribution gate normally keeps both from reaching the form.
 */
function refusalOf(error: AppError, body?: string): Refusal {
  const kept = body === undefined ? {} : { body };
  switch (error.code) {
    case 'validation':
      return error.fieldErrors?.body === 'experience.commentLength'
        ? {
            status: 'error',
            messageKey: 'experience.commentLength',
            values: { min: COMMENT_BODY_MIN, max: COMMENT_BODY_MAX },
            ...kept,
          }
        : { status: 'error', messageKey: 'errors.common.validation', ...kept };
    case 'community.reply_depth':
      return { status: 'error', messageKey: 'errors.community.replyDepth', ...kept };
    case 'not_found':
      return { status: 'error', messageKey: 'errors.common.notFound', ...kept };
    case 'rate_limited':
      return {
        status: 'error',
        messageKey: 'errors.common.rateLimited',
        values: { minutes: Math.max(1, Math.ceil((error.retryAfterSec ?? 0) / 60)) },
        ...kept,
      };
    case 'auth.email_unverified':
      return { status: 'error', messageKey: 'errors.auth.emailUnverified', ...kept };
    case 'forbidden':
      return { status: 'error', messageKey: 'errors.common.forbidden', ...kept };
    default:
      return { status: 'error', messageKey: 'errors.common.internal', ...kept };
  }
}

/** Posts a comment, or a reply when `parentPublicId` is set; the module picks the persona. */
export async function postComment(
  _previous: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const reviewPublicId = field(formData, 'reviewPublicId');
  const parentPublicId = field(formData, 'parentPublicId');
  const body = field(formData, 'body').trim();

  const result = await runCommand(getContainer().community.postComment, {
    reviewPublicId,
    ...(parentPublicId !== '' ? { parentPublicId } : {}),
    body,
  });
  if (!result.ok) return refusalOf(result.error, body);

  revalidateExperience(reviewPublicId);
  return { status: 'done', messageKey: 'experience.commentPosted', at: Date.now() };
}

/** Deletes the signed-in account's own comment; anyone else's comment reads as not found. */
export async function deleteComment(
  _previous: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const result = await runCommand(getContainer().community.deleteComment, {
    commentPublicId: field(formData, 'commentPublicId'),
  });
  if (!result.ok) return refusalOf(result.error);

  revalidateExperience(field(formData, 'reviewPublicId'));
  return { status: 'done', messageKey: 'experience.commentDeleted', at: Date.now() };
}
