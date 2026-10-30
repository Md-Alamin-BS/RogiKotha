import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listOwnEvidenceFiles } from '@/server/actions/evidence';
import { AuthorEvidence } from './AuthorEvidence';
import { loadEvidenceMessages } from './evidence-test-support';

vi.mock('@/server/actions/evidence', () => ({
  listOwnEvidenceFiles: vi.fn(),
  uploadEvidence: vi.fn(),
}));

const REVIEW_PUBLIC_ID = 'r7x2k9m4pq';

async function renderAuthorEvidence(locale: 'en' | 'bn') {
  const ui = await AuthorEvidence({ reviewPublicId: REVIEW_PUBLIC_ID });
  return render(
    <NextIntlClientProvider locale={locale} messages={loadEvidenceMessages(locale)}>
      {ui}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(listOwnEvidenceFiles).mockReset();
});

describe('AuthorEvidence', () => {
  it.each(['en', 'bn'] as const)('shows the uploader to the author (%s)', async (locale) => {
    vi.mocked(listOwnEvidenceFiles).mockResolvedValue({
      reviewPublicId: REVIEW_PUBLIC_ID,
      files: [{ publicId: 'e1e1e1e1e1', name: 'xray.png', status: 'ready', size: 10 }],
      maxFiles: 5,
      maxBytes: 10 * 1024 * 1024,
    });

    await renderAuthorEvidence(locale);

    expect(listOwnEvidenceFiles).toHaveBeenCalledWith(REVIEW_PUBLIC_ID);
    expect(screen.getByTestId('evidence-uploader')).toBeInTheDocument();
    expect(screen.getByTestId('evidence-file')).toHaveTextContent(
      locale === 'en' ? 'Ready' : 'প্রস্তুত',
    );
  });

  it('renders nothing for anyone who is not the author', async () => {
    vi.mocked(listOwnEvidenceFiles).mockResolvedValue(null);
    const { container } = await renderAuthorEvidence('en');
    expect(container).toBeEmptyDOMElement();
  });
});
