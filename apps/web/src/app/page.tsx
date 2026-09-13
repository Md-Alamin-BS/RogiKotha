import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';

function isLocale(value: string | undefined): value is Locale {
  return routing.locales.includes(value as Locale);
}

// Fallback only — proxy.ts's next-intl middleware normally redirects `/`
// before this ever renders (task step 5). Same locale-negotiation order as
// the proxy (task step 3): `rk.lang` cookie, else Accept-Language prefers
// `bn`, else the default locale.
function preferredLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return routing.defaultLocale;
  const languages = acceptLanguage
    .split(',')
    .map((entry) => entry.split(';')[0]?.trim().toLowerCase())
    .filter((lang): lang is string => Boolean(lang));
  for (const lang of languages) {
    if (lang.startsWith('bn')) return 'bn';
    if (lang.startsWith('en')) return 'en';
  }
  return routing.defaultLocale;
}

export default async function RootPage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('rk.lang')?.value;
  if (isLocale(cookieLocale)) {
    redirect(`/${cookieLocale}`);
  }
  const headerStore = await headers();
  redirect(`/${preferredLocale(headerStore.get('accept-language'))}`);
}
