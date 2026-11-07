import { getTranslations } from 'next-intl/server';

import { loadCommentThread, logSlotFailure } from '@/server/actions/review-slots';
import { CommentThreadView } from './CommentThreadView';

// C16 slot (props frozen when U47 merges): the experience page passes only the public id; the
// slot resolves the review itself and reads the demo discussion until U49 swaps the source.
// An unknown review renders no thread; a failed read stays inside the slot.
export async function CommentThread({ reviewPublicId }: { reviewPublicId: string }) {
  let thread: Awaited<ReturnType<typeof loadCommentThread>>;
  try {
    thread = await loadCommentThread(reviewPublicId);
  } catch (error: unknown) {
    logSlotFailure('comments', error);
    const t = await getTranslations();
    return (
      <section aria-labelledby="discussion-head" data-testid="comment-thread-error">
        <h2 className="section-head" id="discussion-head">
          {t('experience.discussion')}
        </h2>
        <p className="note">{t('errors.common.internal')}</p>
      </section>
    );
  }
  if (thread === null) return null;
  return (
    <CommentThreadView
      reviewPublicId={reviewPublicId}
      threads={thread.threads}
      signedIn={thread.signedIn}
    />
  );
}
