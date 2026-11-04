import { expect, test, type Page } from '@playwright/test';

// FD-091 motion system (T-011, BR9.4): what a visitor's browser does with motion.css on the built
// app. The spec asserts on the animations the browser runs, never on pixels.

type RecordedAnimation = { pseudo: string; duration: number };
type RecordedTransition = {
  settled: boolean;
  skipped: boolean;
  animations: RecordedAnimation[];
};
type Recorder = Window & { __transitions: RecordedTransition[] };

// Runs before the page's own scripts: wraps `document.startViewTransition` so each view
// transition leaves a record of the animations on its pseudo-elements once it is ready.
function recordViewTransitions() {
  const recorder = window as unknown as Recorder;
  recorder.__transitions = [];
  const start = document.startViewTransition.bind(document);
  document.startViewTransition = ((callback?: ViewTransitionUpdateCallback) => {
    const transition = start(callback);
    const entry: RecordedTransition = { settled: false, skipped: false, animations: [] };
    recorder.__transitions.push(entry);
    transition.ready.then(
      () => {
        // CSS animations only: the browser adds its own zero-length animations on the root group.
        entry.animations = document
          .getAnimations()
          .filter((animation) => animation instanceof CSSAnimation)
          .map((animation) => ({
            pseudo: (animation.effect as KeyframeEffect | null)?.pseudoElement ?? '',
            duration: Number(animation.effect?.getComputedTiming().duration ?? 0),
          }))
          .filter((animation) => animation.pseudo.startsWith('::view-transition'));
        entry.settled = true;
      },
      () => {
        entry.skipped = true;
        entry.settled = true;
      },
    );
    return transition;
  }) as typeof document.startViewTransition;
}

async function openPage(page: Page, path: string) {
  await page.addInitScript(recordViewTransitions);
  await page.goto(path);
  // Set by the route frame once the page has hydrated: motion rules wait for it (BR4.5).
  await expect(page.locator('html')).toHaveAttribute('data-motion-ready', '');
}

// A duration token in milliseconds; the built stylesheet may spell 240ms as .24s.
async function tokenMs(page: Page, token: string): Promise<number> {
  return page.evaluate((name) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return raw.endsWith('ms') ? parseFloat(raw) : parseFloat(raw) * 1000;
  }, token);
}

