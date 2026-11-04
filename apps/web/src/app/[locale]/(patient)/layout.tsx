import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import '@/styles/globals.css';
import '@/styles/patient.css';
import '@/styles/motion.css';
import { SkipLink } from '@/components/shared/SkipLink';
import { DemoMarker } from '@/components/shared/DemoMarker';
import { Masthead } from '@/components/patient/Masthead';
import { Colophon } from '@/components/patient/Colophon';
import { RouteTransition } from '@/components/patient/motion/RouteTransition';
import { readTheme, readMotion, activePatientTab } from '@/lib/cookies';
import type { Locale } from '@/i18n/routing';
import { getCurrentAccount } from '@/server/auth/session';

// Task step 7: patient chrome (masthead, tabs, controls, colophon) around
// every `(patient)` route. App Router only allows a global CSS import in a
// layout, which is why patient.css and admin.css live in these two nested
// layouts instead of the [locale] layout (01-conventions.md §7.3).
export default async function PatientLayout({
  children,
  params,
}: {
  children: ReactNode;
  // Next's generated route validator (.next/types/validator.ts) requires
  // this to accept the untyped `{ locale: string }` it infers for a
  // `[locale]` segment; the [locale]/layout.tsx above this one already
  // called notFound() for anything outside `routing.locales`, so this cast
  // is safe.
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const [theme, motion, headerStore, account] = await Promise.all([
    readTheme(),
    readMotion(),
    headers(),
    getCurrentAccount(),
  ]);
  const pathname = headerStore.get('x-pathname') ?? `/${locale}`;
  const activeTab = activePatientTab(pathname);

  return (
    <>
      <SkipLink />
      <DemoMarker />
      <Masthead
        activeTab={activeTab}
        locale={locale}
        theme={theme}
        motion={motion}
        account={account}
      />
      <div className="progress" aria-hidden="true">
        <i />
      </div>
      <main id="main">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <Colophon />
    </>
  );
}
