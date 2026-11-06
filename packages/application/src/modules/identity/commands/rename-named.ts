// `identity.renameNamed` (U11 WF6, BR4.1): a rename makes a new named persona, so earlier bylines
// keep the name they were written under. `account_profiles.display_name` is the account module's
// and is not written here.
import { InternalError, ok, RenameNamedInput } from '@rogikotha/contracts';

import { defineCommand, type Command, type CommandContext } from '../../../command';
import type { HandlerResult } from '../../../ports/unit-of-work';
import { identityAudit } from '../audit';
import { currentDefaultPersona } from '../default-personas';
import type { IdentityModulePorts } from '../ports';

export interface RenameNamedOutput {
  changed: boolean;
}

async function renameNamed(
  identity: IdentityModulePorts,
  ctx: CommandContext<RenameNamedInput>,
): Promise<HandlerResult<RenameNamedOutput>> {
  const accountId = ctx.actor.accountId;
  if (accountId === undefined) throw new InternalError('renameNamed: no account on the actor');
  const current = await currentDefaultPersona(identity, ctx.tx, accountId, 'named');
  if (current.displayName === ctx.input.displayName) return ok({ changed: false });
  await identity.privateIdentities.insertNamed(ctx.tx, {
    accountId,
    displayName: ctx.input.displayName,
    username: current.username,
    avatarHue: current.avatarHue,
  });
  await ctx.ports.audit.write(ctx.tx, identityAudit.namedPersonaCreated(accountId));
  return ok({ changed: true });
}

export function createRenameNamedCommand(
  identity: IdentityModulePorts,
): Command<RenameNamedInput, RenameNamedOutput> {
  return defineCommand<RenameNamedInput, RenameNamedOutput>({
    name: 'identity.renameNamed',
    input: RenameNamedInput,
    requires: { authenticated: true },
    handle: (ctx) => renameNamed(identity, ctx),
  });
}
