import { useLocale, useTranslations } from 'next-intl';
import type { FacilityAccountVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatMonthYear } from '@rogikotha/i18n/format';
import { Byline } from '@/components/patient/experience/Byline';
import { bylineIdentity } from '@/components/patient/experience/people';
import { bylineName } from '@/components/patient/shared/AccountRow';

// One described visit: the overall answer, the period, the byline, the full text and a tag per
// answered criterion. Nothing here reaches a doctor's figures (BR2.6).
export function FacilityAccountRow({ account }: { account: FacilityAccountVM }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const overall = account.overall ? t(`crit.${account.overall}`) : t('label.notProvided');
  return (
    <article className="acct" data-testid="facility-visit">
      <div className="row-flags">
        <span className="badge plain">{`${t('crit.overall')}: ${overall}`}</span>
        <span className="badge plain">
          {`${t('review.episodeDate')}: ${formatMonthYear(account.period, locale)}`}
        </span>
      </div>
      <Byline
        variant="row"
        name={bylineName(account.author)}
        identity={bylineIdentity(account.author.personaKind)}
      />
      <p className="excerpt">{account.body}</p>
      {account.criteria.length > 0 ? (
        <div className="tag-row">
          {account.criteria
            .filter((c) => c.key !== 'overall')
            .map((c) => (
              <span className="tag" key={c.key}>
                {`${t(`crit.${c.key}`)}: ${t(`crit.${c.value}`)}`}
              </span>
            ))}
        </div>
      ) : null}
    </article>
  );
}
