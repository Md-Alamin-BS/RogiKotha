import type { ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { getContributionAccess } from '@/server/actions/account';
import { safeAuthNext, type ContributionAccess } from '@/server/actions/auth-form';
import { ResendOwnButton } from './ResendOwnButton';

export type ContributionPurpose = 'write' | 'comment';

/**
 * The gate's body for one access state (WF9 step 3, BR8.2). It shows no address; `next` has
 * already passed `safeAuthNext`, and a refused `returnTo` is simply dropped.
 */
export function ContributionGatePanel({
  access,
  purpose,
  next,
}: {
  access: ContributionAccess;
  purpose: ContributionPurpose;
  next: string | null;
}) {
  const t = useTranslations();
  if (access === 'allowed') return null;
  if (access === 'unavailable') {
    return (
      <p className="note" data-testid="contribution-gate" data-access={access}>
        {t('auth.gate.unavailable')}
      </p>
    );
  }
  if (access === 'unconfirmed') {
    return (
      <div className="callout" data-testid="contribution-gate" data-access={access}>
        <b>{t('auth.verifyPending')}</b>
        <p>{t('auth.gate.verifyToAct')}</p>
        <ResendOwnButton />
        <p className="sub" style={{ marginTop: '10px' }}>
          <Link className="link-btn" href="/me/security" data-testid="contribution-gate-security">
            {t('auth.security.nav')}
          </Link>
        </p>
      </div>
    );
  }
  const query = next ? { next } : undefined;
  return (
    <div className="callout" data-testid="contribution-gate" data-access="signed-out">
      <b>{t('auth.gate.title')}</b>
      <p>{t(purpose === 'write' ? 'auth.gate.writeBody' : 'auth.gate.commentBody')}</p>
      <p className="sub">
        <Link
          className="btn"
          href={query ? { pathname: '/sign-in', query } : '/sign-in'}
          data-testid="contribution-gate-sign-in"
        >
          {t('auth.signIn.label')}
        </Link>{' '}
        <Link
          className="btn ghost"
          href={query ? { pathname: '/register', query } : '/register'}
          data-testid="contribution-gate-register"
        >
          {t('auth.gate.register')}
        </Link>
      </p>
    </div>
  );
}

/**
 * C16 (frozen when U9 merges): mounted by U47 and U49 above their own form, which they render only
 * when `getContributionAccess()` answers `allowed`. It never throws into its page: any error reads
 * as signed out (fail closed, BR8.3), and the commands still refuse on their own (C9, C10).
 */
export async function ContributionGate({
  purpose,
  returnTo,
}: {
  purpose: ContributionPurpose;
  returnTo: string;
}): Promise<ReactElement | null> {
  let access: ContributionAccess;
  try {
    access = await getContributionAccess();
  } catch {
    // getContributionAccess logs its own failures; a throw past it still must not break the page.
    access = 'signed-out';
  }
  return <ContributionGatePanel access={access} purpose={purpose} next={safeAuthNext(returnTo)} />;
}
