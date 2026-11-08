import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

import {
  EVIDENCE_FIXTURES,
  fixturePath,
  WRITE_TARGET_DOCTOR,
  type EvidenceFixture,
} from '../fixtures/seed-facts';
import {
  addedDoctorName,
  fileSentinelPrefix,
  LONG_BENGALI_SECTION,
  LONG_BENGALI_TITLE,
  oversizePng,
  reviewText,
  reviewTitle,
  textSentinel,
} from '../fixtures/synthetic';
import { registerConfirmed, secondDevice } from '../helpers/accounts';
import {
  chooseDoctor,
  chooseIdentityAndAttest,
  escapeRegExp,
  publishQuickReview,
} from '../helpers/content';
import { formatNumber } from '../helpers/digits';
import { runId } from '../helpers/env';
import { forEachLocale, type Locale } from '../helpers/locale';
import { msg } from '../helpers/messages';
import { checkPage } from '../helpers/page-check';

// WF2 Part 3: writing with evidence, in bn then en (BR2.3, BR4.5, BR7.3). Every test publishes
// about the write-target doctor or a doctor it adds (BR7.2), so the numbers the reading tests
// assert never move. Parts that need U48 (evidence) or U22 (corrections) run after the Step 34
// rebase.

test.describe.configure({ timeout: 240_000 });

const EVIDENCE_WAIT_MS = 120_000;
const EVIDENCE_POLL_MS = 2_000;
const MAX_FILE_MB = 15;

// BR2.3: a gate run needs the scanner; E2E_ALLOW_NO_SCANNER=1 skips only the scan outcomes.
const scannerOptional = process.env['E2E_ALLOW_NO_SCANNER'] === '1';
let scanOutcomes = true;

test.beforeAll(async () => {
  const baseURL = test.info().project.use.baseURL ?? '';
  const response = await fetch(new URL('/api/health', baseURL), {
    signal: AbortSignal.timeout(10_000),
  });
  const health = (await response.json()) as { scanner?: string };
  if (health.scanner === 'ok') return;
  if (!scannerOptional) {
    throw new Error(
      'ClamAV is not ready: run pnpm infra:up and wait for clamd, or set E2E_ALLOW_NO_SCANNER=1 for a local run',
    );
  }
  scanOutcomes = false;
  test.info().annotations.push({
    type: 'not-a-gate-run',
    description: 'E2E_ALLOW_NO_SCANNER=1: scan outcomes were not asserted',
  });
});

let addedDoctors = 0;
function newDoctorName(): string {
  addedDoctors += 1;
  const { workerIndex, retry } = test.info();
  return addedDoctorName(runId(), workerIndex * 1_000 + retry * 100 + addedDoctors);
}

async function stepTo(page: Page, locale: Locale, step: number, nameKey: string): Promise<void> {
  await page.getByTestId(`compose-step-${step}`).click();
  const heading = page.getByTestId(`compose-step-body-${step}`).locator('h2');
  await expect(heading, 'the step heading').toHaveText(msg(locale, nameKey));
  await expect(heading, 'focus moves to the step heading').toBeFocused();
  await expect(page.locator('#sr-live'), 'the step change is announced').toContainText(
    msg(locale, nameKey),
  );
}

const REWARD_WORDS =
  /confetti|streak|badge|points|countdown|কনফেটি|স্ট্রিক|ব্যাজ|পয়েন্ট|কাউন্টডাউন/i;

