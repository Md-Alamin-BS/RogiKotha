import type { ReactNode } from 'react';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { Colophon } from './Colophon';
import {
  ConsoleNav,
  NAV_GROUPS,
  ZERO_NAV_COUNTS,
  navGroupLabelKey,
  navItemKey,
  type NavCounts,
} from './ConsoleNav';
import { Crumbs } from './Crumbs';
import { Masthead } from './Masthead';
import { TabBar } from './TabBar';

// See components/patient/Masthead.test.tsx for why this mocks the app's own
// `@/i18n/routing` re-export rather than `next/navigation` directly.
vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    locale,
    children,
    ...rest
  }: {
    href: string;
    locale?: string;
    children?: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={locale ? `/${locale}${href}` : href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/admin/queue',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('@/server/actions/preferences', () => ({
  setTheme: vi.fn(() => Promise.resolve()),
  setMotion: vi.fn(() => Promise.resolve()),
  setLang: vi.fn(() => Promise.resolve()),
}));

const require = createRequire(import.meta.url);
const i18nPackageRoot = path.resolve(path.dirname(require.resolve('@rogikotha/i18n')), '..');
const LOCALES = ['en', 'bn'] as const;
type Locale = (typeof LOCALES)[number];

function loadMessages(locale: Locale): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

// The message-file text for a dotted key, so assertions follow the copy and not a pasted string.
function copy(locale: Locale, key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      loadMessages(locale),
    );
  if (typeof value !== 'string') throw new Error(`No message ${key} in ${locale}`);
  return value;
}

function inLocale(locale: Locale, ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {ui}
    </NextIntlClientProvider>,
  );
}

// Builder: zero counts with the given fields set.
function counts(overrides: Partial<NavCounts> = {}): NavCounts {
  return { ...ZERO_NAV_COUNTS, ...overrides };
}

describe.each(LOCALES)('admin Colophon in %s', (locale) => {
  it('shows the staff-only note and the hidden-fields note', () => {
    inLocale(locale, <Colophon />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(copy(locale, 'admin.staffOnlyNote'))).toBeInTheDocument();
    expect(within(footer).getByText(copy(locale, 'admin.permissionNote'))).toBeInTheDocument();
  });
});

describe('navigation labels', () => {
  it('names the group and item of a tab for the breadcrumb', () => {
    expect(navGroupLabelKey('evidence')).toBe('admin.nav.casework');
    expect(navGroupLabelKey('config')).toBe('admin.nav.oversight');
    expect(navItemKey('providers')).toBe('admin.tab.providers');
    expect(navItemKey('notifications')).toBe('admin.tab.notifications');
  });

  it('falls back to the report queue when no tab is active', () => {
    expect(navGroupLabelKey(undefined)).toBe('admin.nav.casework');
    expect(navItemKey(undefined)).toBe('admin.tab.queue');
  });

  it('gives every tab a group and an item label that exist in both languages', () => {
    for (const item of NAV_GROUPS.flatMap((group) => group.items)) {
      for (const locale of LOCALES) {
        expect(copy(locale, navItemKey(item.id))).not.toBe('');
        expect(copy(locale, navGroupLabelKey(item.id))).not.toBe('');
      }
    }
  });
});

describe.each(LOCALES)('Crumbs in %s', (locale) => {
  it('shows the console, the group and the active tab', () => {
    inLocale(locale, <Crumbs active="evidence" />);
    const crumbs = document.querySelector('.crumbs');
    expect(crumbs).toHaveTextContent(copy(locale, 'admin.portal'));
    expect(crumbs).toHaveTextContent(copy(locale, 'admin.nav.casework'));
    expect(crumbs?.querySelector('b')).toHaveTextContent(copy(locale, 'admin.tab.evidence'));
  });

  it('shows only the console name on a page that has no tab', () => {
    inLocale(locale, <Crumbs />);
    const crumbs = document.querySelector('.crumbs');
    expect(crumbs).toHaveTextContent(copy(locale, 'admin.portal'));
    expect(crumbs?.querySelector('b')).toBeNull();
  });
});

