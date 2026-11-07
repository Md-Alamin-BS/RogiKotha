// Comment body and liveness rules (BR1.2, BR3.3). Plain values only.
import { COMMENT_BODY_MAX } from './limits';

// The `publication_state` enum of `comments.state`; U49 writes only published and deleted_tombstone.
export const COMMENT_STATES = [
  'draft',
  'pending_review',
  'published',
  'hidden_pending_review',
  'hidden',
  'rejected',
  'deleted_tombstone',
] as const;
export type CommentState = (typeof COMMENT_STATES)[number];

/** NFC of the trimmed body; links, at-names and markdown stay literal text (Q3). */
export function normaliseBody(raw: string): string {
  return raw.trim().normalize('NFC');
}

/** Length in Unicode code points, so an astral character counts once. */
export function bodyLength(body: string): number {
  return [...body].length;
}

/** True when the normalised body has 1 to `COMMENT_BODY_MAX` code points. */
export function isBodyWithinLimits(body: string): boolean {
  const length = bodyLength(body);
  return length >= 1 && length <= COMMENT_BODY_MAX;
}

export interface LivenessFields {
  state: CommentState;
  deletedAt: Date | null;
}

export function isLive(row: LivenessFields): boolean {
  return row.state === 'published' && row.deletedAt === null;
}
