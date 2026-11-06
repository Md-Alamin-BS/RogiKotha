import { useLocale, useTranslations } from 'next-intl';
import { formatNumber } from '@rogikotha/i18n/format';
import type { Locale } from '@rogikotha/i18n';

const STEPS = ['auth.steps.create', 'auth.steps.confirm', 'auth.steps.write'] as const;

/** The static three-step joining strip on /register and every /verify-email panel (BR9.3). */
export function JoinSteps({ current }: { current: 1 | 2 | 3 }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  return (
    <ol className="join-steps" aria-label={t('auth.steps.label')} data-testid="join-steps">
      {STEPS.map((key, index) => {
        const step = index + 1;
        const isCurrent = step === current;
        return (
          <li key={key} aria-current={isCurrent ? 'step' : undefined}>
            {t(key)}
            {isCurrent ? (
              <span className="sr-only">
                {' '}
                {t('auth.steps.position', {
                  step: formatNumber(step, locale),
                  total: formatNumber(STEPS.length, locale),
                })}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
