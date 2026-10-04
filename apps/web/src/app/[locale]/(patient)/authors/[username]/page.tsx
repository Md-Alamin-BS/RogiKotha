import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { titleForView, documentTitle } from '@/lib/titles';
import { noindex } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  // TODO(T-409): replace with the real entity's name once its query exists.
  return { title: documentTitle('person', t), ...noindex() };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const t = await getTranslations();
  return (
    <ViewShell view="person" title={titleForView('person', t)}>
      <p className="note">
        {t('shell.placeholder', { task: 'T-409' })} ({username})
      </p>
    </ViewShell>
  );
}
