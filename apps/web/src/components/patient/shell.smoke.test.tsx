import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { Masthead } from './Masthead';
import { ViewShell } from './ViewShell';

// 04-handoff-and-validation.md §3.1: every task adds at least one smoke
// assertion for the behaviour it delivered — this app's first one, since
// T-008 is the first task to touch apps/web/src. Covers the patient shell
// end to end: masthead + tabs + write CTA render, and a placeholder page's
// ViewShell renders the expected `#view-<name>` section and heading.
vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const messages = {
  brand: { name: 'RogiKotha', tagline: 'Patient-reported treatment experiences' },
  nav: {
    discover: 'Discover',
    profile: 'Doctors',
    facilities: 'Hospitals & clinics',
    condition: 'Health topics',
    account: 'Experiences',
    mine: 'My writing',
    compose: 'Share your experience',
  },
  a11y: {
    screens: 'Screens',
    lang: 'Switch interface language',
    theme: 'Switch light or dark mode',
    motion: 'Reduce animation',
  },
  auth: { signIn: { title: 'Sign in' } },
} as unknown as AbstractIntlMessages;

describe('patient shell smoke', () => {
  it('renders the masthead chrome and a placeholder view together', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <Masthead activeTab="discover" locale="en" theme={null} motion="on" />
        <main id="main">
          <ViewShell view="discover" title="Discover">
            <p className="note">placeholder</p>
          </ViewShell>
        </main>
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: 'Discover' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Share your experience' })).toBeInTheDocument();
    expect(document.getElementById('view-discover')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Discover' })).toBeInTheDocument();
  });
});
