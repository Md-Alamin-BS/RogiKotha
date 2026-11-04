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

const SECURE_PREFIX = '__Secure-';

/** The library adds `__Secure-` when APP_URL is https; either spelling may be in the browser. */
function bothSpellings(name: string): string[] {
  const bare = name.startsWith(SECURE_PREFIX) ? name.slice(SECURE_PREFIX.length) : name;
  return [bare, `${SECURE_PREFIX}${bare}`];
}

/** Removes the session cookies; the gateway already revoked the session row. */
export async function clearSessionCookies(auth: AuthInstance): Promise<void> {
  const context = await auth.$context;
  const store = await cookies();
  for (const cookie of [context.authCookies.sessionToken, context.authCookies.sessionData]) {
    for (const name of bothSpellings(cookie.name)) {
      // A browser ignores a `__Secure-` cookie without `Secure`, even one sent to delete it.
      store.delete({
        name,
        path: cookie.attributes.path ?? '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: name.startsWith(SECURE_PREFIX),
      });
    }
  }
}
