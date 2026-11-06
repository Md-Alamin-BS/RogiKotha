import { useTranslations } from 'next-intl';
import type { OwnAccountVM, SessionVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { ChangePasswordForm } from './ChangePasswordForm';
import { ResendOwnButton } from './ResendOwnButton';
import { SessionList } from './SessionList';
import { SignOutEverywhere } from './SignOutEverywhere';

function SectionFailed() {
  const t = useTranslations();
  return (
    <p className="callout warn" data-testid="security-section-failed">
      {t('errors.common.internal')}
    </p>
  );
}

/**
 * WF7, BR6.2-BR6.5: the holder's email row (masked only), password, sessions and sign out
 * everywhere. A section whose query failed says so, and the rest of the page still renders.
 */
export function SecuritySettings({
  account,
  sessions,
  locale,
}: {
  account: OwnAccountVM | null;
  sessions: SessionVM[] | null;
  locale: Locale;
}) {
  const t = useTranslations();
  return (
    <>
      <section className="sub" aria-labelledby="security-email-head">
        <h2 className="sub-head" id="security-email-head">
          {t('auth.security.email')}
        </h2>
        {account ? (
          <>
            <p data-testid="security-email">
              <span>{account.emailMasked}</span>
              {' · '}
              <span data-testid="security-email-status">
                {account.emailVerified
                  ? t('auth.security.verified')
                  : t('auth.security.unverified')}
              </span>
            </p>
            {account.emailVerified ? null : <ResendOwnButton />}
            <p className="sub">{t('auth.security.emailNote')}</p>
          </>
        ) : (
          <SectionFailed />
        )}
      </section>
      <section className="sub" aria-labelledby="security-password-head">
        <h2 className="sub-head" id="security-password-head">
          {t('auth.security.password')}
        </h2>
        <ChangePasswordForm />
      </section>
      <section className="sub" aria-labelledby="security-sessions-head">
        <h2 className="sub-head" id="security-sessions-head">
          {t('auth.security.sessions')}
        </h2>
        {sessions ? <SessionList sessions={sessions} locale={locale} /> : <SectionFailed />}
        <SignOutEverywhere />
      </section>
    </>
  );
}
