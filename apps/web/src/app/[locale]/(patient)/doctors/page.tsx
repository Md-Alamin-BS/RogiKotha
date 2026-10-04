import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('doctors', t) };
}

export default async function DoctorIndexPage() {
  const t = await getTranslations();
  return (
    <ViewShell view="doctors" title={titleForView('doctors', t)}>
      <p className="note">{t('shell.placeholder', { task: 'T-202' })}</p>
    </ViewShell>
  );
}
