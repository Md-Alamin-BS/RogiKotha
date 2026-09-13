import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import type { Locale } from '@rogikotha/i18n';
import { ViewShell } from '@/components/patient/ViewShell';
import { Emergency, type EmergencyConfig } from '@/components/patient/Emergency';
import { documentTitle } from '@/lib/titles';

// ASSUMPTION(T-207a): task step 1 says numbers come from
// `config.current().emergency` (a server component reading the live
// config). Two independent blockers rule that out today:
//   1. The config query/command (T-105) is a stub that always throws
//      `NotImplemented` (packages/database/src/repositories/config.ts) —
//      there is no config_versions row to read yet.
//   2. Even `DEFAULT_CONFIG_VALUES` from `@rogikotha/contracts` cannot be
//      imported into this app at all right now: every relative import
//      inside `packages/contracts/src` uses a `.js`-suffixed specifier
//      (`from './enums.js'`), and Next's Turbopack bundler (unlike Vite,
//      which every other package's Vitest suite uses) does not resolve
//      that specifier to the sibling `.ts` file when transpiling the
//      package via `transpilePackages` — `next build` fails with "Module
//      not found: Can't resolve './enums.js'" no matter which file or
//      subpath of the package is imported. Confirmed this is not
//      `workspace.ts`-specific: the same failure moves to whichever file
//      is imported first. `experimental.extensionAlias` in
//      `next.config.ts` (the documented fix for this exact Turbopack/
//      webpack situation) was tried and did not help — Turbopack logged
//      the experiment as active but still failed the same way. This app
//      is the first task to import anything from `@rogikotha/contracts`,
//      so nothing caught this before. See `ISSUES.md`.
//
// Narrower, reversible choice: the three numbers and the last-verified
// date are typed locally, matching `DEFAULT_CONFIG_VALUES.emergency` in
// `packages/contracts/src/config-values.ts` verbatim. If that default ever
// changes, this constant needs updating too until the real query lands —
// flagged in the ISS row so it doesn't drift silently.
export const EMERGENCY_DEFAULTS: EmergencyConfig = {
  ambulance: '999',
  healthLine: '16263',
  crisisLine: '09612-119911',
  lastVerified: '2026-08-21',
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: documentTitle('emergency', t) };
}

export default async function EmergencyPage() {
  const locale = (await getLocale()) as Locale;

  return (
    <ViewShell view="emergency" title="">
      <Emergency config={EMERGENCY_DEFAULTS} locale={locale} />
    </ViewShell>
  );
}
