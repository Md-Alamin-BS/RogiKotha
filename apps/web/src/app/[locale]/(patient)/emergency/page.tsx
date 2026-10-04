import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import type { Locale } from '@rogikotha/i18n';
import { DEFAULT_CONFIG_VALUES } from '@rogikotha/contracts';
import { ViewShell } from '@/components/patient/ViewShell';
import { Emergency } from '@/components/patient/Emergency';
import { documentTitle } from '@/lib/titles';

// ASSUMPTION(CR-005): task step 1 (T-207a) says numbers come from
// `config.current().emergency` (a server component reading the live
// config). The config query/command (T-105) is still a stub that always
// throws `NotImplemented` (packages/database/src/repositories/config.ts) —
// there is no config_versions row to read yet — so this still reads the
// package's static default rather than a live query. CR-005 fixed the
// other blocker (`packages/contracts`'s `.js`-suffixed relative imports
// broke `next build`, ISS-133, closed), so `DEFAULT_CONFIG_VALUES` is now
// imported directly from the main `@rogikotha/contracts` barrel instead of
// the hand-typed local copy this page used before (ISS-134, closed).
// Narrower, reversible choice: switch to a real `config.current()` call
// once T-105 lands.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('emergency', t) };
}

export default async function EmergencyPage() {
  const locale = (await getLocale()) as Locale;

  return (
    <ViewShell view="emergency" title="">
      <Emergency config={DEFAULT_CONFIG_VALUES.emergency} locale={locale} />
    </ViewShell>
  );
}
