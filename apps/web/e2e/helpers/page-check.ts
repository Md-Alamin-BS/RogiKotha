import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page, type Response } from '@playwright/test';

import { expectNoSeriousViolations } from './axe';
import { logsDir } from './env';
import { expectLocale, type Locale } from './locale';
import { allMessages, msg } from './messages';
import { expectNeverAnimated, expectReducedMotionOnly } from './motion';

// BR2.5, BR2.8, BR3.5, BR3.6, BR4.3: what every walked page asserts, whatever the journey.
// Page-specific hard rules (n of m, Limited data, Not provided, the evidence wording...) stay in
// the journey rows of functional-spec.md WF2; their names are passed in `rules` and recorded.

export interface PageCheckOptions {
  /** The document response of the navigation; without it the page is fetched once more for CSP. */
  response?: Response | null;
  /** The page carries the persistent medical-advice disclaimer (WF2 rows). */
  disclaimer?: boolean;
  /** The page carries the emergency guidance. */
  emergency?: boolean;
  /** The hard rules the journey row asserts on this page, recorded with the check (PageCheck). */
  rules?: string[];
  /** Defaults to true; false only when the caller runs axe itself right after. */
  axe?: boolean;
  label?: string;
}

/** BR3.6: overflow is asserted at the phone width only. */
export const PHONE_WIDTH = 360;

// ASSUMPTION(U50): the cards and headers BR2.5 (c) to (e) inspect, and the user-written content
// (a) leaves out, by the test ids on main; a journey that finds another container adds it (ISS-752).
export const RATED_SCOPES = [
  '[data-testid="doctor-entry"]',
  '[data-testid="facility-entry"]',
  '[data-testid="profile-head"]',
  '[data-testid="profile-hero"]',
  '[data-testid="facility-hero"]',
  '[data-testid="experience-page"] header',
  '[data-testid="experience-entry"]',
  '[data-testid="profile-review"]',
].join(', ');

export const USER_CONTENT = [
  '[data-testid="experience-story"]',
  '[data-testid="experience-sections"]',
  '[data-testid="preview-body"]',
  'article.comment',
  'textarea',
  'input',
].join(', ');

export const NAME_SCOPES = ['[data-testid="doctor-entry"]', '[data-testid="profile-head"]'].join(
  ', ',
);

const RATING_KEY = /rating|rated|highest|score/i;

/** Labels a rating sort or filter would carry: every message whose key path names one. */
export function ratingOptionLabels(locale: Locale): string[] {
  return allMessages(locale)
    .filter(([key]) => RATING_KEY.test(key))
    .map(([, value]) => value.trim())
    .filter((value) => value.length > 0);
}

export interface NoRatingFindings {
  stars: string[];
  starImages: string[];
  ratingOptions: string[];
  meters: string[];
  ratingAttributes: string[];
  scoreText: string[];
}

