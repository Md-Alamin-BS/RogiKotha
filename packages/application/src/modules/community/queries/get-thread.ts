// `community.thread` (U49 WF3, BR3.1–BR3.7, BR4.1): the public thread behind U47's
// `<CommentThread reviewPublicId>` slot. Public ids only; authors through persona projections;
// `mine` as a server-side boolean for a signed-in viewer.
import {
  GetThreadInput,
  ok,
  PUBLIC_PROJECTIONS_MAX,
  type Actor,
  type CommentVM,
  type PersonaPublicVM,
  type ThreadItemVM,
  type ThreadVM,
} from '@rogikotha/contracts';
import { buildThread, capRows, THREAD_CAP } from '@rogikotha/domain';

import { defineQuery } from '../../../command';
import type { CommentRecord, Tx } from '../../../ports';
import type { CommunityModulePorts } from '../ports';

const CLOSED: ThreadVM = { open: false, items: [], truncated: false };

/** The byline for a persona with no projection, never an empty name (BR3.4). */
const ANONYMOUS_BYLINE: PersonaPublicVM = { kind: 'anonymous', displayName: null, avatarHue: 0 };

async function projectAuthors(
  deps: CommunityModulePorts,
  tx: Tx,
  personaIds: readonly string[],
): Promise<Map<string, PersonaPublicVM>> {
  const byId = new Map<string, PersonaPublicVM>();
  for (let start = 0; start < personaIds.length; start += PUBLIC_PROJECTIONS_MAX) {
    const batch = personaIds.slice(start, start + PUBLIC_PROJECTIONS_MAX);
    const projected = await deps.identity.publicProjections(tx, { personaIds: batch });
    if (projected.length === batch.length) {
      batch.forEach((id, i) => byId.set(id, projected[i] ?? ANONYMOUS_BYLINE));
      continue;
    }
    // A short answer does not say which id is missing, so this batch is read one id at a time.
    for (const personaId of batch) {
      byId.set(
        personaId,
        (await deps.identity.publicProjection(tx, { personaId })) ?? ANONYMOUS_BYLINE,
      );
    }
  }
  return byId;
}

async function ownedAuthors(
  deps: CommunityModulePorts,
  tx: Tx,
  actor: Actor,
  personaIds: readonly string[],
): Promise<Set<string>> {
  const owned = new Set<string>();
  const accountId = actor.kind === 'account' ? actor.accountId : undefined;
  if (accountId === undefined) return owned;
  for (const personaId of personaIds) {
    if (await deps.ownership.ownsPersona(tx, { accountId, personaId })) owned.add(personaId);
  }
  return owned;
}

export function getThreadQuery(deps: CommunityModulePorts) {
  return defineQuery<GetThreadInput, ThreadVM>({
    name: 'community.thread',
    input: GetThreadInput,
    requires: {},
    async handle({ input, tx, actor }) {
      const reviewId = await deps.review.reviewIdForPublicId(tx, {
        publicId: input.reviewPublicId,
      });
      if (reviewId === null || !(await deps.review.isReviewPublished(tx, { reviewId }))) {
        return ok(CLOSED);
      }

      const listed = await deps.comments.threadRows(tx, { reviewId, limit: THREAD_CAP + 1 });
      const { rows, truncated } = capRows(listed);
      const tree = buildThread(rows);

      const live: CommentRecord[] = tree.flatMap((item) =>
        item.kind === 'comment' ? [item.comment, ...item.replies] : item.replies,
      );
      const authorIds = [...new Set(live.map((row) => row.authorPersonaId))];
      const authors = await projectAuthors(deps, tx, authorIds);
      const mine = await ownedAuthors(deps, tx, actor, authorIds);

      const toVM = (row: CommentRecord): CommentVM => ({
        publicId: row.publicId,
        author: authors.get(row.authorPersonaId) ?? ANONYMOUS_BYLINE,
        body: row.body,
        postedAt: row.createdAt.toISOString(),
        mine: mine.has(row.authorPersonaId),
        isReply: row.parentId !== null,
      });

      const items: ThreadItemVM[] = tree.map((item) =>
        item.kind === 'comment'
          ? { kind: 'comment', comment: toVM(item.comment), replies: item.replies.map(toVM) }
          : {
              kind: 'placeholder',
              placeholderPublicId: item.placeholder.publicId,
              replies: item.replies.map(toVM),
            },
      );
      return ok({ open: true, items, truncated });
    },
  });
}
