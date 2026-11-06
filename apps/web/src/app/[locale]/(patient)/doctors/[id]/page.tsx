import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { DoctorProfile } from '@/components/patient/doctors/DoctorProfile';
import type { RawSearch } from '@/lib/doctor-filters';
import { loadDoctorProfile } from '../load';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<RawSearch>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations();
  const { vm } = await loadDoctorProfile(id, await searchParams);
  return { title: `${vm.name} — ${t('brand.name')}` };
}

export default async function DoctorProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: SearchParams;
}) {
  const { id } = await params;
  const { vm, filters, threshold } = await loadDoctorProfile(id, await searchParams);

  return (
    // The hero brings the doctor's name as the page's only h1.
    <ViewShell view="profile" title="">
      <DoctorProfile vm={vm} filters={filters} threshold={threshold} />
    </ViewShell>
  );
}
