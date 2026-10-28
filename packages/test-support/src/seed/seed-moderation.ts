// seed-moderation: cases with `code` from the corpus, lanes, `report_count`
// / `distinct_reporters` from `reports`, `auto_hidden`, reasons, reports
// rows from `reporter_N` accounts to make the counts true, decisions where
// `auditLog` shows `record`, an appeal for every `appeals`-lane case
// (MOD-2011 on review r4, MOD-2018 on comment k27) with `appealText`, audit
// events from `auditLog` with `created_at = now - timeMin`, staff
// notifications. Sets the target content state to `hidden_pending_review`
// where `autoHidden` is true.
//
// ASSUMPTION(T-007): `auditLog`'s actors (`moderator:rashid`,
// `moderator:nadia`, `moderator:tabassum`) do not all correspond to seeded
// staff accounts — only `mod_rashid`/`admin_nadia`/`sa_founder` are in the
// storyboard's roster (`tabassum` is not). Every decision/appeal-review
// actor in this step is attributed to `mod_rashid` (or `sa_founder` for
// the appeal decision itself, which needs `decided_by != decisions.actor`
// — FR rule) rather than inventing a fourth staff account. `audit_events`
// rows keep the corpus's original opaque actor strings verbatim (they are
// display-only), so the timeline text is unaffected. Logged as an `ISS-`
// row.
//
// ASSUMPTION(T-007): MOD-2038 targets evidence item `e6`, which has no
// `hidden_pending_review`-equivalent state in `evidence_state` — this step
// creates the case/report rows but does not flip `e6`'s own state (S4,
// logged). Auto-hidden comments (MOD-2041 `k3`, MOD-2047 `k31`) and the
// appealed targets (MOD-2011 review `r4`, via the `account` → `review`
// target-kind mapping, and MOD-2018 comment `k27`) do get their content
// state flipped, since `comments.state`/`reviews.state` both have a
// `hidden_pending_review` value.
import { newId } from '@rogikotha/contracts';
import type { ReportReason, TargetKind } from '@rogikotha/contracts';
import {
  appeals,
  auditEvents,
  comments,
  moderationCaseReasons,
  moderationCases,
  moderationDecisions,
  personaLinks,
  reports,
  reviews,
  staffNotifications,
  type Db,
} from '@rogikotha/database';
import { eq } from 'drizzle-orm';

import { MODERATION_AUDIT_LOG, MODERATION_CASES, STAFF_NOTIFICATIONS } from '../corpus/index.js';
import type { SeedContext } from './seed.js';

const REPORTER_USERNAMES = ['reporter_1', 'reporter_2', 'reporter_3', 'reporter_4', 'reporter_5', 'reporter_6'];

/** Corpus `targetKind` -> the schema's shared `target_kind` enum (addendum: `account` -> `review`). */
function mapTargetKind(kind: 'comment' | 'evidence' | 'account' | 'profile'): TargetKind {
  if (kind === 'account') return 'review';
  return kind;
}

function resolveTargetId(ctx: SeedContext, kind: 'comment' | 'evidence' | 'account' | 'profile', seedRef: string): string | undefined {
  if (kind === 'comment') return ctx.commentIdBySeedRef.get(seedRef);
  if (kind === 'evidence') return ctx.evidenceItemIdBySeedRef.get(seedRef);
  if (kind === 'account') return ctx.reviewIdBySeedRef.get(seedRef);
  if (kind === 'profile') return ctx.doctorIdBySeedRef.get(seedRef);
  return undefined;
}

/**
 * The reason that fills a case's reports beyond its listed reasons, per case.
 * FD-039 / ISS-221: MOD-2033's three further reports cite `factual`, so the
 * case reads as the factual disagreement its summary describes. Only cases
 * listed here are padded (CR-012, BR4.1).
 */
const REASON_PADDING: Readonly<Record<string, ReportReason>> = { 'MOD-2033': 'factual' };

