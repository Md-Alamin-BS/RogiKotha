import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import type { Locale } from '@rogikotha/i18n';
import { ViewShell } from '@/components/patient/ViewShell';
import { Emergency } from '@/components/patient/Emergency';
import { getContainer } from '@/server/container';
import { documentTitle } from '@/lib/titles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('emergency', t) };
}

// WF3: the numbers come from the configuration provider; no sign-in and no redirect (BR2.6).
export default async function EmergencyPage() {
  const locale = (await getLocale()) as Locale;
  const { emergency } = await getContainer().ports.config.current();

  return (
    <ViewShell view="emergency" title="">
      <Emergency config={emergency} locale={locale} />
    </ViewShell>
  );
}
