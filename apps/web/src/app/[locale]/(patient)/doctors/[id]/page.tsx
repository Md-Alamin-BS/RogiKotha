import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  // TODO(T-202): replace with the real entity's name once its query exists.
  return { title: documentTitle('profile', t) };
}

export default async function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  return (
    <ViewShell view="profile" title={titleForView('profile', t)}>
      <p className="note">
        {t('shell.placeholder', { task: 'T-202' })} ({id})
      </p>
    </ViewShell>
  );
}
