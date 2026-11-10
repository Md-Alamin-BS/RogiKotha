import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';
import { noindex } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('saved', t), ...noindex() };
}

export default async function SavedPage() {
  const t = await getTranslations();
  return (
    <ViewShell view="saved" title={titleForView('saved', t)}>
      <p className="note">{t('shell.placeholder')}</p>
    </ViewShell>
  );
}
