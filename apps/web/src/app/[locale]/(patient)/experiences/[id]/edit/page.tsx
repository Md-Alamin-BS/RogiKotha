import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { stripSlug } from '@rogikotha/contracts';
import { getTranslations } from 'next-intl/server';
import { EditForm } from '@/components/patient/compose/EditForm';
import { ViewShell } from '@/components/patient/ViewShell';
import { requireAccount } from '@/server/auth/session';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';
import { noindex } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t('compose.edit.title')} — ${t('brand.name')}`, ...noindex() };
}

export default async function EditExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const publicId = stripSlug(id);
  if (!publicId) notFound();
  await requireAccount({ returnTo: `/experiences/${publicId}/edit` });
  const result = await runCommand(getContainer().review.getOwnForEdit, { publicId });
  if (!result.ok) {
    // Someone else's experience is "not found" too, so the page never confirms who wrote it.
    if (result.error.code === 'not_found' || result.error.code === 'validation') notFound();
    throw new Error(`review.getOwnForEdit: ${result.error.code}`);
  }
  const t = await getTranslations();

  return (
    <ViewShell view="compose" title={t('compose.edit.title')}>
      <p className="lede">{t('compose.edit.intro')}</p>
      <EditForm vm={result.data} />
    </ViewShell>
  );
}
