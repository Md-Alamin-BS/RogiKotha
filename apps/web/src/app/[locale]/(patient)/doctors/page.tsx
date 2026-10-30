import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@rogikotha/contracts';
import { ViewShell } from '@/components/patient/ViewShell';
import { DoctorList } from '@/components/patient/doctors/DoctorList';
import { doctors } from '@/server/data';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('doctors', t) };
}

export default async function DoctorIndexPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const rows = await doctors.listDoctors(locale);

  return (
    <ViewShell view="doctors" title={titleForView('doctors', t)}>
      <DoctorList doctors={rows} />
    </ViewShell>
  );
}
