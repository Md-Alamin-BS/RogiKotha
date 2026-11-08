import { expect, type Locator, type Page } from '@playwright/test';

// BR3.3: keyboard-only helpers. After the first `page.goto` a test reaches every control with Tab
// or Shift+Tab, acts with Enter, Space, arrows or typing, and checks the focus ring at every stop.

export interface FocusStop {
  target: string;
  focusVisible: boolean;
  outlineStyle: string;
  boxShadow: string;
  /**
   * Focus sits on a date field's own calendar button inside the browser's shadow tree: the host
   * then matches no `:focus`, and the browser draws that button's ring itself (ISS-776).
   */
  nativePicker?: boolean;
}

export const MAX_TAB_STOPS = 200;

/** What a stop looks like when the focus ring cannot be seen; null when it can. */
export function focusProblem(stop: FocusStop): string | null {
  if (stop.nativePicker === true) return null;
  if (!stop.focusVisible) return `${stop.target} is focused without :focus-visible`;
  if (stop.outlineStyle === 'none' && stop.boxShadow === 'none') {
    return `${stop.target} has no outline and no box-shadow`;
  }
  return null;
}

export async function readFocus(page: Page): Promise<FocusStop | null> {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body || element === document.documentElement) return null;
    const style = getComputedStyle(element);
    const id = element.id ? `#${element.id}` : '';
    const testId = element.getAttribute('data-testid');
    return {
      target: `${element.tagName.toLowerCase()}${id}${testId ? `[data-testid=${testId}]` : ''}`,
      focusVisible: element.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      boxShadow: style.boxShadow,
      nativePicker:
        element.matches('input:is([type="date"], [type="month"], [type="time"], [type="week"])') &&
        !element.matches(':focus'),
    };
  });
}

/** Visible focus at the current stop; a stop on the document itself (nothing focused) passes. */
export async function expectVisibleFocus(page: Page, label: string): Promise<void> {
  const stop = await readFocus(page);
  if (stop === null) return;
  expect(focusProblem(stop), `visible focus: ${label}`).toBeNull();
}

type Direction = 'here' | 'forward' | 'backward';

async function directionTo(target: Locator): Promise<Direction> {
  return target.first().evaluate((node): Direction => {
    const active = document.activeElement;
    if (active === node) return 'here';
    if (!active || active === document.body) return 'forward';
    return active.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING
      ? 'backward'
      : 'forward';
  });
}

/**
 * Presses Tab (or Shift+Tab when the target comes earlier in the document) until the target has
 * focus, checking the focus ring at every stop. Fails when the target is not reachable.
 */
export async function tabTo(page: Page, target: Locator, label: string): Promise<void> {
  for (let stops = 0; stops <= MAX_TAB_STOPS; stops += 1) {
    const direction = await directionTo(target);
    if (direction === 'here') return;
    await page.keyboard.press(direction === 'forward' ? 'Tab' : 'Shift+Tab');
    await expectVisibleFocus(page, `${label} (stop ${stops + 1})`);
  }
  throw new Error(`${label} is not reachable with Tab within ${MAX_TAB_STOPS} stops`);
}

/** Tab to a control and press Enter. */
export async function activate(page: Page, target: Locator, label: string): Promise<void> {
  await tabTo(page, target, label);
  await page.keyboard.press('Enter');
}

/** Tab to a field and type; the value is then read back. */
export async function typeInto(
  page: Page,
  target: Locator,
  text: string,
  label: string,
): Promise<void> {
  await tabTo(page, target, label);
  await page.keyboard.type(text);
  await expect(target, `${label} holds what was typed`).toHaveValue(text);
}

/** Tab to a checkbox and press Space. */
export async function checkWithSpace(page: Page, target: Locator, label: string): Promise<void> {
  await tabTo(page, target, label);
  await page.keyboard.press('Space');
  await expect(target, `${label} is checked`).toBeChecked();
}

/** Tab to a native select and move with ArrowDown until the option with that text is selected. */
export async function chooseWithArrows(
  page: Page,
  select: Locator,
  optionText: string,
  label: string,
): Promise<void> {
  await tabTo(page, select, label);
  const options = await select.locator('option').count();
  for (let moved = 0; moved <= options; moved += 1) {
    const selected = await select.evaluate((node) => {
      const field = node as HTMLSelectElement;
      return field.selectedOptions[0]?.textContent ?? '';
    });
    if (selected.includes(optionText)) return;
    await page.keyboard.press('ArrowDown');
  }
  throw new Error(`${label} has no option "${optionText}"`);
}
