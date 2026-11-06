import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import { err, ok } from '@rogikotha/contracts';
import {
  EMERGENCY_CONFIG,
  aFacilityCard,
  anExperienceCard,
  loadMessages,
  renderInLocale,
} from '@/components/patient/doctors/directory-test-support';
import type { Translate } from '@/lib/titles';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

// Stand-ins for the three queries; `runCommand` below answers by identity.
const fake = vi.hoisted(() => {
  const listConditions = { name: 'taxonomy.listConditions' };
  const listFacilities = { name: 'directory.listFacilities' };
  const listExperienceCards = { name: 'review.listExperienceCards' };
  const configCurrent = vi.fn();
  const warn = vi.fn();
  return {
    listConditions,
    listFacilities,
    listExperienceCards,
    runCommand: vi.fn(),
    configCurrent,
    warn,
    container: {
      taxonomy: { listConditions },
      directory: { listFacilities },
      reviewReads: { listExperienceCards },
      ports: {
        config: { current: configCurrent },
        logger: { info: vi.fn(), warn, error: vi.fn() },
      },
    },
  };
});

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve(
      createTranslator({ locale: active.locale, messages: loadMessages(active.locale) }),
    ),
  getLocale: () => Promise.resolve(active.locale),
}));

vi.mock('@/server/auth', () => ({
  getActor: () =>
    Promise.resolve({
      kind: 'anonymous',
      capabilities: [],
      locale: active.locale,
      correlationId: 'home-test-correlation',
    }),
}));
vi.mock('@/server/container', () => ({ getContainer: () => fake.container }));
vi.mock('@/server/command-call', () => ({ runCommand: fake.runCommand }));

// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', async () => ({
  Link: (await import('@/components/patient/shared/link-test-support')).PlainLink,
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import DiscoverPage from './page';

type Section = 'conditions' | 'facilities' | 'latest';
type Failure = 'err' | 'throw';

const TOPIC = { publicId: 'c000000001', name: 'Synthetic asthma', accountsTotal: 3 };

function answer(failing?: { section: Section; how: Failure }) {
  const results: Record<Section, unknown> = {
    conditions: ok([TOPIC]),
    facilities: ok({ items: [aFacilityCard()], total: 1 }),
    latest: ok({ items: [anExperienceCard()] }),
  };
  const sectionOf = new Map<unknown, Section>([
    [fake.listConditions, 'conditions'],
    [fake.listFacilities, 'facilities'],
    [fake.listExperienceCards, 'latest'],
  ]);
  fake.runCommand.mockImplementation((command: unknown) => {
    const section = sectionOf.get(command);
    if (section === undefined) throw new Error('unexpected command');
    if (failing?.section === section) {
      if (failing.how === 'throw') return Promise.reject(new Error('database down'));
      return Promise.resolve(err('internal', { correlationId: 'home-test-correlation' }));
    }
    return Promise.resolve(results[section]);
  });
}

const HEADING_KEY: Record<Section, string> = {
  conditions: 'discover.browse',
  facilities: 'discover.facilities',
  latest: 'discover.latest',
};

describe.each(['en', 'bn'] as const)('home page in %s', (locale) => {
  const t = createTranslator({ locale, messages: loadMessages(locale) }) as unknown as Translate;

  beforeEach(() => {
    active.locale = locale;
    fake.runCommand.mockReset();
    fake.warn.mockReset();
    fake.configCurrent.mockReset();
    fake.configCurrent.mockResolvedValue({ emergency: EMERGENCY_CONFIG });
  });

  it('makes each of the four reads once with the release-1 inputs', async () => {
    answer();
    renderInLocale(locale, await DiscoverPage());

    expect(fake.runCommand).toHaveBeenCalledTimes(3);
    expect(fake.runCommand).toHaveBeenCalledWith(fake.listConditions, {});
    expect(fake.runCommand).toHaveBeenCalledWith(fake.listFacilities, { page: 1, pageSize: 3 });
    expect(fake.runCommand).toHaveBeenCalledWith(fake.listExperienceCards, { limit: 4 });
    expect(fake.configCurrent).toHaveBeenCalledTimes(1);
    expect(fake.warn).not.toHaveBeenCalled();
  });

  it('renders every section under one h1 when all reads succeed', async () => {
    answer();
    renderInLocale(locale, await DiscoverPage());

    expect(document.getElementById('view-discover')).not.toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const key of Object.values(HEADING_KEY)) {
      expect(screen.getByRole('heading', { level: 2, name: t(key) })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: TOPIC.name })).toHaveAttribute(
      'href',
      `/topics/${TOPIC.publicId}`,
    );
  });

  describe.each(['err', 'throw'] as const)('a list that fails by %s', (how) => {
    it.each(['conditions', 'facilities', 'latest'] as const)(
      'leaves out only the %s section and logs it',
      async (section) => {
        answer({ section, how });
        renderInLocale(locale, await DiscoverPage());

        expect(
          screen.queryByRole('heading', { level: 2, name: t(HEADING_KEY[section]) }),
        ).toBeNull();
        for (const other of (Object.keys(HEADING_KEY) as Section[]).filter((s) => s !== section)) {
          expect(
            screen.getByRole('heading', { level: 2, name: t(HEADING_KEY[other]) }),
          ).toBeInTheDocument();
        }
        expect(fake.warn).toHaveBeenCalledTimes(1);
        expect(fake.warn).toHaveBeenCalledWith('discover.section_unavailable', {
          kind: section,
          correlationId: 'home-test-correlation',
        });
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getAllByTestId('home-browse-link')).toHaveLength(3);
        expect(screen.getByTestId('emergency-panel')).toBeInTheDocument();
      },
    );
  });

  it('leaves out the topic chips when the condition list fails', async () => {
    answer({ section: 'conditions', how: 'err' });
    renderInLocale(locale, await DiscoverPage());

    expect(screen.queryByTestId('home-chips')).toBeNull();
  });
});
