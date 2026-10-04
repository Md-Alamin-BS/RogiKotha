import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('experiences', t) };
}

export default async function ExperienceIndexPage() {
  const t = await getTranslations();
  return (
    <ViewShell view="experiences" title={titleForView('experiences', t)}>
      <p className="note">{t('shell.placeholder', { task: 'T-307' })}</p>
    </ViewShell>
  );
}
