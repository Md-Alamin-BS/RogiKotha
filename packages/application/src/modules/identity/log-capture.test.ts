// U11 BR3.8: no log line or audit row of an identity operation holds an account id together with a
// persona id, an alias or a username, and no ownership answer is ever logged.
import { describe, expect, it } from 'vitest';

import {
  anAccountActor,
  CollectingLogger,
  makeCommandPorts,
  makeIdentityPorts,
} from '../../fakes-test-support';
import type { Tx } from '../../ports/unit-of-work';
import { createIdentityModule } from './index';

const tx = {} as Tx;

async function runEveryOperation() {
  const command = makeCommandPorts();
  const logger = command.fakes.logger;
  const account = await command.addAccount({ username: 'shirin_88', displayName: 'Shirin Demo' });
  const identity = makeIdentityPorts({ accounts: command.fakes.accounts, logger });
  command.fakes.unitOfWork.enlist(identity.store);
  const module = createIdentityModule(identity.ports);
  const { accountId } = account;

  await module.createDefaultPersonas(tx, {
    accountId,
    username: 'shirin_88',
    displayName: 'Shirin Demo',
  });
  await module.personaFor(tx, { accountId, mode: 'named' });
  await module.personaFor(tx, { accountId, mode: 'pseudonymous' });
  await module.personaFor(tx, { accountId, reviewId: 'review-1', mode: 'anonymous' });
  const ids = identity.store.personas.map((p) => p.id);
  await module.publicProjections(tx, { personaIds: ids });
  await module.publicProjection(tx, { personaId: ids[0]! });
  await module.publicPersonaIdsByUsername(tx, { username: 'shirin_88' });
  await module.ownership.ownsPersona(tx, { accountId, personaId: ids[0]! });
  await module.ownership.ownPersonaIds(tx, { accountId });
  await module.renameNamedCommand.execute(
    { displayName: 'Shirin Begum' },
    command.callAs(anAccountActor(account)),
  );

  // The exhausted alias path is the one operation that logs.
  const exhausted = makeIdentityPorts({ accounts: command.fakes.accounts, logger });
  exhausted.privateIdentities.takenAliases.add('patient-aaaa');
  await createIdentityModule({
    ...exhausted.ports,
    crypto: { randomToken: () => 'A'.repeat(43) },
  }).personaFor(tx, { accountId, reviewId: 'review-2', mode: 'anonymous' });

  const personaValues = identity.store.personas.flatMap((p) =>
    [p.id, p.displayName, p.username].filter((v): v is string => v !== null),
  );
  return {
    accountId,
    logger,
    audit: command.fakes.audit,
    personaValues: [...personaValues, 'patient-aaaa'],
  };
}

function pairsAccountWithPersona(record: unknown, accountId: string, personaValues: string[]) {
  const text = JSON.stringify(record);
  return text.includes(accountId) && personaValues.some((value) => text.includes(value));
}

describe('identity logging and audit (BR3.8)', () => {
  it('never puts an account id together with a persona id, alias or username', async () => {
    const { accountId, logger, audit, personaValues } = await runEveryOperation();

    expect(logger.entries.length).toBeGreaterThan(0);
    expect(audit.events.length).toBeGreaterThan(0);
    for (const entry of [...logger.entries, ...audit.events]) {
      expect(pairsAccountWithPersona(entry, accountId, personaValues), JSON.stringify(entry)).toBe(
        false,
      );
    }
  });

  it('logs only the exhausted alias event, with a count and a correlation id', async () => {
    const { logger } = await runEveryOperation();

    expect(logger.events()).toEqual(['identity.alias_exhausted']);
    expect(Object.keys(logger.entries[0]!.fields).sort()).toEqual(['attempts', 'correlationId']);
  });

  it('the check itself fails on a line that pairs the two', () => {
    const logger = new CollectingLogger();
    logger.info('leak', { accountId: 'account-1', command: 'persona-1' });

    expect(pairsAccountWithPersona(logger.entries[0], 'account-1', ['persona-1'])).toBe(true);
  });
});
