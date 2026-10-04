import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ViewShell } from '@/components/patient/ViewShell';
import { Policy } from '@/components/patient/Policy';
import { documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('privacy', t) };
}

export default function PrivacyPage() {
  return (
    <ViewShell view="privacy" title="">
      <Policy kind="privacy" />
    </ViewShell>
  );
}
