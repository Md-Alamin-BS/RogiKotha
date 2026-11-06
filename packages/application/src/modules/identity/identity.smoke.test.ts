// BR6.2: the identity module's smoke assertion. An anonymous author keeps one persona per thread,
// gets a different alias in another thread, and the public projection carries no username and no id.
import { describe, expect, it } from 'vitest';

import { makeCommandPorts, makeIdentityPorts } from '../../fakes-test-support';
import type { Tx } from '../../ports/unit-of-work';
import { createIdentityModule } from './index';

const tx = {} as Tx;

describe('identity smoke', () => {
  it('keeps one anonymous persona per thread and projects it without username or id', async () => {
    const command = makeCommandPorts();
    const account = await command.addAccount({ username: 'rahim_42', displayName: 'Rahim Demo' });
    const module = createIdentityModule(
      makeIdentityPorts({ accounts: command.fakes.accounts }).ports,
    );
    const anonymousIn = async (reviewId: string) => {
      const result = await module.personaFor(tx, {
        accountId: account.accountId,
        reviewId,
        mode: 'anonymous',
      });
      if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
      return result.data.personaId;
    };

    const first = await anonymousIn('thread-1');
    const again = await anonymousIn('thread-1');
    const other = await anonymousIn('thread-2');
    const firstView = await module.publicProjection(tx, { personaId: first });
    const otherView = await module.publicProjection(tx, { personaId: other });

    expect(again).toBe(first);
    expect(other).not.toBe(first);
    expect(firstView?.kind).toBe('anonymous');
    expect(firstView?.displayName).toMatch(/^patient-/);
    expect(otherView?.displayName).not.toBe(firstView?.displayName);
    expect(Object.keys(firstView ?? {}).sort()).toEqual(['avatarHue', 'displayName', 'kind']);
    expect(JSON.stringify(firstView)).not.toContain(first);
    expect(JSON.stringify(firstView)).not.toContain(account.accountId);
    expect(JSON.stringify(firstView)).not.toContain('rahim_42');
  });
});
