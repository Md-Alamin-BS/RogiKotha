import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import type { ConditionCardVM } from '@rogikotha/contracts';
import {
  EMERGENCY_CONFIG,
  aFacilityCard,
  anExperienceCard,
  loadMessages,
  renderInLocale,
  type TestLocale,
} from '@/components/patient/doctors/directory-test-support';
import { Home, type HomeProps } from './Home';
import type { TeaserTranslate } from './teaser-sub';

vi.mock('@/i18n/routing', async () => ({
  Link: (await import('../shared/link-test-support')).PlainLink,
}));

const aTopic = (publicId: string, name: string, accountsTotal: number): ConditionCardVM => ({
  publicId,
  name,
  accountsTotal,
});

function homeProps(overrides: Partial<HomeProps> = {}): HomeProps {
  return {
    chips: [
      aTopic('c000000001', 'Synthetic asthma', 4),
      aTopic('c000000002', 'Synthetic dengue', 1),
    ],
    browse: [
      aTopic('c000000001', 'Synthetic asthma', 4),
      aTopic('c000000002', 'Synthetic dengue', 1),
    ],
    facilities: [aFacilityCard()],
    latest: [anExperienceCard()],
    emergency: EMERGENCY_CONFIG,
    ...overrides,
  };
}

const digits = (locale: TestLocale, latin: string) =>
  locale === 'en' ? latin : latin.replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)] ?? d);

