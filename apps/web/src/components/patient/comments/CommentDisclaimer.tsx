import { useTranslations } from 'next-intl';

/** Persistent and non-modal: shown above the thread in every state (BR5.1). */
export function CommentDisclaimer() {
  const t = useTranslations();
  return (
    <p className="note" data-testid="comment-disclaimer">
      {t('disclaimer.comments')}
    </p>
  );
}
