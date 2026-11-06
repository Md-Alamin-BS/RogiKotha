import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { TopicIndex } from '@/components/patient/topics/TopicIndex';
import { documentTitle } from '@/lib/titles';
import { loadTopicIndex } from './load';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('topics', t) };
}

export default async function TopicIndexPage() {
  const { cards, total } = await loadTopicIndex();
  return (
    // IndexHead brings the page's only h1.
    <ViewShell view="topics" title="">
      <TopicIndex cards={cards} total={total} />
    </ViewShell>
  );
}