/** One reason per report: the case's listed reasons, padded from `REASON_PADDING`; any other shortfall fails (BR4.2). */
function reportReasonsFor(c: { seedRef: string; reportCount: number; reportReasons: readonly ReportReason[] }): ReportReason[] {
  const reasons = [...c.reportReasons];
  if (reasons.length >= c.reportCount) return reasons;
  const padding = REASON_PADDING[c.seedRef];
  if (!padding) {
    throw new Error(`seed-moderation: ${c.seedRef} has ${c.reportCount} reports but ${reasons.length} reasons and no padding entry`);
  }
  while (reasons.length < c.reportCount) reasons.push(padding);
  return reasons;
}

/** The account behind the author persona of an appealed review or comment (MOD-2011: r_ahmed; MOD-2018: shafiq_ctg). */
async function appellantAccountId(db: Db, targetKind: TargetKind, targetId: string): Promise<string> {
  const [target] =
    targetKind === 'review'
      ? await db.select({ personaId: reviews.authorPersonaId }).from(reviews).where(eq(reviews.id, targetId)).limit(1)
      : await db.select({ personaId: comments.authorPersonaId }).from(comments).where(eq(comments.id, targetId)).limit(1);
  const [link] = target ? await db.select().from(personaLinks).where(eq(personaLinks.personaId, target.personaId)).limit(1) : [];
  if (!link) throw new Error(`seed-moderation: no account behind the author of appealed ${targetKind} ${targetId}`);
  return link.accountId;
}

