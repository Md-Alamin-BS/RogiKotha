import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@rogikotha/contracts';
import { ViewShell } from '@/components/patient/ViewShell';
import { DoctorProfile } from '@/components/patient/doctors/DoctorProfile';
import { doctors } from '@/server/data';
import { documentTitle } from '@/lib/titles';

type Params = Promise<{ id: string }>;

// One lookup per request, shared by the metadata and the page.
const loadDoctor = cache((id: string, locale: Locale) => doctors.getDoctor(id, locale));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations();
  const doctor = await loadDoctor(id, (await getLocale()) as Locale);
  if (!doctor) return { title: documentTitle('profile', t) };
  return { title: `${doctor.name} — ${t('brand.name')}` };
}

export default async function DoctorProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const locale = (await getLocale()) as Locale;
  const doctor = await loadDoctor(id, locale);
  if (!doctor) notFound();
  const experiences = await doctors.listPublishedReviewsForDoctor(doctor.id, locale);

  return (
    // The hero brings the doctor's name as the page's only h1.
    <ViewShell view="profile" title="">
      <DoctorProfile doctor={doctor} experiences={experiences} />
    </ViewShell>
  );
}
