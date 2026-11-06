import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import {
  EMERGENCY_CONFIG,
  aConditionPage,
  renderInLocale,
} from '@/components/patient/doctors/directory-test-support';
import { ConditionPage } from './ConditionPage';
import { FreqList } from './FreqList';
import { TopicIndex } from './TopicIndex';

vi.mock('@/i18n/routing', async () => ({
  Link: (await import('../shared/link-test-support')).PlainLink,
}));

describe('TopicIndex', () => {
  it('lists every topic, a topic nobody wrote about with the empty text', () => {
    const cards = [
      { publicId: 'c000000001', name: 'Asthma', accountsTotal: 3 },
      { publicId: 'c000000002', name: 'Thyroid disease', accountsTotal: 0 },
    ];
    renderInLocale('en', <TopicIndex cards={cards} total={2} />);
    const items = screen.getAllByTestId('browse-card');
    expect(items.map((i) => i.querySelector('b')?.textContent)).toEqual([
      'Asthma',
      'Thyroid disease',
    ]);
    expect(items[0]).toHaveTextContent('3 patient experiences');
    expect(items[1]).toHaveTextContent('No one has written about this yet.');
    expect(items[1]).toHaveAttribute('href', '/topics/c000000002');
  });

  it('renders an empty directory with a zero count and no cards, in Bengali', () => {
    renderInLocale('bn', <TopicIndex cards={[]} total={0} />);
    expect(screen.queryByTestId('browse-card')).toBeNull();
    expect(screen.getByTestId('topic-index-count')).toHaveTextContent('০টি স্বাস্থ্য বিষয়');
  });
});

describe('ConditionPage', () => {
  it('shows the counts line, specialties, places, distributions and the compact emergency panel', () => {
    renderInLocale(
      'en',
      <ConditionPage vm={aConditionPage()} threshold={5} emergency={EMERGENCY_CONFIG} />,
    );
    expect(screen.getByTestId('condition-counts')).toHaveTextContent(
      '4 patient experiences about 2 doctors',
    );
    expect(screen.getByTestId('condition-specialties')).toHaveTextContent('Endocrinology (3)');
    expect(screen.getByTestId('condition-limited')).toHaveTextContent('Limited data');
    expect(screen.getByTestId('condition-aliases')).toHaveTextContent('Also written as: sugar');
    const panel = screen.getByTestId('emergency-panel');
    expect(panel).toHaveAttribute('data-static', 'emergency');
    expect(panel).toHaveTextContent('Call 999 for an ambulance. For health guidance, call 16263.');
    expect(screen.getByTestId('condition-doctors')).toHaveTextContent('Dr. Synthetic Rahman');
    expect(document.body.textContent).not.toContain('%');
  });

  it('orders places by count and reads "Not provided" for a missing hospital', () => {
    renderInLocale(
      'en',
      <ConditionPage vm={aConditionPage()} threshold={5} emergency={EMERGENCY_CONFIG} />,
    );
    const rows = screen.getAllByTestId('place-row');
    expect(rows[0]).toHaveTextContent('Not provided');
    expect(rows[0]).toHaveTextContent('Mirpur, Dhaka');
    expect(rows[1]).toHaveTextContent('Synthetic General Hospital');
    expect(screen.getByTestId('places-panel')).toHaveTextContent('Counted from 4 experiences');
  });

  it('leaves out the places panel and an empty mention list', () => {
    renderInLocale(
      'en',
      <ConditionPage
        vm={aConditionPage({ places: [], treatments: [] })}
        threshold={5}
        emergency={EMERGENCY_CONFIG}
      />,
    );
    expect(screen.queryByTestId('places-panel')).toBeNull();
    expect(screen.queryByTestId('freq-treatments')).toBeNull();
    expect(screen.getByTestId('freq-medicines')).toBeInTheDocument();
  });

  it('marks a provisional term and shows the empty state for a topic nobody wrote about', () => {
    renderInLocale(
      'en',
      <ConditionPage
        vm={aConditionPage({ provisional: true, accountsTotal: 0, accounts: [] })}
        threshold={5}
        emergency={EMERGENCY_CONFIG}
      />,
    );
    expect(screen.getByTestId('condition-provisional')).toHaveTextContent(
      'Submitted wording, not yet mapped',
    );
    expect(screen.getByTestId('condition-counts')).toHaveTextContent(
      'No one has written about this yet.',
    );
    expect(screen.getByText('Be the first to write about it')).toBeInTheDocument();
  });

  it('names the configured numbers in Bengali numerals', () => {
    renderInLocale(
      'bn',
      <ConditionPage vm={aConditionPage()} threshold={5} emergency={EMERGENCY_CONFIG} />,
    );
    expect(screen.getByTestId('emergency-panel')).toHaveTextContent('৯৯৯');
    expect(screen.getByTestId('emergency-panel')).toHaveTextContent('১৬২৬৩');
    expect(screen.getByTestId('condition-counts')).toHaveTextContent('৪টি রোগীর অভিজ্ঞতা');
  });
});

describe('FreqList', () => {
  it('sorts by count, draws the first bar full width and prints exact counts', () => {
    renderInLocale(
      'en',
      <FreqList
        title="Medicines people mentioned"
        items={[
          { label: 'Metformin', count: 2 },
          { label: 'Insulin', count: 4 },
        ]}
        total={4}
      />,
    );
    const rows = screen.getAllByTestId('freq-row');
    expect(rows.map((r) => within(r).getByText(/\d/).textContent)).toEqual(['4', '2']);
    const bars = screen.getAllByTestId('freq-bar');
    expect(bars[0]!.style.getPropertyValue('--w')).toBe('1');
    expect(bars[1]!.style.getPropertyValue('--w')).toBe('0.5');
  });

  it('renders nothing when nothing was mentioned', () => {
    const { container } = renderInLocale('en', <FreqList title="x" items={[]} total={0} />);
    expect(container.querySelector('.freq-list')).toBeNull();
  });
});
