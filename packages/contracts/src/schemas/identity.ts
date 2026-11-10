// Input schemas for the `identity` command catalogue
// (03-routes-and-contracts.md §4 "identity (T-104)").
import { z } from 'zod';

import { IDENTITY_MODES, TARGET_KINDS } from '../enums';
import { ACCOUNT_FIELD_ERROR_KEYS, DISPLAY_NAME_MAX } from './account';

// internal — called only by other application code, never a public route
export const PersonaForInput = z
  .object({
    accountId: z.string().min(1),
    reviewId: z.string().min(1).optional(),
    mode: z.enum(IDENTITY_MODES),
  })
  .strict();
export type PersonaForInput = z.output<typeof PersonaForInput>;

export const PublicProjectionInput = z.object({ personaId: z.string().min(1) }).strict();
export type PublicProjectionInput = z.output<typeof PublicProjectionInput>;

/** The batch form (U11 BR1.5); more ids than this is a programmer error. */
export const PUBLIC_PROJECTIONS_MAX = 200;

export const PublicProjectionsInput = z
  .object({ personaIds: z.array(z.string().min(1)).max(PUBLIC_PROJECTIONS_MAX) })
  .strict();
export type PublicProjectionsInput = z.output<typeof PublicProjectionsInput>;

// `identity.renameNamed` (U11 BR4.1): the register form's name rule and key, NFC-normalised first.
export const RenameNamedInput = z
  .object({
    displayName: z
      .string({ error: ACCOUNT_FIELD_ERROR_KEYS.displayNameRequired })
      .transform((name) => name.normalize('NFC').trim())
      .pipe(
        z
          .string()
          .min(1, { error: ACCOUNT_FIELD_ERROR_KEYS.displayNameRequired })
          .max(DISPLAY_NAME_MAX, { error: ACCOUNT_FIELD_ERROR_KEYS.displayNameRequired }),
      ),
  })
  .strict();
export type RenameNamedInput = z.output<typeof RenameNamedInput>;

export const RevealIdentityInput = z
  .object({
    targetKind: z.enum(TARGET_KINDS),
    targetId: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

// internal — called only by account.register
export const CreateDefaultPersonasInput = z
  .object({
    accountId: z.string().min(1),
    username: z.string().min(1),
    displayName: z.string().min(1),
  })
  .strict();

// Release 2 (T-104): private query consumed only by data-requests and moderation
// enforcement — exact filter shape owned by that task.
export const AccountsOfInput = z.unknown();

export const identitySchemas = {
  PersonaForInput,
  PublicProjectionInput,
  PublicProjectionsInput,
  RenameNamedInput,
  RevealIdentityInput,
  CreateDefaultPersonasInput,
  AccountsOfInput,
};
