import type { RegisterInput } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import {
  anAnonymousActor,
  FAKE_APP_URL,
  FAKE_TERMS_VERSION,
  makeCommandPorts,
  type FakeCommandWorld,
} from '../../../fakes-test-support';
import { REGISTER_FLOOR_MS } from '../timing';
import { registerCommand } from './register';
import { resendVerificationCommand } from './resend-verification';

let n = 0;
function aRegistration(overrides: Partial<RegisterInput> = {}): RegisterInput {
  n += 1;
  return {
    email: `shirin.demo+${n}@example.test`,
    password: 'correct-horse-battery',
    username: `shirin_${n}`,
    displayName: 'Shirin Demo',
    locale: 'en',
    ageConfirmed: true,
    termsAccepted: true,
    ...overrides,
  };
}

function register(world: FakeCommandWorld, input: unknown, clientAddress = '198.51.100.7') {
  return registerCommand.execute(input, world.callAs(anAnonymousActor(), { clientAddress }));
}

describe('account.register with a new email', () => {
  it('creates the credential, the pending profile, preferences, two personas, audit and event', async () => {
    const world = makeCommandPorts();
    const { fakes } = world;
    const input = aRegistration({ locale: 'bn' });

    const result = await register(world, input);

    expect(result.ok).toBe(true);
    const accountId = result.ok ? result.data.accountId : '';
    expect(fakes.store.userByEmail(input.email)).toBeDefined();
    expect(fakes.accounts.profiles.get(accountId)).toMatchObject({
      username: input.username,
      status: 'pending_verification',
      termsVersion: FAKE_TERMS_VERSION,
    });
    expect((await fakes.accounts.findPreferences({} as never, accountId))?.interfaceLocale).toBe(
      'bn',
    );
    expect(fakes.accounts.personas.map((p) => p.kind)).toEqual(['named', 'pseudonymous']);
    expect(fakes.audit.events).toEqual([
      expect.objectContaining({ action: 'registered', stream: `account:${accountId}` }),
    ]);
    expect(fakes.outbox.events).toEqual([{ name: 'account.registered', payload: { accountId } }]);
    expect(fakes.unitOfWork.outcomes).toEqual(['commit']);
  });

  it('queues the verification email to its own page in the account locale, keyed per delivery', async () => {
    const world = makeCommandPorts();
    const { fakes } = world;

    await register(world, aRegistration({ locale: 'bn' }));

    const [delivery] = fakes.deliveries.all();
    expect(delivery).toMatchObject({
      messageKey: 'email.verify',
      category: 'verification',
      locale: 'bn',
    });
    expect(delivery?.params.link).toMatch(new RegExp(`^${FAKE_APP_URL}/bn/verify-email\\?token=`));
    expect(fakes.jobQueue.enqueued).toEqual([
      {
        name: 'mail.send',
        payload: { deliveryId: delivery?.id },
        key: `mail.send:${delivery?.id}`,
      },
    ]);
    expect(fakes.jobQueue.ensured).toContain('mail.send');
  });

  it('encrypts the recipient with the mail key, never the app key (FD-095)', async () => {
    const world = makeCommandPorts();
    const input = aRegistration();

    await register(world, input);

    const sealed = world.fakes.deliveries.all()[0]?.toEmailEnc ?? new Uint8Array();
    expect(world.fakes.mailCrypto.decryptText(sealed)).toEqual({ ok: true, data: input.email });
    expect(world.fakes.crypto.decrypt(sealed).ok).toBe(false);
  });

  it('answers no earlier than the register floor', async () => {
    const world = makeCommandPorts();

    await register(world, aRegistration());

    expect(world.fakes.sleeper.waits).toEqual([REGISTER_FLOOR_MS]);
  });
});

