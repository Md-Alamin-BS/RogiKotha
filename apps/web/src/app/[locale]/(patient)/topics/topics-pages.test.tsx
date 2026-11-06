import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import {
  EMERGENCY_CONFIG,
  aConditionPage,
  loadMessages,
  renderInLocale,
} from '@/components/patient/doctors/directory-test-support';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));
const load = vi.hoisted(() => ({ loadTopicIndex: vi.fn(), loadConditionPage: vi.fn() }));

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve(
      createTranslator({ locale: active.locale, messages: loadMessages(active.locale) }),
    ),
  getLocale: () => Promise.resolve(active.locale),
}));

// The loaders own the container calls and the 404 (load.test.ts); the pages only render.
vi.mock('./load', () => load);

// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/topics',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import TopicIndexPage from './page';
import TopicPage, { generateMetadata as conditionMetadata } from './[id]/page';

const LOCALES = ['en', 'bn'] as const;
const BRAND = { en: 'RogiKotha', bn: 'রোগীকথা' } as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(LOCALES)('topic pages in %s', (locale) => {
  beforeEach(() => {
    active.locale = locale;
  });

  it('lists the condition cards in the topics view', async () => {
    load.loadTopicIndex.mockResolvedValue({
      cards: [{ publicId: 'c000000001', name: 'Synthetic condition', accountsTotal: 2 }],
      total: 1,
    });

    renderInLocale(locale, await TopicIndexPage());

    expect(document.getElementById('view-topics')).not.toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByTestId('browse-card')).toHaveAttribute('href', '/topics/c000000001');
  });

  it('shows one condition with its name as the only h1', async () => {
    const vm = aConditionPage({ name: 'Synthetic asthma' });
    load.loadConditionPage.mockResolvedValue({ vm, threshold: 5, emergency: EMERGENCY_CONFIG });

    renderInLocale(locale, await TopicPage({ params: Promise.resolve({ id: vm.publicId }) }));

    expect(load.loadConditionPage).toHaveBeenCalledWith(vm.publicId);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Synthetic asthma');
  });

  it('lets the loader’s 404 through for a condition that does not exist', async () => {
    load.loadConditionPage.mockRejectedValue(new Error('NEXT_HTTP_ERROR_FALLBACK;404'));

    await expect(TopicPage({ params: Promise.resolve({ id: 'missing000' }) })).rejects.toThrow(
      /404/,
    );
  });

  it('names the condition in the browser tab title', async () => {
    load.loadConditionPage.mockResolvedValue({
      vm: aConditionPage({ name: 'Synthetic titled condition' }),
      threshold: 5,
      emergency: EMERGENCY_CONFIG,
    });

    const metadata = await conditionMetadata({ params: Promise.resolve({ id: 'c000000001' }) });

    expect(metadata.title).toBe(`Synthetic titled condition — ${BRAND[locale]}`);
  });
});