forEachLocale('P3.11', 'compose and publish', async ({ page, locale }) => {
  const account = await registerConfirmed(page, locale);
  const sentinel = textSentinel(runId(), test.info());
  const title = locale === 'bn' ? LONG_BENGALI_TITLE : reviewTitle(locale, sentinel);
  const sections = {
    symptoms: reviewText(sentinel),
    diagnosis:
      locale === 'bn' ? LONG_BENGALI_SECTION : 'They said it was a common infection, nothing more.',
    treatment: 'A short course of tablets, and a follow-up visit after two weeks.',
    after: 'ডাক্তার শাহেব আবার দেখা করতে বললেন, and I felt much better in a week.',
  };
  const term = `e2e term ${runId()}`;

  await page.goto(`/${locale}/write`);
  await expect(page.getByTestId('composer')).toBeVisible();
  await checkPage(page, locale, { label: `/${locale}/write (step 1)`, disclaimer: true });

  await chooseDoctor(page, WRITE_TARGET_DOCTOR[locale]);
  await page.getByTestId('compose-relationship-options').getByRole('button').first().click();
  await page.getByTestId('compose-period').selectOption({ index: 1 });
  await page
    .getByTestId('compose-mode')
    .getByRole('button', {
      name: new RegExp(escapeRegExp(msg(locale, 'compose.mode.detailed'))),
    })
    .click();

  await stepTo(page, locale, 2, 'compose.stepName.story');
  await page.getByTestId('compose-title').fill(title);
  for (const [key, text] of Object.entries(sections)) {
    await page.getByTestId(`compose-${key}`).fill(text);
  }
  await page.getByTestId('compose-not-sure').first().click();
  await page.getByTestId('compose-tag-free-condition').fill(term);
  await page.getByTestId('compose-tag-add-condition').click();
  await expect(
    page.getByTestId('compose-tags-condition').getByRole('button', { name: term }),
  ).toHaveAttribute('aria-pressed', 'true');
  await checkPage(page, locale, { label: `/${locale}/write (step 2)` });

  // Sentiment stays empty; one Reviewer's label is chosen.
  await stepTo(page, locale, 3, 'compose.stepName.how');
  const claim = page.getByTestId('compose-claims').getByRole('button').first();
  await claim.click();
  await expect(claim).toHaveAttribute('aria-pressed', 'true');

  await stepTo(page, locale, 4, 'compose.stepName.check');
  await chooseIdentityAndAttest(page, locale, 'anonymous');
  // Where the layout stacks, the preview sits in a `details` that opens by itself on step 4.
  const details = page.getByTestId('compose-preview-details');
  if ((await details.count()) > 0) await expect(details).toHaveAttribute('open', '');
  const preview = page.getByTestId('compose-preview');
  await expect(preview).toContainText(title);
  await expect(preview).toContainText(msg(locale, 'label.reviewerLabel'));
  await checkPage(page, locale, { label: `/${locale}/write (step 4)` });

  await page.getByTestId('compose-publish').click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/experiences/[^/?#]+\\?published=1`));

  const note = page.getByTestId('published-note');
  await expect(note).toHaveText(msg(locale, 'compose.publishedNote'));
  await expect(page.locator('.publish-tick'), 'exactly one tick').toHaveCount(1);
  await expect(page.locator('body')).not.toContainText(REWARD_WORDS);
  await expect
    .poll(
      () =>
        // The scroll-driven reading-progress bar runs for as long as the page; it is not motion.
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((a) => a.playState === 'running' && a.timeline === document.timeline).length,
        ),
      { message: 'animations still running after the tick ended', timeout: 5_000 },
    )
    .toBe(0);

  await expect(page.locator('h1')).toHaveText(title);
  const body = page.getByTestId('experience-sections');
  for (const text of Object.values(sections)) await expect(body).toContainText(text);
  await expect(page.getByTestId('byline-alias')).toBeVisible();
  await expect(page.locator('body'), 'the run username on the public page').not.toContainText(
    account.username,
  );
  await checkPage(page, locale, { label: `/${locale}/experiences/<new>`, disclaimer: true });
});

forEachLocale('P3.11b', 'member-added doctor', async ({ page, locale }) => {
  const account = await registerConfirmed(page, locale);
  const doctor = newDoctorName();
  await publishQuickReview(page, account, { newDoctorName: doctor, identity: 'pseudonymous' });

  const margin = page.getByTestId('experience-margin');
  await expect(margin).toContainText(doctor);
  await expect(margin).toContainText(msg(locale, 'label.memberAdded'));
  await expect(margin).toContainText(msg(locale, 'label.notVerified'));

  await page.goto(`/${locale}/doctors`);
  const entry = page.getByTestId('doctor-entry').filter({ hasText: doctor });
  for (let pages = 0; (await entry.count()) === 0 && pages < 8; pages += 1) {
    const more = page.getByTestId('pager-more');
    if ((await more.count()) === 0) break;
    const before = page.url();
    await more.click();
    await expect(page).not.toHaveURL(before);
  }
  await expect(entry.first(), 'the new doctor in the index').toBeVisible();
  await expect(entry.first()).toContainText(msg(locale, 'label.memberAdded'));
  await expect(entry.first()).toContainText(msg(locale, 'label.notVerified'));
});

