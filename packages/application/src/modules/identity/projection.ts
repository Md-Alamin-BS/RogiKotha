// Public projections and the username lookup (U11 WF5, BR1.4–BR1.6, BR2.7).
import { InternalError, PUBLIC_PROJECTIONS_MAX, type PersonaPublicVM } from '@rogikotha/contracts';
import { publicProjection as projectPersona } from '@rogikotha/domain';

import type { Tx } from '../../ports/unit-of-work';
import type { IdentityModulePorts } from './ports';

/** In input order, de-duplicated; unknown ids are left out, never an error (BR1.5). */
export async function publicProjections(
  ports: IdentityModulePorts,
  tx: Tx,
  input: { personaIds: readonly string[] },
): Promise<PersonaPublicVM[]> {
  const ids = [...new Set(input.personaIds)];
  if (ids.length > PUBLIC_PROJECTIONS_MAX) {
    throw new InternalError(`publicProjections: more than ${PUBLIC_PROJECTIONS_MAX} persona ids`);
  }
  if (ids.length === 0) return [];
  const rows = await ports.identities.byIds(tx, ids);
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [projectPersona(row)] : [];
  });
}

/** The one-id form; null for an unknown id. */
export async function publicProjection(
  ports: IdentityModulePorts,
  tx: Tx,
  input: { personaId: string },
): Promise<PersonaPublicVM | null> {
  const [projection] = await publicProjections(ports, tx, { personaIds: [input.personaId] });
  return projection ?? null;
}

/** BR1.6: named and pseudonymous personas only; an alias or "Anonymous" finds nothing. */
export function publicPersonaIdsByUsername(
  ports: IdentityModulePorts,
  tx: Tx,
  input: { username: string },
): Promise<string[]> {
  if (input.username === '') return Promise.resolve([]);
  return ports.identities.publicIdsByUsername(tx, input.username);
}
