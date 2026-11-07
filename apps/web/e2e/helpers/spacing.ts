import { expect, type Page } from '@playwright/test';

import { overflowFindings } from './page-check';

// BR3.8: WCAG 1.4.12 text spacing, applied to every document the page loads, and the two reflow
// checks that must still hold: no horizontal scroll and no text clipped by an overflow:hidden box.

export const TEXT_SPACING_CSS = [
  '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }',
  'p { margin-bottom: 2em !important; }',
].join('\n');

/** Adds the spacing rules to this document and to every document the page loads later. */
export async function applyTextSpacing(page: Page): Promise<void> {
  await page.addInitScript((css) => {
    const add = () => {
      const style = document.createElement('style');
      style.setAttribute('data-e2e', 'text-spacing');
      style.textContent = css;
      document.head.append(style);
    };
    if (document.head) add();
    else document.addEventListener('DOMContentLoaded', add, { once: true });
  }, TEXT_SPACING_CSS);
}

/** Elements with overflow hidden whose content is wider than the box by more than 1 px. */
export async function clippedElements(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const found: string[] = [];
    for (const element of document.body.querySelectorAll('*')) {
      const style = getComputedStyle(element);
      const hides = style.overflowX === 'hidden' || style.overflowX === 'clip';
      if (!hides) continue;
      // A one-pixel visually-hidden box (screen-reader text) clips by design.
      if (element.clientWidth <= 1) continue;
      // ASSUMPTION(U50): a text field scrolls its own value under the caret, which is the
      // browser's native behaviour, not clipped content (ISS-775).
      if (element.matches('input, textarea, select')) continue;
      if (element.scrollWidth > element.clientWidth + 1) {
        const id = element.id ? `#${element.id}` : '';
        const classes = [...element.classList].map((name) => `.${name}`).join('');
        found.push(
          `${element.tagName.toLowerCase()}${id}${classes} ${element.scrollWidth} > ${element.clientWidth}`,
        );
      }
    }
    return found.slice(0, 20);
  });
}

export async function expectReflow(page: Page, label: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  expect(await overflowFindings(page), `horizontal scroll or overflow on ${label}`).toEqual([]);
  expect(await clippedElements(page), `clipped text on ${label}`).toEqual([]);
}
