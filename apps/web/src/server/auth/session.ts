import type { DemoCurrentAccount } from '@rogikotha/contracts';
// The package, not the app's `@/i18n/routing` re-export: server code may not import web-shared
// (T-010 boundaries). Its navigation cannot load under Vitest (ISS-053), so tests mock this module.
import { redirect } from '@rogikotha/i18n';
import { getLocale } from 'next-intl/server';
import { cache } from 'react';

import { getRequestContext } from '../auth';
import { session as demoSession } from '../data';
import { contributionAccessOf } from './contribution-access';

export type CurrentAccount = DemoCurrentAccount;

/**
 * The signed-in account for the demo pages, or null when signed out. The session and the status
 * come from T-101's `getActor()` (ISS-391), so a suspended, banned or deleted account is signed out
 * on its next request. Once per request inside a render; a server action calls it afresh.
 *
 * An unconfirmed (pending) or restricted account counts as signed in here, as `getActor()` says,
 * so it can still reach `/me` and `/me/security`; the write actions refuse it through
 * `requireContributor()` (BR8.1).
 */
export const getCurrentAccount = cache(async (): Promise<CurrentAccount | null> => {
  const { actor, session } = await getRequestContext();
  if (actor.kind !== 'account' || !session) return null;
  return demoSession.getCurrentAccountByAuthUserId(session.authUserId);
});

/**
 * The signed-in account, or a redirect to the sign-in page in the active locale. `returnTo` is
 * passed on as `?next=`; the sign-in page must accept only a same-site path from it.
 */
export async function requireAccount(options: { returnTo?: string } = {}): Promise<CurrentAccount> {
  const account = await getCurrentAccount();
  if (account) return account;
  const locale = await getLocale();
  const href = options.returnTo
    ? { pathname: '/sign-in', query: { next: options.returnTo } }
    : '/sign-in';
  return redirect({ href, locale });
}

/**
 * The signed-in account when it may write or comment (BR8.1, the same rule as the C16 gate);
 * otherwise a redirect, so a hand-built POST that skips the gate is refused before any data is read.
 * Signed out goes to sign-in as `requireAccount` does; unconfirmed goes to the confirm screen.
 *
 * ASSUMPTION(U9): any other state (release 2's `restricted`) goes to `/me`, which shows no form.
 */
export async function requireContributor(
  options: { returnTo?: string } = {},
): Promise<CurrentAccount> {
  const account = await requireAccount(options);
  const { actor } = await getRequestContext();
  const access = contributionAccessOf(actor);
  if (access === 'allowed') return account;
  const locale = await getLocale();
  return redirect({ href: access === 'unconfirmed' ? '/verify-email' : '/me', locale });
}