async function clickTab(page: Page, tab: 'doctors' | 'facilities') {
  await page.locator(`nav.tabs a[data-nav="${tab}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/${tab}$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function settledTransitions(page: Page): Promise<RecordedTransition[]> {
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as Recorder).__transitions.every((t) => t.settled)),
    )
    .toBe(true);
  return page.evaluate(() => (window as unknown as Recorder).__transitions);
}

function pseudoNames(transitions: RecordedTransition[]): string[] {
  return transitions.flatMap((transition) =>
    transition.animations.map((animation) => animation.pseudo),
  );
}

// Inserts a list of eight after load, as a page would, and reports the transitions each item
// started; reading the layout makes the browser resolve the styles, which starts them.
function insertListOfEight() {
  const list = document.createElement('ul');
  list.setAttribute('data-reveal-list', '');
  for (let position = 1; position <= 8; position += 1) {
    const item = document.createElement('li');
    item.textContent = `Item ${position}`;
    list.append(item);
  }
  document.querySelector('main')?.append(list);
  list.getBoundingClientRect();
  return Array.from(list.children).map((item) =>
    document
      .getAnimations()
      .filter((animation) => (animation.effect as KeyframeEffect | null)?.target === item)
      .map((animation) => ({
        property: (animation as CSSTransition).transitionProperty,
        delay: Number(animation.effect?.getTiming().delay ?? 0),
      })),
  );
}

test.describe('with motion on', () => {
  test('a tab click fades the old page out and the new one in and up', async ({ page }) => {
    await openPage(page, '/en');
    await clickTab(page, 'doctors');
    const transitions = await settledTransitions(page);

    expect(transitions).toHaveLength(1);
    expect(pseudoNames(transitions)).toEqual(
      expect.arrayContaining(['::view-transition-old(page)', '::view-transition-new(page)']),
    );

    const baseMs = await tokenMs(page, '--dur-base');
    expect(baseMs).toBeGreaterThan(0);
    for (const animation of transitions.flatMap((transition) => transition.animations)) {
      expect(animation.duration).toBeLessThanOrEqual(baseMs);
    }
  });

  test('only the page animates: the masthead, demo marker and footer stay still', async ({
    page,
  }) => {
    await openPage(page, '/en');
    await clickTab(page, 'facilities');
    const names = pseudoNames(await settledTransitions(page));

    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name).toMatch(/\(page\)$/);
  });

  test('a list of eight inserted after the page loads reveals only its first six items', async ({
    page,
  }) => {
    await openPage(page, '/en');
    const revealed = await page.evaluate(insertListOfEight);
    const stagger = await tokenMs(page, '--stagger');
    expect(stagger).toBeGreaterThan(0);

    revealed.slice(0, 6).forEach((animations, index) => {
      expect(animations.map((animation) => animation.property).sort()).toEqual([
        'opacity',
        'transform',
      ]);
      for (const animation of animations) expect(animation.delay).toBeCloseTo(index * stagger);
    });
    expect(revealed.slice(6)).toEqual([[], []]);
  });
});

test.describe('switching the language', () => {
  test('swaps the page at once instead of running the route fade', async ({ page }) => {
    // A public page: since the demo slice, /write sends a signed-out visitor to sign in.
    await openPage(page, '/en/doctors');
    await page.locator('#lang').click();
    await expect(page).toHaveURL(/\/bn\/doctors$/, { timeout: 20_000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
    expect(pseudoNames(await settledTransitions(page))).toEqual([]);
  });
});

test.describe('with reduced motion asked for by the operating system', () => {
  test.use({ reducedMotion: 'reduce' });

  test('a tab click swaps the page at once and shows its heading', async ({ page }) => {
    await openPage(page, '/en');
    await clickTab(page, 'doctors');
    expect(pseudoNames(await settledTransitions(page))).toEqual([]);
  });

  test('a list of eight inserted after the page loads reveals none of its items', async ({
    page,
  }) => {
    await openPage(page, '/en');
    const revealed = await page.evaluate(insertListOfEight);
    expect(revealed.flat()).toEqual([]);
  });
});

test.describe('with motion switched off in the app', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: 'rk.motion', value: 'off', url: baseURL ?? '' }]);
  });

  test('a tab click swaps the page at once and shows its heading', async ({ page }) => {
    await openPage(page, '/en');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await clickTab(page, 'doctors');
    expect(pseudoNames(await settledTransitions(page))).toEqual([]);
  });

  test('a list of eight inserted after the page loads reveals none of its items', async ({
    page,
  }) => {
    await openPage(page, '/en');
    const revealed = await page.evaluate(insertListOfEight);
    expect(revealed.flat()).toEqual([]);
  });
});

for (const locale of ['en', 'bn'] as const) {
  test.describe(`the static parts in ${locale}`, () => {
    test('the demo marker, the disclaimer and the emergency guidance never animate', async ({
      page,
    }) => {
      await openPage(page, `/${locale}/emergency`);
      await expect(page.locator('.demo')).toBeVisible();
      await expect(page.locator('.colophon')).toContainText(
        locale === 'bn' ? /[ঀ-৿]/ : /does not diagnose/,
      );
      await expect(page.locator('#view-emergency')).toBeVisible();

      const moving = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            '.demo, .demo *, .colophon, .colophon *, #view-emergency, #view-emergency *',
          ),
        )
          .filter((element) => {
            const style = getComputedStyle(element);
            return style.animationName !== 'none' || style.transitionProperty !== 'none';
          })
          .map((element) => element.tagName),
      );
      expect(moving).toEqual([]);
    });

    test('a press squeezes a control but never an emergency number', async ({ page }) => {
      await openPage(page, `/${locale}/emergency`);

      const transformWhilePressed = async (selector: string) => {
        const target = page.locator(selector).first();
        const box = await target.boundingBox();
        if (!box) throw new Error(`${selector} is not on the page`);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(300);
        const transform = await target.evaluate((element) => getComputedStyle(element).transform);
        // Released away from the target so the press does not become a click.
        await page.mouse.move(0, 0);
        await page.mouse.up();
        return transform;
      };

      expect(await transformWhilePressed('.emerg-card')).toBe('none');
      expect(await transformWhilePressed('.cta-write')).toMatch(/^matrix\(0\.98,/);
    });
  });
}
