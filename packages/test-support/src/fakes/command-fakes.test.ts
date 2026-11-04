// The T-101 port fakes that application tests lean on: the rolling-back unit of work, the windowed
// limiter, the gateway over the shared auth store, and the email-delivery repository.
import { ok, err } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { FakeAuthGateway, sessionHeaders } from './auth-gateway.js';
import { FakeAuthStore } from './auth-store.js';
import { ClockSleeper, FakeClock, ImmediateAfterResponse } from './clock.js';
import { anAccountActor, anAnonymousActor, makeCommandPorts } from './command-ports.js';
import { FakeEmailDeliveryRepository } from './email-delivery-repository.js';
import { FastHasher } from './hasher.js';
import { ListOutbox } from './outbox.js';
import { WindowedRateLimiter } from './rate-limiter.js';
import { InMemoryUnitOfWork } from './unit-of-work.js';

const tx = {} as never;

describe('InMemoryUnitOfWork', () => {
  it('keeps the writes of a committed transaction', async () => {
    const outbox = new ListOutbox();
    const uow = new InMemoryUnitOfWork([outbox]);

    await uow.run(async (t) => {
      await outbox.append(t, 'account.registered', { accountId: 'a1' });
      return ok(null);
    });

    expect(outbox.events).toHaveLength(1);
    expect(uow.outcomes).toEqual(['commit']);
  });

  it('undoes the writes of a transaction that returned an error or threw', async () => {
    const outbox = new ListOutbox();
    const uow = new InMemoryUnitOfWork();
    uow.enlist(outbox);

    await uow.run(async (t) => {
      await outbox.append(t, 'account.registered', { accountId: 'a1' });
      return err('internal');
    });
    await expect(
      uow.run(async (t) => {
        await outbox.append(t, 'account.registered', { accountId: 'a2' });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(outbox.events).toEqual([]);
    expect(uow.count('rollback')).toBe(2);
  });

  it('commits a recorded error and fails the scripted number of commits', async () => {
    const outbox = new ListOutbox();
    const uow = new InMemoryUnitOfWork([outbox]);
    uow.failCommits(1);

    await expect(uow.run(() => Promise.resolve(ok(null)))).rejects.toThrow(/commit failed/);
    const recorded = await uow.run(() =>
      Promise.resolve({
        ...(err('forbidden') as { ok: false; error: never }),
        recorded: true as const,
      }),
    );

    expect(recorded.ok).toBe(false);
    expect(uow.outcomes).toEqual(['rollback', 'commit']);
    expect(await uow.read(() => Promise.resolve('read'))).toBe('read');
  });
});

describe('WindowedRateLimiter', () => {
  it('allows hits up to the limit in a sliding window and answers the wait', async () => {
    const clock = new FakeClock();
    const limiter = new WindowedRateLimiter(clock);
    for (let i = 0; i < 3; i += 1) await limiter.hit('resend:email:k', 3, 3600);

    const refused = await limiter.hit('resend:email:k', 3, 3600);
    clock.advanceMs(3600 * 1000);
    const later = await limiter.hit('resend:email:k', 3, 3600);

    expect(refused).toEqual({ allowed: false, retryAfter: 3600 });
    expect(later.allowed).toBe(true);
  });

  it('keeps reserved failures per key inside the window and forgets them on clear', async () => {
    const clock = new FakeClock();
    const limiter = new WindowedRateLimiter(clock);
    await limiter.reserveFailure('signin:email:a', 900);
    clock.advanceMs(1000);
    await limiter.reserveFailure('signin:email:a', 900);
    await limiter.reserveFailure('signin:email:b', 900);

    expect((await limiter.reserveFailure('signin:email:a', 900)).earlier).toHaveLength(2);
    clock.advanceMs(900_000);
    expect((await limiter.reserveFailure('signin:email:a', 900)).earlier).toHaveLength(0);
    await limiter.clear('signin:email:a');
    expect((await limiter.reserveFailure('signin:email:a', 900)).earlier).toEqual([]);
    expect(limiter.calls.map((c) => c.method)).toContain('clear');
  });

  it('takes a released failure off the count', async () => {
    const limiter = new WindowedRateLimiter(new FakeClock());
    const released = await limiter.reserveFailure('signin:email:a', 900);
    await limiter.reserveFailure('signin:email:b', 900);

    await released.release();
    await released.release();

    expect(limiter.keysWithFailures()).toEqual(['signin:email:b']);
    expect(limiter.failureCount('signin:email:a')).toBe(0);
  });
});

describe('FakeAuthGateway', () => {
  function gateway() {
    const clock = new FakeClock();
    const store = new FakeAuthStore();
    return { clock, store, gateway: new FakeAuthGateway(store, new FastHasher(), clock) };
  }

  it('creates a credential user once per address and deletes it with its sessions', async () => {
    const { store, gateway: g } = gateway();

    const first = await g.createCredentialUser({
      email: 'shirin.demo@example.test',
      password: 'pw-123456789',
    });
    const again = await g.createCredentialUser({
      email: 'shirin.demo@example.test',
      password: 'x',
    });
    const id = first.ok ? first.data.authUserId : '';
    g.openSessionFor(id);
    await g.deleteUser(id);

    expect(again).toEqual({ ok: false, error: { code: 'email_exists' } });
    expect(store.users.size).toBe(0);
    expect(store.sessions.size).toBe(0);
  });

  it('mints a session for the right password, reads it from the cookie and lists it', async () => {
    const { gateway: g } = gateway();
    const user = await g.createCredentialUser({
      email: 'shirin.demo@example.test',
      password: 'pw-123456789',
    });
    const authUserId = user.ok ? user.data.authUserId : '';

    const wrong = await g.createSession({ email: 'shirin.demo@example.test', password: 'nope' });
    const right = await g.createSession({
      email: 'shirin.demo@example.test',
      password: 'pw-123456789',
    });
    const sessionId =
      (right.ok ? (right.data.setCookies[0] ?? '') : '').split(';')[0]?.split('=')[1] ?? '';

    expect(wrong).toEqual({ ok: false, error: { code: 'invalid_credentials' } });
    expect((await g.getSession(sessionHeaders(sessionId)))?.authUserId).toBe(authUserId);
    expect(await g.getSession(sessionHeaders(null))).toBeNull();
    expect(await g.listSessions(authUserId)).toHaveLength(1);
    await g.revokeSession(sessionId);
    expect(await g.revokeSessions(authUserId)).toEqual({ revoked: 0 });
  });

  it('answers the scripted library error once, and user_not_found for an unknown address', async () => {
    const { gateway: g } = gateway();
    g.failNext('createSession');

    expect(await g.createSession({ email: 'a@example.test', password: 'x' })).toEqual({
      ok: false,
      error: { code: 'library_error' },
    });
    expect(await g.issueResetToken('nobody.demo@example.test')).toEqual({
      ok: false,
      error: { code: 'user_not_found' },
    });
    expect(g.called('createSession')).toBe(1);
  });

  it('expires a reset token after an hour and consumes it on use', async () => {
    const { clock, gateway: g } = gateway();
    await g.createCredentialUser({ email: 'shirin.demo@example.test', password: 'pw-123456789' });
    const issued = await g.issueResetToken('shirin.demo@example.test');
    const token = issued.ok ? issued.data.token : '';

    const used = await g.resetPassword({ token, newPassword: 'new-pw-12345' });
    const reused = await g.resetPassword({ token, newPassword: 'new-pw-12345' });
    const late = await g.issueResetToken('shirin.demo@example.test');
    clock.advanceMs(60 * 60 * 1000);
    const expired = await g.resetPassword({
      token: late.ok ? late.data.token : '',
      newPassword: 'x'.repeat(10),
    });

    expect(used.ok).toBe(true);
    expect(reused).toEqual({ ok: false, error: { code: 'token_invalid' } });
    expect(expired).toEqual({ ok: false, error: { code: 'token_expired' } });
  });
});

describe('FakeEmailDeliveryRepository', () => {
  it('finds the newest delivery of a key since a time and refuses a repeated dedupe key', async () => {
    const clock = new FakeClock();
    const repo = new FakeEmailDeliveryRepository(clock);
    const row = {
      id: 'd1',
      accountId: 'a1',
      toEmailEnc: new Uint8Array([1]),
      locale: 'en' as const,
      category: 'security' as const,
      messageKey: 'email.existing' as const,
      params: { link: 'http://localhost:3000/en/sign-in' },
      dedupeKey: 'k1',
    };
    await repo.insert(tx, row);

    const since = new Date(clock.now().getTime() - 1);
    expect(
      await repo.findRecent(tx, { accountId: 'a1', messageKey: 'email.existing', since }),
    ).toMatchObject({ id: 'd1' });
    expect(await repo.findByDedupeKey(tx, 'k1')).toEqual({ id: 'd1' });
    await expect(repo.insert(tx, { ...row, id: 'd2' })).rejects.toThrow(/dedupe_key/);
    await expect(repo.markSent(tx, 'missing', clock.now())).rejects.toThrow(/no delivery/);
  });
});

describe('the command world', () => {
  it('wires every command port and builds Actors and calls', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount({ status: 'pending_verification' });
    const { headers, sessionId } = world.signInAs(account, 'agent');

    const call = world.callAs(anAccountActor(account), { headers, sessionId, clientAddress: null });

    expect(call.request).toMatchObject({ sessionId, clientAddress: null });
    expect(headers.get('user-agent')).toBe('agent');
    expect(anAccountActor(account).emailVerified).toBe(false);
    expect(anAnonymousActor().kind).toBe('anonymous');
    expect(world.fakes.hasher.hashCalls).toBe(0);
  });

  it('runs scheduled tasks on settle and moves the clock while sleeping', async () => {
    const clock = new FakeClock();
    const sleeper = new ClockSleeper(clock);
    const after = new ImmediateAfterResponse();
    const ran: string[] = [];

    after.run(() => Promise.resolve(void ran.push('task')));
    expect(ran).toEqual([]);
    await after.settle();
    await sleeper.sleep(250);

    expect(ran).toEqual(['task']);
    expect(sleeper.waits).toEqual([250]);
    expect(clock.now().toISOString()).toBe('2026-09-01T00:00:00.250Z');
  });
});
