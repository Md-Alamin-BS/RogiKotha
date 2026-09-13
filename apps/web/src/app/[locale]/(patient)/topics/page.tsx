import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('topics', t) };
}

export default async function TopicIndexPage() {
  const t = await getTranslations();
  return (
    <ViewShell view="topics" title={titleForView('topics', t)}>
      <p className="note">{t('shell.placeholder', { task: 'T-203' })}</p>
    </ViewShell>
  );
}
