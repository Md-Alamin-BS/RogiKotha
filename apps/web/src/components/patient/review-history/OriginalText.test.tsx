import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';

import {
  renderInLocale,
  testTranslator,
} from '@/components/patient/experience/experience-test-support';
import { OriginalText } from './OriginalText';

describe.each(['en', 'bn'] as const)('OriginalText in %s', (locale) => {
  const t = testTranslator(locale);
  const other = locale === 'en' ? 'bn' : 'en';
  const english = 'An earlier synthetic story.';
  const bengali = 'আগের একটি কৃত্রিম গল্প।';

  it('is closed by default and holds the heading, title and story', () => {
    renderInLocale(
      locale,
      <OriginalText original={{ kind: 'quick', title: 'Earlier title', story: english }} />,
    );
    const details = screen.getByTestId('original-text');
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByText(t('history.showOriginal'))).toBeInTheDocument();
    expect(details).toHaveTextContent(t('history.originalHeading'));
    expect(details).toHaveTextContent('Earlier title');
    expect(details).toHaveTextContent(english);
  });

  it('shows the sections in order and only the values the snapshot holds', () => {
    renderInLocale(
      locale,
      <OriginalText
        original={{
          kind: 'detailed',
          title: 'T',
          sections: { after: 'After text.', symptoms: 'Symptom text.' },
        }}
      />,
    );
    const text = screen.getByTestId('original-text').textContent ?? '';
    expect(text.indexOf('Symptom text.')).toBeLessThan(text.indexOf('After text.'));
    expect(text).not.toContain(t('compose.diagnosis'));
    expect(text).not.toContain(t('label.notProvided'));
    expect(text).not.toContain(t('experience.sentimentLabel'));
    expect(text).not.toContain(t('experience.outcomeLabel'));
  });

  it('shows sentiment, outcome and claims as the reviewer’s label', () => {
    renderInLocale(
      locale,
      <OriginalText
        original={{
          kind: 'quick',
          title: 'T',
          story: english,
          sentiment: 'mixed',
          outcome: 'helped',
          claims: ['wrongRx', 'A stored free label'],
        }}
      />,
    );
    const details = screen.getByTestId('original-text');
    expect(details).toHaveTextContent(t('sentiment.mixed'));
    expect(details).toHaveTextContent(t('outcome.helped'));
    expect(details).toHaveTextContent(t('claim.wrongRx'));
    expect(details).toHaveTextContent('A stored free label');
    expect(screen.getAllByText(t('label.reviewerLabel'))).toHaveLength(2);
  });

  it('marks the text with lang only when its language differs from the page', () => {
    const { unmount } = renderInLocale(
      locale,
      <OriginalText original={{ kind: 'quick', title: 'T', story: bengali }} />,
    );
    // A Latin title with a Bengali story is a mixed text and keeps the page language.
    expect(screen.getByTestId('original-text').querySelector('[lang]')).toBeNull();
    unmount();

    renderInLocale(
      locale,
      <OriginalText
        original={{
          kind: 'quick',
          title: other === 'bn' ? 'শিরোনাম' : 'Title',
          story: other === 'bn' ? bengali : english,
        }}
      />,
    );
    expect(screen.getByTestId('original-text').querySelector('[lang]')).toHaveAttribute(
      'lang',
      other,
    );
  });

  it('applies no capital-letter transform to its text', () => {
    renderInLocale(
      locale,
      <OriginalText original={{ kind: 'quick', title: 'T', story: english }} />,
    );
    expect(screen.getByTestId('original-text').outerHTML).not.toMatch(/text-transform/);
  });
});
