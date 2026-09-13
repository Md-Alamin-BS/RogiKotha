import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('config', t) };
}

export default async function ConfigViewPage() {
  const t = await getTranslations();
  return (
    <ViewShell view="config" title={titleForView('config', t)}>
      <p className="note">{t('shell.placeholder', { task: 'T-408' })}</p>
    </ViewShell>
  );
}
