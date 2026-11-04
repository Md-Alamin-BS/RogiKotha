// Comment data functions of the demo slice (FR6). Signatures fixed by the foundation step; bodies
// are written by the experience-and-comments step (plan Step 10).
import type {
  DemoAddCommentInput,
  DemoComment,
  DemoCommentThread,
  DemoOutcome,
} from '@rogikotha/contracts';
import { newId, newPublicId } from '@rogikotha/contracts';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { Db } from '../client';
import { comments } from '../schema/community';
import { personaLinks, personas } from '../schema/identity';

// ASSUMPTION(demo-slice): the publication-state enum has no plain "deleted" value, so a deleted
// comment moves to `deleted_tombstone` whether or not it has replies; `deleted_at` marks the
// deletion and the `tombstone` flag records whether replies kept it in the thread. Code that
// counts `state = 'published'` comments therefore never counts a deleted one.
const DELETED_STATE = 'deleted_tombstone';
const LISTED_STATES = ['published', DELETED_STATE] as const;

const EXTERNAL_LINK_RE = /\bhttps?:\/\/|\bwww\./i;

interface CommentRow {
  id: string;
  publicId: string;
  parentId: string | null;
  body: string;
  state: string;
  createdAt: Date;
  deletedAt: Date | null;
  personaKind: 'named' | 'pseudonymous' | 'anonymous';
  personaName: string;
  isViewer: boolean;
}

function isLive(row: CommentRow): boolean {
  return row.state === 'published' && row.deletedAt === null;
}

function toComment(row: CommentRow): DemoComment {
  return {
    id: row.id,
    publicId: row.publicId,
    body: row.body,
    // ASSUMPTION(demo-slice): DemoComment carries no identity mode, so an anonymous commenter
    // comes back with no name and the thread renders the anonymous byline for it.
    authorDisplayName: row.personaKind === 'anonymous' ? null : row.personaName,
    createdAt: row.createdAt,
    tombstone: false,
    canDelete: row.isViewer,
  };
}

function toTombstone(row: CommentRow): DemoComment {
  return {
    id: row.id,
    publicId: row.publicId,
    body: null,
    authorDisplayName: null,
    createdAt: row.createdAt,
    tombstone: true,
    canDelete: false,
  };
}

function selectCommentRows(db: Db, reviewId: string, viewerAccountId: string | null) {
  // Only the comparison leaves the database, never the author's account id.
  const isViewer = viewerAccountId
    ? sql<boolean>`coalesce(${personaLinks.accountId} = ${viewerAccountId}, false)`
    : sql<boolean>`false`;
  return db
    .select({
      id: comments.id,
      publicId: comments.publicId,
      parentId: comments.parentId,
      body: comments.body,
      state: comments.state,
      createdAt: comments.createdAt,
      deletedAt: comments.deletedAt,
      personaKind: personas.kind,
      personaName: personas.displayName,
      isViewer,
    })
    .from(comments)
    .innerJoin(personas, eq(personas.id, comments.authorPersonaId))
    .leftJoin(personaLinks, eq(personaLinks.personaId, comments.authorPersonaId))
    .where(and(eq(comments.reviewId, reviewId), inArray(comments.state, [...LISTED_STATES])))
    .orderBy(asc(comments.createdAt), asc(comments.id));
}

/**
 * Published comments on one experience, oldest first, each top-level comment with its replies.
 * A deleted comment that has replies comes back as a tombstone (no body, no author); one without
 * replies is left out. `canDelete` is true for the viewer's own live comments.
 */
export async function listComments(
  db: Db,
  reviewId: string,
  viewerAccountId: string | null,
): Promise<DemoCommentThread[]> {
  const rows: CommentRow[] = await selectCommentRows(db, reviewId, viewerAccountId);

  const repliesByParent = new Map<string, DemoComment[]>();
  for (const row of rows) {
    if (row.parentId === null || !isLive(row)) continue;
    const replies = repliesByParent.get(row.parentId) ?? [];
    replies.push(toComment(row));
    repliesByParent.set(row.parentId, replies);
  }

  const threads: DemoCommentThread[] = [];
  for (const row of rows) {
    if (row.parentId !== null) continue;
    const replies = repliesByParent.get(row.id) ?? [];
    if (isLive(row)) threads.push({ ...toComment(row), replies });
    else if (replies.length > 0) threads.push({ ...toTombstone(row), replies });
  }
  return threads;
}

/**
 * Inserts a published comment or reply. `parent_not_found` when the parent is missing, deleted or
 * on another experience; `reply_depth` when the parent is itself a reply (one reply level, also
 * enforced by the `fn_comment_depth()` trigger).
 */
export async function addComment(
  db: Db,
  input: DemoAddCommentInput,
): Promise<DemoOutcome<{ id: string; publicId: string }, 'parent_not_found' | 'reply_depth'>> {
  let parentId: string | null = null;
  if (input.parentPublicId !== null) {
    const [parent] = await db
      .select({ id: comments.id, parentId: comments.parentId })
      .from(comments)
      .where(
        and(
          eq(comments.publicId, input.parentPublicId),
          eq(comments.reviewId, input.reviewId),
          eq(comments.state, 'published'),
          isNull(comments.deletedAt),
        ),
      )
      .limit(1);
    if (!parent) return { ok: false, reason: 'parent_not_found' };
    if (parent.parentId !== null) return { ok: false, reason: 'reply_depth' };
    parentId = parent.id;
  }

  const [row] = await db
    .insert(comments)
    .values({
      id: newId(),
      publicId: newPublicId(),
      reviewId: input.reviewId,
      parentId,
      authorPersonaId: input.authorPersonaId,
      body: input.body,
      hasExternalLink: EXTERNAL_LINK_RE.test(input.body),
      state: 'published',
    })
    .returning({ id: comments.id, publicId: comments.publicId });
  return { ok: true, data: row! };
}

/**
 * Deletes the viewer's own comment: sets `deleted_at`, and `tombstone = true` when it has replies.
 * `not_found` also covers "someone else's comment", so ownership is not leaked.
 */
export function deleteOwnComment(
  db: Db,
  commentPublicId: string,
  accountId: string,
): Promise<DemoOutcome<{ tombstone: boolean }, 'not_found'>> {
  return db.transaction(async (tx): Promise<DemoOutcome<{ tombstone: boolean }, 'not_found'>> => {
    const [own] = await tx
      .select({ id: comments.id })
      .from(comments)
      .innerJoin(personaLinks, eq(personaLinks.personaId, comments.authorPersonaId))
      .where(
        and(
          eq(comments.publicId, commentPublicId),
          eq(personaLinks.accountId, accountId),
          eq(comments.state, 'published'),
          isNull(comments.deletedAt),
        ),
      )
      .limit(1);
    if (!own) return { ok: false, reason: 'not_found' };

    const liveReplies = await tx.$count(
      comments,
      and(
        eq(comments.parentId, own.id),
        eq(comments.state, 'published'),
        isNull(comments.deletedAt),
      ),
    );
    const tombstone = liveReplies > 0;
    const now = new Date();
    await tx
      .update(comments)
      .set({ state: DELETED_STATE, deletedAt: now, updatedAt: now, tombstone })
      .where(eq(comments.id, own.id));
    return { ok: true, data: { tombstone } };
  });
}
