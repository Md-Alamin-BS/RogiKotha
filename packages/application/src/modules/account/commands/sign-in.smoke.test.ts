// T-101 smoke (team practice: one assertion per Unit): a confirmed account signs in with its
// password, and the cookie it gets back makes the next request that account's Actor.
import { expect, it } from 'vitest';

import { anAnonymousActor, makeCommandPorts } from '../../../fakes-test-support';
import { MAX_SESSION_AGE_MS, resolveActor } from '../resolve-actor';
import { signInCommand } from './sign-in';

it('signs a confirmed account in and resolves its next request to that account', async () => {
  const world = makeCommandPorts();
  const account = await world.addAccount({
    email: 'smoke.signin.demo@example.test',
    password: 'a synthetic secret 2026',
  });

  const result = await signInCommand.execute(
    { email: account.email, password: account.password },
    world.callAs(anAnonymousActor()),
  );
  if (!result.ok || result.data.session.kind !== 'set') throw new Error('sign-in set no cookie');
  const cookie = result.data.session.setCookies.map((c) => c.split(';')[0]).join('; ');
  const session = await world.ports.authGateway.getSession({
    get: (name) => (name.toLowerCase() === 'cookie' ? cookie : null),
  });
  const profile = session
    ? await world.ports.accounts.findProfileByAuthUserId({} as never, session.authUserId)
    : null;

  const { actor } = resolveActor({
    session,
    profile,
    locale: 'en',
    correlationId: '00000000-0000-4000-8000-000000000001',
    now: world.ports.clock.now(),
    maxSessionAgeMs: MAX_SESSION_AGE_MS,
  });

  expect(actor).toMatchObject({ kind: 'account', accountId: account.accountId });
});
