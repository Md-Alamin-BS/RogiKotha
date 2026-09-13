// Input schemas for the `identity` command catalogue
// (03-routes-and-contracts.md §4 "identity (T-104)").
import { z } from 'zod';

import { IDENTITY_MODES, TARGET_KINDS } from '../enums';

// internal — called only by other application code, never a public route
export const PersonaForInput = z
  .object({
    accountId: z.string().min(1),
    reviewId: z.string().min(1).optional(),
    mode: z.enum(IDENTITY_MODES),
  })
  .strict();

export const PublicProjectionInput = z.object({ personaId: z.string().min(1) }).strict();

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

// TODO(T-104): private query consumed only by data-requests and moderation
// enforcement — exact filter shape owned by that task.
export const AccountsOfInput = z.unknown();

export const identitySchemas = {
  PersonaForInput,
  PublicProjectionInput,
  RevealIdentityInput,
  CreateDefaultPersonasInput,
  AccountsOfInput,
};
