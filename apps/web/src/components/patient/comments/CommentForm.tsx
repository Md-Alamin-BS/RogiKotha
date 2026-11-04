'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';

import { postComment, type CommentActionState } from '@/server/actions/comments';
import { useAnnounce } from '@/lib/announce';

/** FR6.2; `server/actions/comments.ts` enforces the same limit. */
export const COMMENT_BODY_MAX = 2000;

const IDLE: CommentActionState = { status: 'idle' };

// Port of concept-04b's composer-box and replyBox() (app.js). React resets the form after each
// submission; `defaultValue` puts the text back when the server refused it.
export function CommentForm({
  reviewPublicId,
  parentPublicId,
  onCancel,
  onDone,
}: {
  reviewPublicId: string;
  /** Set for a reply. */
  parentPublicId?: string;
  onCancel?: () => void;
  onDone?: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const announce = useAnnounce();
  const [state, formAction, pending] = useActionState(postComment, IDLE);
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const handledAt = useRef(0);

  useEffect(() => {
    if (state.status !== 'done' || state.at === handledAt.current) return;
    handledAt.current = state.at;
    announce(t(state.messageKey));
    onDone?.();
  });

  const error =
    state.status === 'error'
      ? t(
          state.messageKey,
          Object.fromEntries(
            Object.entries(state.values ?? {}).map(([name, value]) => [
              name,
              formatNumber(value, locale),
            ]),
          ),
        )
      : null;
  const isReply = parentPublicId !== undefined;

  return (
    <form action={formAction}>
      <input type="hidden" name="reviewPublicId" value={reviewPublicId} />
      {isReply ? <input type="hidden" name="parentPublicId" value={parentPublicId} /> : null}
      <label className="sr-only" htmlFor={fieldId}>
        {t('experience.commentBox')}
      </label>
      <textarea
        id={fieldId}
        name="body"
        placeholder={t('experience.commentBox')}
        maxLength={COMMENT_BODY_MAX}
        defaultValue={state.status === 'error' ? (state.body ?? '') : ''}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        autoFocus={isReply}
      />
      {error ? (
        <div className="callout warn" id={errorId} role="alert">
          {error}
        </div>
      ) : null}
      <p className="note">{t('experience.commentHint')}</p>
      <button className="btn small" type="submit" disabled={pending}>
        {t(isReply ? 'experience.replyPost' : 'experience.commentPost')}
      </button>
      {onCancel ? (
        <>
          {' '}
          <button className="btn small ghost" type="button" onClick={onCancel}>
            {t('experience.replyCancel')}
          </button>
        </>
      ) : null}
    </form>
  );
}
