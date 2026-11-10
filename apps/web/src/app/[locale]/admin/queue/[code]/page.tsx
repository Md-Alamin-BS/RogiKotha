import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  // Release 2 (T-406): replace with the real entity's name once its query exists.
  return { title: documentTitle('queue', t) };
}

export default async function CaseTrayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = await getTranslations();
  return (
    <ViewShell view="queue" title={titleForView('queue', t)}>
      <p className="note">
        {t('shell.placeholder')} ({code})
      </p>
    </ViewShell>
  );
}
