import { describe, expect, it } from 'vitest';

import type { CommentState } from './comment';
import { THREAD_CAP } from './limits';
import { buildThread, capRows, type ThreadItem, type ThreadRow } from './thread';

const BASE = Date.parse('2026-03-01T08:00:00Z');
const DELETED_AT = new Date('2026-03-02T08:00:00Z');

function aRow(
  id: string,
  minute: number,
  overrides: Partial<Omit<ThreadRow, 'id'>> = {},
): ThreadRow {
  return {
    id,
    parentId: null,
    state: 'published',
    deletedAt: null,
    createdAt: new Date(BASE + minute * 60_000),
    ...overrides,
  };
}

function deleted(state: CommentState = 'deleted_tombstone') {
  return { state, deletedAt: DELETED_AT };
}

function shape(items: ThreadItem<ThreadRow>[]) {
  return items.map((item) => ({
    kind: item.kind,
    id: item.kind === 'comment' ? item.comment.id : item.placeholder.id,
    replies: item.replies.map((r) => r.id),
  }));
}

describe('buildThread', () => {
  it('lists a live top-level comment with its live replies', () => {
    const rows = [
      aRow('c1', 0),
      aRow('r1', 1, { parentId: 'c1' }),
      aRow('r2', 2, { parentId: 'c1' }),
    ];
    expect(shape(buildThread(rows))).toEqual([
      { kind: 'comment', id: 'c1', replies: ['r1', 'r2'] },
    ]);
  });

  it('shows a deleted top-level comment with a live reply as a placeholder', () => {
    const rows = [aRow('c1', 0, deleted()), aRow('r1', 1, { parentId: 'c1' })];
    expect(shape(buildThread(rows))).toEqual([{ kind: 'placeholder', id: 'c1', replies: ['r1'] }]);
  });

  it('omits a deleted top-level comment without live replies', () => {
    expect(buildThread([aRow('c1', 0, deleted())])).toEqual([]);
  });

  it('drops the placeholder once its last live reply is deleted', () => {
    const rows = [
      aRow('c1', 0, deleted()),
      aRow('r1', 1, { parentId: 'c1', ...deleted() }),
      aRow('r2', 2, { parentId: 'c1', ...deleted() }),
    ];
    expect(buildThread(rows)).toEqual([]);
  });

  it('never lists a deleted reply under a live comment', () => {
    const rows = [
      aRow('c1', 0),
      aRow('r1', 1, { parentId: 'c1', ...deleted() }),
      aRow('r2', 2, { parentId: 'c1' }),
    ];
    expect(shape(buildThread(rows))).toEqual([{ kind: 'comment', id: 'c1', replies: ['r2'] }]);
  });

  it('treats a published row with deletedAt set as deleted', () => {
    const rows = [aRow('c1', 0, { deletedAt: DELETED_AT }), aRow('r1', 1, { parentId: 'c1' })];
    expect(shape(buildThread(rows))).toEqual([{ kind: 'placeholder', id: 'c1', replies: ['r1'] }]);
  });

  it('never lists a hidden, rejected or draft comment, nor a placeholder for one', () => {
    const states: CommentState[] = ['hidden_pending_review', 'hidden', 'rejected', 'draft'];
    for (const state of states) {
      const rows = [
        aRow('c1', 0, { state }),
        aRow('r1', 1, { parentId: 'c1' }),
        aRow('c2', 2),
        aRow('r2', 3, { parentId: 'c2', state }),
      ];
      expect(shape(buildThread(rows))).toEqual([{ kind: 'comment', id: 'c2', replies: [] }]);
    }
  });

  it('orders items and replies oldest first by createdAt, then by id', () => {
    const rows = [
      aRow('c3', 5),
      aRow('r2', 7, { parentId: 'c1' }),
      aRow('c2', 0),
      aRow('r1', 6, { parentId: 'c1' }),
      aRow('c1', 0),
      aRow('r0', 6, { parentId: 'c1' }),
    ];
    expect(shape(buildThread(rows))).toEqual([
      { kind: 'comment', id: 'c1', replies: ['r0', 'r1', 'r2'] },
      { kind: 'comment', id: 'c2', replies: [] },
      { kind: 'comment', id: 'c3', replies: [] },
    ]);
  });

  it('returns the rows it was given, so the query maps them without a lookup', () => {
    const top = aRow('c1', 0);
    const reply = aRow('r1', 1, { parentId: 'c1' });
    const [item] = buildThread([top, reply]);
    expect(item).toEqual({ kind: 'comment', comment: top, replies: [reply] });
  });

  it('gives an empty list for no rows', () => {
    expect(buildThread([])).toEqual([]);
  });
});

describe('capRows', () => {
  function rows(count: number, deletedEvery = 0): ThreadRow[] {
    return Array.from({ length: count }, (_, i) =>
      aRow(
        `c${String(i).padStart(4, '0')}`,
        i,
        deletedEvery && i % deletedEvery === 0 ? deleted() : {},
      ),
    );
  }

  it('keeps 500 rows untouched', () => {
    const capped = capRows(rows(THREAD_CAP));
    expect(capped.rows).toHaveLength(500);
    expect(capped.truncated).toBe(false);
  });

  it('cuts 501 rows to the first 500 and says it was cut', () => {
    const all = rows(THREAD_CAP + 1);
    const capped = capRows(all);
    expect(capped.rows).toHaveLength(500);
    expect(capped.rows.at(-1)).toBe(all[499]);
    expect(capped.truncated).toBe(true);
  });

  it('counts tombstones toward the cap, before the placeholder filter', () => {
    const capped = capRows(rows(THREAD_CAP + 1, 3));
    expect(capped.truncated).toBe(true);
    expect(capped.rows.filter((r) => r.state === 'deleted_tombstone')).toHaveLength(167);
    expect(buildThread(capped.rows)).toHaveLength(500 - 167);
  });

  it('accepts a smaller cap', () => {
    expect(capRows([1, 2, 3], 2)).toEqual({ rows: [1, 2], truncated: true });
    expect(capRows([], 2)).toEqual({ rows: [], truncated: false });
  });
});
