import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('discover', t) };
}

export default async function DiscoverPage() {
  const t = await getTranslations();
  return (
    <ViewShell view="discover" title={titleForView('discover', t)}>
      <p className="note">{t('shell.placeholder', { task: 'T-207' })}</p>
    </ViewShell>
  );
}
