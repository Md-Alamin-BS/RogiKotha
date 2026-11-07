import type { ExperiencePageVM, ExperienceTagVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatMonthYear } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { ConditionLink } from '@/components/patient/shared/ConditionLink';
import { DoctorLink } from '@/components/patient/shared/DoctorLink';
import { MemberAdded } from '@/components/patient/shared/MemberAdded';
import { NotVerified } from '@/components/patient/shared/NotVerified';

function TagChip({ tag }: { tag: ExperienceTagVM }) {
  const t = useTranslations();
  if ('notSure' in tag) return <span className="tag">{t('compose.notSure')}</span>;
  if (tag.group === 'condition' && tag.conditionPublicId) {
    return (
      <span className="tag">
        <ConditionLink publicId={tag.conditionPublicId} label={tag.name} />
      </span>
    );
  }
  // A typed tag is shown as written, marked as wording not yet mapped (BR5.6).
  return (
    <span className="tag" title={tag.provisional ? t('condition.provisional') : undefined}>
      {tag.name}
    </span>
  );
}

// The provenance margin (concept-04b renderAccount, `.a-margin`): period, published month, the
// doctor with Registration not verified, the tags and the author's other experiences (BR5.6, BR5.8).
export function ExperienceMargin({ vm }: { vm: ExperiencePageVM }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const published = vm.publishedAt
    ? formatMonthYear(
        { year: Number(vm.publishedAt.slice(0, 4)), month: Number(vm.publishedAt.slice(5, 7)) },
        locale,
      )
    : null;

  return (
    <aside className="a-margin" data-testid="experience-margin">
      {vm.byline.personaKind === 'anonymous' ? (
        <div>
          <span className="k">{t('compose.identity.anon')}</span>
          <span className="v">{t('compose.identity.anonNote')}</span>
        </div>
      ) : null}
      <div>
        <span className="k">{t('review.episodeDate')}</span>
        <span className="v">{formatMonthYear(vm.period, locale)}</span>
      </div>
      {published ? (
        <div>
          <span className="k">{t('byline.published')}</span>
          <span className="v">{published}</span>
        </div>
      ) : null}
      <div>
        <span className="k">{t('profile.kicker')}</span>
        <DoctorLink publicId={vm.doctor.publicId} label={vm.doctor.name} />
        <br />
        <NotVerified kind="doctor" />
        {vm.doctor.memberAddedNotConfirmed ? (
          <>
            {' '}
            <MemberAdded />
          </>
        ) : null}
      </div>
      {vm.tags.length > 0 ? (
        <div>
          <span className="k">{t('review.tags')}</span>
          <span className="tag-row">
            {vm.tags.map((tag, index) => (
              <TagChip key={index} tag={tag} />
            ))}
          </span>
        </div>
      ) : null}
      {vm.otherByAuthor.length > 0 ? (
        <div data-testid="experience-other-by-author">
          <span className="k">{t('experience.otherAccounts')}</span>
          {vm.otherByAuthor.map((card) => (
            <Link
              key={card.publicId}
              className="link-btn margin-link"
              href={`/experiences/${card.publicId}`}
            >
              {card.title}
            </Link>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
