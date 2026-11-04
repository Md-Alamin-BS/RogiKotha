import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { DEFAULT_CONFIG_VALUES, type Locale } from '@rogikotha/contracts';
import { ViewShell } from '@/components/patient/ViewShell';
import { Home } from '@/components/patient/home/Home';
import { doctors } from '@/server/data';
import { titleForView, documentTitle } from '@/lib/titles';

// The prototype's home shows four of the latest accounts (renderDiscover, app.js 538).
const LATEST_COUNT = 4;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('discover', t) };
}

export default async function DiscoverPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const latest = await doctors.listRecentPublishedReviews(LATEST_COUNT, locale);

  return (
    <ViewShell view="discover" title={titleForView('discover', t)}>
      {/* ASSUMPTION(demo-slice): emergency numbers read the static default config, as /emergency
          does, until the live config query (T-105) exists. */}
      <Home latest={latest} emergency={DEFAULT_CONFIG_VALUES.emergency} />
    </ViewShell>
  );
}
