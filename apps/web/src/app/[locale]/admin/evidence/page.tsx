import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('evidence', t) };
}

export default async function EvidenceQuarantinePage() {
  const t = await getTranslations();
  return (
    <ViewShell view="evidence" title={titleForView('evidence', t)}>
      <p className="note">{t('shell.placeholder', { task: 'T-407' })}</p>
    </ViewShell>
  );
}
