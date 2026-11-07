import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { ReviewVersionVM } from '@rogikotha/contracts';

import {
  renderInLocale,
  testTranslator,
} from '@/components/patient/experience/experience-test-support';
import { VersionList } from './VersionList';

const VERSIONS: ReviewVersionVM[] = [
  { version: 3, at: '2026-04-10T08:00:00.000Z', kind: 'corrected', fields: ['outcome'] },
  { version: 2, at: '2026-03-10T08:00:00.000Z', kind: 'edited', fields: [] },
  { version: 1, at: '2026-02-01T08:00:00.000Z', kind: 'published', fields: [] },
];

describe.each(['en', 'bn'] as const)('VersionList in %s', (locale) => {
  const t = testTranslator(locale);

  it('is closed by default and lists the versions in the order given, without text', () => {
    renderInLocale(locale, <VersionList versions={VERSIONS} />);
    const details = screen.getByTestId('version-list');
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByText(t('history.yourVersions'))).toBeInTheDocument();
    const items = within(details).getAllByRole('listitem', { hidden: true });
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(t('history.kind.corrected'));
    expect(items[0]).toHaveTextContent(t('history.field.outcome'));
    expect(items[1]).toHaveTextContent(t('history.kind.edited'));
    expect(items[2]).toHaveTextContent(t('history.kind.published'));
    expect(items[2]?.querySelector('time')).toHaveAttribute('dateTime', '2026-02');
  });

  it('uses the active language’s digits', () => {
    renderInLocale(locale, <VersionList versions={VERSIONS} />);
    const first = screen.getByTestId('version-list').querySelector('li');
    if (locale === 'bn') expect(first?.textContent).not.toMatch(/[0-9]/);
    else expect(first).toHaveTextContent('Version 3');
    expect(first).toHaveTextContent(locale === 'bn' ? '৩' : '3');
  });
});
