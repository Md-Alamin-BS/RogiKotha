import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('admin-signin', t) };
}

export default async function StaffSignInPage() {
  const t = await getTranslations();
  return (
    <ViewShell view="admin-signin" title={titleForView('admin-signin', t)}>
      <p className="note">{t('shell.placeholder')}</p>
    </ViewShell>
  );
}
