import type { DemoComment, DemoCommentThread } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatDate } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { Byline } from '../experience/Byline';
import { dhakaIsoDate } from '../experience/people';
import { CommentActions } from './CommentActions';
import { CommentForm } from './CommentForm';

// Port of the discussion part of concept-04b's renderAccount() and its commentHtml() (app.js):
// oldest first, one reply level, tombstones that keep a thread readable (FR6.1–FR6.3).
export function CommentThreadView({
  reviewPublicId,
  threads,
  signedIn,
}: {
  reviewPublicId: string;
  threads: DemoCommentThread[];
  signedIn: boolean;
}) {
  const t = useTranslations();

  return (
    <section aria-labelledby="discussion-head">
      <h2 className="section-head" id="discussion-head">
        {t('experience.discussion')}
      </h2>
      {threads.length > 0 ? (
        <div>
          {threads.map((thread) => (
            <CommentItem
              key={thread.publicId}
              comment={thread}
              replies={thread.replies}
              reviewPublicId={reviewPublicId}
              signedIn={signedIn}
            />
          ))}
        </div>
      ) : (
        <p className="note">{t('mine.empty')}</p>
      )}
      <p className="note">{t('experience.replyLevel')}</p>

      {signedIn ? (
        <div className="composer-box">
          <CommentForm reviewPublicId={reviewPublicId} />
        </div>
      ) : (
        <p className="note">
          <Link
            className="link-btn"
            href={{ pathname: '/sign-in', query: { next: `/experiences/${reviewPublicId}` } }}
          >
            {t('experience.signInToComment')}
          </Link>
        </p>
      )}
    </section>
  );
}

function CommentItem({
  comment,
  replies,
  reviewPublicId,
  signedIn,
}: {
  comment: DemoComment;
  /** Null for a reply, which can have none (one reply level). */
  replies: DemoComment[] | null;
  reviewPublicId: string;
  signedIn: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const replyList =
    replies && replies.length > 0 ? (
      <div className="comment-replies">
        {replies.map((reply) => (
          <CommentItem
            key={reply.publicId}
            comment={reply}
            replies={null}
            reviewPublicId={reviewPublicId}
            signedIn={signedIn}
          />
        ))}
      </div>
    ) : null;

  if (comment.tombstone) {
    return (
      <article className="comment tombstone">
        <p className="note">
          <b>{t('experience.commentGone')}</b> {t('experience.commentGoneWhy')}
        </p>
        {replyList}
      </article>
    );
  }

  const isoDate = dhakaIsoDate(comment.createdAt);
  return (
    <article className="comment">
      <div className="comment-head">
        <Byline
          variant="comment"
          name={comment.authorDisplayName}
          identity={comment.authorDisplayName === null ? 'anon' : undefined}
          when={formatDate(isoDate, locale)}
          whenDateTime={isoDate}
        />
        {comment.canDelete ? (
          <span className="badge plain">{t('experience.ownComment')}</span>
        ) : null}
      </div>
      <p>{comment.body}</p>
      <CommentActions
        reviewPublicId={reviewPublicId}
        commentPublicId={comment.publicId}
        authorName={comment.authorDisplayName}
        canReply={signedIn && replies !== null}
        canDelete={comment.canDelete}
      />
      {replyList}
    </article>
  );
}
