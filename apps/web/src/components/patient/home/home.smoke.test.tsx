// Cumulative smoke (U20, BR6.2): the home page keeps its one h1, the configured emergency numbers as
// tel: links and the three browse links that stand in for the search box, in both locales.
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import {
  EMERGENCY_CONFIG,
  loadMessages,
  renderInLocale,
  type TestLocale,
} from '@/components/patient/doctors/directory-test-support';
import { Home } from './Home';
import type { TeaserTranslate } from './teaser-sub';

vi.mock('@/i18n/routing', async () => ({
  Link: (await import('../shared/link-test-support')).PlainLink,
}));

describe.each(['en', 'bn'] as const)('home smoke in %s', (locale: TestLocale) => {
  const t = createTranslator({ locale, messages: loadMessages(locale) }) as TeaserTranslate;

  it('renders one h1, the emergency tel: links and the three browse links', () => {
    renderInLocale(
      locale,
      <Home
        chips={[]}
        browse={null}
        facilities={null}
        latest={null}
        emergency={EMERGENCY_CONFIG}
      />,
    );

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

    const telHrefs = within(screen.getByTestId('emergency-panel'))
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));
    expect(telHrefs).toEqual([
      `tel:${EMERGENCY_CONFIG.ambulance}`,
      `tel:${EMERGENCY_CONFIG.healthLine}`,
      `tel:${EMERGENCY_CONFIG.crisisLine}`,
    ]);

    const nav = screen.getByRole('navigation', { name: t('discover.browseAll') });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href')),
    ).toEqual(['/doctors', '/facilities', '/topics']);
  });
});
