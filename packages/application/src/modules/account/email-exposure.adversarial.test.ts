// Adversarial (T-101 plan Step 15, design § 12.2 "a mail-key leak to the worker", BR6.1, BR8.1,
// FD-095, FD-096): drive every flow that touches an address and sweep everything the commands
// leave behind for the address, its local part or a link token.
import type { Result } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import {
  anAccountActor,
  anAnonymousActor,
  makeCommandPorts,
  type FakeCommandWorld,
} from '../../fakes-test-support';
import { registerCommand } from './commands/register';
import { requestPasswordResetCommand } from './commands/request-password-reset';
import { resendVerificationCommand } from './commands/resend-verification';
import { signInCommand } from './commands/sign-in';
import { getOwnAccountQuery } from './queries/get-own-account';

const TYPED = '  Shirin.Demo@Example.TEST ';
const NORMALISED = 'shirin.demo@example.test';
const EXISTING = 'rahim.demo@example.test';
const PASSWORD = 'correct-horse-battery';
const NETWORK = '198.51.100.7';

function anonymous(world: FakeCommandWorld) {
  return world.callAs(anAnonymousActor(), { clientAddress: NETWORK });
}

function tokensIn(world: FakeCommandWorld): string[] {
  return world.fakes.deliveries
    .all()
    .map((row) => /token=([^&#]+)/.exec(row.params.link ?? '')?.[1])
    .filter((token): token is string => token !== undefined)
    .flatMap((token) => [token, decodeURIComponent(token)]);
}

/** Everything a command may write outside the encrypted recipient column. */
function traces(world: FakeCommandWorld, results: Result<unknown>[]): Record<string, string> {
  const { fakes } = world;
  return {
    results: JSON.stringify(results),
    logs: JSON.stringify(fakes.logger.entries),
    audit: JSON.stringify(fakes.audit.events),
    outbox: JSON.stringify(fakes.outbox.events),
    jobs: JSON.stringify(fakes.jobQueue.snapshot()),
    rateLimitKeys: JSON.stringify(fakes.rateLimiter.calls),
    deliveryParams: JSON.stringify(fakes.deliveries.all().map((row) => row.params)),
  };
}

describe('the account commands under an address-leak sweep', () => {
  it('leave no address in results, logs, audit rows, events, jobs, limiter keys or links, and seal recipients only under the mail key', async () => {
    const world = makeCommandPorts();
    await world.addAccount({ email: EXISTING, password: PASSWORD, status: 'active' });
    const results: Result<unknown>[] = [];

    results.push(
      await registerCommand.execute(
        {
          email: TYPED,
          password: PASSWORD,
          username: 'shirin_adv',
          displayName: 'Shirin Demo',
          locale: 'en',
          ageConfirmed: true,
          termsAccepted: true,
        },
        anonymous(world),
      ),
    );
    results.push(
      await registerCommand.execute(
        {
          email: EXISTING.toUpperCase(),
          password: PASSWORD,
          username: 'rahim_adv_2',
          displayName: 'Rahim Demo',
          locale: 'bn',
          ageConfirmed: true,
          termsAccepted: true,
        },
        anonymous(world),
      ),
    );
    results.push(await resendVerificationCommand.execute({ email: TYPED }, anonymous(world)));
    results.push(await requestPasswordResetCommand.execute({ email: EXISTING }, anonymous(world)));
    results.push(
      await requestPasswordResetCommand.execute(
        { email: 'nobody.demo@example.test' },
        anonymous(world),
      ),
    );
    for (let i = 0; i < 10; i += 1) {
      results.push(
        await signInCommand.execute({ email: EXISTING, password: 'wrong-horse' }, anonymous(world)),
      );
      world.fakes.clock.advanceMs(31_000);
    }
    await world.fakes.afterResponse.settle();
    results.push(
      await signInCommand.execute({ email: TYPED, password: PASSWORD }, anonymous(world)),
    );

    // The flows ran: verify, existing, resend, reset and the severe notice all queued mail.
    const keys = world.fakes.deliveries.all().map((row) => row.messageKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        'email.verify',
        'email.existing',
        'email.reset',
        'email.security.severeSignInActivity',
      ]),
    );

    // Without tokens to look for, the sweep below would not test the token half at all.
    expect(tokensIn(world).length).toBeGreaterThan(0);
    const needles = [
      NORMALISED,
      'shirin.demo',
      'shirin.demo%40',
      EXISTING,
      'rahim.demo',
      'rahim.demo%40',
      'nobody.demo',
      ...tokensIn(world).filter((token) => token.length >= 16),
    ];
    for (const [where, text] of Object.entries(traces(world, results))) {
      for (const needle of needles) {
        if (where === 'deliveryParams' && !needle.includes('demo')) continue;
        expect({ where, leaked: text.toLowerCase().includes(needle.toLowerCase()) }).toEqual({
          where,
          leaked: false,
        });
      }
    }

    for (const row of world.fakes.deliveries.all()) {
      const opened = world.fakes.mailCrypto.decryptText(row.toEmailEnc);
      expect(opened.ok && [NORMALISED, EXISTING].includes(opened.data)).toBe(true);
      // FD-095: the app key (which also opens exact dates and file names) cannot read it.
      expect(world.fakes.crypto.decryptText(row.toEmailEnc).ok).toBe(false);
    }
    // Review point 6: the mail-key instance holds no MAC secret, so it cannot mint limiter keys.
    expect(() => world.fakes.mailCrypto.hmac('email-key', NORMALISED)).toThrow();
  });

  it('masks own addresses of very different lengths to the same visible length', async () => {
    const world = makeCommandPorts();
    const short = await world.addAccount({ email: 's@example.test' });
    const long = await world.addAccount({
      email: 'shirin.with.a.very.long.local.part.demo@example.test',
    });

    const masks: string[] = [];
    for (const account of [short, long]) {
      const result = await getOwnAccountQuery.execute({}, world.callAs(anAccountActor(account)));
      expect(result.ok).toBe(true);
      if (result.ok) masks.push(result.data.emailMasked);
    }

    expect(masks).toEqual(['s****@example.test', 's****@example.test']);
    expect(JSON.stringify(world.fakes.logger.entries)).not.toContain('example.test');
  });
});
