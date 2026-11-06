import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { FacilityIndex } from '@/components/patient/facilities/FacilityIndex';
import { documentTitle } from '@/lib/titles';
import { loadFacilityIndex } from './load';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('facilities', t) };
}

export default async function FacilityIndexPage() {
  const { cards, total, threshold } = await loadFacilityIndex();
  return (
    // IndexHead brings the page's only h1.
    <ViewShell view="facilities" title="">
      <FacilityIndex cards={cards} total={total} threshold={threshold} />
    </ViewShell>
  );
}
