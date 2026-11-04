// The library-call scope of T-101 § 10.2 and BR7.9. Every `AuthGateway` method runs its Better Auth
// call inside `runInScope`; the library's database hooks and email callbacks read the open scope,
// so they act only for the gateway call that asked, and never for a request that reached the
// library some other way.
import { AsyncLocalStorage } from 'node:async_hooks';

/** T-103 adds `staffSignIn` and `approveDevice`. */
export const SCOPE_PURPOSES = [
  'register',
  'issueVerification',
  'verify',
  'issueReset',
  'reset',
  'changePassword',
  'signIn',
] as const;
export type ScopePurpose = (typeof SCOPE_PURPOSES)[number];

export interface LibraryScope {
  readonly purpose: ScopePurpose;
  /** Set only by `createSession`, after the command decided the sign-in (BR3.8). */
  readonly sessionAllowed: boolean;
  /** The token an email callback handed back; read by the method that opened the scope. */
  token?: string;
  /** The user a session hook saw, so `verifyEmailToken` knows whose address was verified. */
  authUserId?: string;
}

const storage = new AsyncLocalStorage<LibraryScope>();

export function runInScope<T>(
  init: { purpose: ScopePurpose; sessionAllowed?: boolean },
  work: (scope: LibraryScope) => Promise<T>,
): Promise<T> {
  const scope: LibraryScope = {
    purpose: init.purpose,
    sessionAllowed: init.sessionAllowed ?? false,
  };
  return storage.run(scope, () => work(scope));
}

/** The open scope, or undefined outside every gateway call. */
export function currentScope(): LibraryScope | undefined {
  return storage.getStore();
}
