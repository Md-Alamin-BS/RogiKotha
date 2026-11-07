// The thread tree of one review (BR3.3, BR3.6, functional-spec WF3). Pure: rows in, items out;
// the query maps the result to `ThreadVM` with public ids and persona projections.
import { isLive, type LivenessFields } from './comment';
import { THREAD_CAP } from './limits';

export interface ThreadRow extends LivenessFields {
  id: string;
  parentId: string | null;
  createdAt: Date;
}

export type ThreadItem<R extends ThreadRow> =
  | { kind: 'comment'; comment: R; replies: R[] }
  | { kind: 'placeholder'; placeholder: R; replies: R[] };

function oldestFirst(a: ThreadRow, b: ThreadRow): number {
  const byTime = a.createdAt.getTime() - b.createdAt.getTime();
  if (byTime !== 0) return byTime;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Keeps the first `cap` rows in the given order and says whether any were cut; every listed row
 * counts, deleted ones included, before the placeholder filter (BR3.6).
 */
export function capRows<R>(
  rows: readonly R[],
  cap: number = THREAD_CAP,
): { rows: R[]; truncated: boolean } {
  return { rows: rows.slice(0, cap), truncated: rows.length > cap };
}

/**
 * Live top-level comments with their live replies; a deleted top-level comment becomes a
 * placeholder only while it has a live reply; deleted replies are never listed. Oldest first by
 * `createdAt`, then `id`.
 */
export function buildThread<R extends ThreadRow>(rows: readonly R[]): ThreadItem<R>[] {
  // ASSUMPTION(U49): a row in any other state (moderation-hidden, rejected, draft) is dropped with
  // its replies rather than shown as a placeholder, so the thread reveals no moderation state.
  const listed = rows.filter((r) => r.state === 'published' || r.state === 'deleted_tombstone');
  const sorted = [...listed].sort(oldestFirst);
  const replies = new Map<string, R[]>();
  for (const row of sorted) {
    if (row.parentId === null || !isLive(row)) continue;
    const siblings = replies.get(row.parentId);
    if (siblings) siblings.push(row);
    else replies.set(row.parentId, [row]);
  }
  const items: ThreadItem<R>[] = [];
  for (const top of sorted) {
    if (top.parentId !== null) continue;
    const live = replies.get(top.id) ?? [];
    if (isLive(top)) items.push({ kind: 'comment', comment: top, replies: live });
    else if (live.length > 0) items.push({ kind: 'placeholder', placeholder: top, replies: live });
  }
  return items;
}
