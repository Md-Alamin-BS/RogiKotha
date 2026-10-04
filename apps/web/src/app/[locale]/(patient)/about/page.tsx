import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { About } from '@/components/patient/About';
import { documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('about', t) };
}

export default function AboutPage() {
  return (
    <ViewShell view="about" title="">
      <About />
    </ViewShell>
  );
}
