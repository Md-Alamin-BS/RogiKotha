// Input schemas for the `evidence` command catalogue
// (03-routes-and-contracts.md §4 "evidence (T-303, T-304, T-305, T-309)").
// `retention.*` and `hold.*` commands, though listed in the same catalogue
// section, belong to the `retention` module (01-conventions.md §1 fixed
// module list) and live in schemas/retention.ts instead.
import { z } from 'zod';

import { EVIDENCE_GROUPS, EVIDENCE_STATES } from '../enums';

// Phase 1 accepts images only (FD-036); PDF/HEIC/Office wait for Phase 2.
const DECLARED_MIME = ['image/jpeg', 'image/png'] as const;

export const EVIDENCE_LIMITS = {
  maxItemsPerDraft: 10,
  maxItemBytes: 15 * 1024 * 1024,
  maxTotalBytesPerDraft: 100 * 1024 * 1024,
} as const;

// The uploaded bytes travel as a stream outside the zod-validated part of
// the request (03-routes-and-contracts.md §1 `/api/evidence/upload`); this
// schema covers the accompanying JSON fields only.
export const IntakeEvidenceInput = z
  .object({
    reviewDraftId: z.string().min(1),
    group: z.enum(EVIDENCE_GROUPS),
    declaredMime: z.enum(DECLARED_MIME),
    declaredName: z.string().min(1),
    bytes: z.number().int().min(1).max(EVIDENCE_LIMITS.maxItemBytes),
    idempotencyKey: z.string().min(1),
  })
  .strict();

// job payload
export const ProcessEvidenceJobInput = z.object({ itemId: z.string().min(1) }).strict();

const Rect = z
  .object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  })
  .strict();

export const ApplyRedactionInput = z
  .object({
    itemId: z.string().min(1),
    pageNo: z.number().int().min(1),
    rects: z.array(Rect).min(1),
  })
  .strict();

export const ConfirmPrivacyInput = z
  .object({
    itemId: z.string().min(1),
    confirmed: z.literal(true),
  })
  .strict();

// internal — called only by review.publish
export const PublishEvidenceInput = z.object({ reviewId: z.string().min(1) }).strict();

export const RemoveEvidenceInput = z.object({ itemId: z.string().min(1) }).strict();

export const GetEvidenceForAuthorInput = z.object({ draftId: z.string().min(1) }).strict();

export const ListEvidenceForStaffInput = z
  .object({
    state: z.enum(EVIDENCE_STATES).optional(),
    page: z.number().int().min(1).optional(),
  })
  .strict();

export const GetPublicEvidenceInput = z.object({ reviewId: z.string().min(1) }).strict();

export const ReadOriginalEvidenceInput = z
  .object({
    itemId: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

export const evidenceSchemas = {
  IntakeEvidenceInput,
  ProcessEvidenceJobInput,
  ApplyRedactionInput,
  ConfirmPrivacyInput,
  PublishEvidenceInput,
  RemoveEvidenceInput,
  GetEvidenceForAuthorInput,
  ListEvidenceForStaffInput,
  GetPublicEvidenceInput,
  ReadOriginalEvidenceInput,
};
