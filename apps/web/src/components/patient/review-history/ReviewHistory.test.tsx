import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { ReviewHistoryVM } from '@rogikotha/contracts';

import {
  renderInLocale,
  testTranslator,
} from '@/components/patient/experience/experience-test-support';
import { loadReviewHistory, logSlotFailure } from '@/server/actions/review-slots';
import { ReviewHistory } from './ReviewHistory';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', async () => {
  const support = await import('@/components/patient/experience/experience-test-support');
  return {
    getTranslations: () => Promise.resolve(support.testTranslator(active.locale)),
    getLocale: () => Promise.resolve(active.locale),
  };
});
vi.mock('@/server/actions/review-slots', () => ({
  loadReviewHistory: vi.fn(),
  logSlotFailure: vi.fn(),
}));

const PUBLIC_ID = 'exp0000001';

const CORRECTED: ReviewHistoryVM = {
  editedAt: '2026-04-10T08:00:00.000Z',
  corrections: [
    {
      at: '2026-03-10T08:00:00.000Z',
      fields: ['outcome', 'claims'],
      original: {
        kind: 'detailed',
        title: 'Earlier title',
        sections: { symptoms: 'Earlier symptoms text.' },
        outcome: 'uncertain',
        claims: ['wrongDx', 'A stored free label'],
      },
    },
    {
      at: '2026-04-10T08:00:00.000Z',
      fields: ['story'],
      original: { kind: 'quick', title: 'Second title', story: 'Second earlier story.' },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(['en', 'bn'] as const)('the review history slot in %s', (locale) => {
  const t = testTranslator(locale);
  beforeEach(() => {
    active.locale = locale;
  });

  async function show(vm: ReviewHistoryVM | null) {
    vi.mocked(loadReviewHistory).mockResolvedValue(vm);
    return renderInLocale(locale, await ReviewHistory({ reviewPublicId: PUBLIC_ID }));
  }

  it('renders nothing for an unknown review and for one never edited', async () => {
    vi.mocked(loadReviewHistory).mockResolvedValue(null);
    expect(await ReviewHistory({ reviewPublicId: PUBLIC_ID })).toBeNull();
    vi.mocked(loadReviewHistory).mockResolvedValue({ corrections: [] });
    expect(await ReviewHistory({ reviewPublicId: PUBLIC_ID })).toBeNull();
    expect(loadReviewHistory).toHaveBeenCalledWith(PUBLIC_ID);
  });

  it('shows only the Edited mark with the month and year for a title-only edit', async () => {
    await show({ editedAt: '2026-03-10T08:00:00.000Z', corrections: [] });
    const mark = screen.getByTestId('review-history');
    expect(mark).toHaveTextContent(t('label.edited'));
    if (locale === 'bn') expect(mark.textContent).not.toMatch(/[0-9]/);
    else expect(mark).toHaveTextContent('March 2026');
    expect(mark.querySelector('time')).toHaveAttribute('dateTime', '2026-03');
    expect(screen.queryByTestId('review-corrections')).toBeNull();
    expect(screen.queryByTestId('original-text')).toBeNull();
    expect(screen.queryByTestId('version-list')).toBeNull();
  });

  it('lists corrections oldest first, each with a closed Show original', async () => {
    await show(CORRECTED);
    const items = Array.from(screen.getByTestId('review-corrections').children);
    expect(items).toHaveLength(2);
    const fields = `${t('history.field.outcome')}, ${t('history.field.claims')}`;
    expect(items[0]).toHaveTextContent(fields);
    if (locale === 'en') expect(items[0]).toHaveTextContent('March 2026');
    else expect(items[0]?.querySelector('p')?.textContent).not.toMatch(/[0-9]/);
    const originals = screen.getAllByTestId('original-text');
    expect(originals).toHaveLength(2);
    for (const original of originals) expect(original).not.toHaveAttribute('open');
    expect(within(originals[0] as HTMLElement).getByText(t('history.showOriginal'))).toBeVisible();
    expect(originals[0]).toHaveTextContent('Earlier symptoms text.');
    expect(originals[0]).toHaveTextContent(t('outcome.uncertain'));
    expect(originals[0]).toHaveTextContent(t('claim.wrongDx'));
    expect(originals[0]).toHaveTextContent('A stored free label');
    expect(originals[1]).toHaveTextContent('Second earlier story.');
  });

  it('gives the author the version list and no other reader', async () => {
    await show({
      ...CORRECTED,
      versions: [
        { version: 3, at: '2026-04-10T08:00:00.000Z', kind: 'corrected', fields: ['story'] },
        { version: 1, at: '2026-02-01T08:00:00.000Z', kind: 'published', fields: [] },
      ],
    });
    expect(screen.getByTestId('version-list')).toBeInTheDocument();
  });

  it('shows the unavailable line and logs the failure when the read throws', async () => {
    vi.mocked(loadReviewHistory).mockRejectedValue(new Error('boom'));
    renderInLocale(locale, await ReviewHistory({ reviewPublicId: PUBLIC_ID }));
    expect(screen.getByTestId('review-history-error')).toHaveTextContent(t('history.unavailable'));
    expect(logSlotFailure).toHaveBeenCalledWith('history', expect.any(Error));
  });
});
