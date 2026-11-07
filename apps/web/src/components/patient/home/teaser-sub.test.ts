import { describe, expect, it } from 'vitest';
import { createTranslator } from 'next-intl';
import {
  aFacilityCard,
  loadMessages,
  type TestLocale,
} from '@/components/patient/doctors/directory-test-support';
import { teaserSub, type TeaserTranslate } from './teaser-sub';

describe.each(['en', 'bn'] as const)('teaserSub (%s)', (locale: TestLocale) => {
  const t = createTranslator({ locale, messages: loadMessages(locale) }) as TeaserTranslate;
  const latin = locale === 'en';

  it('reads type, place and the visit count when feedback is visible', () => {
    const card = aFacilityCard({
      type: 'clinic',
      area: 'Mirpur',
      city: 'Dhaka',
      accountsTotal: 12,
    });
    const sub = teaserSub(card, t, locale);

    expect(sub).toBe(
      [
        t('facility.type.clinic'),
        'Mirpur, Dhaka',
        t('facility.visitCount', { n: 12, count: latin ? '12' : '১২' }),
      ].join(' · '),
    );
    expect(sub).toContain(latin ? '12' : '১২');
    if (!latin) expect(sub).not.toMatch(/[0-9]/);
  });

  it('says a zero count in words and never shows 0', () => {
    const sub = teaserSub(aFacilityCard({ accountsTotal: 0 }), t, locale);

    expect(sub.endsWith(t('facility.noVisits'))).toBe(true);
    expect(sub).not.toMatch(/[0০]/);
  });

  it('shows only type and place when facility feedback is hidden', () => {
    const card = aFacilityCard({
      type: 'diagnostic',
      area: 'Agrabad',
      city: 'Chattogram',
      feedbackVisible: false,
      accountsTotal: 5,
    });

    expect(teaserSub(card, t, locale)).toBe(
      `${t('facility.type.diagnostic')} · Agrabad, Chattogram`,
    );
  });

  it('leaves out a missing area instead of an empty place part', () => {
    const card = aFacilityCard({ city: 'Sylhet', feedbackVisible: false });
    delete card.area;

    expect(teaserSub(card, t, locale)).toBe(`${t('facility.type.hospital')} · Sylhet`);
  });
});
