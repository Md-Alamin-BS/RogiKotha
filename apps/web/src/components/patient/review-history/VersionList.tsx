import type { ReviewVersionVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatMonthYear, formatNumber } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';

import { dhakaMonthYear } from '@/components/patient/experience/people';

// The author's own list of versions, newest first, with no text (BR4.3). The page renders it only
// when the query returned `versions`, which it does for the author alone.
export function VersionList({ versions }: { versions: readonly ReviewVersionVM[] }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  return (
    <details className="version-list" data-testid="version-list">
      <summary>{t('history.yourVersions')}</summary>
      <ol>
        {versions.map((version) => {
          const when = dhakaMonthYear(new Date(version.at));
          const fields = version.fields.map((field) => t(`history.field.${field}`)).join(', ');
          return (
            <li key={version.version}>
              <span>{t('history.version', { n: formatNumber(version.version, locale) })}</span>
              {' · '}
              <time dateTime={`${when.year}-${String(when.month).padStart(2, '0')}`}>
                {formatMonthYear(when, locale)}
              </time>
              {' · '}
              <span>{t(`history.kind.${version.kind}`)}</span>
              {version.kind === 'corrected' && fields ? <span>{` (${fields})`}</span> : null}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
