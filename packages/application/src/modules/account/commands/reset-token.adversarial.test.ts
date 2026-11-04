// Adversarial tests (T-101 Step 15, tester 1): replay a reset link that should no longer work, and
// use a dead link as an oracle for the address it was sent to (BR5.1, BR5.2, BR2.3, WF8).
import { describe, expect, it } from 'vitest';

import {
  anAnonymousActor,
  makeCommandPorts,
  type FakeCommandWorld,
} from '../../../fakes-test-support';
import { requestPasswordResetCommand } from './request-password-reset';
import { resetPasswordCommand } from './reset-password';
import { signInCommand } from './sign-in';

const OWNER_EMAIL = 'rumana.demo@example.test';
const OWNER_NEW_PASSWORD = 'the owner’s new secret';
const ATTACKER_PASSWORD = 'the attacker’s secret';
const HOUR_MS = 60 * 60 * 1000;

async function requestResetLink(world: FakeCommandWorld, email: string): Promise<string> {
  const before = world.fakes.deliveries.all().length;
  await requestPasswordResetCommand.execute({ email }, world.callAs(anAnonymousActor()));
  const link = world.fakes.deliveries.all()[before]?.params.link ?? '';
  return decodeURIComponent(link.split('token=')[1] ?? '');
}

const reset = (world: FakeCommandWorld, token: string, newPassword: string) =>
  resetPasswordCommand.execute({ token, newPassword }, world.callAs(anAnonymousActor()));

describe('reset-token replay and reuse', () => {
  it('refuses an older link once the owner has completed a reset with a newer one', async () => {
    const world = makeCommandPorts();
    await world.addAccount({ email: OWNER_EMAIL });
    // The attacker saw the first link (a shared inbox, a forwarded mail); the owner asks again.
    const leakedToken = await requestResetLink(world, OWNER_EMAIL);
    const ownerToken = await requestResetLink(world, OWNER_EMAIL);
    const ownerReset = await reset(world, ownerToken, OWNER_NEW_PASSWORD);

    const replayed = await reset(world, leakedToken, ATTACKER_PASSWORD);
    const attackerSignIn = await signInCommand.execute(
      { email: OWNER_EMAIL, password: ATTACKER_PASSWORD },
      world.callAs(anAnonymousActor()),
    );

    expect(ownerReset.ok).toBe(true);
    expect(replayed.ok ? null : replayed.error.code).toBe('auth.token_invalid');
    expect(attackerSignIn.ok).toBe(false);
  });

  it('answers an expired link as expired, whatever the new password, so it names no address', async () => {
    const world = makeCommandPorts();
    await world.addAccount({ email: OWNER_EMAIL });
    const token = await requestResetLink(world, OWNER_EMAIL);
    world.fakes.clock.advanceMs(HOUR_MS + 1);

    const guessedRight = await reset(world, token, OWNER_EMAIL);
    const guessedWrong = await reset(world, token, 'someone.else.demo@example.test');

    expect(guessedRight.ok ? null : guessedRight.error.code).toBe('auth.token_expired');
    expect(guessedRight).toEqual(guessedWrong);
  });
});
