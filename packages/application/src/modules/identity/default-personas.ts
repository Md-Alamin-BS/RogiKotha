// The default named and pseudonymous personas (U11 BR1.2, BR2.1, BR2.2).
import { InternalError } from '@rogikotha/contracts';

import type { Tx } from '../../ports/unit-of-work';
import type {
  DefaultPersonaIds,
  DefaultPersonaKind,
  IdentityModulePorts,
  PersonaRecord,
} from './ports';

export interface CreateDefaultPersonasInput {
  accountId: string;
  username: string;
  displayName: string;
}

/** BR1.2: one named and one pseudonymous persona per account; a repeat creates nothing. */
export function createDefaultPersonas(
  ports: IdentityModulePorts,
  tx: Tx,
  input: CreateDefaultPersonasInput,
): Promise<DefaultPersonaIds> {
  return ports.privateIdentities.createDefault(tx, input);
}

/**
 * BR2.1 and BR2.2: the newest persona of that kind, created from the profile when the account has
 * none (seeded and demo accounts). The caller passes the actor's own live account, so a missing
 * account is a programmer error.
 */
export async function currentDefaultPersona(
  ports: IdentityModulePorts,
  tx: Tx,
  accountId: string,
  kind: DefaultPersonaKind,
): Promise<PersonaRecord> {
  const current = await ports.privateIdentities.currentOf(tx, accountId, kind);
  if (current) return current;
  const created = await ports.privateIdentities.createMissingDefault(tx, accountId, kind);
  if (created === null) throw new InternalError(`identity: no live account for a ${kind} persona`);
  const persona = await ports.privateIdentities.currentOf(tx, accountId, kind);
  if (!persona) throw new InternalError(`identity: the new ${kind} persona was not found`);
  return persona;
}
