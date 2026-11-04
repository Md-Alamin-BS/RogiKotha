// `account.updatePreferences` (T-101 WF14, BR11.1): any signed-in account, confirmed or not; a
// partial update, audited with the field names only.
import { ok, UpdatePreferencesInput, type Result } from '@rogikotha/contracts';

import { accountAudit } from '../../../audit/account';
import { defineCommand, type CommandContext } from '../../../command';
import type { AccountPreferencesPatch } from '../../../ports';
import type { UpdatePreferencesOutput } from '../types';

function patchOf(input: UpdatePreferencesInput): AccountPreferencesPatch {
  const patch: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(input)) {
    if (value !== undefined) patch[field] = value;
  }
  return patch;
}

async function handle(
  ctx: CommandContext<UpdatePreferencesInput>,
): Promise<Result<UpdatePreferencesOutput>> {
  const { ports, input, actor, tx } = ctx;
  const accountId = actor.accountId ?? '';
  const patch = patchOf(input);
  const fields = Object.keys(patch).sort();
  if (fields.length === 0) return ok({});
  await ports.accounts.savePreferences(tx, accountId, patch);
  await ports.audit.write(tx, accountAudit.preferencesUpdated(accountId, fields));
  return ok({});
}

export const updatePreferencesCommand = defineCommand<
  UpdatePreferencesInput,
  UpdatePreferencesOutput
>({
  name: 'account.updatePreferences',
  input: UpdatePreferencesInput,
  requires: { authenticated: true },
  handle,
});
