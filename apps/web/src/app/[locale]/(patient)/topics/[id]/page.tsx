import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@rogikotha/contracts';
import { ViewShell } from '@/components/patient/ViewShell';
import { TopicProfile } from '@/components/patient/topics/TopicProfile';
import { doctors } from '@/server/data';
import { documentTitle } from '@/lib/titles';

type Params = Promise<{ id: string }>;

// One lookup per request, shared by the metadata and the page.
const loadTopic = cache((id: string, locale: Locale) => doctors.getTopic(id, locale));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations();
  const topic = await loadTopic(id, (await getLocale()) as Locale);
  if (!topic) return { title: documentTitle('condition', t) };
  return { title: `${topic.name} — ${t('brand.name')}` };
}

export default async function TopicPage({ params }: { params: Params }) {
  const { id } = await params;
  const topic = await loadTopic(id, (await getLocale()) as Locale);
  if (!topic) notFound();
  return (
    // The hero brings the topic's name as the page's only h1.
    <ViewShell view="condition" title="">
      <TopicProfile topic={topic} />
    </ViewShell>
  );
}
