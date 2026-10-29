import { describe, expect, it, vi } from 'vitest';

// The i18n package's next-intl build imports `next/navigation` by a path that does not resolve
// under Vitest (the same limit components/patient/Masthead.test.tsx works around), so the
// package is replaced by distinct stand-ins and the test checks the wiring: this module must
// hand the package's own objects on, not copies.
const standIns = vi.hoisted(() => ({
  routing: { locales: ['en', 'bn'], defaultLocale: 'en' },
  Link: () => null,
  redirect: () => undefined,
  usePathname: () => '/',
  useRouter: () => ({}),
  getPathname: () => '/',
}));
vi.mock('@rogikotha/i18n', () => standIns);

import * as appRouting from './routing';

describe('app routing module', () => {
  it('hands on the i18n package routing config unchanged', () => {
    expect(appRouting.routing).toBe(standIns.routing);
  });

  it.each(['Link', 'redirect', 'usePathname', 'useRouter', 'getPathname'] as const)(
    'hands on the i18n package %s unchanged',
    (name) => {
      expect(appRouting[name]).toBe(standIns[name]);
    },
  );
});
