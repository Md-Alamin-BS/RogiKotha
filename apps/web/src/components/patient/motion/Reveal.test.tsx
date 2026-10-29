import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { screen } from '@testing-library/react';
import { Reveal } from './Reveal';
import {
  LOCALES,
  copy,
  givenInAppMotionOff,
  givenMotionReady,
  givenOsMotionPreference,
  inEffect,
  installMotionCss,
  renderInLocale,
  resetMotionEnvironment,
  startingValue,
  type Locale,
} from './motion-test-support';

const ITEM_KEYS = [
  'nav.discover',
  'nav.profile',
  'nav.facilities',
  'nav.condition',
  'nav.account',
  'nav.mine',
  'nav.emergency',
  'nav.about',
] as const;

function revealedList(locale: Locale, props: { as?: 'ul' | 'ol' | 'div' | 'section' } = {}) {
  const item = props.as === 'div' || props.as === 'section' ? 'p' : 'li';
  renderInLocale(
    locale,
    createElement(Reveal, {
      ...props,
      className: 'cards',
      children: ITEM_KEYS.map((key) => createElement(item, { key }, copy(locale, key))),
    }),
  );
  return screen.getByText(copy(locale, ITEM_KEYS[0])).parentElement as HTMLElement;
}

// The stagger is a multiple of --stagger: `var(--stagger)` is one step, `calc(var(--stagger) * 3)`
// is three, and no delay is zero steps.
function staggerSteps(delay: string | undefined): number {
  if (delay === undefined) return 0;
  if (delay === 'var(--stagger)') return 1;
  const steps = /^calc\(var\(--stagger\) \* (\d+)\)$/.exec(delay)?.[1];
  if (steps === undefined) throw new Error(`Not a stagger delay: ${delay}`);
  return Number(steps);
}

// Cold start of the first jsdom render under a loaded machine (ISS-296, ISS-297).
beforeAll(() => {
  renderInLocale('en', createElement(Reveal, null, createElement('li', null, 'warm-up'))).unmount();
});

beforeEach(installMotionCss);
afterEach(resetMotionEnvironment);

describe.each(LOCALES)('Reveal in %s', (locale) => {
  it('renders every item of a list of eight, in order', () => {
    const list = revealedList(locale);
    expect(Array.from(list.children).map((child) => child.textContent)).toEqual(
      ITEM_KEYS.map((key) => copy(locale, key)),
    );
  });

  it.each(['ul', 'ol', 'div', 'section'] as const)(
    'marks a %s as a reveal list and keeps its class',
    (as) => {
      const list = revealedList(locale, { as });
      expect(list.tagName.toLowerCase()).toBe(as);
      expect(list).toHaveAttribute('data-reveal-list');
      expect(list).toHaveClass('cards');
    },
  );

  it('puts no style attribute on the list or on any item', () => {
    const list = revealedList(locale);
    expect(list).not.toHaveAttribute('style');
    for (const child of Array.from(list.children)) expect(child).not.toHaveAttribute('style');
  });

  describe('once the page is ready for entry motion', () => {
    beforeEach(() => {
      givenOsMotionPreference('no-preference');
      givenMotionReady();
    });

    it('fades in and rises only the first six items', () => {
      const items = Array.from(revealedList(locale).children);
      expect(items.map((item) => inEffect(item, 'transition') !== undefined)).toEqual([
        true,
        true,
        true,
        true,
        true,
        true,
        false,
        false,
      ]);
      expect(items.map((item) => startingValue(item, 'opacity'))).toEqual([
        '0',
        '0',
        '0',
        '0',
        '0',
        '0',
        undefined,
        undefined,
      ]);
    });

    it('delays the first six items one stagger step apart and the rest not at all', () => {
      const items = Array.from(revealedList(locale).children);
      expect(items.map((item) => staggerSteps(inEffect(item, 'transition-delay')))).toEqual([
        0, 1, 2, 3, 4, 5, 0, 0,
      ]);
    });

    it('moves nothing but opacity and transform', () => {
      const [first] = Array.from(revealedList(locale).children);
      const transition = inEffect(first as Element, 'transition') ?? '';
      expect(transition.replace(/\s+/g, ' ')).toMatch(/^opacity [^,]+, transform [^,]+$/);
    });
  });

  describe('before the page is ready for entry motion', () => {
    it('animates nothing, so the first paint is still', () => {
      givenOsMotionPreference('no-preference');
      const items = Array.from(revealedList(locale).children);
      expect(items.map((item) => inEffect(item, 'transition'))).toEqual(Array(8).fill(undefined));
    });
  });

  describe('when the visitor asks for reduced motion', () => {
    it.each([
      ['in the operating system', () => givenOsMotionPreference('reduce')],
      [
        'with the in-app switch',
        () => {
          givenOsMotionPreference('no-preference');
          givenInAppMotionOff();
        },
      ],
    ])('animates nothing %s', (_where, setUp) => {
      givenMotionReady();
      setUp();
      const items = Array.from(revealedList(locale).children);
      expect(items.map((item) => inEffect(item, 'transition'))).toEqual(Array(8).fill(undefined));
      expect(items.map((item) => startingValue(item, 'opacity'))).toEqual(Array(8).fill(undefined));
    });
  });
});
