import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import {
  QUALITY_SCORE_PATTERN,
  buildTopicDetail,
  buildTopicRow,
  loadMessages,
  renderInLocale,
} from '@/components/patient/doctors/directory-test-support';
import { TopicList } from './TopicList';
import { TopicProfile } from './TopicProfile';

vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function message(locale: 'en' | 'bn', key: string): string {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      loadMessages(locale),
    ) as string;
}

describe('TopicList', () => {
  it('lists every topic, including one nobody has written about, linked to its page', () => {
    const busy = buildTopicRow({ name: 'Asthma', experienceCount: 4 });
    const empty = buildTopicRow({ name: 'Eczema', experienceCount: 0 });
    renderInLocale('en', <TopicList topics={[busy, empty]} />);

    const cards = screen.getAllByTestId('topic-card');
    expect(cards[0]).toHaveAttribute('href', `/topics/${busy.publicId}`);
    expect(cards[0]).toHaveTextContent('4 patient experiences');
    expect(cards[1]).toHaveTextContent(message('en', 'index.emptyTopic'));
    expect(cards[1]).not.toHaveTextContent('0');
  });

  it('renders in Bengali with Bengali numerals', () => {
    renderInLocale('bn', <TopicList topics={[buildTopicRow({ experienceCount: 2 })]} />);
    expect(screen.getByTestId('topic-card')).toHaveTextContent('২টি রোগীর অভিজ্ঞতা');
  });
});

describe.each(['en', 'bn'] as const)('TopicProfile in %s', (locale) => {
  it('shows the other wordings, the tagged experiences and the doctors people wrote about', () => {
    const topic = buildTopicDetail({ name: 'Type 2 diabetes' });
    renderInLocale(locale, <TopicProfile topic={topic} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Type 2 diabetes' })).toBeVisible();
    expect(screen.getByTestId('topic-aliases')).toHaveTextContent('sugar, চিনি রোগ');
    expect(screen.getByText(topic.experiences[0]!.title)).toBeVisible();
    expect(
      within(screen.getByTestId('topic-doctors')).getByText(topic.doctors[0]!.name),
    ).toBeVisible();
    expect(screen.getByText(message(locale, 'condition.mentionNote'))).toBeVisible();
    expect(document.body.textContent).not.toMatch(QUALITY_SCORE_PATTERN);
  });

  it('invites the first experience when nobody has written about the topic', () => {
    renderInLocale(
      locale,
      <TopicProfile
        topic={buildTopicDetail({ experiences: [], doctors: [], experienceCount: 0 })}
      />,
    );
    expect(screen.getByText(message(locale, 'index.emptyTopic'))).toBeVisible();
    expect(screen.getByRole('link', { name: message(locale, 'index.beFirst') })).toHaveAttribute(
      'href',
      '/write',
    );
    expect(screen.queryByTestId('topic-doctors')).toBeNull();
  });
});
