// Applies the gateway's `Set-Cookie` values to the server action's response (T-101 § 6.3). The
// values carry the session token, so they are written here and never returned to the browser in
// a result (BR8.3). There is no `nextCookies` plugin: plugins stay empty (BR7.7).
import type { SetCookieHeaders } from '@rogikotha/application';
import { parseSetCookieHeader, toCookieOptions } from 'better-auth/cookies';
import { cookies } from 'next/headers';

import type { AuthInstance } from './instance';

export async function applySetCookies(setCookies: SetCookieHeaders): Promise<void> {
  const store = await cookies();
  for (const header of setCookies) {
    for (const [name, attributes] of parseSetCookieHeader(header)) {
      store.set(name, attributes.value, toCookieOptions(attributes));
    }
  }
}

/** Removes the session cookies; the gateway already revoked the session row. */
export async function clearSessionCookies(auth: AuthInstance): Promise<void> {
  const context = await auth.$context;
  const store = await cookies();
  store.delete(context.authCookies.sessionToken.name);
  store.delete(context.authCookies.sessionData.name);
}
