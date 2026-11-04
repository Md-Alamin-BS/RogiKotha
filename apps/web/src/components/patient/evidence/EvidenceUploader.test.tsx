import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  uploadEvidence,
  type OwnEvidenceFile,
  type OwnEvidenceList,
} from '@/server/actions/evidence';
import { EvidenceUploader } from './EvidenceUploader';
import { loadEvidenceMessages } from './evidence-test-support';

vi.mock('@/server/actions/evidence', () => ({ uploadEvidence: vi.fn() }));

const REVIEW_PUBLIC_ID = 'r7x2k9m4pq';

function buildFile(overrides: Partial<OwnEvidenceFile> = {}): OwnEvidenceFile {
  return { publicId: 'e1e1e1e1e1', name: 'xray.png', status: 'ready', size: 2048, ...overrides };
}

function buildList(files: OwnEvidenceFile[]): OwnEvidenceList {
  return { reviewPublicId: REVIEW_PUBLIC_ID, files, maxFiles: 5, maxBytes: 10 * 1024 * 1024 };
}

function renderUploader(locale: 'en' | 'bn', list: OwnEvidenceList) {
  return render(
    <NextIntlClientProvider locale={locale} messages={loadEvidenceMessages(locale)}>
      <EvidenceUploader {...list} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(uploadEvidence).mockReset();
});

describe('EvidenceUploader', () => {
  it("lists the author's files as Ready or Scan pending, with the upload form", () => {
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
    expect(rows[0]).toHaveTextContent('Ready');
    expect(rows[0]).toHaveClass('ev-file', 'done');
    expect(rows[1]).toHaveTextContent('Scan pending');
    expect(screen.getByTestId('evidence-file-input')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png',
    );
    expect(screen.getByText(/up to 10 MB each and 5 per experience/)).toBeInTheDocument();
  });

  it('renders in Bengali with Bengali numerals and status words', () => {
    renderUploader('bn', buildList([buildFile({ status: 'pending' })]));

    expect(screen.getByTestId('evidence-file')).toHaveTextContent('স্ক্যান বাকি');
    expect(screen.getByText(/সর্বোচ্চ ১০ এমবি/)).toBeInTheDocument();
    expect(screen.getByTestId('evidence-upload-submit')).toHaveTextContent('আপলোড করুন');
  });

  it('marks a file the scan rejected as not accepted', () => {
    renderUploader('en', buildList([buildFile({ status: 'rejected' })]));
    const row = screen.getByTestId('evidence-file');
    expect(row).toHaveClass('bad');
    expect(row).toHaveTextContent('Not accepted');
  });

  it('reads "Not provided" for a file whose name is missing, and "No documents" when empty', () => {
    const { unmount } = renderUploader('en', buildList([buildFile({ name: null })]));
    expect(screen.getByTestId('evidence-file').querySelector('b')).toHaveTextContent(
      'Not provided',
    );
    unmount();

    renderUploader('en', buildList([]));
    expect(screen.getByText('No documents')).toBeInTheDocument();
  });

  it('hides the form once five counted files are attached', () => {
    renderUploader(
      'en',
      buildList(
        Array.from({ length: 5 }, (_, i) => buildFile({ publicId: `e${i}e${i}e${i}e${i}e${i}` })),
      ),
    );
    expect(screen.queryByTestId('evidence-upload-form')).not.toBeInTheDocument();
    expect(screen.getByText(/the most files allowed \(5\)/)).toBeInTheDocument();
  });

  it('sends the chosen file with the experience id and shows a refusal next to the field', async () => {
    vi.mocked(uploadEvidence).mockResolvedValue({
      status: 'error',
      messageKey: 'errors.evidence.typeRejected',
    });
    const user = userEvent.setup();
    renderUploader('en', buildList([]));

    const file = new File(['not an image'], 'photo.png', { type: 'image/png' });
    await user.upload(screen.getByTestId('evidence-file-input'), file);
    await user.click(screen.getByTestId('evidence-upload-submit'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Only JPG and PNG images are accepted.'),
    );
    const form = vi.mocked(uploadEvidence).mock.calls[0]![1];
    expect(form.get('reviewPublicId')).toBe(REVIEW_PUBLIC_ID);
    // jsdom builds FormData from its own file list, which user-event's upload does not fill, so
    // only the field's presence is checked here; the action's tests cover the bytes.
    expect(form.has('file')).toBe(true);
    expect(screen.getByTestId('evidence-file-input')).toHaveAttribute('aria-invalid', 'true');
  });

  it('confirms an upload whose scan could not run as pending', async () => {
    vi.mocked(uploadEvidence).mockResolvedValue({
      status: 'uploaded',
      scan: 'error',
      messageKey: 'ev.upload.done.pending',
    });
    const user = userEvent.setup();
    renderUploader('en', buildList([]));

    await user.upload(
      screen.getByTestId('evidence-file-input'),
      new File([Uint8Array.from([0x89, 0x50])], 'scan.png', { type: 'image/png' }),
    );
    await user.click(screen.getByTestId('evidence-upload-submit'));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Scan pending'));
  });
});
