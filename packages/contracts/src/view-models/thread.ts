// The public discussion thread of one review (U49 entities.md, C10 release 1). Public ids only:
// no review, account, persona or internal comment id (BR4.1), and no like, score or rank field
// (BR3.7, FD-105). Replies are one level deep (02-data-model.md §8 `comments.parent_id`).
import type { PersonaPublicVM } from './persona';

export interface CommentVM {
  publicId: string;
  /** From identity `publicProjections` only (BR3.4). */
  author: PersonaPublicVM;
  /** Plain text; never rendered as markup (BR1.2). */
  body: string;
  /** ISO date-time. */
  postedAt: string;
  /** Computed on the server for a signed-in viewer; false when signed out (BR3.5). */
  mine: boolean;
  /** A reply offers no reply (BR5.3). */
  isReply: boolean;
}

export const THREAD_ITEM_KINDS = ['comment', 'placeholder'] as const;
export type ThreadItemKind = (typeof THREAD_ITEM_KINDS)[number];

export interface ThreadItemVM {
  kind: ThreadItemKind;
  /** Present only when `kind` is `comment`. */
  comment?: CommentVM;
  /** Present only when `kind` is `placeholder`; a render key, with no body, author or date. */
  placeholderPublicId?: string;
  /** Live replies, oldest first; at least one when `kind` is `placeholder` (BR3.3). */
  replies: CommentVM[];
}

export interface ThreadVM {
  /** False for an unknown or unpublished review (BR3.1). */
  open: boolean;
  /** Top-level items, oldest first. */
  items: ThreadItemVM[];
  /** True when more listed rows exist than the 500 kept (BR3.6). */
  truncated: boolean;
}
