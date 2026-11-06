// `identity.personaFor` (U11 WF2, WF3, BR2.1–BR2.6, BR2.10): the persona a new review or comment is
// written under, in the caller's transaction. An internal operation, not a `defineCommand`, so it
// commits or rolls back with the content it is for.
import {
  err,
  InternalError,
  ok,
  parseInput,
  PersonaForInput,
  type Result,
} from '@rogikotha/contracts';
import { newAnonymousAlias } from '@rogikotha/domain';

import type { Tx } from '../../ports/unit-of-work';
import { currentDefaultPersona } from './default-personas';
import type { IdentityModulePorts } from './ports';

/** BR2.6: alias clashes are retried this many times, then the call fails with `internal`. */
export const ALIAS_ATTEMPTS = 5;

export interface PersonaForOutput {
  personaId: string;
}

async function anonymousPersonaFor(
  ports: IdentityModulePorts,
  tx: Tx,
  accountId: string,
  reviewId: string,
): Promise<Result<PersonaForOutput>> {
  for (let attempt = 1; attempt <= ALIAS_ATTEMPTS; attempt += 1) {
    const existing = await ports.privateIdentities.findAnonymous(tx, accountId, reviewId);
    if (existing !== null) return ok({ personaId: existing });
    const alias = newAnonymousAlias(() => ports.crypto.randomToken());
    const inserted = await ports.privateIdentities.insertAnonymous(tx, {
      accountId,
      reviewId,
      alias,
    });
    if (inserted.ok) return ok({ personaId: inserted.data.personaId });
    // `thread_taken`: a concurrent first use won; the next round reads it.
  }
  const failed = err('internal');
  ports.logger.error('identity.alias_exhausted', {
    attempts: ALIAS_ATTEMPTS,
    ...(failed.ok ? {} : { correlationId: failed.error.correlationId }),
  });
  return failed;
}

export async function personaFor(
  ports: IdentityModulePorts,
  tx: Tx,
  raw: { accountId: string; reviewId?: string; mode: string },
): Promise<Result<PersonaForOutput>> {
  const parsed = parseInput(PersonaForInput, raw);
  if (!parsed.ok) return parsed;
  const { accountId, reviewId, mode } = parsed.data;
  if (mode === 'anonymous') {
    // BR2.3: an unscoped anonymous persona would be reusable across threads.
    if (reviewId === undefined) throw new InternalError('personaFor: anonymous needs a reviewId');
    return anonymousPersonaFor(ports, tx, accountId, reviewId);
  }
  const persona = await currentDefaultPersona(ports, tx, accountId, mode);
  return ok({ personaId: persona.id });
}
