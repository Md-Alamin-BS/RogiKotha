// ISS-452 (review R-01): the auth library shares the web pool, so no command may call it while
// one of its own transactions holds a connection (functional-spec § 13 Q4). Every gateway call
// below records how many fake transactions were open at that moment.
import { describe, expect, it } from 'vitest';

import {
  anAccountActor,
  anAnonymousActor,
  makeCommandPorts,
  type FakeCommandWorld,
} from '../../../fakes-test-support';
import { listSessionsQuery } from '../queries/list-sessions';
import { changePasswordCommand } from './change-password';
import { registerCommand } from './register';
import { requestPasswordResetCommand } from './request-password-reset';
import { resendOwnVerificationCommand } from './resend-own-verification';
import { resendVerificationCommand } from './resend-verification';
import { resetPasswordCommand } from './reset-password';
import { signInCommand } from './sign-in';
import { signOutCommand } from './sign-out';
import { signOutEverywhereCommand } from './sign-out-everywhere';
import { verifyEmailCommand } from './verify-email';

const PASSWORD = 'correct-horse-battery';

interface LibraryCall {
  method: string;
  openTransactions: number;
}

/** Replaces the world's gateway with one that notes the open transactions at every call. */
function watchLibrary(world: FakeCommandWorld): LibraryCall[] {
  const calls: LibraryCall[] = [];
  const target = world.fakes.authGateway;
  world.ports.authGateway = new Proxy(target, {
    get(object, property, receiver) {
      const value: unknown = Reflect.get(object, property, receiver);
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        calls.push({
          method: String(property),
          openTransactions: world.fakes.unitOfWork.openTransactions,
        });
        return (value as (...a: unknown[]) => unknown).apply(object, args);
      };
    },
  });
  return calls;
}

function tokenIn(link: string | undefined): string {
  return decodeURIComponent((link ?? '').split('token=')[1] ?? '');
}

describe('library-first commands hold no transaction while the library works (ISS-452)', () => {
  it('registers, resends, verifies, signs in and lists with no transaction open', async () => {
    const world = makeCommandPorts();
    const calls = watchLibrary(world);
    const email = 'shirin.demo@example.test';
    const anonymous = () => world.callAs(anAnonymousActor());

    const registered = await registerCommand.execute(
      {
        email,
        password: PASSWORD,
        username: 'shirin_library_first',
        displayName: 'Shirin Demo',
        locale: 'en',
        ageConfirmed: true,
        termsAccepted: true,
      },
      anonymous(),
    );
    await resendVerificationCommand.execute({ email }, anonymous());
    const link = world.fakes.deliveries.all().at(-1)?.params.link;
    const verified = await verifyEmailCommand.execute({ token: tokenIn(link) }, anonymous());
    const signedIn = await signInCommand.execute({ email, password: PASSWORD }, anonymous());
    const accountId = registered.ok ? registered.data.accountId : '';
    const account = { accountId, status: 'active' as const };
    await listSessionsQuery.execute({}, world.callAs(anAccountActor(account)));

    expect([registered.ok, verified.ok, signedIn.ok]).toEqual([true, true, true]);
    expect(calls.map((c) => c.method)).toEqual(
      expect.arrayContaining([
        'createCredentialUser',
        'issueVerificationToken',
        'verifyEmailToken',
        'createSession',
        'listSessions',
      ]),
    );
    expect(calls.filter((c) => c.openTransactions > 0)).toEqual([]);
  });

  it('changes and resets the password and signs out with no transaction open', async () => {
    const world = makeCommandPorts();
    const calls = watchLibrary(world);
    const account = await world.addAccount({ password: PASSWORD });
    const call = world.callAs(anAccountActor(account), world.signInAs(account));

    const changed = await changePasswordCommand.execute(
      { currentPassword: PASSWORD, newPassword: 'next-correct-horse' },
      call,
    );
    await requestPasswordResetCommand.execute(
      { email: account.email },
      world.callAs(anAnonymousActor()),
    );
    const link = world.fakes.deliveries.all().at(-1)?.params.link;
    const reset = await resetPasswordCommand.execute(
      { token: tokenIn(link), newPassword: 'third-correct-horse' },
      world.callAs(anAnonymousActor()),
    );
    const again = world.callAs(anAccountActor(account), world.signInAs(account));
    await signOutCommand.execute({}, again);
    await signOutEverywhereCommand.execute({}, again);

    expect([changed.ok, reset.ok]).toEqual([true, true]);
    expect(calls.map((c) => c.method)).toEqual(
      expect.arrayContaining([
        'changePassword',
        'issueResetToken',
        'resetPassword',
        'revokeSession',
        'revokeSessions',
      ]),
    );
    expect(calls.filter((c) => c.openTransactions > 0)).toEqual([]);
  });

  it('resends own and compensates a failed register with no transaction open', async () => {
    const world = makeCommandPorts();
    const calls = watchLibrary(world);
    const pending = await world.addAccount({ status: 'pending_verification' });
    const resent = await resendOwnVerificationCommand.execute(
      {},
      world.callAs(anAccountActor(pending), world.signInAs(pending)),
    );
    world.fakes.unitOfWork.failCommits(1);

    const failed = await registerCommand.execute(
      {
        email: 'farid.demo@example.test',
        password: PASSWORD,
        username: 'farid_library_first',
        displayName: 'Farid Demo',
        locale: 'bn',
        ageConfirmed: true,
        termsAccepted: true,
      },
      world.callAs(anAnonymousActor()),
    );

    expect(resent.ok).toBe(true);
    expect(failed.ok ? null : failed.error.code).toBe('internal');
    expect(calls.map((c) => c.method)).toEqual(
      expect.arrayContaining(['issueVerificationToken', 'createCredentialUser', 'deleteUser']),
    );
    expect(calls.filter((c) => c.openTransactions > 0)).toEqual([]);
  });
});
