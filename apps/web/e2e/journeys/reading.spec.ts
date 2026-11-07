import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

import {
  CLAIM_REVIEW_TITLE,
  LIMITED_DATA_THRESHOLD,
  PROFILE_DOCTOR,
  R1_TITLE,
  SEEDED_TOPICS,
  SEEDED_USERNAMES,
  SPARSE_DOCTOR,
  UNKNOWN_USERNAME,
} from '../fixtures/seed-facts';
import { forEachLocale, expectLocale } from '../helpers/locale';
import { msg } from '../helpers/messages';
import { checkPage } from '../helpers/page-check';
import {
  capsuleCounts,
  emergencyNumber,
  expectEmergencyNumbers,
  expectNoAsciiDigitInCapsules,
  expectOfTotal,
  firstNumber,
  hasBareZero,
  isLimited,
  numbersIn,
  openByName,
  openExperienceByTitle,
  provenancePattern,
  switchLanguage,
  visitCountOf,
} from '../helpers/reading';

// WF2 Part 1: reading, signed out, in bn then en (BR2.1, BR3.5). Seeded facts are read by visible
// name (BR7.2); Dr. Farhana Rahman is never a writing target, so her counts cannot move in a run.

forEachLocale(
  'P1.0',
  'language detection and stored choice',
  async ({ browser, locale }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const context = await browser.newContext({
      ...(baseURL ? { baseURL } : {}),
      locale: locale === 'bn' ? 'bn-BD' : 'en-US',
      timezoneId: 'Asia/Dhaka',
    });
    try {
      const page = await context.newPage();
      await page.goto('/');
      await expect(page).toHaveURL(new RegExp(`/${locale}/?$`));
      await expectLocale(page, locale);
      await expect(page.locator('a#lang'), 'language switch visible').toBeVisible();

      const other = await switchLanguage(page, locale);
      await expect
        .poll(async () => (await context.cookies()).find((c) => c.name === 'rk.lang')?.value)
        .toBe(other);

      await page.goto('/');
      await expect(page, 'the stored choice wins over the browser language').toHaveURL(
        new RegExp(`/${other}/?$`),
      );
      await expectLocale(page, other);
    } finally {
      await context.close();
    }
  },
);

forEachLocale('P1.1', 'home', async ({ page, locale, open }) => {
  await open();
  await checkPage(page, locale, {
    disclaimer: true,
    emergency: true,
    rules: ['one h1', 'five topic chips', 'emergency numbers', 'limited data', 'no search box'],
  });

  await expect(page.locator('h1')).toHaveCount(1);

  const chips = page.getByTestId('home-chips').locator('a');
  await expect(chips).toHaveCount(5);
  for (const href of await chips.evaluateAll((links) =>
    links.map((link) => link.getAttribute('href') ?? ''),
  )) {
    expect(href).toMatch(new RegExp(`^/${locale}/topics/[^/]+$`));
  }

  const emergency = page.getByTestId('emergency-panel');
  await expect(emergency).toBeVisible();
  await expectEmergencyNumbers(emergency, locale, emergency.locator('p.note'));

  const facilities = page.getByTestId('home-facilities');
  await expect(facilities).toContainText(msg(locale, 'facility.separation'));
  const rows = facilities.getByTestId('teaser-row');
  const rowCount = await rows.count();
  expect(rowCount, 'facility teaser rows').toBeGreaterThan(0);
  for (let index = 0; index < rowCount; index += 1) {
    const row = rows.nth(index);
    const text = await row.innerText();
    expect(hasBareZero(text), `a 0 stands for a missing value in "${text}"`).toBe(false);
    const visits = visitCountOf(text, locale);
    if (visits !== null) {
      const tag = row.getByTestId('teaser-limited');
      if (isLimited(visits)) await expect(tag).toHaveText(msg(locale, 'label.limitedData'));
      else await expect(tag).toHaveCount(0);
    }
  }

  await expect(
    page.locator('main input[type="search"], main [role="search"], main [role="searchbox"]'),
    'no search box in release 1',
  ).toHaveCount(0);
});

forEachLocale('P1.1b', 'emergency', async ({ page, locale, open }) => {
  await open('/emergency');
  await expect(page).toHaveURL(new RegExp(`/${locale}/emergency$`));
  await checkPage(page, locale, { emergency: true, rules: ['emergency numbers', 'signed out'] });

  await expect(page.locator('h1')).toHaveText(msg(locale, 'emergency.title'));
  await expectEmergencyNumbers(page.locator('main'), locale, page.locator('p.emerg-note'));
  await expect(page.getByTestId('contribution-gate'), 'no gate on the emergency page').toHaveCount(
    0,
  );
});

