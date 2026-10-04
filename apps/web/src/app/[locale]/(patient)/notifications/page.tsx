import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';
import { noindex } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('notifications', t), ...noindex() };
}

export default async function NotificationsPage() {
  const t = await getTranslations();
  return (
    <ViewShell view="notifications" title={titleForView('notifications', t)}>
      <p className="note">{t('shell.placeholder', { task: 'T-405' })}</p>
    </ViewShell>
  );
}
