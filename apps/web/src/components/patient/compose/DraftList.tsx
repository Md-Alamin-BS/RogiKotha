import { getLocale, getTranslations } from 'next-intl/server';
import type { DraftSummaryVM, Locale } from '@rogikotha/contracts';
import { formatDate } from '@rogikotha/i18n/format';

import { Link } from '@/i18n/routing';
import { DiscardDraftButton } from './DiscardDraftButton';

/** The most live drafts one account may hold (C18); at the cap the new composer asks to free one. */
export const DRAFTS_LIMIT = 10;

// The author's live drafts, shown on /write before the composer (BR2.4). The dates are the author's
// own operational dates, so they use the day-level formatter, in the active language's digits.
export async function DraftList({ drafts }: { drafts: readonly DraftSummaryVM[] }) {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  if (drafts.length === 0) return null;
  const full = drafts.length >= DRAFTS_LIMIT;
  const day = (iso: string) => formatDate(iso.slice(0, 10), locale);
  return (
    <section
      className="panel draft-list"
      aria-labelledby="draft-list-title"
      data-testid="draft-list"
    >
      <h2 id="draft-list-title">{t('compose.drafts.title')}</h2>
      {full ? (
        <p className="callout warn" data-testid="draft-list-full">
          {t('errors.review.draftsFull')}
        </p>
      ) : null}
      <ul>
        {drafts.map((draft) => {
          const title = draft.title ?? t('compose.drafts.untitled');
          return (
            <li key={draft.draftId} data-testid="draft-row">
              <b>{title}</b>
              <span className="sub">
                {t('compose.drafts.saved', { date: day(draft.updatedAt) })}
                {' · '}
                {t('compose.drafts.expires', { date: day(draft.expiresAt) })}
              </span>
              <Link
                className="btn small"
                href={{ pathname: '/write', query: { draft: draft.draftId } }}
                aria-label={`${t('compose.drafts.continue')}: ${title}`}
              >
                {t('compose.drafts.continue')}
              </Link>
              <DiscardDraftButton draftId={draft.draftId} label={title} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
