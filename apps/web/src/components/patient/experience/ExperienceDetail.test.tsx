import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';

import { ExperienceDetail } from './ExperienceDetail';
import {
  buildReviewDetail,
  renderInLocale,
  testTranslator,
  type TestLocale,
} from './experience-test-support';

vi.mock('@/i18n/routing', async () => {
  const support = await import('./experience-test-support');
  return { Link: support.TestLink };
});

function renderDetail(locale: TestLocale, review = buildReviewDetail(), authorTools?: string) {
  return renderInLocale(
    locale,
    <ExperienceDetail
      review={review}
      evidence={<p>evidence slot</p>}
      authorTools={authorTools ? <p>{authorTools}</p> : null}
      discussion={<p>discussion slot</p>}
    />,
  );
}

describe.each(['en', 'bn'] as const)('the experience detail in %s', (locale) => {
  const t = testTranslator(locale);

  it('shows the title, the author, the doctor link and the unverified registration', () => {
    renderDetail(locale);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Clear advice after a long wait',
    );
    expect(screen.getAllByText('Rina Akter')[0]).toBeInTheDocument();
    const doctorLinks = screen.getAllByRole('link', { name: 'Dr. Nasrin Synthetic' });
    expect(doctorLinks[0]).toHaveAttribute('href', '/doctors/dcr0000001');
    expect(screen.getAllByText(t('label.notVerified'), { exact: false }).length).toBeGreaterThan(0);
  });

  it('shows the treatment month and year with numerals of the active language', () => {
    renderDetail(locale);
    const period = locale === 'bn' ? 'মার্চ ২০২৬' : 'March 2026';
    expect(screen.getAllByText(period, { exact: false }).length).toBeGreaterThan(0);
  });

  it('shows the relationship, the body paragraphs and the sentiment and outcome labels', () => {
    const { container } = renderDetail(locale);

    expect(screen.getAllByText(t('rel.parent')).length).toBeGreaterThan(0);
    const story = Array.from(container.querySelectorAll('p.story')).map((p) => p.textContent);
    expect(story).toEqual([
      'The doctor listened to every symptom.',
      'She explained the tests in plain words.',
    ]);
    expect(screen.getAllByText(t('sentiment.positive')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(t('outcome.helped')).length).toBeGreaterThan(0);
  });

  it('says "Not provided" for a missing sentiment, outcome and body', () => {
    const { container } = renderDetail(
      locale,
      buildReviewDetail({ sentiment: null, outcome: null, body: null }),
    );
    const margin = container.querySelector('aside.a-margin') as HTMLElement;
    expect(within(margin).getAllByText(t('label.notProvided'))).toHaveLength(2);
    expect(container.querySelector('p.story')).toHaveTextContent(t('label.notProvided'));
  });

  it('marks the experience edited only once its version is above 1', () => {
    renderDetail(locale);
    expect(screen.queryByText(t('label.edited'))).toBeNull();

    renderDetail(locale, buildReviewDetail({ version: 2, edited: true }));
    expect(screen.getByText(t('label.edited'))).toBeInTheDocument();
  });

  it('never shows the name of an anonymous author', () => {
    renderDetail(locale, buildReviewDetail({ identityMode: 'anonymous' }));
    expect(screen.queryByText('Rina Akter')).toBeNull();
    expect(screen.getByText(t('byline.anonSentence'))).toBeInTheDocument();
  });

  it('says "No documents" until a file is ready, then shows the evidence note', () => {
    renderDetail(locale);
    expect(screen.getByText(t('label.noDocuments'))).toBeInTheDocument();
    expect(screen.queryByText('evidence slot')).toBeNull();

    renderDetail(locale, buildReviewDetail({ readyEvidenceCount: 2 }));
    expect(screen.getByText('evidence slot')).toBeInTheDocument();
  });

  it('places the author tools and the discussion it is given', () => {
    renderDetail(locale, buildReviewDetail(), 'author tools slot');
    expect(screen.getByText('author tools slot')).toBeInTheDocument();
    expect(screen.getByText('discussion slot')).toBeInTheDocument();
  });

  it('keeps the medical disclaimer on the page', () => {
    renderDetail(locale);
    expect(screen.getByText(t('disclaimer.long'))).toBeInTheDocument();
  });
});
