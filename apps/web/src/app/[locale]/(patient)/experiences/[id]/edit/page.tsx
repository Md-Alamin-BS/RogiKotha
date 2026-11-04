import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isPublicId, type Locale } from '@rogikotha/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { EditForm } from '@/components/patient/compose/EditForm';
import { ViewShell } from '@/components/patient/ViewShell';
import { requireAccount } from '@/server/auth/session';
import { doctors, reviews } from '@/server/data';
import { noindex } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t('compose.edit.title')} — ${t('brand.name')}`, ...noindex() };
}

export default async function EditExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isPublicId(id)) notFound();
  const account = await requireAccount({ returnTo: `/experiences/${id}/edit` });
  // Someone else's experience is "not found" too, so the page never confirms who wrote it.
  const review = await reviews.getOwnReviewForEdit(id, account.accountId);
  if (!review) notFound();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations();
  const doctor = await doctors.getDoctor(review.doctorId, locale);

  return (
    <ViewShell view="compose" title={t('compose.edit.title')}>
      <p className="lede">{t('compose.edit.intro')}</p>
      <EditForm
        publicId={review.publicId}
        doctorName={doctor?.name ?? null}
        defaults={{
          title: review.title,
          body: review.body,
          sentiment: review.sentiment ?? '',
          outcome: review.outcome ?? '',
        }}
      />
    </ViewShell>
  );
}
