// U41 plan Step 31 (design § 8.3, Review 01 R-04): the uploader shows the too-large copy for the
// route's 413, chosen by `messageKey`, in both languages. No component change; every value is
// synthetic.
import type { OwnEvidenceList } from '@rogikotha/contracts';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EvidenceUploader } from './EvidenceUploader';
import { loadEvidenceMessages } from './evidence-test-support';

vi.mock('@/server/actions/evidence', () => ({ removeEvidence: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const MB = 1024 * 1024;
const fetchMock = vi.fn<typeof fetch>();

function emptyList(): OwnEvidenceList {
  return { reviewPublicId: 'r7x2k9m4pq', files: [], maxFiles: 10, maxBytes: 15 * MB };
}

/** The 413 the upload route answers when the request passes its cap (U41 BR4.2, BR4.3). */
function requestTooLarge(): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: 'evidence.too_large',
        messageKey: 'errors.evidence.tooLarge',
        correlationId: '0190f5a2-0000-7000-8000-0000000000ce',
      },
    }),
    { status: 413, headers: { 'Content-Type': 'application/json', Connection: 'close' } },
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EvidenceUploader and the request cap', () => {
  it.each([
    ['en', 'Each file must be 15 MB or smaller.'],
    ['bn', 'প্রতিটি ফাইল ১৫ এমবি বা তার কম হতে হবে।'],
  ] as const)(
    'shows the too-large copy for a 413 in %s, not the generic failure',
    async (locale, expected) => {
      fetchMock.mockResolvedValue(requestTooLarge());
      const user = userEvent.setup();
      render(
        <NextIntlClientProvider locale={locale} messages={loadEvidenceMessages(locale)}>
          <EvidenceUploader {...emptyList()} />
        </NextIntlClientProvider>,
      );

      await user.upload(
        screen.getByTestId('evidence-file-input'),
        new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], 'synthetic-scan.png', {
          type: 'image/png',
        }),
      );
      await user.click(screen.getByTestId('evidence-upload-submit'));

      await waitFor(() => {
        expect(screen.getByTestId('evidence-upload-message')).toHaveTextContent(expected);
      });
      const messages = loadEvidenceMessages(locale) as {
        ev: { upload: { errors: { failed: string } } };
      };
      expect(screen.getByTestId('evidence-upload-message')).not.toHaveTextContent(
        messages.ev.upload.errors.failed,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});
