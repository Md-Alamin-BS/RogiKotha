// The Community repository (U49 functional-spec § 1): reads and writes `comments` only, and never
// joins `persona_links` or `reviews`, so no account or review data passes through it.
import type {
  CommentLookup,
  CommentRecord,
  CommunityRepository,
  MarkDeletedRequest,
  NewCommentRow,
  PortResult,
  ThreadRowsRequest,
  Tx as AppTx,
} from '@rogikotha/application';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { isRaiseWithPrefix } from '../pg-error';
import { comments } from '../schema/community';
import { executorOf } from '../unit-of-work';
import { isUuid } from './identity';

const LISTED_STATES = ['published', 'deleted_tombstone'] as const;

// Same test the demo slice used; the flag is stored but not shown in release 1.
const EXTERNAL_LINK_RE = /\bhttps?:\/\/|\bwww\./i;

// The message prefix of the `fn_comment_depth` raise (migration 0003).
const REPLY_DEPTH_PREFIX = 'community.reply_depth';

const commentColumns = {
  id: comments.id,
  publicId: comments.publicId,
  reviewId: comments.reviewId,
  parentId: comments.parentId,
  authorPersonaId: comments.authorPersonaId,
  body: comments.body,
  state: comments.state,
  deletedAt: comments.deletedAt,
  tombstone: comments.tombstone,
  createdAt: comments.createdAt,
};

export class PgCommunityRepository implements CommunityRepository {
  async byPublicId(tx: AppTx, lookup: CommentLookup): Promise<CommentRecord | null> {
    if (lookup.reviewId !== undefined && !isUuid(lookup.reviewId)) return null;
    const where =
      lookup.reviewId === undefined
        ? eq(comments.publicId, lookup.publicId)
        : and(eq(comments.publicId, lookup.publicId), eq(comments.reviewId, lookup.reviewId));
    const [row] = await executorOf(tx).select(commentColumns).from(comments).where(where).limit(1);
    return row ?? null;
  }

  async insert(tx: AppTx, row: NewCommentRow): Promise<PortResult<void, 'community.reply_depth'>> {
    try {
      // A savepoint, so the trigger's raise leaves the caller's transaction usable.
      await executorOf(tx).transaction(async (savepoint) => {
        await savepoint.insert(comments).values({
          id: row.id,
          publicId: row.publicId,
          reviewId: row.reviewId,
          parentId: row.parentId,
          authorPersonaId: row.authorPersonaId,
          body: row.body,
          hasExternalLink: EXTERNAL_LINK_RE.test(row.body),
          state: 'published',
        });
      });
    } catch (error) {
      if (isRaiseWithPrefix(error, REPLY_DEPTH_PREFIX))
        return { ok: false, error: { code: 'community.reply_depth' } };
      throw error;
    }
    return { ok: true, data: undefined };
  }

  async countLiveReplies(tx: AppTx, commentId: string): Promise<number> {
    if (!isUuid(commentId)) return 0;
    return executorOf(tx).$count(
      comments,
      and(
        eq(comments.parentId, commentId),
        eq(comments.state, 'published'),
        isNull(comments.deletedAt),
      ),
    );
  }

  async markDeleted(tx: AppTx, request: MarkDeletedRequest): Promise<void> {
    await executorOf(tx)
      .update(comments)
      .set({
        state: 'deleted_tombstone',
        deletedAt: request.at,
        updatedAt: request.at,
        tombstone: request.tombstone,
      })
      .where(eq(comments.id, request.commentId));
  }

  async threadRows(tx: AppTx, request: ThreadRowsRequest): Promise<CommentRecord[]> {
    if (!isUuid(request.reviewId)) return [];
    return executorOf(tx)
      .select(commentColumns)
      .from(comments)
      .where(
        and(eq(comments.reviewId, request.reviewId), inArray(comments.state, [...LISTED_STATES])),
      )
      .orderBy(asc(comments.createdAt), asc(comments.id))
      .limit(request.limit);
  }
}
