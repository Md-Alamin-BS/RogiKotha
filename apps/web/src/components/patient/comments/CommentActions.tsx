'use client';

import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { CommentForm } from './CommentForm';
import { DeleteCommentButton } from './DeleteCommentButton';

// The comment-actions row of concept-04b's commentHtml() (app.js) with its inline reply box.
// Only the controls the slice supports are kept: reply on a top-level comment, delete on one's own.
export function CommentActions({
  reviewPublicId,
  commentPublicId,
  authorName,
  canReply,
  canDelete,
}: {
  reviewPublicId: string;
  commentPublicId: string;
  /** Null for an anonymous commenter. */
  authorName: string | null;
  canReply: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations();
  const [replying, setReplying] = useState(false);
  const boxId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Focus goes into the box when it opens (the form's autoFocus) and back to the toggle on close.
  const close = () => {
    setReplying(false);
    toggleRef.current?.focus();
  };

  if (!canReply && !canDelete) return null;
  return (
    <>
      <div className="comment-actions">
        {canReply ? (
          <button
            className="link-btn"
            type="button"
            ref={toggleRef}
            aria-expanded={replying}
            aria-controls={replying ? boxId : undefined}
            onClick={() => setReplying((open) => !open)}
          >
            {t('experience.reply')}
          </button>
        ) : null}
        {canDelete ? (
          <DeleteCommentButton reviewPublicId={reviewPublicId} commentPublicId={commentPublicId} />
        ) : null}
      </div>
      {replying ? (
        <div className="composer-box reply-box" id={boxId}>
          <p className="note">
            {t('experience.replyingTo')} <b>{authorName ?? t('byline.anonSentence')}</b>
          </p>
          <CommentForm
            reviewPublicId={reviewPublicId}
            parentPublicId={commentPublicId}
            onCancel={close}
            onDone={close}
          />
        </div>
      ) : null}
    </>
  );
}