forEachLocale('P1.1c', 'policy pages', async ({ page, locale, open }) => {
  const pages = [
    { path: '/about', lawful: false },
    { path: '/terms', lawful: true },
    { path: '/privacy', lawful: true },
  ];
  for (const { path, lawful } of pages) {
    await test.step(path, async () => {
      await open(path);
      await expectLocale(page, locale);
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('navigation').first()).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(
        page.getByRole('heading', { name: msg(locale, 'policy.privacy.lawful') }),
        `lawful section on ${path}`,
      ).toHaveCount(lawful ? 1 : 0);
      await checkPage(page, locale, { rules: ['landmarks', 'one h1', 'lawful section placement'] });
    });
  }
});

forEachLocale('P1.3', 'doctor index', async ({ page, locale, open }) => {
  await open('/doctors');
  await checkPage(page, locale, { rules: ['at least 10 entries', 'not verified', 'no rating'] });

  const entries = page.getByTestId('doctor-entry');
  expect(await entries.count(), 'doctor entries').toBeGreaterThanOrEqual(10);
  for (const entry of await entries.all()) {
    await expect(entry.getByTestId('not-verified')).toHaveText(msg(locale, 'label.notVerified'));
  }
  for (const badge of await page.getByTestId('member-added').all()) {
    await expect(badge).toHaveText(msg(locale, 'label.memberAdded'));
  }

  // A sort control, if the page has one, offers neutral orders only (BR2.5).
  const allowed = ['sort.relevance', 'sort.volume', 'sort.recent'].map((key) => msg(locale, key));
  const options = await page.locator('main select option, main [role="option"]').allInnerTexts();
  for (const option of options) expect(allowed).toContain(option.trim());
});

forEachLocale('P1.4', 'doctor profile', async ({ page, locale, open }) => {
  await open('/doctors');
  await openByName(page, 'doctor-link', PROFILE_DOCTOR[locale]);
  await expect(page).toHaveURL(new RegExp(`/${locale}/doctors/[^/?]+$`));
  await expect(page.locator('h1')).toHaveText(PROFILE_DOCTOR[locale]);

  const hero = page.getByTestId('profile-hero');
  await expect(hero.getByTestId('not-verified')).toHaveText(msg(locale, 'label.notVerified'));
  await checkPage(page, locale, {
    rules: ['not verified', 'provenance chips', 'n of m', 'limited data', 'digits'],
  });

  const accounts = firstNumber(await page.getByTestId('doctor-profile-count').innerText());
  await expect(page.getByTestId('doctor-profile-count')).toHaveText(
    msg(locale, 'profile.experienceCount', { n: accounts, count: accounts }),
  );
  const limited = page.getByTestId('doctor-profile-limited');
  if (accounts < LIMITED_DATA_THRESHOLD) {
    await expect(limited).toHaveText(msg(locale, 'label.limitedData'));
  } else {
    await expect(limited).toHaveCount(0);
  }

  const provenance = page.locator('.prov');
  expect(await provenance.count(), 'provenance chips').toBeGreaterThan(0);
  for (const text of await provenance.allInnerTexts()) {
    expect(text.trim()).toMatch(provenancePattern(locale));
  }

  const sentiment = page.getByTestId('sentiment-block').first();
  await expectOfTotal(sentiment.getByTestId('dist-denominator'), locale, accounts);
  for (const count of await capsuleCounts(sentiment)) expect(count).toBeLessThanOrEqual(accounts);
  if (locale === 'bn') await expectNoAsciiDigitInCapsules(sentiment);

  const outcome = page.getByTestId('outcome-block').first();
  await expectOfTotal(outcome.getByTestId('dist-denominator'), locale, accounts);
  expect(await outcome.locator('.outcome-row').count(), 'outcome rows').toBeGreaterThan(0);
  await expect(page.getByTestId('profile-breakdown')).toBeVisible();
  expect(
    await page.getByTestId('doctor-profile-chambers').locator('li').count(),
    'chambers',
  ).toBeGreaterThan(0);

  // BR2.6: the same page in the other locale carries the same numbers.
  const numberScopes = [
    '[data-testid="doctor-profile-count"]',
    '[data-testid="sentiment-block"] .cap b',
    '[data-testid="sentiment-block"] [data-testid="dist-denominator"]',
    '[data-testid="outcome-block"] .outcome-row .n',
    '[data-testid="outcome-block"] [data-testid="dist-denominator"]',
    '[data-testid="profile-breakdown"] td',
    '[data-testid="profile-showing"]',
    '.prov',
  ];
  const here = await numbersIn(page, numberScopes);
  expect(here.length, 'numbers read on the profile').toBeGreaterThan(0);

  const to = await switchLanguage(page, locale);
  await expect(page.locator('h1')).toHaveText(PROFILE_DOCTOR[to]);
  await expect(page.getByTestId('doctor-profile-count')).toBeVisible();
  const there = await numbersIn(page, numberScopes);
  expect(there, `numbers equal after digit mapping, ${locale} and ${to}`).toEqual(here);
  if (to === 'bn') await expectNoAsciiDigitInCapsules(page.getByTestId('sentiment-block').first());
  await checkPage(page, to, { rules: ['switched locale', 'digits', 'n of m'] });
});

