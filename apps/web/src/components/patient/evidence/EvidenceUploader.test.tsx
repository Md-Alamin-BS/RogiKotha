import type { OwnEvidenceFile, OwnEvidenceList } from '@rogikotha/contracts';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { removeEvidence } from '@/server/actions/evidence';
import { EvidenceUploader } from './EvidenceUploader';
import { loadEvidenceMessages } from './evidence-test-support';

const refresh = vi.hoisted(() => vi.fn());

vi.mock('@/server/actions/evidence', () => ({ removeEvidence: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const REVIEW_PUBLIC_ID = 'r7x2k9m4pq';
const MB = 1024 * 1024;
const PNG_HEAD = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);

function buildFile(overrides: Partial<OwnEvidenceFile> = {}): OwnEvidenceFile {
  return { publicId: 'e1e1e1e1e1', name: 'xray.png', status: 'ready', size: 2048, ...overrides };
}

function buildList(files: OwnEvidenceFile[], maxFiles = 10): OwnEvidenceList {
  return { reviewPublicId: REVIEW_PUBLIC_ID, files, maxFiles, maxBytes: 15 * MB };
}

function manyFiles(count: number, status: OwnEvidenceFile['status'] = 'ready') {
  return Array.from({ length: count }, (_, i) =>
    buildFile({ publicId: `e${String(i).padStart(2, '0')}e1e1e1e`, status }),
  );
}

function renderUploader(locale: 'en' | 'bn', list: OwnEvidenceList) {
  return render(
    <NextIntlClientProvider locale={locale} messages={loadEvidenceMessages(locale)}>
      <EvidenceUploader {...list} />
    </NextIntlClientProvider>,
  );
}

function png(name = 'scan.png', size = PNG_HEAD.length): File {
  return new File([new Uint8Array(size).fill(1)], name, { type: 'image/png' });
}

const fetchMock = vi.fn<typeof fetch>();

function answer(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.mocked(removeEvidence).mockReset();
  fetchMock.mockReset();
  refresh.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EvidenceUploader', () => {
  it("lists the author's files as Attached or Being checked, with the upload form", () => {
    renderUploader(
      'en',
      buildList([
        buildFile(),
        buildFile({ publicId: 'e2e2e2e2e2', name: 'prescription.jpg', status: 'pending' }),
      ]),
    );

    const rows = screen.getAllByTestId('evidence-file');
    expect(rows.map((row) => row.querySelector('b')?.textContent)).toEqual([
      'xray.png',
      'prescription.jpg',
    ]);
    expect(rows[0]).toHaveTextContent('Attached');
    expect(rows[0]).toHaveClass('ev-file', 'done');
    expect(rows[1]).toHaveTextContent('Being checked');
    expect(screen.getByTestId('evidence-file-input')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png',
    );
    expect(screen.getByText(/up to 15 MB each and 10 per experience/)).toBeInTheDocument();
  });

  it('renders in Bengali with Bengali numerals and status words', () => {
    renderUploader('bn', buildList([buildFile({ status: 'pending' })]));

    expect(screen.getByTestId('evidence-file')).toHaveTextContent('যাচাই হচ্ছে');
    expect(screen.getByText(/সর্বোচ্চ ১৫ এমবি/)).toBeInTheDocument();
    expect(screen.getByTestId('evidence-upload-submit')).toHaveTextContent('আপলোড করুন');
  });

  it('reads "No documents" when the list is empty', () => {
    renderUploader('en', buildList([]));
    expect(screen.getByText('No documents')).toBeInTheDocument();
  });

  it.each(['en', 'bn'] as const)(
    'hides the form once ten counted files are attached (%s)',
    (locale) => {
      renderUploader(locale, buildList(manyFiles(10)));

      expect(screen.queryByTestId('evidence-upload-form')).not.toBeInTheDocument();
      expect(
        screen.getByText(locale === 'en' ? /the most files allowed \(10\)/ : /\(১০টি\)/),
      ).toBeInTheDocument();
    },
  );

  it('counts files being checked, and enables the form again when one of ten has failed', () => {
    const { unmount } = renderUploader('en', buildList(manyFiles(10, 'pending')));
    expect(screen.queryByTestId('evidence-upload-form')).not.toBeInTheDocument();
    unmount();

    const nine = manyFiles(9);
    renderUploader(
      'en',
      buildList([...nine, buildFile({ publicId: 'f0f0f0f0f0', status: 'failed' })]),
    );
    expect(screen.getByTestId('evidence-upload-form')).toBeInTheDocument();
  });

  it('sends one request per file with a fresh key, announces receipt and refreshes the list', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(answer(200, [{ itemId: 'i', state: 'quarantined' }])),
    );
    const user = userEvent.setup();
    renderUploader('en', buildList([]));

    await user.upload(screen.getByTestId('evidence-file-input'), [png('a.png'), png('b.png')]);
    await user.click(screen.getByTestId('evidence-upload-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('evidence-upload-message')).toHaveTextContent(
        'File received. It stays private',
      ),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const bodies = fetchMock.mock.calls.map(([, init]) => init?.body as FormData);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/evidence/upload');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(bodies.map((b) => b.get('reviewPublicId'))).toEqual([
      REVIEW_PUBLIC_ID,
      REVIEW_PUBLIC_ID,
    ]);
    expect(bodies.map((b) => (b.get('file') as File).name)).toEqual(['a.png', 'b.png']);
    expect(new Set(bodies.map((b) => b.get('idempotencyKey'))).size).toBe(2);
    expect(refresh).toHaveBeenCalledTimes(1);
    // The region is polite and the input keeps focus ownership with the user.
    expect(screen.getByTestId('evidence-upload-message')).toHaveAttribute('aria-live', 'polite');
  });

  it('refuses a type that is not JPG or PNG before sending anything', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderUploader('en', buildList([]));

    await user.upload(
      screen.getByTestId('evidence-file-input'),
      new File(['hello'], 'notes.txt', { type: 'text/plain' }),
    );
    await user.click(screen.getByTestId('evidence-upload-submit'));

    expect(screen.getByTestId('evidence-upload-message')).toHaveTextContent(
      'Only JPG and PNG images are accepted.',
    );
    expect(screen.getByTestId('evidence-file-input')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a file over the limit before sending anything', async () => {
    const user = userEvent.setup();
    renderUploader('en', buildList([]));

    await user.upload(screen.getByTestId('evidence-file-input'), png('big.png', 15 * MB + 1));
    await user.click(screen.getByTestId('evidence-upload-submit'));

    expect(screen.getByTestId('evidence-upload-message')).toHaveTextContent(
      'Each file must be 15 MB or smaller.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a choice that would pass the file limit', async () => {
    const user = userEvent.setup();
    renderUploader('en', buildList(manyFiles(9)));

    await user.upload(screen.getByTestId('evidence-file-input'), [png('a.png'), png('b.png')]);
    await user.click(screen.getByTestId('evidence-upload-submit'));

    expect(screen.getByTestId('evidence-upload-message')).toHaveTextContent(
      'You can attach up to 10 files per experience.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['en', 'Try again in 15 minutes.'],
    ['bn', '১৫ মিনিট পর আবার চেষ্টা করুন।'],
  ] as const)('shows the rate-limit message with the minutes (%s)', async (locale, expected) => {
    fetchMock.mockResolvedValue(
      answer(429, {
        error: {
          code: 'evidence.rate_limited',
          messageKey: 'ev.upload.errors.rateLimited',
          retryAfterSec: 900,
        },
      }),
    );
    const user = userEvent.setup();
    renderUploader(locale, buildList([]));

    await user.upload(screen.getByTestId('evidence-file-input'), png());
    await user.click(screen.getByTestId('evidence-upload-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('evidence-upload-message')).toHaveTextContent(expected),
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows the server's refusal copy, and the generic one for an unknown key or a dropped connection", async () => {
    fetchMock.mockResolvedValueOnce(
      answer(400, {
        error: { code: 'evidence.type_rejected', messageKey: 'errors.evidence.typeRejected' },
      }),
    );
    const user = userEvent.setup();
    renderUploader('en', buildList([]));
    const input = screen.getByTestId('evidence-file-input');
    const submit = screen.getByTestId('evidence-upload-submit');

    await user.upload(input, png());
    await user.click(submit);
    await waitFor(() =>
      expect(screen.getByTestId('evidence-upload-message')).toHaveTextContent(
        'Only JPG and PNG images are accepted.',
      ),
    );

    fetchMock.mockResolvedValueOnce(answer(500, { error: { messageKey: 'not.a.key' } }));
    await user.upload(input, png());
    await user.click(submit);
    await waitFor(() =>
      expect(screen.getByTestId('evidence-upload-message')).toHaveTextContent(
        'The file could not be uploaded. Please try again.',
      ),
    );

    fetchMock.mockRejectedValueOnce(new TypeError('network'));
    await user.upload(input, png());
    await user.click(submit);
    await waitFor(() =>
      expect(screen.getByTestId('evidence-upload-message')).toHaveTextContent(
        'The file could not be uploaded.',
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it('removes a file through the server action and refreshes the list', async () => {
    vi.mocked(removeEvidence).mockResolvedValue({ status: 'removed' });
    const user = userEvent.setup();
    renderUploader('en', buildList([buildFile()]));

    await user.click(screen.getByRole('button', { name: 'Remove xray.png' }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(removeEvidence).toHaveBeenCalledWith('e1e1e1e1e1');
  });

  it('shows the message when a removal is refused', async () => {
    vi.mocked(removeEvidence).mockResolvedValue({
      status: 'error',
      messageKey: 'ev.upload.errors.notFound',
    });
    const user = userEvent.setup();
    renderUploader('en', buildList([buildFile()]));

    await user.click(screen.getByRole('button', { name: 'Remove xray.png' }));

    await waitFor(() =>
      expect(screen.getByTestId('evidence-upload-message')).toHaveTextContent(
        'This experience was not found',
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
