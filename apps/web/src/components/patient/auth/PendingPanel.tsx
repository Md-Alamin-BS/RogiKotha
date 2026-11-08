import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ResendLinkForm } from './ResendLinkForm';
import { ResendOwnButton } from './ResendOwnButton';

/**
 * WF2: the "check your email" panel, also shown as the expired panel (WF3 step 5). Signed out, the
 * resend takes an address and the panel links to sign in with `next`; signed in, it is one button
 * and no address is shown (BR2.3-BR2.5).
 */
export function PendingPanel({
  address,
  signedIn,
  expired,
  next,
  devInboxUrl = null,
}: {
  address: string | null;
  signedIn: boolean;
  expired: boolean;
  next: string | null;
  /** The local Mailpit inbox, passed only outside production (WF2 step 4). */
  devInboxUrl?: string | null;
}) {
  const t = useTranslations();
  return (
    <div data-testid="verify-pending-panel" data-expired={expired ? 'true' : 'false'}>
      {expired ? (
        <p className="callout warn" data-testid="verify-expired">
          {t('auth.verify.expired')}
        </p>
      ) : null}
      {/* fix: U50 (ISS-785): the class lets a long address wrap at 360 px. */}
      <p className="verify-body">
        {address ? t('auth.verify.body', { email: address }) : t('auth.verify.bodyNoEmail')}
      </p>
      <p className="sub">{t('auth.verify.expires')}</p>
      {signedIn ? <ResendOwnButton /> : <ResendLinkForm defaultEmail={address ?? ''} />}
      {signedIn ? null : (
        <p className="sub" style={{ marginTop: '14px' }}>
          <Link
            className="link-btn"
            href={next ? { pathname: '/sign-in', query: { next } } : '/sign-in'}
            data-testid="verify-sign-in-link"
          >
            {t('auth.signIn.label')}
          </Link>
        </p>
      )}
      {devInboxUrl ? (
        <p className="sub" style={{ marginTop: '6px' }}>
          <a className="link-btn" href={devInboxUrl} data-testid="verify-dev-inbox-link">
            {t('auth.verify.devInbox')}
          </a>
        </p>
      ) : null}
    </div>
  );
}
