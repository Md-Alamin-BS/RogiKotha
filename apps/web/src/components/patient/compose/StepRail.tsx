'use client';

import { useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@rogikotha/contracts';
import { formatNumber } from '@rogikotha/i18n/format';

import { useAnnounce } from '@/lib/announce';
import { COMPOSER_STEPS, type ComposerStep } from './composer-reducer';

/** The id of the current step's `h2[tabindex=-1]`, which the composer renders. */
export const STEP_HEADING_ID = 'compose-step-heading';

const STEP_KEYS: Record<ComposerStep, string> = {
  1: 'care',
  2: 'story',
  3: 'how',
  4: 'check',
};

// The four-step rail (BR8.2). Every step is reachable; after a change focus moves to the step's
// heading and the step is read out, so a keyboard or screen-reader author lands on the new content.
export function StepRail({
  step,
  onStep,
}: {
  step: ComposerStep;
  onStep: (step: ComposerStep) => void;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const announce = useAnnounce();
  const previous = useRef(step);

  useEffect(() => {
    if (previous.current === step) return;
    previous.current = step;
    document.getElementById(STEP_HEADING_ID)?.focus();
    announce(
      `${t('compose.step')} ${formatNumber(step, locale)} ${t('compose.of')} ${formatNumber(4, locale)}: ${t(`compose.stepName.${STEP_KEYS[step]}`)}`,
    );
  }, [step, announce, t, locale]);

  return (
    <nav aria-label={t('compose.title')}>
      <ol className="c-steps" data-testid="compose-steps">
        {COMPOSER_STEPS.map((n) => (
          <li key={n}>
            <button
              type="button"
              className="c-step"
              aria-current={n === step ? 'step' : undefined}
              onClick={() => onStep(n)}
              data-testid={`compose-step-${n}`}
            >
              <span className="c-step-n">
                {t('compose.step')} {formatNumber(n, locale)} {t('compose.of')}{' '}
                {formatNumber(4, locale)}
              </span>
              <span className="c-step-name">{t(`compose.stepName.${STEP_KEYS[n]}`)}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
