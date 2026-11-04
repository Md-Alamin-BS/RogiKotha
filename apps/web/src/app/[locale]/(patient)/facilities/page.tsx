import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@rogikotha/contracts';
import { ViewShell } from '@/components/patient/ViewShell';
import { FacilityList } from '@/components/patient/facilities/FacilityList';
import { facilities } from '@/server/data';
import { titleForView, documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('facilities', t) };
}

export default async function FacilityIndexPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const rows = await facilities.listFacilities(locale);
  return (
    <ViewShell view="facilities" title={titleForView('facilities', t)}>
      <FacilityList facilities={rows} />
    </ViewShell>
  );
}