const MIME: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
};

/** The file under a run-marked name, so the log scan (BR2.8) can tell a leaked name. */
const runName = (fixture: string): string => `${fileSentinelPrefix(runId())}-${fixture}`;

async function attach(
  page: Page,
  name: string,
  file: { fixture: EvidenceFixture } | { buffer: Buffer; mimeType: string },
): Promise<void> {
  const payload =
    'fixture' in file
      ? {
          name,
          mimeType: MIME[file.fixture.split('.').pop() ?? ''] ?? 'application/octet-stream',
          buffer: readFileSync(fixturePath(file.fixture)),
        }
      : { name, mimeType: file.mimeType, buffer: file.buffer };
  await page.getByTestId('evidence-file-input').setInputFiles(payload);
  await page.getByTestId('evidence-upload-submit').click();
}

const rowOf = (page: Page, name: string) =>
  page.getByTestId('evidence-file').filter({ hasText: name });

/** BR2.3: a bounded poll with a reload, because the scan runs in the worker. */
async function expectRowEnds(page: Page, name: string, texts: readonly string[]): Promise<void> {
  await expect(async () => {
    await page.reload();
    for (const text of texts)
      await expect(rowOf(page, name)).toContainText(text, { timeout: 1_000 });
  }, `${name} reaches its final status`).toPass({
    timeout: EVIDENCE_WAIT_MS,
    intervals: [EVIDENCE_POLL_MS],
  });
}

