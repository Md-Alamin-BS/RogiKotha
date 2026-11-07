import type { ReactNode } from 'react';
import type { CommentVM, PersonaPublicVM, ThreadVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatDate } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';

import { Byline } from '../experience/Byline';
import { dhakaIsoDate } from '../experience/people';
import { CommentActions } from './CommentActions';
import { CommentPlaceholder } from './CommentPlaceholder';

// The discussion of concept-04b's renderAccount() on the release-1 view model: oldest first, one
// reply level, placeholders that keep a thread readable (FR6.1–FR6.3). Text only, never markup.
export function CommentThreadView({
  reviewPublicId,
  thread,
  canContribute,
}: {
  reviewPublicId: string;
  thread: ThreadVM;
  canContribute: boolean;
}) {
  const t = useTranslations();

  return (
    <section aria-labelledby="discussion-head">
      <h2 className="section-head" id="discussion-head">
        {t('experience.discussion')}
      </h2>
      {thread.items.length > 0 ? (
        <div>
          {thread.items.map((item) => {
            const replies = item.replies.map((reply) => (
              <CommentItem
                key={reply.publicId}
                comment={reply}
                reviewPublicId={reviewPublicId}
                canContribute={canContribute}
              />
            ));
            const replyList =
              replies.length > 0 ? <div className="comment-replies">{replies}</div> : null;
            if (item.kind === 'placeholder' || !item.comment) {
              return (
                <CommentPlaceholder key={item.placeholderPublicId ?? 'placeholder'}>
                  {replyList}
                </CommentPlaceholder>
              );
            }
            return (
              <CommentItem
                key={item.comment.publicId}
                comment={item.comment}
                reviewPublicId={reviewPublicId}
                canContribute={canContribute}
              >
                {replyList}
              </CommentItem>
            );
          })}
        </div>
      ) : (
        <p className="note">{t('experience.noComments')}</p>
      )}
      {thread.truncated ? (
        <p className="note" data-testid="thread-truncated">
          {t('experience.threadTruncated')}
        </p>
      ) : null}
      <p className="note">{t('experience.replyLevel')}</p>
    </section>
  );
}

function bylineProps(author: PersonaPublicVM) {
  if (author.kind === 'named') {
    return { name: author.displayName, identity: 'real' as const };
  }
  if (author.kind === 'pseudonymous') {
    return {
      name: author.displayName,
      identity: 'pseudo' as const,
      username: author.username ?? undefined,
    };
  }
  // Never a name, a link or initials for an anonymous author; the thread alias stays plain text.
  return { name: null, identity: 'anon' as const, alias: author.displayName };
}

function CommentItem({
  comment,
  reviewPublicId,
  canContribute,
  children,
}: {
  comment: CommentVM;
  reviewPublicId: string;
  canContribute: boolean;
  /** The reply list of a top-level comment. */
  children?: ReactNode;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const isoDate = dhakaIsoDate(new Date(comment.postedAt));
  const authorName = comment.author.kind === 'anonymous' ? null : comment.author.displayName;

  return (
    <article className="comment">
      <div className="comment-head">
        <Byline
          variant="comment"
          {...bylineProps(comment.author)}
          when={formatDate(isoDate, locale)}
          whenDateTime={isoDate}
        />
        {comment.mine ? <span className="badge plain">{t('experience.ownComment')}</span> : null}
      </div>
      <p className="comment-body">{comment.body}</p>
      <CommentActions
        reviewPublicId={reviewPublicId}
        commentPublicId={comment.publicId}
        authorName={authorName}
        canReply={canContribute && !comment.isReply}
        canDelete={comment.mine}
      />
      {children}
    </article>
  );
}
