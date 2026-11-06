import { useTranslations } from 'next-intl';
import type { DemoOwnReviewRow, DemoProfile, Locale } from '@rogikotha/contracts';
import { formatDate } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';

import { dhakaIsoDate } from './dates';
import { DisplayNameForm } from './DisplayNameForm';
import { LanguageForm } from './LanguageForm';
import { OwnReviewList } from './OwnReviewList';

// Port of the prototype's renderMine (app.js §8): the head, the author's own experiences, then
// the profile and preference sections. FR2.1-FR2.3.
// ASSUMPTION(demo-slice): the workspace tabs, drafts, appeal, feedback and data-request sections are
// left out (FD-099 scope), and the section heads are h2, not the prototype's h4, so no level is
// skipped after the view's h1.
export function ProfileWorkspace({
  profile,
  reviews,
  locale,
}: {
  profile: DemoProfile;
  reviews: DemoOwnReviewRow[];
  locale: Locale;
}) {
  const t = useTranslations();
  const joined = formatDate(dhakaIsoDate(profile.createdAt), locale);

  return (
    <>
      <section className="a-head" data-testid="profile-head">
        <span className="kicker">
          {profile.displayName} · @{profile.username}
        </span>
        <p className="note">{t('mine.profile.joined', { date: joined })}</p>
      </section>
      <OwnReviewList reviews={reviews} locale={locale} />
      <section className="sub" aria-labelledby="profile-details-head">
        <h2 className="sub-head" id="profile-details-head">
          {t('mine.profile.heading')}
        </h2>
        <div className="field">
          <span className="lbl">{t('auth.username')}</span>
          <p data-testid="profile-username">@{profile.username}</p>
          <p className="sub">{t('mine.profile.usernameNote')}</p>
        </div>
        <DisplayNameForm displayName={profile.displayName} />
      </section>
      <section className="sub" aria-labelledby="profile-preferences-head">
        <h2 className="sub-head" id="profile-preferences-head">
          {t('user2.preferences')}
        </h2>
        <LanguageForm current={profile.locale} />
        <p className="sub" style={{ marginTop: '14px' }}>
          <Link className="link-btn" href="/me/security" data-testid="profile-security-link">
            {t('auth.security.nav')}
          </Link>
        </p>
      </section>
    </>
  );
}
