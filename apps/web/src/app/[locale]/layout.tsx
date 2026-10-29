import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { readTheme, readMotion, deriveAppFromPathname } from '@/lib/cookies';
import { LiveRegion } from '@/components/shared/LiveRegion';
import { bnHeading } from '@/app/fonts/bn-heading';

// Task step 6: validates the locale, sets it for the request, reads the
// theme/motion cookies server-side (no flash — 01-conventions.md §7.4),
// and owns <html>/<body> since next-intl requires that of this layout.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  const typedLocale: Locale = locale;
  setRequestLocale(typedLocale);

  const [messages, theme, motion, headerStore] = await Promise.all([
    getMessages(),
    readTheme(),
    readMotion(),
    headers(),
  ]);
  const pathname = headerStore.get('x-pathname') ?? `/${typedLocale}`;
  const app = deriveAppFromPathname(pathname);

  // T-011 (BR5.2, BR2.4): view-transition pseudo-elements hang off <html>, so
  // the in-app switch reaches motion.css there; the staff console keeps
  // reading <body data-motion>. The Bengali heading font is attached on `bn`
  // only, so English pages never request it.
  return (
    <html
      lang={typedLocale}
      data-lang={typedLocale}
      data-theme={theme ?? undefined}
      data-motion={motion === 'off' ? 'reduced' : undefined}
      className={typedLocale === 'bn' ? bnHeading.variable : undefined}
    >
      <body data-app={app} data-motion={motion}>
        <NextIntlClientProvider messages={messages}>
          <LiveRegion />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
