import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('queue', t) };
}

export default async function QueuePage() {
  const t = await getTranslations();
  return (
    <ViewShell view="queue" title={titleForView('queue', t)}>
      <p className="note">{t('shell.placeholder', { task: 'T-406' })}</p>
    </ViewShell>
  );
}
