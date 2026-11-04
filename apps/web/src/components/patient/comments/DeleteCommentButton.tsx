'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { deleteComment, type CommentActionState } from '@/server/actions/comments';
import { useAnnounce } from '@/lib/announce';

const IDLE: CommentActionState = { status: 'idle' };

/** The delete control of the reader's own comment (FR6.3); the server re-checks ownership. */
export function DeleteCommentButton({
  reviewPublicId,
  commentPublicId,
}: {
  reviewPublicId: string;
  commentPublicId: string;
}) {
  const t = useTranslations();
  const announce = useAnnounce();
  const [state, formAction, pending] = useActionState(deleteComment, IDLE);
  const handledAt = useRef(0);

  useEffect(() => {
    if (state.status !== 'done' || state.at === handledAt.current) return;
    handledAt.current = state.at;
    announce(t(state.messageKey));
  });

  return (
    <form action={formAction}>
      <input type="hidden" name="reviewPublicId" value={reviewPublicId} />
      <input type="hidden" name="commentPublicId" value={commentPublicId} />
      <button className="link-btn" type="submit" disabled={pending}>
        {t('experience.deleteComment')}
      </button>
      {state.status === 'error' ? (
        <span className="note" role="alert">
          {' '}
          {t(state.messageKey)}
        </span>
      ) : null}
    </form>
  );
}
