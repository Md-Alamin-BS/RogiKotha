import type { OwnEvidenceFile } from '@rogikotha/contracts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { EvidenceFileRow } from './EvidenceFileRow';
import { loadEvidenceMessages } from './evidence-test-support';

function buildFile(overrides: Partial<OwnEvidenceFile> = {}): OwnEvidenceFile {
  return { publicId: 'e1e1e1e1e1', name: 'xray.png', status: 'ready', size: 2048, ...overrides };
}

function renderRow(locale: 'en' | 'bn', file: OwnEvidenceFile, onRemove = vi.fn()) {
  render(
    <NextIntlClientProvider locale={locale} messages={loadEvidenceMessages(locale)}>
      <EvidenceFileRow file={file} maxMb={15} onRemove={onRemove} />
    </NextIntlClientProvider>,
  );
  return onRemove;
}

const STATUS_TEXT = {
  en: { ready: 'Attached', pending: 'Being checked', rejected: 'Not accepted' },
  bn: { ready: 'যুক্ত হয়েছে', pending: 'যাচাই হচ্ছে', rejected: 'গ্রহণ করা হয়নি' },
} as const;

describe.each(['en', 'bn'] as const)('EvidenceFileRow (%s)', (locale) => {
  it.each(['ready', 'pending'] as const)('shows a %s file with its status only', (status) => {
    renderRow(locale, buildFile({ status }));

    const row = screen.getByTestId('evidence-file');
    expect(row).toHaveTextContent(STATUS_TEXT[locale][status]);
    expect(screen.queryByTestId('evidence-file-reason')).toBeNull();
    expect(row).not.toHaveTextContent(locale === 'en' ? 'clear photo' : 'পরিষ্কার ছবি');
  });

  it.each(['rejected', 'failed'] as const)(
    'shows the reason, the photo guidance, the failure note and Remove for a %s file',
    (status) => {
      renderRow(
        locale,
        buildFile({
          status,
          reasonKey: status === 'rejected' ? 'ev.reason.tooLarge' : 'ev.reason.couldNotCheck',
        }),
      );

      const row = screen.getByTestId('evidence-file');
      expect(row).toHaveClass('bad');
      expect(screen.getByTestId('evidence-file-reason')).toBeInTheDocument();
      expect(row).toHaveTextContent(locale === 'en' ? 'clear photo' : 'পরিষ্কার ছবি');
      expect(row).toHaveTextContent(locale === 'en' ? 'Only this file' : 'শুধু এই ফাইলটি');
      expect(screen.getByTestId('evidence-file-remove')).toBeEnabled();
    },
  );

  it('fills the file limit into the too-large reason in the active numerals', () => {
    renderRow(locale, buildFile({ status: 'rejected', reasonKey: 'ev.reason.tooLarge' }));

    const reason = screen.getByTestId('evidence-file-reason');
    expect(reason).toHaveTextContent(locale === 'en' ? '15' : '১৫');
  });

  it('reads "Not provided" when the name is missing, and names the file on the Remove button', () => {
    renderRow(locale, buildFile({ name: null }));

    const notProvided = locale === 'en' ? 'Not provided' : 'জানানো হয়নি';
    expect(screen.getByTestId('evidence-file').querySelector('b')).toHaveTextContent(notProvided);
    expect(screen.getByRole('button')).toHaveAccessibleName(
      locale === 'en' ? `Remove ${notProvided}` : `${notProvided} সরান`,
    );
  });

  it('names the file on the Remove button and hands its id to the parent', async () => {
    const onRemove = renderRow(locale, buildFile({ name: 'xray.png' }));

    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName(locale === 'en' ? 'Remove xray.png' : 'xray.png সরান');
    await userEvent.setup().click(button);
    expect(onRemove).toHaveBeenCalledWith('e1e1e1e1e1');
  });

  it('writes the size in the active numerals', () => {
    renderRow(locale, buildFile({ size: 2 * 1024 * 1024 }));

    const text = screen.getByTestId('evidence-file').textContent ?? '';
    if (locale === 'bn') {
      expect(text).toContain('২');
      expect(text).not.toMatch(/[0-9]/);
    } else {
      expect(text).toContain('2 MB');
    }
  });
});
