import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { expect, it } from 'vitest';

import { EvidenceNote } from './EvidenceNote';
import { loadEvidenceMessages } from './evidence-test-support';

// U48 smoke: the count behind the public evidence section reaches the page as the fixed wording
// and the count, or as No documents, in both languages.
it.each([
  ['en', 1, 'Files attached: 1'],
  ['bn', 1, 'যুক্ত ফাইল: ১'],
  ['en', 0, 'No documents'],
  ['bn', 0, 'কোনো কাগজপত্র নেই'],
] as const)('shows %s count %d as "%s"', (locale, count, expected) => {
  const { container } = render(
    <NextIntlClientProvider locale={locale} messages={loadEvidenceMessages(locale)}>
      <EvidenceNote count={count} />
    </NextIntlClientProvider>,
  );
  expect(container.textContent).toContain(expected);
});