forEachLocale('P1.4b', 'sparse doctor', async ({ page, locale, open }) => {
  // ASSUMPTION(U50): d10 has no "about" text in the corpus, so it reads Not provided (ISS-752).
  await open('/doctors');
  const entry = page.getByTestId('doctor-entry').filter({ hasText: SPARSE_DOCTOR[locale] });
  const documents = await entry.getByTestId('doctor-entry-documents').innerText();
  expect(hasBareZero(documents), `a 0 stands for no documents in "${documents}"`).toBe(false);
  await openByName(page, 'doctor-link', SPARSE_DOCTOR[locale]);
  await expect(page).toHaveURL(new RegExp(`/${locale}/doctors/[^/?]+$`));
  await checkPage(page, locale, { rules: ['not provided', 'no 0 for a missing value'] });

  await expect(page.getByTestId('doctor-profile-about')).toHaveText(
    msg(locale, 'label.notProvided'),
  );
  for (const id of ['profile-hero', 'doctor-profile-facts', 'doctor-profile-chambers']) {
    const text = await page.getByTestId(id).innerText();
    expect(hasBareZero(text), `a 0 stands for a missing value in ${id}: "${text}"`).toBe(false);
  }
  for (const block of await page.getByTestId('sentiment-block').all()) {
    if ((await block.getByTestId('dist-not-provided').count()) > 0) {
      await expect(block.getByTestId('dist-not-provided')).toHaveText(
        msg(locale, 'label.notProvided'),
      );
      await expect(block.locator('.cap')).toHaveCount(0);
    }
  }
});

forEachLocale('P1.5', 'facility', async ({ page, locale, open }) => {
  await open('/facilities');
  await page.getByTestId('facility-link').first().click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/facilities/[^/?]+$`));
  await checkPage(page, locale, { rules: ['not verified', 'nine criteria', 'separation'] });

  await expect(page.getByTestId('facility-hero').getByTestId('not-verified')).toHaveText(
    msg(locale, 'facility.notVerified'),
  );
  await expect(page.getByTestId('facility-separation')).toHaveText(
    msg(locale, 'facility.separation'),
  );
  await expect(
    page.getByTestId('sentiment-block'),
    'no doctor aggregate on a facility page',
  ).toHaveCount(0);
  await expect(page.getByTestId('outcome-block')).toHaveCount(0);

  const criteria = page.locator('[data-testid^="crit-"]');
  await expect(criteria).toHaveCount(9);
  for (const criterion of await criteria.all()) {
    const denominator = criterion.getByTestId('dist-denominator');
    if ((await denominator.count()) > 0) await expectOfTotal(denominator, locale);
    else
      await expect(criterion.getByTestId('dist-not-provided')).toHaveText(
        msg(locale, 'label.notProvided'),
      );
  }

  const numberScopes = [
    '[data-testid="facility-profile-count"]',
    '[data-testid^="crit-"] .cap b',
    '[data-testid^="crit-"] [data-testid="dist-denominator"]',
  ];
  const here = await numbersIn(page, numberScopes);
  const to = await switchLanguage(page, locale);
  await expect(page.locator('[data-testid^="crit-"]')).toHaveCount(9);
  expect(await numbersIn(page, numberScopes), `numbers equal, ${locale} and ${to}`).toEqual(here);
  await expect(page.getByTestId('facility-separation')).toHaveText(msg(to, 'facility.separation'));
});

forEachLocale('P1.5b', 'topics', async ({ page, locale, open }) => {
  await open('/topics');
  await checkPage(page, locale, { rules: ['ten seeded topics', 'no rating'] });

  const cards = page.getByTestId('browse-card');
  expect(await cards.count(), 'topic cards').toBeGreaterThanOrEqual(10);
  const titles = (await cards.locator('b').allInnerTexts()).map((title) => title.trim());
  for (const name of SEEDED_TOPICS[locale]) expect(titles).toContain(name);

  await cards
    .filter({ hasText: SEEDED_TOPICS[locale][0] ?? '' })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/topics/[^/?]+$`));
  await expect(page.locator('h1')).toHaveText(SEEDED_TOPICS[locale][0] ?? '');
  // A topic page carries the compact panel: the ambulance and health-line numbers from the
  // configuration in one line, in the locale's digits; the full list is on /emergency (ISS-763).
  const emergency = page.getByTestId('emergency-panel');
  await expect(emergency, 'emergency guidance on a topic page').toBeVisible();
  await expect(emergency.locator('p.note')).toHaveText(
    msg(locale, 'emergency.compactLine', {
      ambulance: emergencyNumber('ambulance', locale),
      healthLine: emergencyNumber('healthLine', locale),
    }),
  );
  await checkPage(page, locale, { emergency: true, rules: ['emergency guidance'] });
});

