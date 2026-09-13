import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('about', t) };
}

export default async function AboutPage() {
  const t = await getTranslations();
  return (
    <ViewShell view="about" title={titleForView('about', t)}>
      <p className="note">{t('shell.placeholder', { task: 'T-207' })}</p>
    </ViewShell>
  );
}
