import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@rogikotha/contracts';
import { ViewShell } from '@/components/patient/ViewShell';
import { TopicList } from '@/components/patient/topics/TopicList';
import { doctors } from '@/server/data';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('topics', t) };
}

export default async function TopicIndexPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const topics = await doctors.listTopics(locale);
  return (
    <ViewShell view="topics" title={titleForView('topics', t)}>
      <TopicList topics={topics} />
    </ViewShell>
  );
}