/** BR2.5 (a) to (e), by structure, never by words. */
export async function noRatingFindings(page: Page, locale: Locale): Promise<NoRatingFindings> {
  return page.evaluate(
    ({ ratedScopes, userContent, nameScopes, labels }) => {
      const describe = (element: Element) => {
        const id = element.id ? `#${element.id}` : '';
        const testId = element.getAttribute('data-testid');
        return `${element.tagName.toLowerCase()}${id}${testId ? `[data-testid=${testId}]` : ''}`;
      };
      const latin = (text: string) =>
        text.replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)));

      const stars: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (!parent || parent.closest(userContent) || parent.closest('script, style')) continue;
        if (/[★☆⭐✭]/u.test(node.textContent ?? '')) stars.push(describe(parent));
      }

      const starImages = [...document.querySelectorAll('[role="img"], img, svg')]
        .filter((element) => {
          const name = `${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('alt') ?? ''}`;
          return /\d\s*(star|★)|of\s*5\b/i.test(latin(name));
        })
        .map(describe);

      const optionSelector =
        'select option, [role="option"], input[type="radio"], [role="menuitem"], [role="menuitemradio"]';
      const ratingOptions = [...document.querySelectorAll(optionSelector)]
        .filter((element) => {
          const value = element.getAttribute('value') ?? '';
          const label = (element.textContent ?? element.getAttribute('aria-label') ?? '').trim();
          return /rating|rated|highest|score/i.test(value) || labels.includes(label);
        })
        .map((element) => `${describe(element)} "${element.textContent?.trim() ?? ''}"`);

      const scopes = [...document.querySelectorAll(ratedScopes)];
      const meters = scopes.flatMap((scope) =>
        [
          ...scope.querySelectorAll(
            '[role="slider"], [role="meter"], [role="progressbar"], meter, progress',
          ),
        ]
          .filter(
            (element) =>
              element.hasAttribute('aria-valuenow') ||
              element.tagName === 'METER' ||
              element.tagName === 'PROGRESS',
          )
          .map(describe),
      );

      const ratingAttributes = scopes.flatMap((scope) =>
        [scope, ...scope.querySelectorAll('*')]
          .filter((element) =>
            [...element.attributes].some(
              (attribute) =>
                (attribute.name === 'class' ||
                  attribute.name === 'id' ||
                  attribute.name.startsWith('data-')) &&
                /rating|score/i.test(attribute.value),
            ),
          )
          .map(describe),
      );

      const scoreText: string[] = [];
      for (const scope of document.querySelectorAll(nameScopes)) {
        const text = latin(scope.textContent ?? '');
        const pattern = /(^|[^\d])(\d+(\.\d+)?\s*\/\s*(5|10))(?!\d)|(^|\s)(\d\.\d)(\s|$)/;
        const found = pattern.exec(text);
        if (found) scoreText.push(`${describe(scope)} "${found[0].trim()}"`);
        // A bare number right beside the name heading or link reads as a score.
        const name = scope.querySelector('h1, h2, h3, [data-testid="doctor-link"]');
        for (const sibling of [name?.previousElementSibling, name?.nextElementSibling]) {
          if (sibling && /^\s*\d+(\.\d+)?\s*$/.test(latin(sibling.textContent ?? ''))) {
            scoreText.push(`${describe(sibling)} "${sibling.textContent?.trim() ?? ''}"`);
          }
        }
      }

      return { stars, starImages, ratingOptions, meters, ratingAttributes, scoreText };
    },
    {
      ratedScopes: RATED_SCOPES,
      userContent: USER_CONTENT,
      nameScopes: NAME_SCOPES,
      labels: ratingOptionLabels(locale),
    },
  );
}

export const NO_RATING: NoRatingFindings = {
  stars: [],
  starImages: [],
  ratingOptions: [],
  meters: [],
  ratingAttributes: [],
  scoreText: [],
};

/** BR3.6: horizontal overflow at 360 px, after the web fonts have loaded. */
export async function overflowFindings(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const root = document.documentElement;
    const found: string[] = [];
    if (root.scrollWidth > root.clientWidth) {
      found.push(`document ${root.scrollWidth} > ${root.clientWidth}`);
    }
    const scrollsByDesign = (element: Node) => {
      for (let node = element.parentElement; node; node = node.parentElement) {
        const overflow = getComputedStyle(node).overflowX;
        if (overflow === 'auto' || overflow === 'scroll') return true;
      }
      return false;
    };
    for (const element of document.body.querySelectorAll('*')) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (getComputedStyle(element).visibility === 'hidden') continue;
      // A mobile layout viewport widens to the content, so the edge is the root's client width.
      if (box.right > root.clientWidth + 1 && !scrollsByDesign(element)) {
        const id = element.id ? `#${element.id}` : '';
        found.push(`${element.tagName.toLowerCase()}${id} right ${Math.round(box.right)}`);
      }
    }
    // A clipping box (the sr-only pattern among others) keeps its overflow off the page; the
    // body's own overflow-x is the viewport's, so the walk stops below it.
    const clipped = (node: Node) => {
      for (let el = node.parentElement; el && el !== document.body; el = el.parentElement) {
        const overflow = getComputedStyle(el).overflowX;
        if (overflow === 'hidden' || overflow === 'clip') return true;
      }
      return false;
    };
    // Text that spills out of a box that itself fits widens the document but no element rect.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || !node.textContent?.trim()) continue;
      if (getComputedStyle(parent).visibility === 'hidden' || scrollsByDesign(node)) {
        continue;
      }
      if (clipped(node)) continue;
      range.selectNodeContents(node);
      const box = range.getBoundingClientRect();
      if (box.width > 0 && box.right > root.clientWidth + 1) {
        const where = `${parent.tagName.toLowerCase()}${parent.className ? `.${String(parent.className).split(' ').join('.')}` : ''}`;
        found.push(
          `text in ${where} right ${Math.round(box.right)}: ${node.textContent.trim().slice(0, 30)}`,
        );
      }
    }
    return found.slice(0, 20);
  });
}

