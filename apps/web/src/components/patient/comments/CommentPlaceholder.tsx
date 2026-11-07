import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

// A deleted comment that still has live replies keeps the thread readable (BR3.3); it shows no
// author, date, body or action.
export function CommentPlaceholder({ children }: { children: ReactNode }) {
  const t = useTranslations();
  return (
    <article className="comment tombstone">
      <p className="note">
        <b>{t('experience.commentGone')}</b> {t('experience.commentGoneWhy')}
      </p>
      {children}
    </article>
  );
}