describe('account.register with an email that has an account', () => {
  it('answers the same success shape, creates nothing and tells the owner by email', async () => {
    const world = makeCommandPorts();
    const { fakes } = world;
    const owner = await world.addAccount({ email: 'shirin.demo@example.test' });

    const result = await register(world, aRegistration({ email: 'Shirin.Demo@Example.test ' }));

    expect(result.ok).toBe(true);
    expect(result.ok && result.data.accountId).not.toBe(owner.accountId);
    expect(fakes.accounts.profiles.size).toBe(1);
    expect(fakes.authGateway.called('createCredentialUser')).toBe(0);
    expect(fakes.deliveries.all()).toEqual([
      expect.objectContaining({ accountId: owner.accountId, messageKey: 'email.existing' }),
    ]);
    expect(fakes.deliveries.all()[0]?.params.link).toBe(`${FAKE_APP_URL}/en/sign-in`);
    expect(fakes.outbox.events).toEqual([
      {
        name: 'account.securityEvent',
        payload: { accountId: owner.accountId, kind: 'existingEmailRegister' },
      },
    ]);
    expect(fakes.audit.actions()).toEqual(['existing_email_register']);
  });

  it('costs one hash and waits for the same floor as a new email (BR1.6)', async () => {
    const world = makeCommandPorts();
    await world.addAccount({ email: 'shirin.demo@example.test' });

    await register(world, aRegistration({ email: 'shirin.demo@example.test' }));

    expect(world.fakes.hasher.hashCalls).toBe(1);
    expect(world.fakes.sleeper.waits).toEqual([REGISTER_FLOOR_MS]);
  });

  it('sends nothing for a deleted account and still answers success', async () => {
    const world = makeCommandPorts();
    await world.addAccount({ email: 'gone.demo@example.test', status: 'deleted' });

    const result = await register(world, aRegistration({ email: 'gone.demo@example.test' }));

    expect(result.ok).toBe(true);
    expect(world.fakes.deliveries.all()).toEqual([]);
    expect(world.fakes.audit.events).toEqual([]);
  });

  it('sends no owner notice once the network used up its mail limit (review point 4)', async () => {
    const world = makeCommandPorts();
    await world.addAccount({ email: 'shirin.demo@example.test' });
    for (let i = 0; i < 10; i += 1) {
      await resendVerificationCommand.execute(
        { email: `nobody.demo+${i}@example.test` },
        world.callAs(anAnonymousActor()),
      );
    }

    const result = await register(world, aRegistration({ email: 'shirin.demo@example.test' }));

    expect(result.ok).toBe(true);
    expect(world.fakes.deliveries.all()).toEqual([]);
  });
});

describe('account.register refusals', () => {
  it('reports a taken username whether or not the email has an account (BR1.3)', async () => {
    const world = makeCommandPorts();
    const owner = await world.addAccount({
      email: 'shirin.demo@example.test',
      username: 'shirin_88',
    });

    const forNewEmail = await register(world, aRegistration({ username: 'shirin_88' }));
    const forExistingEmail = await register(
      world,
      aRegistration({ username: 'shirin_88', email: 'shirin.demo@example.test' }),
    );

    for (const result of [forNewEmail, forExistingEmail]) {
      expect(result.ok ? null : result.error).toMatchObject({
        code: 'auth.username_taken',
        fieldErrors: { username: 'errors.auth.usernameTaken' },
      });
    }
    expect(world.fakes.authGateway.called('createCredentialUser')).toBe(0);
    expect(world.fakes.deliveries.all().some((d) => d.accountId === owner.accountId)).toBe(false);
  });

  it.each([
    [
      'a 9-character password',
      { password: 'short-pw1' },
      'auth.password_too_short',
      'errors.auth.passwordTooShort',
    ],
    [
      'a password equal to the email',
      { email: 'shirin.demo@example.test', password: 'Shirin.Demo@example.test' },
      'auth.password_equals_email',
      'errors.auth.passwordEqualsEmail',
    ],
    [
      'a 257-character password',
      { password: 'p'.repeat(257) },
      'validation',
      'errors.auth.passwordTooLong',
    ],
    [
      'no age confirmation',
      { ageConfirmed: false },
      'auth.age_required',
      'errors.auth.ageRequired',
    ],
    [
      'no accepted terms',
      { termsAccepted: false },
      'auth.terms_required',
      'errors.auth.termsRequired',
    ],
  ] as const)('refuses %s with its code and field key', async (_name, overrides, code, key) => {
    const world = makeCommandPorts();

    const result = await register(world, aRegistration(overrides));

    expect(result.ok ? null : result.error.code).toBe(code);
    expect(Object.values(result.ok ? {} : (result.error.fieldErrors ?? {}))).toEqual([key]);
    expect(world.fakes.store.users.size).toBe(0);
  });

  it('answers validation with one field error each when several fields are wrong', async () => {
    const world = makeCommandPorts();

    const result = await register(world, aRegistration({ username: 'X', displayName: ' ' }));

    expect(result.ok ? null : result.error).toMatchObject({
      code: 'validation',
      fieldErrors: {
        username: 'errors.auth.usernameInvalid',
        displayName: 'errors.auth.displayNameRequired',
      },
    });
  });

  it('refuses the sixth attempt in an hour from one network, and only that network', async () => {
    const world = makeCommandPorts();
    for (let i = 0; i < 5; i += 1) await register(world, aRegistration(), '203.0.113.9');

    const sixth = await register(world, aRegistration(), '203.0.113.9');
    const elsewhere = await register(world, aRegistration(), '198.51.100.20');

    expect(sixth.ok ? null : sixth.error).toMatchObject({ code: 'auth.rate_limited' });
    expect(sixth.ok ? 0 : (sixth.error.retryAfterSec ?? 0)).toBeGreaterThan(0);
    expect(elsewhere.ok).toBe(true);
  });
});

