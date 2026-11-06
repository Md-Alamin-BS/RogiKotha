import { useLocale, useTranslations } from 'next-intl';
import type { ConditionCountVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';
import { filterHref, type ProfileFilters } from '@/lib/doctor-filters';

/** The filters without the condition, which keeps every other filter (BR3.5). */
function withoutCondition({ condition: _c, ...rest }: ProfileFilters): ProfileFilters {
  void _c;
  return rest;
}

// The prototype's condition pills (renderProfile): links, so they work without script; the
// selected pill links back to the unscoped page.
export function ConditionPills({
  publicId,
  filters,
  conditions,
  total,
}: {
  publicId: string;
  filters: ProfileFilters;
  conditions: ConditionCountVM[];
  total: number;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const rest = withoutCondition(filters);

  return (
    <div className="pillrow" role="group" aria-label={t('filter.condition')}>
      <Link
        href={filterHref(publicId, rest)}
        scroll={false}
        prefetch={false}
        aria-current={filters.condition ? undefined : 'true'}
        data-testid="condition-pill-all"
      >
        {`${t('profile.allConditions')} (${formatNumber(total, locale)})`}
      </Link>
      {conditions.map((condition) => {
        const selected = filters.condition === condition.publicId;
        const href = filterHref(
          publicId,
          selected ? rest : { ...rest, condition: condition.publicId },
        );
        return (
          <Link
            key={condition.publicId}
            href={href}
            scroll={false}
            prefetch={false}
            aria-current={selected ? 'true' : undefined}
            data-testid="condition-pill"
          >
            {`${condition.name} (${formatNumber(condition.count, locale)})`}
          </Link>
        );
      })}
    </div>
  );
}
