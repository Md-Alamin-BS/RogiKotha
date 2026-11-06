// `IdentityOwnership` (U11 BR3.3–BR3.5, Q1): the narrow private check that answers who wrote a
// piece of content without handing out the link. Only the review and community module factories
// receive it. The account id always comes from the caller's `Actor`, never from the request, and an
// answer is never logged.
import { InternalError } from '@rogikotha/contracts';

import type { Tx } from '../../ports/unit-of-work';
import type { IdentityModulePorts } from './ports';

/** BR3.4: more persona ids than this for one account is a programmer error. */
export const OWN_PERSONA_IDS_MAX = 1000;

declare const OWNERSHIP_BRAND: unique symbol;

export interface IdentityOwnership {
  readonly [OWNERSHIP_BRAND]: 'IdentityOwnership';
  /** True only when that persona is linked to that account; unknown ids give false. */
  ownsPersona(tx: Tx, input: { accountId: string; personaId: string }): Promise<boolean>;
  /** Every persona id of the account, for that account's own private lists only. */
  ownPersonaIds(tx: Tx, input: { accountId: string }): Promise<string[]>;
}

export function createIdentityOwnership(ports: IdentityModulePorts): IdentityOwnership {
  const ownership = {
    ownsPersona: (tx: Tx, input: { accountId: string; personaId: string }) =>
      ports.privateIdentities.owns(tx, input.accountId, input.personaId),
    async ownPersonaIds(tx: Tx, input: { accountId: string }) {
      const ids = await ports.privateIdentities.personaIdsOf(
        tx,
        input.accountId,
        OWN_PERSONA_IDS_MAX + 1,
      );
      if (ids.length > OWN_PERSONA_IDS_MAX) {
        throw new InternalError(`ownPersonaIds: more than ${OWN_PERSONA_IDS_MAX} personas`);
      }
      return ids;
    },
  };
  return ownership as unknown as IdentityOwnership;
}
