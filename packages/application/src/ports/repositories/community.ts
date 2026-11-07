// The Community repository port (U49 functional-spec § 1): reads and writes `comments` only, never
// `persona_links` or `reviews`. Ids are internal; only `publicId` leaves the server (BR4.1).
import type { CommentState } from '@rogikotha/domain';

import type { PortResult } from '../port-result';
import type { Tx } from '../unit-of-work';

export interface CommentRecord {
  id: string;
  publicId: string;
  reviewId: string;
  parentId: string | null;
  authorPersonaId: string;
  body: string;
  state: CommentState;
  deletedAt: Date | null;
  tombstone: boolean;
  createdAt: Date;
}

/** A new published comment or reply; the command generates both ids. */
export interface NewCommentRow {
  id: string;
  publicId: string;
  reviewId: string;
  parentId: string | null;
  authorPersonaId: string;
  body: string;
}

export interface CommentLookup {
  /** When given, a comment of another review is not found. */
  reviewId?: string;
  publicId: string;
}

export interface MarkDeletedRequest {
  commentId: string;
  at: Date;
  /** True when the comment still has live replies (BR2.3). */
  tombstone: boolean;
}

export interface ThreadRowsRequest {
  reviewId: string;
  limit: number;
}

export interface CommunityRepository {
  /** Any state; the command decides liveness. */
  byPublicId(tx: Tx, lookup: CommentLookup): Promise<CommentRecord | null>;
  /** `community.reply_depth` when the parent is itself a reply (the `fn_comment_depth` trigger). */
  insert(tx: Tx, row: NewCommentRow): Promise<PortResult<void, 'community.reply_depth'>>;
  /** Replies that are published and not deleted. */
  countLiveReplies(tx: Tx, commentId: string): Promise<number>;
  /** Only a live comment changes; false when it was no longer live (a concurrent delete). */
  markDeleted(tx: Tx, request: MarkDeletedRequest): Promise<boolean>;
  /** Listed rows (published and deleted_tombstone) of one review, oldest first, at most `limit` (BR3.6). */
  threadRows(tx: Tx, request: ThreadRowsRequest): Promise<CommentRecord[]>;
}
