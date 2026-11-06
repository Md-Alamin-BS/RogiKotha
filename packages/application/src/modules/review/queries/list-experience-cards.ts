// `review.listExperienceCards` (WF12): eligible accounts newest first, with a keyset cursor on
// (`published_at`, `public_id`). Internal query for U20's home; U47 extends the stub (C9).
import {
  ListExperienceCardsInput,
  decodeCursor,
  encodeCursor,
  err,
  ok,
  type CursorPage,
  type ExperienceCardVM,
  type Result,
} from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import { cardOf } from '../cards';
import type { ReviewReadDeps } from '../provider-experience';

export const DEFAULT_CARD_LIMIT = 20;

interface CardCursor {
  p: string;
  id: string;
}

function readCursor(cursor: string): { publishedAt: Date; publicId: string } | null {
  try {
    const value = decodeCursor<Partial<CardCursor>>(cursor);
    if (typeof value.p !== 'string' || typeof value.id !== 'string') return null;
    const publishedAt = new Date(value.p);
    return Number.isNaN(publishedAt.getTime()) ? null : { publishedAt, publicId: value.id };
  } catch {
    return null;
  }
}

export function listExperienceCardsQuery(deps: ReviewReadDeps) {
  return defineQuery<ListExperienceCardsInput, CursorPage<ExperienceCardVM>>({
    name: 'review.listExperienceCards',
    input: ListExperienceCardsInput,
    requires: {},
    async handle({ input, tx, actor }): Promise<Result<CursorPage<ExperienceCardVM>>> {
      const limit = input.limit ?? DEFAULT_CARD_LIMIT;
      const after = input.cursor === undefined ? undefined : readCursor(input.cursor);
      if (after === null) return err('validation', { correlationId: actor.correlationId });
      const rows = await deps.reviews.listRecentCards(tx, {
        limit: limit + 1,
        ...(after ? { after } : {}),
        ...(input.doctorPublicId ? { doctorPublicId: input.doctorPublicId } : {}),
        ...(input.conditionPublicId ? { termPublicId: input.conditionPublicId } : {}),
      });
      const page = rows.slice(0, limit);
      const documents = await deps.evidence.countPublicEvidenceByReview(page.map((r) => r.id));
      const result: CursorPage<ExperienceCardVM> = {
        items: page.map((r) => cardOf(r, actor.locale, documents.get(r.id) ?? 0)),
      };
      const last = page[page.length - 1];
      if (rows.length > limit && last) {
        result.nextCursor = encodeCursor({ p: last.publishedAt.toISOString(), id: last.publicId });
      }
      return ok(result);
    },
  });
}
