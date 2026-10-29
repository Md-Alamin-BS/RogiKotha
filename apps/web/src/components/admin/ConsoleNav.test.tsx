import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { ConsoleNav, ZERO_NAV_COUNTS } from './ConsoleNav';

// See components/patient/Masthead.test.tsx for why this mocks the app's own
// `@/i18n/routing` re-export rather than `next/navigation` directly.
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
  usePathname: () => '/admin/queue',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const messages = {
  a11y: { screens: 'Console sections' },
  admin: {
    nav: { casework: 'Casework', oversight: 'Oversight' },
    tab: {
      queue: 'Report queue',
      evidence: 'Evidence quarantine',
      providers: 'Providers & claims',
      notifications: 'Notifications',
      config: 'Configuration',
    },
  },
} as unknown as AbstractIntlMessages;

function renderNav(active: 'queue' | 'evidence' | 'providers' | 'notifications' | 'config') {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ConsoleNav active={active} counts={ZERO_NAV_COUNTS} />
    </NextIntlClientProvider>,
  );
}

describe('ConsoleNav', () => {
  it('renders the Casework and Oversight groups', () => {
    renderNav('queue');
    for (const label of [
      'Report queue',
      'Evidence quarantine',
      'Providers & claims',
      'Notifications',
      'Configuration',
    ]) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('sets aria-current on the active item only', () => {
    renderNav('evidence');
    expect(screen.getByRole('link', { name: /Evidence quarantine/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /Report queue/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /Providers & claims/ })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
