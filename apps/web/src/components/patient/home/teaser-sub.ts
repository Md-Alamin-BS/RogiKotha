import type { FacilityCardVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';

export type TeaserTranslate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The teaser row's sub-line: type, place, then the visit count in words or figures. A zero is said
 * in words (BR2.2); with facility feedback hidden no count appears at all (BR2.3).
 */
export function teaserSub(card: FacilityCardVM, t: TeaserTranslate, locale: Locale): string {
  const parts = [t(`facility.type.${card.type}`)];
  const place = [card.area, card.city].filter((p): p is string => Boolean(p));
  if (place.length > 0) parts.push(place.join(', '));
  if (card.feedbackVisible) {
    const accounts = card.accountsTotal ?? 0;
    parts.push(
      accounts > 0
        ? t('facility.visitCount', { n: accounts, count: formatNumber(accounts, locale) })
        : t('facility.noVisits'),
    );
  }
  return parts.join(' · ');
}
