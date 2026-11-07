// In-memory `CommunityRepository` (U49 functional-spec § 1). Mirrors `PgCommunityRepository`,
// including the `fn_comment_depth` refusal, so command tests see the same `community.reply_depth`.
import type {
  CommentLookup,
  CommentRecord,
  CommunityRepository,
  MarkDeletedRequest,
  NewCommentRow,
  PortResult,
  ThreadRowsRequest,
  Tx,
} from '@rogikotha/application';

import { aCommentRecord } from '../builders/comment.js';
import type { Transactional } from './unit-of-work.js';

const EXTERNAL_LINK_RE = /\bhttps?:\/\/|\bwww\./i;

export interface FakeCommentRow extends CommentRecord {
  hasExternalLink: boolean;
  updatedAt: Date | null;
}

function toRecord(row: FakeCommentRow): CommentRecord {
  const { hasExternalLink: _link, updatedAt: _updated, ...record } = row;
  void _link;
  void _updated;
  return { ...record };
}

function oldestFirst(a: CommentRecord, b: CommentRecord): number {
  const byTime = a.createdAt.getTime() - b.createdAt.getTime();
  if (byTime !== 0) return byTime;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export class FakeCommunityModuleRepository implements CommunityRepository, Transactional {
  rows = new Map<string, FakeCommentRow>();
  /** What `insert` stamps as `created_at`; advances by one second per insert. */
  private nextCreatedAt = Date.UTC(2026, 5, 1, 9, 0, 0);

  /** Seeds a row directly, in any state, as a test arrangement. */
  add(overrides: Partial<FakeCommentRow> = {}): FakeCommentRow {
    const { hasExternalLink, updatedAt, ...record } = overrides;
    const row: FakeCommentRow = {
      ...aCommentRecord(record),
      hasExternalLink: hasExternalLink ?? false,
      updatedAt: updatedAt ?? null,
    };
    this.rows.set(row.id, row);
    return row;
  }

  snapshot(): Map<string, FakeCommentRow> {
    return new Map([...this.rows].map(([k, v]) => [k, { ...v }]));
  }

  restore(state: unknown): void {
    this.rows = state as Map<string, FakeCommentRow>;
  }

  byPublicId(_tx: Tx, lookup: CommentLookup): Promise<CommentRecord | null> {
    const row = [...this.rows.values()].find(
      (r) =>
        r.publicId === lookup.publicId &&
        (lookup.reviewId === undefined || r.reviewId === lookup.reviewId),
    );
    return Promise.resolve(row ? toRecord(row) : null);
  }

  insert(_tx: Tx, row: NewCommentRow): Promise<PortResult<void, 'community.reply_depth'>> {
    if (row.parentId !== null && this.rows.get(row.parentId)?.parentId != null) {
      return Promise.resolve({ ok: false, error: { code: 'community.reply_depth' } });
    }
    const createdAt = new Date(this.nextCreatedAt);
    this.nextCreatedAt += 1000;
    this.rows.set(row.id, {
      ...row,
      state: 'published',
      deletedAt: null,
      tombstone: false,
      createdAt,
      hasExternalLink: EXTERNAL_LINK_RE.test(row.body),
      updatedAt: null,
    });
    return Promise.resolve({ ok: true, data: undefined });
  }

  countLiveReplies(_tx: Tx, commentId: string): Promise<number> {
    const live = [...this.rows.values()].filter(
      (r) => r.parentId === commentId && r.state === 'published' && r.deletedAt === null,
    );
    return Promise.resolve(live.length);
  }

  markDeleted(_tx: Tx, request: MarkDeletedRequest): Promise<void> {
    const row = this.rows.get(request.commentId);
    if (row) {
      this.rows.set(row.id, {
        ...row,
        state: 'deleted_tombstone',
        deletedAt: request.at,
        updatedAt: request.at,
        tombstone: request.tombstone,
      });
    }
    return Promise.resolve();
  }

  threadRows(_tx: Tx, request: ThreadRowsRequest): Promise<CommentRecord[]> {
    const listed = [...this.rows.values()]
      .filter(
        (r) =>
          r.reviewId === request.reviewId &&
          (r.state === 'published' || r.state === 'deleted_tombstone'),
      )
      .map(toRecord)
      .sort(oldestFirst);
    return Promise.resolve(listed.slice(0, request.limit));
  }
}
