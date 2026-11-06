import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { ConditionPage } from '@/components/patient/topics/ConditionPage';
import { loadConditionPage } from '../load';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations();
  const { vm } = await loadConditionPage(id);
  return { title: `${vm.name} — ${t('brand.name')}` };
}

export default async function TopicPage({ params }: { params: Params }) {
  const { id } = await params;
  const { vm, threshold, emergency } = await loadConditionPage(id);
  return (
    // The hero brings the condition's name as the page's only h1.
    <ViewShell view="condition" title="">
      <ConditionPage vm={vm} threshold={threshold} emergency={emergency} />
    </ViewShell>
  );
}
