import { describe, expect, it, vi } from 'vitest';

// next-intl's createNavigation() needs `next/navigation`, which only resolves inside a Next.js app
// (see i18n.smoke.test.ts). The routing config under test does not depend on it.
vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: () => null,
    redirect: () => undefined,
    usePathname: () => '/',
    useRouter: () => ({}),
    getPathname: () => '/',
  }),
}));

const { routing } = await import('./routing');

describe('routing', () => {
  it('serves English and Bengali with equal standing', () => {
    expect([...routing.locales].sort()).toEqual(['bn', 'en']);
  });

  it('falls back to English when no locale is chosen', () => {
    expect(routing.defaultLocale).toBe('en');
    expect(routing.locales).toContain(routing.defaultLocale);
  });

  it('always puts the locale in the URL, even for the default one', () => {
    expect(routing.localePrefix).toBe('always');
  });

  it('remembers the chosen language in the rk.lang cookie', () => {
    expect(routing.localeCookie).toMatchObject({ name: 'rk.lang' });
  });
});
