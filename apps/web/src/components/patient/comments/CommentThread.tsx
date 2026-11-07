import type { ThreadVM } from '@rogikotha/contracts';
import { getLocale, getTranslations } from 'next-intl/server';

import { ContributionGatePanel } from '@/components/patient/auth/ContributionGate';
import { getContributionAccess } from '@/server/actions/account';
import { safeAuthNext } from '@/server/actions/auth-form';
import { loadThread } from '@/server/actions/comment-thread';
import { logSlotFailure } from '@/server/actions/review-slots';
import { CommentDisclaimer } from './CommentDisclaimer';
import { CommentForm } from './CommentForm';
import { CommentThreadView } from './CommentThreadView';

// C16 slot (props frozen): the experience page passes only the public id. The disclaimer comes
// first in every state; a closed thread or a failed read shows a note and never throws (BR5.5).
export async function CommentThread({ reviewPublicId }: { reviewPublicId: string }) {
  const t = await getTranslations();
  let thread: ThreadVM;
  try {
    thread = await loadThread(reviewPublicId);
  } catch (error: unknown) {
    logSlotFailure('comments', error);
    return (
      <div data-testid="comment-thread-error">
        <CommentDisclaimer />
        <section aria-labelledby="discussion-head">
          <h2 className="section-head" id="discussion-head">
            {t('experience.discussion')}
          </h2>
          <p className="note">{t('errors.common.internal')}</p>
        </section>
      </div>
    );
  }
  if (!thread.open) {
    return (
      <div data-testid="comment-thread-closed">
        <CommentDisclaimer />
        <section aria-labelledby="discussion-head">
          <h2 className="section-head" id="discussion-head">
            {t('experience.discussion')}
          </h2>
          <p className="note">{t('experience.discussionClosed')}</p>
        </section>
      </div>
    );
  }

  const access = await getContributionAccess();
  const locale = await getLocale();
  const canContribute = access === 'allowed';
  return (
    <div data-testid="comment-thread">
      <CommentDisclaimer />
      <CommentThreadView
        reviewPublicId={reviewPublicId}
        thread={thread}
        canContribute={canContribute}
      />
      {canContribute ? (
        <div className="composer-box">
          <CommentForm reviewPublicId={reviewPublicId} />
        </div>
      ) : (
        <ContributionGatePanel
          access={access}
          purpose="comment"
          next={safeAuthNext(`/${locale}/experiences/${reviewPublicId}`)}
        />
      )}
    </div>
  );
}
