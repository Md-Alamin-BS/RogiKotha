import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'bn'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeCookie: { name: 'rk.lang' },
});

export type Locale = (typeof routing.locales)[number];

// createNavigation()'s return type embeds Next.js's internal router types
// (RedirectType, NavigateOptions, PrefetchOptions), which are not nominally
// exported from `next` and so cannot be named portably from this package
// (see the `declaration: false` note in tsconfig.json). ASSUMPTION(T-006).
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
