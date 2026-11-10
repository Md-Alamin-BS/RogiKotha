import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('results', t) };
}

export default async function SearchResultsPage() {
  const t = await getTranslations();
  return (
    <ViewShell view="results" title={titleForView('results', t)}>
      <p className="note">{t('shell.placeholder')}</p>
    </ViewShell>
  );
}
