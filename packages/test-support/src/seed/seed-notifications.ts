// seed-notifications: the five in-app notifications (`n1`..`n5`) for
// `shirin_88` (CR-008 step 1 / ISS-173). `USER_NOTIFICATIONS` was ported
// into the corpus by T-007 but never consumed by any seed step —
// `notifications` stayed empty even though `05-demo-storyboard.md:13`
// describes `shirin_88` as having five seeded notifications.
//
// Registered last in `seed.ts`'s step order (after accounts, config,
// directory, content, evidence *and* moderation), not merely "after
// accounts and content" as the task text's minimum — this step's `params`
// reference an evidence item (seed-evidence) and a moderation case code
// (seed-moderation), both seeded later than content, so it must run after
// every other step to resolve real ids for all five rows.
import { newId } from '@rogikotha/contracts';
import { comments, notifications, retentionPolicies, type Db } from '@rogikotha/database';
import { eq } from 'drizzle-orm';

import { USER_NOTIFICATIONS } from '../corpus/index.js';
import type { SeedContext } from './seed.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MESSAGE_KEY_BY_KIND: Record<(typeof USER_NOTIFICATIONS)[number]['kind'], string> = {
  evidence: 'notif.evidenceReady',
  discussion: 'notif.replyReceived',
  moderation: 'notif.moderationOutcome',
  security: 'notif.securityNewDevice',
  draft: 'notif.draftExpiring',
};

/** Parses the corpus's `when` strings ("2 days ago", "1 week ago", …) into a Date relative to now. */
function parseRelativeAgo(en: string): Date {
  const match = /^(\d+)\s+(day|days|week|weeks)\s+ago$/.exec(en.trim());
  if (!match) throw new Error(`seed-notifications: cannot parse relative time from "${en}"`);
  const amount = Number(match[1]);
  const days = match[2]!.startsWith('week') ? amount * 7 : amount;
  return new Date(Date.now() - days * MS_PER_DAY);
}

/**
 * The ids each notification's copy needs (review/evidence/case public id —
 * never free text, per the task's own hard-rule checklist). The corpus's
 * `text.en/bn` strings (never read below) were matched by hand against the
 * reviews/comments/evidence already seeded by seed-content/seed-evidence/
 * seed-moderation, since the corpus carries no cross-reference of its own
 * for these five rows.
 *
 * ASSUMPTION(CR-008): the message keys' remaining interpolation values
 * (evidence `{label}`, commenter `{name}`, moderation `{action}`, sign-in
 * `{city}`, draft `{days}`) are deliberately **not** stored in `params` —
 * a stored `days`/`city` would go stale as time passes or stay a made-up
 * value with no seeded device/session row behind it. The narrower,
 * reversible choice is to store only the ids a future rendering command
 * (T-405) can resolve those values from at query time; `n4` (security)
 * and `n5` (draft) reference no seeded row at all (`n4`: no
 * `staff_devices`/session rows are seeded per the T-007 handoff; `n5`:
 * drafts have no public id and `/me`'s drafts tab lists them without one),
 * so their `params` stay `{}`.
 */
async function resolveNotificationFields(
  db: Db,
  ctx: SeedContext,
  seedRef: string,
): Promise<{ params: Record<string, unknown>; route: string }> {
  const reviewPublicId = ctx.reviewPublicIdBySeedRef.get('r1');

  switch (seedRef) {
    case 'n1': {
      // "Your HbA1c result finished processing…" -> e2, r1's HbA1c-result
      // evidence item (corpus label "HbA1c result, May 2026").
      const evidenceItemPublicId = ctx.evidenceItemPublicIdBySeedRef.get('e2');
      return { params: { reviewPublicId, evidenceItemPublicId }, route: `/experiences/${reviewPublicId}` };
    }
    case 'n2': {
      // "Dr. Farhana Rahman commented on your experience…" -> k2, her
      // comment on r1 (comment author "Dr. Farhana Rahman", identity `real`).
      const commentId = ctx.commentIdBySeedRef.get('k2');
      const [comment] = commentId ? await db.select().from(comments).where(eq(comments.id, commentId)).limit(1) : [];
      return { params: { reviewPublicId, commentPublicId: comment?.publicId }, route: `/experiences/${reviewPublicId}` };
    }
    case 'n3': {
      // "A comment on your experience was hidden for giving dangerous
      // medical instructions…" -> k3, MOD-2041's target (dangerous + spam,
      // auto-hidden).
      const commentId = ctx.commentIdBySeedRef.get('k3');
      const [comment] = commentId ? await db.select().from(comments).where(eq(comments.id, commentId)).limit(1) : [];
      return {
        params: { reviewPublicId, commentPublicId: comment?.publicId, caseCode: 'MOD-2041' },
        route: `/experiences/${reviewPublicId}`,
      };
    }
    case 'n4':
      return { params: {}, route: '/me/security' };
    case 'n5':
      return { params: {}, route: '/me' };
    default:
      throw new Error(`seed-notifications: no id mapping for ${seedRef}`);
  }
}

export async function seedUserNotifications(db: Db, ctx: SeedContext): Promise<number> {
  let inserted = 0;

  const [policy] = await db.select().from(retentionPolicies).where(eq(retentionPolicies.version, 1)).limit(1);
  const notificationDays = policy?.notificationDays ?? 90;
  // Captured once so every "already read" row in this run shares one
  // `read_at`, rather than drifting a few milliseconds apart.
  const readAtNow = new Date();

  for (const n of USER_NOTIFICATIONS) {
    const [existing] = await db.select().from(notifications).where(eq(notifications.dedupeKey, n.seedRef)).limit(1);
    if (existing) continue;

    const accountId = ctx.accountIdByUsername.get(n.accountUsername);
    if (!accountId) continue;

    const createdAt = parseRelativeAgo(n.when.en);
    const { params, route } = await resolveNotificationFields(db, ctx, n.seedRef);

    await db.insert(notifications).values({
      id: newId(),
      accountId,
      kind: n.kind,
      messageKey: MESSAGE_KEY_BY_KIND[n.kind],
      params,
      route,
      readAt: n.unread ? null : readAtNow,
      dedupeKey: n.seedRef,
      expiresAt: new Date(createdAt.getTime() + notificationDays * MS_PER_DAY),
      createdAt,
    });
    inserted += 1;
  }

  return inserted;
}
