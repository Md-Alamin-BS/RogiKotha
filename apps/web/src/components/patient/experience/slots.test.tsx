import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import { EvidenceSection } from '@/components/patient/evidence/EvidenceSection';
import { loadPublicEvidenceCount } from '@/server/actions/review-slots';
import { renderInLocale, testTranslator, type TestLocale } from './experience-test-support';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', async () => {
  const support = await import('./experience-test-support');
  return {
    getTranslations: () => Promise.resolve(support.testTranslator(active.locale)),
    getLocale: () => Promise.resolve(active.locale),
  };
});
vi.mock('@/i18n/routing', async () => {
  const support = await import('./experience-test-support');
  return { Link: support.TestLink };
});
vi.mock('@/server/actions/review-slots', () => ({
  loadPublicEvidenceCount: vi.fn(),
  logSlotFailure: vi.fn(),
}));

const PUBLIC_ID = 'exp0000001';

function show(element: ReactElement | null, locale: TestLocale) {
  return renderInLocale(locale, element);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(['en', 'bn'] as const)('the experience page slots in %s', (locale) => {
  const t = testTranslator(locale);
  beforeEach(() => {
    active.locale = locale;
  });

  it('shows the evidence wording and count, or No documents', async () => {
    vi.mocked(loadPublicEvidenceCount).mockResolvedValue(2);
    const { unmount } = show(await EvidenceSection({ reviewPublicId: PUBLIC_ID }), locale);
    expect(screen.getByTestId('evidence-note')).toHaveTextContent(t('evidence.status'));
    unmount();

    for (const count of [0, null]) {
      vi.mocked(loadPublicEvidenceCount).mockResolvedValue(count);
      const shown = show(await EvidenceSection({ reviewPublicId: PUBLIC_ID }), locale);
      expect(screen.getByTestId('evidence-none')).toHaveTextContent(t('label.noDocuments'));
      shown.unmount();
    }
  });

  it('says the evidence read failed rather than No documents', async () => {
    vi.mocked(loadPublicEvidenceCount).mockRejectedValue(new Error('boom'));
    show(await EvidenceSection({ reviewPublicId: PUBLIC_ID }), locale);
    expect(screen.getByTestId('evidence-error')).toHaveTextContent(t('errors.common.internal'));
    expect(screen.queryByText(t('label.noDocuments'))).toBeNull();
  });
});
