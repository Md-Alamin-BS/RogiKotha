import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { EvidenceNote } from './EvidenceNote';
import { loadEvidenceMessages } from './evidence-test-support';

function renderNote(locale: 'en' | 'bn', count: number) {
  return render(
    <NextIntlClientProvider locale={locale} messages={loadEvidenceMessages(locale)}>
      <EvidenceNote count={count} />
    </NextIntlClientProvider>,
  );
}

describe('EvidenceNote', () => {
  it('states exactly "Documents attached — not medically validated" with the ready count', () => {
    const { getByTestId } = renderNote('en', 3);
    const note = getByTestId('evidence-note');
    expect(note.querySelector('.callout.warn b')?.textContent).toBe(
      'Documents attached — not medically validated',
    );
    expect(note.textContent).toContain('Files attached: 3');
  });

  it('renders the Bengali wording with Bengali numerals', () => {
    const { getByTestId } = renderNote('bn', 12);
    const note = getByTestId('evidence-note');
    expect(note.querySelector('b')?.textContent).toBe(
      'কাগজপত্র যুক্ত — চিকিৎসাগতভাবে যাচাই করা হয়নি',
    );
    expect(note.textContent).toContain('১২');
    expect(note.textContent).not.toMatch(/[0-9]/);
  });

  it('renders nothing when no file is ready', () => {
    const { container } = renderNote('en', 0);
    expect(container).toBeEmptyDOMElement();
  });

  it('never shows a file, an image or a link', () => {
    const { getByTestId } = renderNote('en', 2);
    const note = getByTestId('evidence-note');
    expect(note.querySelectorAll('img, a, button')).toHaveLength(0);
  });
});
