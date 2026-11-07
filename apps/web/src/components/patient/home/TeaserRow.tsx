import { useLocale, useTranslations } from 'next-intl';
import type { FacilityCardVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { Avatar } from '@/components/patient/shared/Avatar';
import { facilityLabel } from '@/components/patient/shared/FacilityLink';
import { MiniRow } from '@/components/patient/shared/MiniList';
import { teaserSub } from './teaser-sub';

// Wraps U46's MiniRow unchanged; the Limited data tag sits beside it, never inside it (R-02, BR2.3).
export function TeaserRow({ card }: { card: FacilityCardVM }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;

  return (
    <div className="teaser-row" data-testid="teaser-row">
      <MiniRow
        href={`/facilities/${card.publicId}`}
        avatar={<Avatar seed={card.publicId} hue={card.avatarHue} size={48} />}
        title={facilityLabel(card)}
        sub={teaserSub(card, t, locale)}
      />
      {card.feedbackVisible && card.accountsLimitedData ? (
        <span className="tag" data-testid="teaser-limited">
          {t('label.limitedData')}
        </span>
      ) : null}
    </div>
  );
}
