import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadPublicEvidenceCount, logSlotFailure } from '@/server/actions/review-slots';
import { EvidenceSection } from './EvidenceSection';
import { loadEvidenceMessages } from './evidence-test-support';

vi.mock('@/server/actions/review-slots', () => ({
  loadPublicEvidenceCount: vi.fn(),
  logSlotFailure: vi.fn(),
}));
vi.mock('next-intl/server', async () => {
  const { createTranslator } = await import('next-intl');
  const { loadEvidenceMessages: load } = await import('./evidence-test-support');
  return {
    getTranslations: () =>
      Promise.resolve(createTranslator({ locale: 'en', messages: load('en') })),
  };
});

const REVIEW_PUBLIC_ID = 'r7x2k9m4pq';

async function renderSection(locale: 'en' | 'bn') {
  const ui = await EvidenceSection({ reviewPublicId: REVIEW_PUBLIC_ID });
  return render(
    <NextIntlClientProvider locale={locale} messages={loadEvidenceMessages(locale)}>
      {ui}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(['en', 'bn'] as const)('EvidenceSection (%s)', (locale) => {
  it('renders only the note with the count: no file list, no file name, no control', async () => {
    vi.mocked(loadPublicEvidenceCount).mockResolvedValue(3);

    const { getByTestId, container } = await renderSection(locale);

    expect(loadPublicEvidenceCount).toHaveBeenCalledWith(REVIEW_PUBLIC_ID);
    expect(getByTestId('evidence-note')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-testid="evidence-file"], img, a, button, input'),
    ).toHaveLength(0);
    expect(container.textContent).not.toMatch(/\.(png|jpe?g)/i);
  });

  it('says No documents when nothing is attached', async () => {
    vi.mocked(loadPublicEvidenceCount).mockResolvedValue(0);

    const { getByTestId } = await renderSection(locale);

    expect(getByTestId('evidence-none')).toBeInTheDocument();
  });

  it('renders nothing for an unknown or unpublished review', async () => {
    vi.mocked(loadPublicEvidenceCount).mockResolvedValue(null);

    const { container } = await renderSection(locale);

    expect(container).toBeEmptyDOMElement();
  });

  it('says the read failed, not No documents, and logs the failure', async () => {
    vi.mocked(loadPublicEvidenceCount).mockRejectedValue(new Error('boom'));

    const { getByTestId, queryByTestId } = await renderSection(locale);

    expect(getByTestId('evidence-error')).toBeInTheDocument();
    expect(queryByTestId('evidence-none')).toBeNull();
    expect(logSlotFailure).toHaveBeenCalledWith('evidence', expect.any(Error));
  });
});
