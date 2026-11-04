import { describe, expect, it } from 'vitest';

import { anAccountActor, anAnonymousActor, makeCommandPorts } from '../../../fakes-test-support';
import { listSessionsQuery } from '../queries/list-sessions';
import { signOutCommand } from './sign-out';
import { signOutEverywhereCommand } from './sign-out-everywhere';

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

async function twoSessions() {
  const world = makeCommandPorts();
  const account = await world.addAccount();
  const current = world.signInAs(account, CHROME_WINDOWS);
  world.fakes.clock.advanceMs(60_000);
  const other = world.signInAs(account);
  const call = world.callAs(anAccountActor(account), current);
  return { world, account, current, other, call };
}

describe('account.signOut', () => {
  it('revokes the current session only and audits it', async () => {
    const { world, current, other, call } = await twoSessions();

    const result = await signOutCommand.execute({}, call);

    expect(result).toEqual({ ok: true, data: { session: { kind: 'clear' } } });
    expect(world.fakes.store.sessions.has(current.sessionId)).toBe(false);
    expect(world.fakes.store.sessions.has(other.sessionId)).toBe(true);
    expect(world.fakes.audit.actions()).toEqual(['signed_out']);
  });

  it('refuses an anonymous caller', async () => {
    const world = makeCommandPorts();

    const result = await signOutCommand.execute({}, world.callAs(anAnonymousActor()));

    expect(result.ok ? null : result.error.code).toBe('forbidden');
  });
});

describe('account.signOutEverywhere', () => {
  it('revokes every session, the current one included, audits the count and emits signOutAll', async () => {
    const { world, account, call } = await twoSessions();

    const result = await signOutEverywhereCommand.execute({}, call);

    expect(result).toEqual({ ok: true, data: { revoked: 2, session: { kind: 'clear' } } });
    expect(world.fakes.store.sessions.size).toBe(0);
    expect(world.fakes.audit.events).toEqual([
      expect.objectContaining({ action: 'signed_out_everywhere', details: { revoked: 2 } }),
    ]);
    expect(world.fakes.outbox.events).toEqual([
      {
        name: 'account.securityEvent',
        payload: { accountId: account.accountId, kind: 'signOutAll' },
      },
    ]);
  });

  it('refuses an account Actor whose profile is gone', async () => {
    const world = makeCommandPorts();

    const result = await signOutEverywhereCommand.execute(
      {},
      world.callAs(anAccountActor({ accountId: 'missing', status: 'active' })),
    );

    expect(result.ok ? null : result.error.code).toBe('forbidden');
  });
});

describe('account.listSessions', () => {
  it('lists live sessions newest first with families, the current marker and no token or IP', async () => {
    const { world, current, other, call } = await twoSessions();

    const result = await listSessionsQuery.execute({}, call);

    expect(result.ok && result.data).toEqual([
      expect.objectContaining({ id: other.sessionId, current: false, browser: null, os: null }),
      expect.objectContaining({
        id: current.sessionId,
        current: true,
        browser: 'Chrome',
        os: 'Windows',
      }),
    ]);
    const first = result.ok ? result.data[0] : undefined;
    expect(Object.keys(first ?? {}).sort()).toEqual([
      'browser',
      'current',
      'firstSeen',
      'id',
      'lastSeen',
      'os',
    ]);
    expect(world.fakes.unitOfWork.outcomes).toEqual(['read']);
  });

  it('leaves out a session past the 30-day cap', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount();
    const old = world.fakes.authGateway.openSessionFor(
      account.authUserId,
      null,
      new Date(world.fakes.clock.now().getTime() - 31 * 24 * 60 * 60 * 1000),
    );
    world.signInAs(account);

    const result = await listSessionsQuery.execute({}, world.callAs(anAccountActor(account)));

    expect(result.ok && result.data.map((s) => s.id)).not.toContain(old);
    expect(result.ok && result.data).toHaveLength(1);
  });

  it('refuses an anonymous caller', async () => {
    const world = makeCommandPorts();

    const result = await listSessionsQuery.execute({}, world.callAs(anAnonymousActor()));

    expect(result.ok ? null : result.error.code).toBe('forbidden');
  });
});
