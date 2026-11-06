import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { DoctorIndex } from '@/components/patient/doctors/DoctorIndex';
import { documentTitle } from '@/lib/titles';
import { loadDoctorIndex } from './load';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('doctors', t) };
}

export default async function DoctorIndexPage() {
  const { cards, total, threshold } = await loadDoctorIndex();

  return (
    // IndexHead brings the page's only h1.
    <ViewShell view="doctors" title="">
      <DoctorIndex cards={cards} total={total} threshold={threshold} />
    </ViewShell>
  );
}