forEachLocale('P1.6', 'experience', async ({ page, request, locale }) => {
  await openExperienceByTitle(page, locale, R1_TITLE[locale]);
  const experience = page.getByTestId('experience-page');
  await expect(page.locator('h1')).toHaveText(R1_TITLE[locale]);
  await checkPage(page, locale, {
    disclaimer: true,
    rules: ['title', 'month and year only', 'not verified', 'evidence wording', 'signed-out gate'],
  });

  // The seeded review is detailed: its sections come in the fixed page order.
  const order = ['compose.symptoms', 'compose.diagnosis', 'compose.treatment', 'compose.after'].map(
    (key) => msg(locale, key),
  );
  const headings =
    // Text content, not inner text: English section heads are set in capitals by CSS.
    (await page.getByTestId('experience-sections').locator('h2').allTextContents()).map((heading) =>
      heading.trim(),
    );
  expect(headings.length, 'detailed sections').toBeGreaterThan(0);
  expect(headings).toEqual(order.filter((heading) => headings.includes(heading)));

  // Month and year only (BR5.5): the published value has no day.
  const margin = page.getByTestId('experience-margin');
  const published = margin
    .locator('div')
    .filter({ has: page.locator('.k', { hasText: msg(locale, 'byline.published') }) })
    .locator('.v');
  await expect(published).toHaveText(/^\S+ [0-9০-৯]{4}$/);

  await expect(margin.getByTestId('not-verified')).toHaveText(msg(locale, 'label.notVerified'));

  const note = page.getByTestId('evidence-note');
  if ((await note.count()) > 0) {
    const ready = firstNumber(await note.locator('.callout').innerText());
    await expect(note).toContainText(msg(locale, 'evidence.status'));
    await expect(note).toContainText(msg(locale, 'ev.note.count', { count: ready }));
  } else {
    await expect(page.getByTestId('evidence-none')).toContainText(msg(locale, 'label.noDocuments'));
  }

  const gate = experience.getByTestId('comment-thread').getByTestId('contribution-gate');
  await expect(gate).toHaveAttribute('data-access', 'signed-out');

  const probe = await request.get(`/api/evidence/items/${randomUUID()}/original`);
  expect(probe.ok(), 'an original is never served to a signed-out reader').toBe(false);
  expect(probe.headers()['content-type'] ?? '').not.toMatch(/^image\//);

  // ASSUMPTION(U50): r1 stores no claim, so the Reviewer's label is read on r6 (ISS-753).
  await openExperienceByTitle(page, locale, CLAIM_REVIEW_TITLE[locale]);
  const labels = page.getByTestId('reviewer-labels');
  await expect(labels.locator('.reviewer-label').first()).toContainText(
    msg(locale, 'label.reviewerLabel'),
  );
  await expect(labels).toContainText(msg(locale, 'label.reviewerLabelWhy'));
});

forEachLocale('P1.7', 'author pages', async ({ page, locale }) => {
  const known = await page.goto(`/${locale}/authors/${SEEDED_USERNAMES.shirin}`);
  expect(known?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByTestId('author-username')).toHaveText(`@${SEEDED_USERNAMES.shirin}`);
  await expect(
    page.getByTestId('account-row-title-link').filter({ hasText: R1_TITLE[locale] }),
  ).toHaveCount(1);
  await expect(
    page.locator('article.acct .byline-av[data-identity="anon"]'),
    'no anonymous review under a pseudonym',
  ).toHaveCount(0);
  await checkPage(page, locale, { response: known, rules: ['noindex', 'no anonymous review'] });

  const anonymous = await page.goto(`/${locale}/authors/${SEEDED_USERNAMES.anonAuthorR2}`);
  expect(anonymous?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByTestId('author-empty')).toHaveText(msg(locale, 'profile.noContributions'));
  await checkPage(page, locale, { response: anonymous, rules: ['empty state'] });

  const unknown = await page.goto(`/${locale}/authors/${UNKNOWN_USERNAME}`);
  expect(unknown?.status(), 'an unknown name answers like the anonymous author').toBe(
    anonymous?.status(),
  );
  await expect(page.getByTestId('author-empty')).toHaveText(msg(locale, 'profile.noContributions'));
  await expect(page.getByTestId('author-display-name')).toHaveCount(0);
});
