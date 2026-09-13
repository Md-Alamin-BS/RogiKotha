import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';
import { noindex } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('register', t), ...noindex() };
}

export default async function RegisterPage() {
  const t = await getTranslations();
  return (
    <ViewShell view="register" title={titleForView('register', t)}>
      <p className="note">{t('shell.placeholder', { task: 'T-102' })}</p>
    </ViewShell>
  );
}
