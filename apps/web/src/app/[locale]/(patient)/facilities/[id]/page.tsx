import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { FacilityProfile } from '@/components/patient/facilities/FacilityProfile';
import { loadFacilityProfile } from '../load';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations();
  const { vm } = await loadFacilityProfile(id);
  return { title: `${vm.name} — ${t('brand.name')}` };
}

export default async function FacilityProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const { vm, threshold } = await loadFacilityProfile(id);
  return (
    // The hero brings the facility's name as the page's only h1.
    <ViewShell view="facility" title="">
      <FacilityProfile vm={vm} threshold={threshold} />
    </ViewShell>
  );
}