/** BR3.5: Bengali headings are never case-transformed. */
export async function transformedHeadings(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('h1, h2, h3')]
      .filter((heading) => getComputedStyle(heading).textTransform !== 'none')
      .map((heading) => heading.textContent?.trim().slice(0, 40) ?? ''),
  );
}

function recordCsp(url: string, csp: string): void {
  const dir = logsDir();
  mkdirSync(dir, { recursive: true });
  appendFileSync(path.join(dir, 'csp.jsonl'), `${JSON.stringify({ url, csp })}\n`);
}

async function cspHeader(page: Page, response: Response | null | undefined): Promise<string> {
  if (response) return (await response.allHeaders())['content-security-policy'] ?? '';
  const fetched = await page.request.get(page.url());
  return fetched.headers()['content-security-policy'] ?? '';
}

/** Everything BR2.5 asks of every walked page, then axe (BR3.1). */
export async function checkPage(
  page: Page,
  locale: Locale,
  options: PageCheckOptions = {},
): Promise<void> {
  const label = options.label ?? new URL(page.url()).pathname;
  test.info().annotations.push({
    type: 'page-check',
    description: `${label}: ${(options.rules ?? []).join(', ') || 'common rules only'}`,
  });

  // BR4.1: sampled first, while the navigation or step change that led here is still settling.
  if (test.info().project.use.reducedMotion === 'reduce') await expectReducedMotionOnly(page);
  await expectLocale(page, locale);

  const marker = page
    .locator('p.demo[role="note"]')
    .filter({ hasText: msg(locale, 'demo.banner') });
  await expectNeverAnimated(marker.first(), 'demo marker');

  const disclaimers = page.locator('[data-static="disclaimer"]');
  if (options.disclaimer) await expect(disclaimers.first(), 'disclaimer').toBeVisible();
  for (const disclaimer of await disclaimers.all()) {
    if (await disclaimer.isVisible()) await expectNeverAnimated(disclaimer, 'disclaimer');
  }
  // The /emergency page is itself the guidance: motion.css holds `#view-emergency` static (ISS-763).
  const emergency = page.locator('[data-static="emergency"], #view-emergency');
  if (options.emergency) await expect(emergency.first(), 'emergency guidance').toBeVisible();
  for (const panel of await emergency.all()) {
    if (await panel.isVisible()) await expectNeverAnimated(panel, 'emergency guidance');
  }

  const csp = await cspHeader(page, options.response);
  expect(csp, `content-security-policy on ${label}`).not.toBe('');
  recordCsp(page.url(), csp);

  if (locale === 'bn') {
    expect(await transformedHeadings(page), 'Bengali headings with a text transform').toEqual([]);
  }
  if ((page.viewportSize()?.width ?? Number.POSITIVE_INFINITY) <= PHONE_WIDTH) {
    expect(await overflowFindings(page), `horizontal overflow at ${PHONE_WIDTH} px`).toEqual([]);
  }
  expect(await noRatingFindings(page, locale), 'rating features (BR2.5)').toEqual(NO_RATING);

  if (options.axe !== false) await expectNoSeriousViolations(page, label);
}
