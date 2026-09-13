import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('facilities', t) };
}

export default async function FacilityIndexPage() {
  const t = await getTranslations();
  return (
    <ViewShell view="facilities" title={titleForView('facilities', t)}>
      <p className="note">{t('shell.placeholder', { task: 'T-203' })}</p>
    </ViewShell>
  );
}
