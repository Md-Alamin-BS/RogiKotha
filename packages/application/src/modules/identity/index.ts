// The identity module (C4 release 1, C19, U11 functional-spec § 1). No reveal, `deidentify` or
// `accountsOf` in release 1 (BR5.3, FD-105). Nothing here is re-exported through
// `@rogikotha/application/worker`, and the worker may not import it (BR3.7).
import type { PersonaPublicVM, RenameNamedInput, Result } from '@rogikotha/contracts';

import type { Command } from '../../command';
import type { Tx } from '../../ports/unit-of-work';
import { createRenameNamedCommand, type RenameNamedOutput } from './commands/rename-named';
import { createDefaultPersonas, type CreateDefaultPersonasInput } from './default-personas';
import { createIdentityOwnership, type IdentityOwnership } from './ownership';
import { personaFor, type PersonaForOutput } from './persona-for';
import type { DefaultPersonaIds, IdentityModulePorts } from './ports';
import { publicPersonaIdsByUsername, publicProjection, publicProjections } from './projection';

export interface IdentityModule {
  createDefaultPersonas(tx: Tx, input: CreateDefaultPersonasInput): Promise<DefaultPersonaIds>;
  personaFor(
    tx: Tx,
    input: { accountId: string; reviewId?: string; mode: string },
  ): Promise<Result<PersonaForOutput>>;
  publicProjection(tx: Tx, input: { personaId: string }): Promise<PersonaPublicVM | null>;
  publicProjections(tx: Tx, input: { personaIds: readonly string[] }): Promise<PersonaPublicVM[]>;
  publicPersonaIdsByUsername(tx: Tx, input: { username: string }): Promise<string[]>;
  renameNamedCommand: Command<RenameNamedInput, RenameNamedOutput>;
  /** For the review and community module factories only (BR3.5). */
  ownership: IdentityOwnership;
}

export function createIdentityModule(ports: IdentityModulePorts): IdentityModule {
  return {
    createDefaultPersonas: (tx, input) => createDefaultPersonas(ports, tx, input),
    personaFor: (tx, input) => personaFor(ports, tx, input),
    publicProjection: (tx, input) => publicProjection(ports, tx, input),
    publicProjections: (tx, input) => publicProjections(ports, tx, input),
    publicPersonaIdsByUsername: (tx, input) => publicPersonaIdsByUsername(ports, tx, input),
    renameNamedCommand: createRenameNamedCommand(ports),
    ownership: createIdentityOwnership(ports),
  };
}

export type { IdentityOwnership } from './ownership';
export { OWN_PERSONA_IDS_MAX } from './ownership';
export { ALIAS_ATTEMPTS, type PersonaForOutput } from './persona-for';
export type { RenameNamedOutput } from './commands/rename-named';
export type { CreateDefaultPersonasInput } from './default-personas';
export { IDENTITY_AUDIT_ACTIONS, type IdentityAuditAction } from './audit';
export type * from './ports';