export async function seedModeration(db: Db, ctx: SeedContext): Promise<number> {
  let inserted = 0;
  const modRashidId = ctx.accountIdByUsername.get('mod_rashid');
  const saFounderId = ctx.accountIdByUsername.get('sa_founder');
  if (!modRashidId || !saFounderId) throw new Error('seed-moderation: mod_rashid and sa_founder must be seeded first');

  for (const c of MODERATION_CASES) {
    const [existing] = await db.select().from(moderationCases).where(eq(moderationCases.code, c.seedRef)).limit(1);
    if (existing) continue;

    const targetKind = mapTargetKind(c.targetKind);
    const targetId = resolveTargetId(ctx, c.targetKind, c.targetSeedRef);
    if (!targetId) {
      // A case whose target was not seeded (e.g. review scope trimmed) is
      // skipped rather than inserted with a dangling reference.
      continue;
    }
    const reviewId = c.reviewSeedRef ? ctx.reviewIdBySeedRef.get(c.reviewSeedRef) : undefined;
    const openedAt = new Date(Date.now() - c.ageHours * 60 * 60 * 1000);

    // CR-008 / ISS-174: `reportCount` is the prototype's own `reports`
    // number, which can exceed `reportReasons.length` when several reporters
    // gave the same reason (MOD-2033: 6 reports, 3 listed reasons). The
    // padding comes from `REASON_PADDING` (FD-039, ISS-221), not from
    // repeating the last reason.
    const paddedReasons = reportReasonsFor(c);

    const [caseRow] = await db
      .insert(moderationCases)
      .values({
        id: newId(),
        code: c.seedRef,
        lane: c.lane,
        status: c.lane === 'appeals' ? 'appealed' : 'open',
        targetKind,
        targetId,
        reviewId,
        reportCount: c.reportCount,
        distinctReporters: Math.min(c.reportCount, REPORTER_USERNAMES.length),
        autoHidden: c.autoHidden,
        coordinatedSignal: c.coordinated,
        summaryEn: c.summary.en,
        summaryBn: c.summary.bn,
        openedAt,
        slaDueAt: new Date(openedAt.getTime() + (c.lane === 'critical' ? 24 : 72) * 60 * 60 * 1000),
      })
      .returning();
    inserted += 1;

    // The reason breakdown is derived from the same `paddedReasons` list as
    // the report rows below, so `sum(moderation_case_reasons.count)` always
    // equals the real number of `reports` rows for the case (hard rule: no
    // number stands for quality; every count is a row count).
    const reasonCounts = new Map<string, number>();
    for (const reason of paddedReasons) reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    for (const [reason, count] of reasonCounts) {
      await db.insert(moderationCaseReasons).values({ caseId: caseRow!.id, reason: reason as (typeof c.reportReasons)[number], count });
      inserted += 1;
    }

    // Report rows from distinct `reporter_N` accounts, so `report_count`/
    // `distinct_reporters` are real, derived counts (hard rule).
    let reporterIndex = 0;
    for (const reason of paddedReasons) {
      const reporterUsername = REPORTER_USERNAMES[reporterIndex % REPORTER_USERNAMES.length]!;
      reporterIndex += 1;
      const reporterAccountId = ctx.accountIdByUsername.get(reporterUsername);
      if (!reporterAccountId) continue;
      await db.insert(reports).values({
        id: newId(),
        targetKind,
        targetId,
        reviewId,
        reporterAccountId,
        reason,
        detail: c.summary.bn,
      });
      inserted += 1;
    }

    // Flip the target's own publication state where the corpus says it was
    // auto-hidden (or, for the appeal case, was hidden and is now under
    // appeal — see the header ASSUMPTION for MOD-2011/r4).
    if (c.autoHidden && targetKind === 'comment') {
      await db.update(comments).set({ state: 'hidden_pending_review' }).where(eq(comments.id, targetId));
    } else if (c.autoHidden && targetKind === 'review') {
      await db
        .update(reviews)
        .set({ state: 'hidden_pending_review', hiddenAt: openedAt, hiddenReasonCode: c.reportReasons[0] ?? 'other' })
        .where(eq(reviews.id, targetId));
    } else if (c.lane === 'appeals' && (targetKind === 'review' || targetKind === 'comment')) {
      // ASSUMPTION(CR-012): MOD-2018 (comment k27) is seeded like MOD-2011: a
      // `hide` decision with reason `other` by `mod_rashid`, appealed by the
      // target's author (BR3.4).
      if (targetKind === 'review') {
        await db
          .update(reviews)
          .set({ state: 'hidden_pending_review', hiddenAt: openedAt, hiddenReasonCode: 'other' })
          .where(eq(reviews.id, targetId));
      } else {
        await db.update(comments).set({ state: 'hidden_pending_review' }).where(eq(comments.id, targetId));
      }

      await db.insert(moderationDecisions).values({
        id: newId(),
        caseId: caseRow!.id,
        action: 'hide',
        reasonCode: 'other',
        reasonToAuthor: c.note.bn,
        policyVersion: '1',
        actorAccountId: modRashidId,
        publicEffect: { stateBefore: 'published', stateAfter: 'hidden_pending_review' },
      });
      inserted += 1;

      if (c.appealText) {
        await db.insert(appeals).values({
          id: newId(),
          caseId: caseRow!.id,
          appellantAccountId: await appellantAccountId(db, targetKind, targetId),
          text: c.appealText.bn,
          status: 'open',
          checklist: { freshReview: true },
          decidedBy: null,
          dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        inserted += 1;
      }
    }
  }

  for (const a of MODERATION_AUDIT_LOG) {
    const caseCode = a.caseSeedRef;
    const [caseRow] = await db.select().from(moderationCases).where(eq(moderationCases.code, caseCode)).limit(1);
    if (!caseRow) continue;
    const already = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.stream, `case:${caseCode}`))
      .limit(200);
    if (already.some((row) => row.action === a.action && row.actor === a.actor)) continue;
    await db.insert(auditEvents).values({
      id: newId(),
      stream: `case:${caseCode}`,
      action: a.action,
      actor: a.actor,
      details: {},
      createdAt: new Date(Date.now() - a.timeMinAgo * 60 * 1000),
    });
    inserted += 1;
  }

  for (const n of STAFF_NOTIFICATIONS) {
    const [existing] = await db.select().from(staffNotifications).where(eq(staffNotifications.dedupeKey, n.seedRef)).limit(1);
    if (existing) continue;
    await db.insert(staffNotifications).values({
      id: newId(),
      kind: n.kind,
      targetCode: n.target.en,
      messageKey: `admin.notif.kind.${n.kind}`,
      params: {},
      route: '/admin/notifications',
      dedupeKey: n.seedRef,
    });
    inserted += 1;
  }

  return inserted;
}
