import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@rogikotha/contracts';
import { ViewShell } from '@/components/patient/ViewShell';
import { branchTitle } from '@/components/patient/facilities/FacilityEntry';
import { FacilityProfile } from '@/components/patient/facilities/FacilityProfile';
import { facilities } from '@/server/data';
import { documentTitle } from '@/lib/titles';

type Params = Promise<{ id: string }>;

// One lookup per request, shared by the metadata and the page.
const loadFacility = cache((id: string, locale: Locale) => facilities.getFacility(id, locale));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations();
  const facility = await loadFacility(id, (await getLocale()) as Locale);
  if (!facility) return { title: documentTitle('facility', t) };
  return { title: `${branchTitle(facility)} — ${t('brand.name')}` };
}

export default async function FacilityProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const facility = await loadFacility(id, (await getLocale()) as Locale);
  if (!facility) notFound();
  return (
    // The hero brings the facility's name as the page's only h1.
    <ViewShell view="facility" title="">
      <FacilityProfile facility={facility} />
    </ViewShell>
  );
}