describe('account.register races and failures (review point 5)', () => {
  it('deletes the library user again when the username is taken on insert', async () => {
    const world = makeCommandPorts();
    const input = aRegistration();
    world.fakes.accounts.racingUsernames.add(input.username);

    const result = await register(world, input);

    expect(result.ok ? null : result.error.code).toBe('auth.username_taken');
    expect(world.fakes.authGateway.called('deleteUser')).toBe(1);
    expect(world.fakes.store.userByEmail(input.email)).toBeUndefined();
    expect(world.fakes.accounts.profiles.size).toBe(0);
    expect(world.fakes.logger.events()).toContain('auth.register_rolled_back');
  });

  it('falls through to the existing-email answer when another registration took the address', async () => {
    const world = makeCommandPorts();
    const input = aRegistration();
    // The other registration's library user exists, its profile not yet visible.
    await world.fakes.authGateway.createCredentialUser({
      email: input.email,
      password: 'x'.repeat(12),
    });
    world.fakes.hasher.hashCalls = 0;

    const result = await register(world, input);

    expect(result.ok).toBe(true);
    expect(world.fakes.accounts.profiles.size).toBe(0);
    expect(world.fakes.hasher.hashCalls).toBe(1);
    expect(world.fakes.sleeper.waits).toEqual([REGISTER_FLOOR_MS]);
  });

  it('deletes the library user and answers internal when the transaction does not commit', async () => {
    const world = makeCommandPorts();
    const input = aRegistration();
    world.fakes.unitOfWork.failCommits(1);

    const result = await register(world, input);

    expect(result.ok ? null : result.error.code).toBe('internal');
    expect(world.fakes.store.userByEmail(input.email)).toBeUndefined();
    expect(world.fakes.deliveries.all()).toEqual([]);
    expect(world.fakes.outbox.events).toEqual([]);
  });

  it('answers internal and writes nothing when the library fails', async () => {
    const world = makeCommandPorts();
    world.fakes.authGateway.failNext('createCredentialUser');

    const result = await register(world, aRegistration());

    expect(result.ok ? null : result.error.code).toBe('internal');
    expect(world.fakes.accounts.profiles.size).toBe(0);
    expect(world.fakes.authGateway.called('deleteUser')).toBe(0);
  });

  it('rolls back and compensates when the verification email cannot be queued', async () => {
    const world = makeCommandPorts();
    const input = aRegistration();
    world.fakes.jobQueue.refuseEnqueues(1);

    const result = await register(world, input);

    expect(result.ok ? null : result.error.code).toBe('internal');
    expect(world.fakes.accounts.profiles.size).toBe(0);
    expect(world.fakes.deliveries.all()).toEqual([]);
    expect(world.fakes.store.userByEmail(input.email)).toBeUndefined();
  });
});
