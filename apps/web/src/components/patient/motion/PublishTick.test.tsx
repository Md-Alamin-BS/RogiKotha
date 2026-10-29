import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { screen } from '@testing-library/react';
import { PublishTick } from './PublishTick';
import {
  LOCALES,
  copy,
  declarationsFor,
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

function renderedTick(locale: Locale) {
  const note = copy(locale, 'compose.publishedNote');
  renderInLocale(locale, createElement(PublishTick, null, note));
  const tick = screen.getByText(note);
  const arms = Array.from(tick.querySelectorAll('svg path'));
  return { note, tick, arms };
}

// The space-separated parts of a transition value that sit outside any parentheses: property,
// duration, easing and, when there is one, delay.
function topLevelParts(transition: string | undefined): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of transition ?? '') {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ' ' && depth === 0) {
      if (current) parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);
  return parts;
}

// Cold start of the first jsdom render under a loaded machine (ISS-296, ISS-297).
beforeAll(() => {
  renderInLocale('en', createElement(PublishTick, null, 'warm-up')).unmount();
});

beforeEach(installMotionCss);
afterEach(resetMotionEnvironment);

describe.each(LOCALES)('PublishTick in %s', (locale) => {
  it("shows the caller's confirmation as plain text beside the tick", () => {
    const { note, tick } = renderedTick(locale);
    expect(tick).toHaveTextContent(note);
    expect(tick.querySelector('svg')?.textContent).toBe('');
  });

  it('hides the tick drawing from assistive technology and from the tab order', () => {
    const { tick } = renderedTick(locale);
    const drawing = tick.querySelector('svg');
    expect(drawing).toHaveAttribute('aria-hidden', 'true');
    expect(drawing).toHaveAttribute('focusable', 'false');
  });

  it('adds no live region of its own and no role', () => {
    const { tick } = renderedTick(locale);
    expect(tick.querySelector('[aria-live], [role]')).toBeNull();
    expect(tick).not.toHaveAttribute('aria-live');
    expect(tick).not.toHaveAttribute('role');
  });

  it('draws the tick with two arms', () => {
    expect(renderedTick(locale).arms).toHaveLength(2);
  });

  describe('once the page is ready for entry motion', () => {
    beforeEach(() => {
      givenOsMotionPreference('no-preference');
      givenMotionReady();
    });

    it('draws each arm by a transform transition from outside its window', () => {
      for (const arm of renderedTick(locale).arms) {
        expect(topLevelParts(inEffect(arm, 'transition'))[0]).toBe('transform');
        expect(startingValue(arm, 'transform')).toBe('translateX(-100%)');
      }
    });

    it('starts the long arm after the short arm, which starts at once', () => {
      const [short, long] = renderedTick(locale).arms as [Element, Element];
      expect(topLevelParts(inEffect(short, 'transition'))).toHaveLength(3);
      expect(topLevelParts(inEffect(long, 'transition'))).toHaveLength(4);
    });

    it('never uses a keyframe animation, so a tick already on the page cannot replay', () => {
      for (const arm of renderedTick(locale).arms) {
        expect(declarationsFor(arm, 'animation')).toEqual([]);
        expect(declarationsFor(arm, 'animation-name')).toEqual([]);
      }
    });
  });

  describe('before the page is ready for entry motion', () => {
    it('applies no motion to the tick, so one present at first paint is shown complete', () => {
      givenOsMotionPreference('no-preference');
      for (const arm of renderedTick(locale).arms) {
        expect(declarationsFor(arm, 'transition')).toEqual([]);
        expect(declarationsFor(arm, 'transform')).toEqual([]);
        expect(declarationsFor(arm, 'animation')).toEqual([]);
      }
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
    ])('shows the complete tick at once %s', (_where, setUp) => {
      givenMotionReady();
      setUp();
      for (const arm of renderedTick(locale).arms) {
        expect(declarationsFor(arm, 'transition')).toEqual([]);
        expect(declarationsFor(arm, 'transform')).toEqual([]);
      }
    });
  });
});