describe.each(['en', 'bn'] as const)('Home (%s)', (locale: TestLocale) => {
  const t = createTranslator({ locale, messages: loadMessages(locale) }) as TeaserTranslate;

  it('has one h1 and its blocks in the prototype order', () => {
    renderInLocale(locale, <Home {...homeProps()} />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('hero.title'));
    const h2s = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual([
      t('emergency.title'),
      t('discover.browse'),
      t('discover.facilities'),
      t('how.title'),
      t('discover.latest'),
    ]);
  });

  it('offers three browse links in a nav named for them', () => {
    renderInLocale(locale, <Home {...homeProps()} />);

    const nav = screen.getByRole('navigation', { name: t('discover.browseAll') });
    const links = within(nav).getAllByRole('link');
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      [t('discover.browseDoctors'), '/doctors'],
      [t('discover.browseFacilities'), '/facilities'],
      [t('discover.browseTopics'), '/topics'],
    ]);
    expect(within(nav).getAllByRole('listitem')).toHaveLength(3);
  });

  it('links each chip to its topic page', () => {
    renderInLocale(locale, <Home {...homeProps()} />);

    const chips = within(screen.getByTestId('home-chips')).getAllByRole('link');
    expect(chips.map((a) => a.getAttribute('href'))).toEqual([
      '/topics/c000000001',
      '/topics/c000000002',
    ]);
  });

  it('leaves the chip list out when no topic has accounts', () => {
    renderInLocale(locale, <Home {...homeProps({ chips: [] })} />);

    expect(screen.queryByTestId('home-chips')).toBeNull();
  });

  it('shows the browse grid with plural counts in the active digits', () => {
    renderInLocale(locale, <Home {...homeProps()} />);

    const cards = within(screen.getByTestId('home-browse-grid')).getAllByTestId('browse-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute('href', '/topics/c000000001');
    expect(cards[0]).toHaveTextContent(
      t('profile.experienceCount', { n: 4, count: digits(locale, '4') }),
    );
    expect(cards[1]).toHaveTextContent(
      t('profile.experienceCount', { n: 1, count: digits(locale, '1') }),
    );
  });

  it('shows teaser rows with their count, Limited data tag and the separation sentence', () => {
    renderInLocale(
      locale,
      <Home
        {...homeProps({
          facilities: [
            aFacilityCard({
              name: 'Synthetic Eye Clinic',
              accountsTotal: 3,
              accountsLimitedData: true,
            }),
            aFacilityCard({ accountsTotal: 0, accountsLimitedData: false }),
            aFacilityCard({ feedbackVisible: false, accountsTotal: 9, accountsLimitedData: true }),
          ],
        })}
      />,
    );

    const panel = screen.getByTestId('home-facilities');
    expect(panel).toHaveTextContent(t('facility.separation'));
    const rows = within(panel).getAllByTestId('teaser-row');
    expect(rows).toHaveLength(3);
    const [counted, zero, hidden] = rows as [HTMLElement, HTMLElement, HTMLElement];
    expect(counted).toHaveTextContent(
      t('facility.visitCount', { n: 3, count: digits(locale, '3') }),
    );
    expect(within(counted).getByTestId('teaser-limited')).toHaveTextContent(t('label.limitedData'));
    expect(zero).toHaveTextContent(t('facility.noVisits'));
    expect(within(zero).queryByTestId('teaser-limited')).toBeNull();
    expect(hidden).not.toHaveTextContent(t('facility.noVisits'));
    expect(hidden.textContent).not.toMatch(/[9৯]/);
    expect(within(hidden).queryByTestId('teaser-limited')).toBeNull();
  });

  it('numbers the how-it-works steps in the active digits', () => {
    const { container } = renderInLocale(locale, <Home {...homeProps()} />);

    const figs = Array.from(container.querySelectorAll('.how-list .fig')).map((f) => f.textContent);
    expect(figs).toEqual(['01', '02', '03'].map((f) => digits(locale, f)));
  });

  it('keeps the disclaimer and emergency panel static and nothing in the opener moves', () => {
    const { container } = renderInLocale(locale, <Home {...homeProps()} />);

    expect(screen.getByText(t('disclaimer.short')).closest('aside')).toHaveAttribute(
      'data-static',
      'disclaimer',
    );
    expect(screen.getByTestId('emergency-panel')).toHaveAttribute('data-static', 'emergency');
    expect(screen.getByTestId('emergency-panel')).toHaveTextContent(digits(locale, '999'));
    const opener = container.querySelector('.opener');
    expect(opener?.querySelector('.reveal, [data-reveal-list]')).toBeNull();
    expect(container.querySelector('[style]')).toBeNull();
  });

  it('never names an anonymous author', () => {
    renderInLocale(
      locale,
      <Home
        {...homeProps({
          latest: [
            anExperienceCard({
              author: { personaKind: 'anonymous', displayName: 'Synthetic Hidden Name' },
            }),
          ],
        })}
      />,
    );

    expect(screen.getAllByTestId('account-row')).toHaveLength(1);
    expect(screen.queryByText(/Synthetic Hidden Name/)).toBeNull();
  });

  it('leaves out unavailable sections together with their headings', () => {
    renderInLocale(
      locale,
      <Home {...homeProps({ browse: null, facilities: null, latest: null })} />,
    );

    expect(screen.queryByTestId('home-browse-grid')).toBeNull();
    expect(screen.queryByTestId('home-facilities')).toBeNull();
    expect(screen.queryByText(t('discover.browse'))).toBeNull();
    expect(screen.queryByText(t('discover.facilities'))).toBeNull();
    expect(screen.queryByText(t('discover.latest'))).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('emergency-panel')).toBeInTheDocument();
    expect(screen.getAllByTestId('home-browse-link')).toHaveLength(3);
  });

  it('leaves out an empty browse grid and an empty teaser', () => {
    renderInLocale(locale, <Home {...homeProps({ browse: [], facilities: [] })} />);

    expect(screen.queryByText(t('discover.browse'))).toBeNull();
    expect(screen.queryByTestId('home-facilities')).toBeNull();
  });

  it('says so when nothing has been published yet', () => {
    renderInLocale(locale, <Home {...homeProps({ latest: [] })} />);

    expect(screen.getByText(t('discover.latest'))).toBeInTheDocument();
    expect(screen.getByText(t('discover.latestEmpty'))).toBeInTheDocument();
    expect(screen.queryByTestId('account-row')).toBeNull();
  });
});
