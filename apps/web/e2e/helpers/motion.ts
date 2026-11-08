import { expect, type Locator, type Page } from '@playwright/test';

// BR4.1, BR4.3, BR4.6: what the browser actually animates, read from `document.getAnimations()`.

export interface AnimationSample {
  kind: 'CSSAnimation' | 'CSSTransition' | 'Animation';
  name: string;
  properties: string[];
  durationMs: number;
  delayMs: number;
  iterations: number;
  pseudo: string | null;
  target: string;
}

export const REDUCED_FADE_MAX_MS = 100;
export const LONGEST_PLAY_MS = 5_000;

/**
 * Every animation that runs during the next `frames` animation frames (about half a second at
 * 60 Hz), so a short fade that starts and ends between two reads is still seen.
 */
export async function sampleAnimations(page: Page, frames = 30): Promise<AnimationSample[]> {
  return page.evaluate(async (frameCount) => {
    const seen = new Map<Animation, AnimationSample>();
    const describeTarget = (target: Element | null | undefined): string => {
      if (!target) return 'document';
      const id = target.id ? `#${target.id}` : '';
      const classes = [...target.classList].map((name) => `.${name}`).join('');
      return `${target.tagName.toLowerCase()}${id}${classes}`;
    };
    const read = () => {
      for (const animation of document.getAnimations()) {
        if (seen.has(animation)) continue;
        const effect = animation.effect as KeyframeEffect | null;
        const timing = effect?.getComputedTiming();
        const properties = new Set<string>();
        for (const frame of effect?.getKeyframes() ?? []) {
          for (const key of Object.keys(frame)) {
            if (!['offset', 'computedOffset', 'easing', 'composite'].includes(key)) {
              properties.add(key);
            }
          }
        }
        const kind =
          animation instanceof CSSAnimation
            ? 'CSSAnimation'
            : animation instanceof CSSTransition
              ? 'CSSTransition'
              : 'Animation';
        const name =
          animation instanceof CSSAnimation
            ? animation.animationName
            : animation instanceof CSSTransition
              ? animation.transitionProperty
              : animation.id;
        seen.set(animation, {
          kind,
          name,
          properties: [...properties],
          durationMs: Number(timing?.duration ?? 0),
          delayMs: Number(timing?.delay ?? 0),
          iterations: Number(timing?.iterations ?? 1),
          pseudo: effect?.pseudoElement ?? null,
          target: describeTarget(effect?.target),
        });
      }
    };
    for (let frame = 0; frame < frameCount; frame += 1) {
      read();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    read();
    return [...seen.values()];
  }, frames);
}

/** BR4.1: under reduced motion only opacity fades of 100 ms or less may run. */
export function reducedMotionViolations(samples: readonly AnimationSample[]): AnimationSample[] {
  return samples.filter(
    (sample) =>
      sample.durationMs > 0 &&
      (sample.durationMs > REDUCED_FADE_MAX_MS ||
        sample.properties.some((property) => property !== 'opacity')),
  );
}

/** BR4.6: nothing loops or plays past 5 seconds after its start. */
export function longOrLooping(samples: readonly AnimationSample[]): AnimationSample[] {
  return samples.filter(
    (sample) =>
      !Number.isFinite(sample.iterations) ||
      sample.delayMs + sample.durationMs * sample.iterations > LONGEST_PLAY_MS,
  );
}

export async function expectReducedMotionOnly(page: Page): Promise<void> {
  const samples = await sampleAnimations(page);
  expect(reducedMotionViolations(samples), 'animations beyond a 100 ms opacity fade').toEqual([]);
}

/**
 * BR4.3: the disclaimer, the emergency guidance and the demo marker never animate, are visible
 * within the first second and are not covered by anything.
 */
export async function expectNeverAnimated(element: Locator, label: string): Promise<void> {
  await expect(element, `${label} visible at once`).toBeVisible({ timeout: 1_000 });
  const state = await element.evaluate(async (node) => {
    // While a route's view transition runs, hit tests land on the root under its snapshot, so
    // the cover check waits for it to finish (ISS-764).
    const running = (
      document as Document & { activeViewTransition?: { finished: Promise<unknown> } | null }
    ).activeViewTransition;
    if (running) await running.finished.catch(() => undefined);
    const durations = getComputedStyle(node)
      .transitionDuration.split(',')
      .map((value) => value.trim());
    const box = node.getBoundingClientRect();
    const x = Math.min(Math.max(box.left + box.width / 2, 0), window.innerWidth - 1);
    const y = Math.min(Math.max(box.top + box.height / 2, 0), window.innerHeight - 1);
    const onTop = document.elementFromPoint(x, y);
    const inView = box.bottom > 0 && box.top < window.innerHeight;
    return {
      animations: node.getAnimations({ subtree: true }).length,
      transitionsOff: durations.every((value) => value === '0s'),
      covered: inView && onTop !== null && onTop !== node && !node.contains(onTop),
    };
  });
  expect(state, `${label} never animates and is not covered`).toEqual({
    animations: 0,
    transitionsOff: true,
    covered: false,
  });
}
