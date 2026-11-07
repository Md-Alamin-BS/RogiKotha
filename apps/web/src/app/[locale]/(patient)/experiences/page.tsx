import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { ViewShell } from '@/components/patient/ViewShell';
import { Pager } from '@/components/patient/experience/Pager';
import { Reveal } from '@/components/patient/motion/Reveal';
import { AccountRow } from '@/components/patient/shared/AccountRow';
import { IndexHead } from '@/components/patient/shared/IndexHead';
import { Link, redirect } from '@/i18n/routing';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';
import { documentTitle } from '@/lib/titles';

type SearchParams = Record<string, string | string[] | undefined>;

/** Cards per page (WF7, BR7.1). */
const INDEX_PAGE_SIZE = 20;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('experiences', t) };
}

// WF7: the newest eligible experiences, keyset paged, with the total in the count line.
export default async function ExperienceIndexPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const search = await searchParams;
  const cursor = Array.isArray(search?.cursor) ? search.cursor[0] : search?.cursor;
  const [t, locale] = await Promise.all([getTranslations(), getLocale() as Promise<Locale>]);
  const c = getContainer();
  const [page, count] = await Promise.all([
    runCommand(c.reviewReads.listExperienceCards, {
      limit: INDEX_PAGE_SIZE,
      ...(cursor !== undefined ? { cursor } : {}),
    }),
    runCommand(c.review.countExperiences, {}),
  ]);
  if (!page.ok) {
    // A stale or hand-made cursor goes back to the newest page (307), never an error page.
    if (page.error.code === 'validation' && cursor !== undefined) {
      redirect({ href: '/experiences', locale });
    }
    throw new Error(`review.listExperienceCards: ${page.error.code}`);
  }
  if (!count.ok) throw new Error(`review.countExperiences: ${count.error.code}`);
  const { items, nextCursor } = page.data;
  const { total } = count.data;

  return (
    // IndexHead brings the page's only h1.
    <ViewShell view="experiences" title="">
      <IndexHead
        kicker={t('nav.discover')}
        title={t('nav.account')}
        note={t('index.experiencesNote')}
      />
      <p className="note count-line" data-testid="experience-index-count">
        {t('index.count', { n: total, count: formatNumber(total, locale) })}
      </p>
      {items.length > 0 ? (
        <Reveal as="div" className="index-list">
          {items.map((card) => (
            <AccountRow key={card.publicId} card={card} headingLevel={2} />
          ))}
        </Reveal>
      ) : (
        <div className="empty-state" data-testid="experience-index-empty">
          <Link className="btn" href="/write">
            {t('index.beFirst')}
          </Link>
        </div>
      )}
      <Pager nextCursor={nextCursor} isLaterPage={cursor !== undefined} basePath="/experiences" />
    </ViewShell>
  );
}
