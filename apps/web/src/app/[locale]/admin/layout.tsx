import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import '@/styles/globals.css';
import '@/styles/admin.css';
import { SkipLink } from '@/components/shared/SkipLink';
import { DemoMarker } from '@/components/shared/DemoMarker';
import { Masthead } from '@/components/admin/Masthead';
import { Crumbs } from '@/components/admin/Crumbs';
import { TabBar } from '@/components/admin/TabBar';
import { Colophon } from '@/components/admin/Colophon';
import { ZERO_NAV_COUNTS } from '@/components/admin/ConsoleNav';
import { readTheme, readMotion, activeAdminTab } from '@/lib/cookies';
import { noindex } from '@/lib/metadata';
import type { Locale } from '@/i18n/routing';
import type { Metadata } from 'next';

export const metadata: Metadata = { ...noindex() };

// Task step 13: staff console chrome. No auth guard yet.
// TODO(T-103): staff guard (redirect unauthenticated/non-staff visitors to
// /admin/sign-in) belongs here once the account system exists.
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  // See the same cast note in (patient)/layout.tsx.
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  const [theme, motion, headerStore] = await Promise.all([readTheme(), readMotion(), headers()]);
  const pathname = headerStore.get('x-pathname') ?? `/${locale}/admin`;
  const activeTab = activeAdminTab(pathname);
  // adminNavCounts (03-routes-and-contracts.md §4) is T-406's job; every
  // count is 0 until then (task step 13).
  const counts = ZERO_NAV_COUNTS;

  return (
    <>
      <SkipLink />
      <DemoMarker />
      <Masthead activeTab={activeTab} counts={counts} locale={locale} theme={theme} motion={motion} />
      <div className="progress" aria-hidden="true">
        <i />
      </div>
      <main id="main">
        <div className="wrap">
          <Crumbs active={activeTab} />
          {children}
        </div>
      </main>
      <TabBar active={activeTab} counts={counts} />
      <Colophon />
    </>
  );
}
