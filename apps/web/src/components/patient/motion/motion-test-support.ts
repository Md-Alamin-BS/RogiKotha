import { createElement, type ReactElement } from 'react';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';

export const LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof LOCALES)[number];

const require = createRequire(import.meta.url);
const i18nPackageRoot = path.resolve(path.dirname(require.resolve('@rogikotha/i18n')), '..');
const motionCssFile = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../styles/motion.css',
);

export function loadMessages(locale: Locale): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

export function copy(locale: Locale, key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      loadMessages(locale),
    );
  if (typeof value !== 'string') throw new Error(`No message ${key} in ${locale}`);
  return value;
}

export function inLocale(locale: Locale, ui: ReactElement): ReactElement {
  return createElement(NextIntlClientProvider, {
    locale,
    messages: loadMessages(locale),
    children: ui,
  });
}

export function renderInLocale(locale: Locale, ui: ReactElement) {
  const result = render(inLocale(locale, ui));
  return {
    ...result,
    rerenderInLocale: (nextLocale: Locale, nextUi: ReactElement) => {
      result.rerender(inLocale(nextLocale, nextUi));
    },
  };
}

// The visitor's operating-system setting. jsdom has no `matchMedia`, so a test that cares which
// `@media (prefers-reduced-motion: …)` block applies installs this stand-in first.
export function givenOsMotionPreference(preference: 'reduce' | 'no-preference'): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes(`prefers-reduced-motion: ${preference}`),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

// What the visitor can switch in the app: the motion-ready mark `RouteTransition` sets after the
// first paint, and the in-app motion switch `<html data-motion="reduced">`.
export function givenMotionReady(): void {
  document.documentElement.dataset.motionReady = '';
}

export function givenInAppMotionOff(): void {
  document.documentElement.dataset.motion = 'reduced';
}

export function resetMotionEnvironment(): void {
  delete document.documentElement.dataset.motionReady;
  delete document.documentElement.dataset.motion;
  document.head.querySelector('style[data-motion-css]')?.remove();
  Reflect.deleteProperty(window, 'matchMedia');
}

export function installMotionCss(): void {
  const style = document.createElement('style');
  style.dataset.motionCss = '';
  style.textContent = fs.readFileSync(motionCssFile, 'utf8');
  document.head.appendChild(style);
}

type Declaration = { value: string; startingStyle: boolean };

function* styleRules(
  rules: CSSRuleList,
  startingStyle: boolean,
): Generator<{ rule: CSSStyleRule; startingStyle: boolean }> {
  for (const rule of Array.from(rules)) {
    if ('selectorText' in rule) {
      yield { rule: rule as CSSStyleRule, startingStyle };
    } else if ('media' in rule) {
      const media = rule as CSSMediaRule;
      if (window.matchMedia(media.media.mediaText).matches) {
        yield* styleRules(media.cssRules, startingStyle);
      }
    } else if (rule.constructor.name === 'CSSStartingStyleRule') {
      yield* styleRules((rule as CSSGroupingRule).cssRules, true);
    }
    // `@supports` blocks hold only the scroll-driven bar and home reveal, which no test here reads.
  }
}

function matches(element: Element, selector: string): boolean {
  try {
    return element.matches(selector);
  } catch {
    // Pseudo-element selectors (view transitions) are not selectable in jsdom.
    return false;
  }
}

// The declarations of `property` in motion.css that apply to this element right now, in source
// order, honouring the OS preference (`matchMedia`), the motion-ready mark and the in-app switch
// the way a browser does. jsdom's `getComputedStyle` does not resolve `transition` or `animation`,
// so the cascade is read from the sheet; specificity is not modelled, so a test reads a property
// that a single rule, or the last of several, sets.
export function declarationsFor(element: Element, property: string): Declaration[] {
  const sheet = document.head.querySelector<HTMLStyleElement>('style[data-motion-css]')?.sheet;
  if (!sheet) throw new Error('installMotionCss() was not called');
  const pattern = new RegExp(String.raw`(?:^|[;{\s])${property}\s*:\s*([^;}]+)`);
  const found: Declaration[] = [];
  for (const { rule, startingStyle } of styleRules(sheet.cssRules, false)) {
    if (!matches(element, rule.selectorText)) continue;
    const value = pattern.exec(rule.cssText)?.[1];
    if (value !== undefined) found.push({ value: value.trim(), startingStyle });
  }
  return found;
}

export function inEffect(element: Element, property: string): string | undefined {
  return declarationsFor(element, property)
    .filter((declaration) => !declaration.startingStyle)
    .at(-1)?.value;
}

export function startingValue(element: Element, property: string): string | undefined {
  return declarationsFor(element, property)
    .filter((declaration) => declaration.startingStyle)
    .at(-1)?.value;
}
