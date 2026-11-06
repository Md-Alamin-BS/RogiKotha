import type { CSSProperties } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { ConditionMentionVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';

// Port of concept-04b's tagFrequency() (app.js): counts what authors wrote, not what a doctor should
// prescribe. Bars are drawn relative to the most-mentioned item, so the first bar is full width;
// each row still prints its exact count. Absent when nothing was mentioned (BR3.6).
export function FreqList({
  title,
  items,
  total,
  testId,
}: {
  title: string;
  items: ConditionMentionVM[];
  total: number;
  testId?: string | undefined;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  if (items.length === 0) return null;
  const sorted = [...items].sort((a, b) => b.count - a.count);
  const max = sorted[0]?.count ?? 0;

  return (
    <section className="panel" data-testid={testId}>
      <h2>{title}</h2>
      <p className="note">{t('condition.mentionNote')}</p>
      <ul className="freq-list">
        {sorted.map((item) => {
          const style = { '--w': max > 0 ? item.count / max : 0 } as CSSProperties;
          return (
            <li key={item.label} data-testid="freq-row">
              <span>{item.label}</span>
              <span className="track" aria-hidden="true">
                <i style={style} data-testid="freq-bar" />
              </span>
              <span className="n">{formatNumber(item.count, locale)}</span>
            </li>
          );
        })}
      </ul>
      <p className="denominator">
        {t('condition.countedFrom', { n: total, count: formatNumber(total, locale) })}
      </p>
    </section>
  );
}
