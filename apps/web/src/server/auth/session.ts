import type { DemoCurrentAccount } from '@rogikotha/contracts';
// The package, not the app's `@/i18n/routing` re-export: server code may not import web-shared
// (T-010 boundaries). Its navigation cannot load under Vitest (ISS-053), so tests mock this module.
import { redirect } from '@rogikotha/i18n';
import { getLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { cache } from 'react';

import { session } from '../data';
import { getAuth } from './instance';

export type CurrentAccount = DemoCurrentAccount;

/**
 * The signed-in account, or null when signed out. Once per request inside a render; a server
 * action calls it afresh.
 */
export const getCurrentAccount = cache(async (): Promise<CurrentAccount | null> => {
  const authSession = await getAuth().api.getSession({ headers: await headers() });
  if (!authSession) return null;
  const account = await session.getCurrentAccountByAuthUserId(authSession.user.id);
  // ASSUMPTION(demo-slice): only an active account counts as signed in; the slice has no
  // restriction or suspension screens yet.
  if (!account || account.status !== 'active') return null;
  return account;
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
