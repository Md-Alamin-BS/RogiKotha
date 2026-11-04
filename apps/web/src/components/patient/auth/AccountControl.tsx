'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { signOut } from '@/server/actions/auth';
import { Icon } from '../../shared/Icon';
import { Sheet } from '../../shared/Sheet';

/** What the masthead may know about the reader: the display name only, never ids or the email. */
export interface MastheadAccount {
  displayName: string;
}

/** Port of app.js's initials(): first letters of the first and last word, case kept as written. */
export function accountInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  const first = Array.from(words[0] ?? '')[0] ?? '';
  const last = words.length > 1 ? (Array.from(words[words.length - 1] ?? '')[0] ?? '') : '';
  return first + last;
}

// Port of app.js's renderAccountEntry() and its `#account` menu sheet (concept-04b, lines ~2328
// and ~3202). The menu keeps the slice's links only: the workspace and sign out.
export function AccountControl({ account }: { account: MastheadAccount | null }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!account) {
    return (
      <Link
        id="account"
        href="/sign-in"
        className="ctl"
        title={t('auth.signIn.title')}
        data-testid="masthead-account-sign-in-link"
      >
        <Icon name="person" />
      </Link>
    );
  }

  return (
    <>
      <button
        id="account"
        type="button"
        className="ctl account"
        data-verified="true"
        title={account.displayName}
        aria-label={t('auth.accountMenu', { name: account.displayName })}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="masthead-account-menu-button"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">{accountInitials(account.displayName)}</span>
      </button>
      <Sheet open={open} title={account.displayName} onClose={close}>
        <p className="sub">
          <Link className="link-btn" href="/me" onClick={close} data-testid="account-menu-me-link">
            {t('nav.mine')}
          </Link>
        </p>
        <form action={signOut}>
          <p className="sub" style={{ marginTop: '10px' }}>
            <button
              className="link-btn"
              type="submit"
              id="account-signout"
              data-testid="account-menu-sign-out-button"
            >
              {t('auth.signOut')}
            </button>
          </p>
        </form>
      </Sheet>
    </>
  );
}
