import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { DraftSummaryVM } from '@rogikotha/contracts';

import { DraftList, DRAFTS_LIMIT } from './DraftList';
import { messagesFor, translatorFor, type TestLocale } from './compose-test-support';

let activeLocale: TestLocale = 'en';
vi.mock('next-intl/server', () => ({
  getLocale: () => Promise.resolve(activeLocale),
  getTranslations: () => Promise.resolve(translatorFor(activeLocale)),
}));
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: unknown; children?: ReactNode }) => {
    const { pathname, query } = href as { pathname: string; query: { draft: string } };
    return (
      <a href={`${pathname}?draft=${query.draft}`} {...rest}>
        {children}
      </a>
    );
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('@/server/actions/review', () => ({ discardDraftAction: vi.fn() }));

function someDrafts(count: number): DraftSummaryVM[] {
  return Array.from({ length: count }, (_, i) => ({
    draftId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    title: i === 0 ? null : `Synthetic draft ${i}`,
    target: 'doctor',
    updatedAt: '2026-11-06T09:00:00Z',
    expiresAt: '2026-12-06T09:00:00Z',
  }));
}

async function renderList(drafts: DraftSummaryVM[], locale: TestLocale) {
  activeLocale = locale;
  const ui = await DraftList({ drafts });
  return render(
    <NextIntlClientProvider locale={locale} messages={messagesFor(locale)}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe.each(['en', 'bn'] as const)('the draft list in %s', (locale: TestLocale) => {
  const t = translatorFor(locale);

  it('renders nothing without drafts', async () => {
    const { container } = await renderList([], locale);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each draft with its dates, a Continue link and a Discard button', async () => {
    await renderList(someDrafts(2), locale);

    const rows = screen.getAllByTestId('draft-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(t('compose.drafts.untitled'));
    expect(rows[1]).toHaveTextContent('Synthetic draft 1');
    const link = rows[1]?.querySelector('a');
    expect(link).toHaveAttribute('href', '/write?draft=00000000-0000-4000-8000-000000000001');
    expect(link).toHaveTextContent(t('compose.drafts.continue'));
    expect(screen.getAllByTestId('draft-discard')).toHaveLength(2);
    expect(screen.queryByTestId('draft-list-full')).not.toBeInTheDocument();
  });

  it('explains that a draft must go when the account holds ten', async () => {
    await renderList(someDrafts(DRAFTS_LIMIT), locale);

    expect(screen.getByTestId('draft-list-full')).toHaveTextContent(t('errors.review.draftsFull'));
  });
});
