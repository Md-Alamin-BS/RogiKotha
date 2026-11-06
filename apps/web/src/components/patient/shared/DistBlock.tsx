import type { CSSProperties } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { DistributionVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';

export type DistPrefix = 'sentiment.' | 'outcome.' | 'crit.';

// Port of concept-04b's distribution (app.js `dist()`): separate capsules, or outcome rows, each
// with its exact count, then the denominator. Never a percentage, never a score (BR2.1–BR2.4).
export function DistBlock({
  dist,
  prefix,
  title,
  compact = false,
  threshold,
  limitedNote = 'full',
  rows = false,
  testId,
}: {
  dist: DistributionVM;
  prefix: DistPrefix;
  title?: string | undefined;
  compact?: boolean;
  threshold: number;
  limitedNote?: 'full' | 'tag';
  /** Outcome rows: a bar per key drawn as count / total, with the count beside it. */
  rows?: boolean;
  testId?: string | undefined;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const n = (value: number) => formatNumber(value, locale);
  const heading = title && !compact ? <h3 className="dist-title">{title}</h3> : null;

  if (dist.empty) {
    return (
      <div className={compact ? 'dist compact' : 'dist'} data-testid={testId}>
        {heading}
        <p className="denominator" data-testid="dist-not-provided">
          {t('label.notProvided')}
        </p>
      </div>
    );
  }

  const ofTotal = t('sentiment.ofTotal', { n: dist.total, count: n(dist.total) });
  const label = (key: string) => t(`${prefix}${key}`);
  const summary = `${dist.keys.map((key) => `${label(key)} ${n(dist.counts[key] ?? 0)}`).join(', ')}, ${ofTotal}`;

  const figures = rows ? (
    <div className="outcome-rows" role="img" aria-label={summary}>
      {dist.keys.map((key) => {
        const count = dist.counts[key] ?? 0;
        // A unitless 0–1 fraction for the bar's scaleX; the text is always the count itself.
        const style = { '--w': dist.total > 0 ? count / dist.total : 0 } as CSSProperties;
        return (
          <div className="outcome-row" key={key} aria-hidden="true">
            <span>{label(key)}</span>
            <span className="track">
              <i style={style} />
            </span>
            <span className="n">{n(count)}</span>
          </div>
        );
      })}
    </div>
  ) : (
    <div className="capsules" role="img" aria-label={summary}>
      {dist.keys.map((key) => {
        const count = dist.counts[key] ?? 0;
        const style = { '--g': count } as CSSProperties;
        return (
          <span className={`cap c-${key}`} key={key} style={style} aria-hidden="true">
            <b>{n(count)}</b>
            <em>{label(key)}</em>
          </span>
        );
      })}
    </div>
  );

  return (
    <div className={compact ? 'dist compact' : 'dist'} data-testid={testId}>
      {heading}
      {figures}
      <p className="denominator" data-testid="dist-denominator">
        {ofTotal}
      </p>
      {!compact && dist.notProvided > 0 ? (
        <p className="denominator not-provided" data-testid="dist-not-provided-count">
          {t('label.notProvidedCount', { count: n(dist.notProvided) })}
        </p>
      ) : null}
      {!compact && dist.limitedData ? (
        limitedNote === 'tag' ? (
          <span className="badge warn limited-tag" data-testid="dist-limited">
            {t('label.limitedData')}
          </span>
        ) : (
          <p className="limited" data-testid="dist-limited">
            <b>{t('label.limitedData')}</b>
            <span>{t('label.limitedDataWhy', { threshold: n(threshold) })}</span>
          </p>
        )
      ) : null}
    </div>
  );
}
