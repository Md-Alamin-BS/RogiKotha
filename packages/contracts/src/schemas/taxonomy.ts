// Input schemas for the `taxonomy` command catalogue
// (03-routes-and-contracts.md §4 "taxonomy (T-201)").
import { z } from 'zod';

import { TAG_GROUPS, TERM_KINDS } from '../enums';
import { PUBLIC_ID_RE } from '../ids';

const publicId = z.string().regex(PUBLIC_ID_RE);
const ALIAS_LANGS = ['en', 'bn', 'banglish'] as const;

export const GetConditionInput = z.object({ publicId }).strict();

export const ListConditionsInput = z
  .object({
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  })
  .strict();

/** The longest wording a provisional term or a lookup accepts (U46 BR5.2). */
export const TERM_TEXT_MAX = 120;

export const ResolveInput = z
  .object({ text: z.string().min(1).max(TERM_TEXT_MAX), kind: z.enum(TERM_KINDS).optional() })
  .strict();

export const ListSuggestedInput = z.object({ group: z.enum(TAG_GROUPS) }).strict();

export const CreateProvisionalInput = z
  .object({
    kind: z.enum(TERM_KINDS),
    text: z.string().trim().min(1).max(TERM_TEXT_MAX),
    lang: z.enum(ALIAS_LANGS),
  })
  .strict();

export const MapProvisionalInput = z
  .object({
    termId: z.string().min(1),
    canonicalId: z.string().min(1),
  })
  .strict();

export type GetConditionInput = z.output<typeof GetConditionInput>;
export type ListConditionsInput = z.output<typeof ListConditionsInput>;
export type ResolveInput = z.output<typeof ResolveInput>;
export type ListSuggestedInput = z.output<typeof ListSuggestedInput>;
export type CreateProvisionalInput = z.output<typeof CreateProvisionalInput>;

export const taxonomySchemas = {
  GetConditionInput,
  ListConditionsInput,
  ResolveInput,
  ListSuggestedInput,
  CreateProvisionalInput,
  MapProvisionalInput,
};