forEachLocale('P3.12', 'attach and scan', async ({ page, browser, request, locale }) => {
  const account = await registerConfirmed(page, locale);
  const review = await publishQuickReview(page, account);
  await expect(page.getByTestId('author-tools')).toBeVisible();

  const accepted = ['prescription-1.jpg', 'prescription-2.jpg', 'photo.jpg'] as const;
  for (const fixture of accepted) {
    await attach(page, runName(fixture), { fixture });
    await expect(rowOf(page, runName(fixture)), `${fixture} listed`).toBeVisible({
      timeout: 30_000,
    });
  }
  if (scanOutcomes) {
    for (const fixture of accepted) {
      await expectRowEnds(page, runName(fixture), [msg(locale, 'ev.status.ready')]);
    }
  }

  // ASSUMPTION(U50): U48's reason copy (`ev.reason.*`) names a damaged image and a malware finding.
  const rejected = [
    { fixture: 'broken.jpg', reason: 'ev.reason.notImage' },
    { fixture: 'flagged.jpg', reason: 'ev.reason.malware' },
  ] as const;
  for (const { fixture } of rejected) {
    await attach(page, runName(fixture), { fixture });
    await expect(rowOf(page, runName(fixture)), `${fixture} listed`).toBeVisible({
      timeout: 30_000,
    });
  }
  if (scanOutcomes) {
    for (const { fixture, reason } of rejected) {
      await expectRowEnds(page, runName(fixture), [
        msg(locale, 'ev.status.rejected'),
        msg(locale, reason),
      ]);
    }
  }

  // Refused at once: no row is left behind.
  const uploader = page.getByTestId('evidence-uploader');
  const limit = formatNumber(MAX_FILE_MB, locale);
  const refusals = [
    {
      name: runName('report.pdf'),
      file: { fixture: 'report.pdf' } as const,
      messages: [msg(locale, 'errors.evidence.typeRejected')],
    },
    {
      name: runName('oversize.png'),
      file: { buffer: oversizePng(), mimeType: 'image/png' },
      messages: [
        msg(locale, 'errors.evidence.tooLarge'),
        msg(locale, 'ev.upload.errors.tooLarge', { maxMb: limit }),
      ],
    },
  ];
  // The uploader speaks a refusal through its polite status line, never an alert (ISS-766).
  const status = uploader.getByTestId('evidence-upload-message');
  await expect(status).toHaveAttribute('role', 'status');
  for (const { name, file, messages } of refusals) {
    await attach(page, name, file);
    await expect(status, `${name} is refused`).toHaveText(
      new RegExp(messages.map(escapeRegExp).join('|')),
    );
    await expect(rowOf(page, name)).toHaveCount(0);
  }

  // A signed-out reader sees the count of attached files and none of their names.
  const reader = await secondDevice(browser);
  try {
    await reader.page.goto(review.path);
    if (scanOutcomes) {
      const note = reader.page.getByTestId('evidence-note');
      await expect(note).toContainText(msg(locale, 'evidence.status'));
      await expect(note).toContainText(
        msg(locale, 'ev.note.count', { count: formatNumber(accepted.length, locale) }),
      );
    }
    const html = await reader.page.content();
    expect(html, 'a file name on the public page').not.toContain(fileSentinelPrefix(runId()));
    for (const fixture of EVIDENCE_FIXTURES) expect(html).not.toContain(fixture);
    await checkPage(reader.page, locale, { label: `${review.path} (signed out)` });
  } finally {
    await reader.context.close();
  }

  const probe = await request.get(`/api/evidence/items/${randomUUID()}/original`);
  expect(probe.ok(), 'an original is never served to a signed-out reader').toBe(false);
  expect(probe.headers()['content-type'] ?? '').not.toMatch(/^image\//);
});

forEachLocale('P3.13', 'correction', async ({ page, browser, locale }) => {
  const account = await registerConfirmed(page, locale);
  const review = await publishQuickReview(page, account);

  await page.getByRole('link', { name: msg(locale, 'experience.editExperience') }).click();
  await expect(page.getByTestId('edit-form')).toBeVisible();
  await page.getByTestId('compose-outcome-options').getByRole('button').first().click();
  await page.getByTestId('edit-save').click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(review.path)}(\\?|$)`));

  async function expectHistory(view: Page): Promise<void> {
    const history = view.getByTestId('review-history');
    await expect(history).toContainText(msg(locale, 'label.edited'));
    await expect(view.getByTestId('review-corrections')).toContainText(
      msg(locale, 'history.field.outcome'),
    );
    const original = view.getByTestId('original-text').first();
    await expect(original, 'Show original is closed by default').not.toHaveAttribute('open', '');
    await expect(original.locator('summary')).toHaveText(msg(locale, 'history.showOriginal'));
    await original.locator('summary').click();
    await expect(original).toContainText(reviewText(review.sentinel));
  }

  await expectHistory(page);
  await checkPage(page, locale, { label: `${review.path} (edited)`, disclaimer: true });

  const reader = await secondDevice(browser);
  try {
    await reader.page.goto(review.path);
    await expectHistory(reader.page);
  } finally {
    await reader.context.close();
  }
});

forEachLocale('P3.14', 'signed-out view', async ({ page, browser, locale }) => {
  const account = await registerConfirmed(page, locale);
  const review = await publishQuickReview(page, account, {
    doctor: WRITE_TARGET_DOCTOR[locale],
    identity: 'anonymous',
  });

  const reader = await secondDevice(browser);
  try {
    await reader.page.goto(review.path);
    await expect(reader.page.getByTestId('byline-alias')).toBeVisible();
    const html = await reader.page.content();
    expect(html, 'the run username').not.toContain(account.username);
    expect(html, 'the run email').not.toContain(account.email);
    for (const fixture of EVIDENCE_FIXTURES) expect(html).not.toContain(fixture);
    await checkPage(reader.page, locale, { label: `${review.path} (anonymous)`, disclaimer: true });

    await reader.page.goto(`/${locale}/authors/${account.username}`);
    await expect(reader.page.getByTestId('author-empty')).toBeVisible();
    await expect(reader.page.locator('body')).not.toContainText(review.title);
  } finally {
    await reader.context.close();
  }
});
