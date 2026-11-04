import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@rogikotha/i18n';
import { ViewShell } from '@/components/patient/ViewShell';
import { ExperienceIndex } from '@/components/patient/experience/ExperienceIndex';
import { doctors } from '@/server/data';
import { documentTitle } from '@/lib/titles';

// ASSUMPTION(demo-slice): the index shows the 50 most recent experiences; the slice has no paging.
const RECENT_EXPERIENCES_LIMIT = 50;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('experiences', t) };
}

export default async function ExperienceIndexPage() {
  const locale = (await getLocale()) as Locale;
  const cards = await doctors.listRecentPublishedReviews(RECENT_EXPERIENCES_LIMIT, locale);
  return (
    <ViewShell view="experiences" title="">
      <ExperienceIndex cards={cards} />
    </ViewShell>
  );
}
