import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  // TODO(T-307): replace with the real entity's name once its query exists.
  return { title: documentTitle('account', t) };
}

export default async function ExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  return (
    <ViewShell view="account" title={titleForView('account', t)}>
      <p className="note">
        {t('shell.placeholder', { task: 'T-307' })} ({id})
      </p>
    </ViewShell>
  );
}