describe.each(LOCALES)('admin ConsoleNav counts in %s', (locale) => {
  it('shows a count beside a tab that has items', () => {
    inLocale(locale, <ConsoleNav active="queue" counts={counts({ evidence: 3 })} />);
    const link = screen.getByRole('link', { name: new RegExp(copy(locale, 'admin.tab.evidence')) });
    expect(link.querySelector('.count')).toHaveTextContent('3');
  });

  it('shows no count for a tab with zero items', () => {
    inLocale(locale, <ConsoleNav active="queue" counts={counts()} />);
    expect(document.querySelector('.count')).toBeNull();
  });

  it('marks the queue count urgent only while a case is critical', () => {
    inLocale(locale, <ConsoleNav active="queue" counts={counts({ queue: 4, critical: 1 })} />);
    expect(document.querySelector('.count')).toHaveClass('urgent');
  });

  it('leaves the queue count calm when no case is critical', () => {
    inLocale(locale, <ConsoleNav active="queue" counts={counts({ queue: 4 })} />);
    expect(document.querySelector('.count')).not.toHaveClass('urgent');
  });

  it('separates the two groups once', () => {
    inLocale(locale, <ConsoleNav counts={counts()} />);
    expect(document.querySelectorAll('.nav-sep')).toHaveLength(1);
  });
});

describe.each(LOCALES)('TabBar in %s', (locale) => {
  it('lists the five tabs in console order with the first word of each label', () => {
    inLocale(locale, <TabBar counts={counts()} />);
    const bar = screen.getByRole('navigation', { name: copy(locale, 'a11y.screens') });
    const items = within(bar).getAllByRole('link');
    expect(items.map((item) => item.getAttribute('data-admin'))).toEqual([
      'queue',
      'evidence',
      'providers',
      'notifications',
      'config',
    ]);
    expect(items[0]).toHaveTextContent(copy(locale, 'admin.tab.queue').split(' ')[0] ?? '');
  });

  it('marks only the active tab as the current page', () => {
    inLocale(locale, <TabBar active="providers" counts={counts()} />);
    const current = document.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute('data-admin', 'providers');
  });

  it('shows a dot count, urgent only for critical queue cases', () => {
    inLocale(locale, <TabBar counts={counts({ queue: 2, critical: 1, config: 5 })} />);
    const dots = Array.from(document.querySelectorAll('.tab-dot'));
    expect(dots.map((dot) => dot.textContent)).toEqual(['2', '5']);
    expect(dots[0]).toHaveClass('urgent');
    expect(dots[1]).not.toHaveClass('urgent');
  });
});

describe.each(LOCALES)('admin Masthead in %s', (locale) => {
  it('shows the brand, the staff-only badge and the console navigation', () => {
    inLocale(
      locale,
      <Masthead activeTab="queue" counts={counts()} locale={locale} theme={null} motion="on" />,
    );
    const header = screen.getByRole('banner');
    expect(within(header).getByText(copy(locale, 'brand.name'))).toBeInTheDocument();
    expect(within(header).getByText(copy(locale, 'admin.staffOnly'))).toBeInTheDocument();
    expect(
      within(header).getByRole('navigation', { name: copy(locale, 'a11y.screens') }),
    ).toBeInTheDocument();
  });

  it('links the brand to the report queue', () => {
    inLocale(locale, <Masthead counts={counts()} locale={locale} theme={null} motion="on" />);
    expect(document.querySelector('a.brand')).toHaveAttribute('href', '/admin/queue');
  });

  it('offers language and theme controls but no motion control', () => {
    inLocale(locale, <Masthead counts={counts()} locale={locale} theme={null} motion="on" />);
    expect(document.getElementById('lang')).not.toBeNull();
    expect(document.getElementById('theme')).not.toBeNull();
    expect(document.getElementById('motion')).toBeNull();
  });
});
