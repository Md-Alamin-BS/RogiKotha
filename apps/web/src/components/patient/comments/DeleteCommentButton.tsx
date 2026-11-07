'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
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
  // fix: U50 (ISS-772): spoken as the action returns, because a deleted comment's control
  // unmounts with the refreshed thread before an effect could run.
  const [state, formAction, pending] = useActionState(
    async (previous: CommentActionState, form: FormData): Promise<CommentActionState> => {
      const next = await deleteComment(previous, form);
      if (next.status === 'done') announce(t(next.messageKey));
      return next;
    },
    IDLE,
  );
  const [confirming, setConfirming] = useState(false);
  const openRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmId = useId();

  // The safe choice takes focus when the question appears, and the control gets it back on cancel.
  const returnFocus = useRef(false);
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      openRef.current?.focus();
    }
  }, [confirming]);

  const cancel = () => {
    returnFocus.current = true;
    setConfirming(false);
  };

  return (
    <form action={formAction}>
      <input type="hidden" name="reviewPublicId" value={reviewPublicId} />
      <input type="hidden" name="commentPublicId" value={commentPublicId} />
      {confirming ? (
        <span role="group" aria-labelledby={confirmId}>
          <span className="note" id={confirmId}>
            {t('experience.deleteConfirm')}
          </span>{' '}
          <button className="link-btn" type="submit" disabled={pending}>
            {t('experience.deleteComment')}
          </button>{' '}
          <button
            className="link-btn"
            type="button"
            ref={cancelRef}
            disabled={pending}
            onClick={cancel}
          >
            {t('experience.deleteCancel')}
          </button>
        </span>
      ) : (
        <button
          className="link-btn"
          type="button"
          ref={openRef}
          disabled={pending}
          onClick={() => setConfirming(true)}
        >
          {t('experience.deleteComment')}
        </button>
      )}
      {state.status === 'error' ? (
        <span className="note" role="alert">
          {' '}
          {t(state.messageKey)}
        </span>
      ) : null}
    </form>
  );
}
