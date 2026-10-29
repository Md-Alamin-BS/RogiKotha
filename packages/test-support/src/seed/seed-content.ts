// seed-content: reviews (`published`, `published_at` from `posted`,
// `period_*` from `period`, `sections` from `timeline` for detailed
// reviews, tags, `claims`, `review_versions` v1, follow-ups + later care,
// `latest_status`), facility reviews with criteria, comments (`k9` parent
// `k8`), reactions (real rows so counts are derived, not stored), and the
// corpus's bookmarks and drafts for shirin_88 (CR-012, BR3.6).
//
// ASSUMPTION(T-007): every corpus review/comment/facility-review carries
// *two* authored variants (`{en, bn}` — data-model header: "two authored
// variants for the demo only", not a real bilingual single post). The
// product schema stores exactly one `body`/`title`/`sections` per row
// (`language` picks which). Narrower, reversible choice: seed the Bengali
// variant everywhere (`language: 'bn'`) — matches the storyboard's
// "Bengali by default" framing; logged as an `ISS-` row.
//
// ASSUMPTION(T-007): the prototype's `likes`/`dislikes` counts (fixture
// flavour numbers, not real accounts) are turned into real `reactions`
// rows — the hard rule ("counts are derived from rows") — using a small
// reusable pool of synthetic `reactor_N` accounts (not the `reporter_N`
// accounts, which are reserved for the report/auto-hide flow) rather than
// one throwaway account per like, which would need ~300 accounts across
// the corpus for no product benefit. Logged as an `ISS-` row. Facility
// review reactions are not seeded (S3 follow-up — criteria, not likes, are
// what facility reviews demonstrate).
import { hash } from '@node-rs/argon2';
import { newId, newPublicId } from '@rogikotha/contracts';
import {
  accountPreferences,
  accountProfiles,
  authAccounts,
  authUsers,
  bookmarks,
  comments,
  facilityReviews,
  personaLinks,
  personas,
  reactions,
  reviewDrafts,
  reviewFollowUps,
  reviewTags,
  reviewVersions,
  reviews,
  type Db,
  type ReviewClaim,
  type ReviewSections,
} from '@rogikotha/database';
import { eq } from 'drizzle-orm';

import {
  COMMENTS,
  FACILITY_REVIEWS,
  FOLLOW_UPS,
  PERSONAS,
  REVIEWS,
  USER_BOOKMARKS,
  USER_DRAFTS,
  type Bilingual,
  type CorpusFollowUp,
} from '../corpus/index.js';
import type { SeedContext } from './seed.js';

/**
 * Anonymous personas are created here, not in seed-accounts.ts:
 * `persona_links.review_id` has a real FK to `reviews.id`
 * (`0004_deferred_fks.sql`), so the review must already exist for a
 * review-scoped anonymous persona, and reviews are this file's job. Each
 * synthesized `anon_author_<seedRef>` account (`port-corpus.mjs`) owns
 * exactly one anonymous persona, so "does this account already have a
 * persona_link" is a sufficient, correct idempotency check.
 */
async function ensureAnonymousPersona(
  db: Db,
  ctx: SeedContext,
  personaKey: string,
  reviewIdForLink: string | null,
): Promise<string> {
  const cached = ctx.personaIdByKey.get(personaKey);
  if (cached) return cached;

  const corpusPersona = (
    PERSONAS as unknown as {
      key: string;
      kind: string;
      displayName: Bilingual;
      avatarHue: number;
      accountUsername: string | null;
    }[]
  ).find((p) => p.key === personaKey);
  if (!corpusPersona?.accountUsername)
    throw new Error(`ensureAnonymousPersona: no corpus persona for key ${personaKey}`);
  const accountId = ctx.accountIdByUsername.get(corpusPersona.accountUsername);
  if (!accountId)
    throw new Error(`ensureAnonymousPersona: account ${corpusPersona.accountUsername} not seeded`);

  const [existingLink] = await db
    .select()
    .from(personaLinks)
    .where(eq(personaLinks.accountId, accountId))
    .limit(1);
  if (existingLink) {
    ctx.personaIdByKey.set(personaKey, existingLink.personaId);
    return existingLink.personaId;
  }

  const [persona] = await db
    .insert(personas)
    .values({
      id: newId(),
      kind: 'anonymous',
      displayName: corpusPersona.displayName.en,
      username: null,
      avatarHue: corpusPersona.avatarHue,
    })
    .returning();
  await db
    .insert(personaLinks)
    .values({ personaId: persona!.id, accountId, reviewId: reviewIdForLink });
  ctx.personaIdByKey.set(personaKey, persona!.id);
  return persona!.id;
}

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function parseMonthYear(en: string): { year: number; month: number } {
  const match = /([A-Za-z]+)\s+(\d{4})/.exec(en);
  if (!match) throw new Error(`seed-content: cannot parse month/year from "${en}"`);
  const month = MONTHS[match[1]!.toLowerCase()];
  if (!month) throw new Error(`seed-content: unknown month name in "${en}"`);
  return { year: Number(match[2]), month };
}

const CLAIM_LABELS: Record<string, Bilingual> = {
  wrongDx: { en: 'Wrong diagnosis', bn: 'ভুল রোগ নির্ণয়' },
  wrongRx: { en: 'Wrong treatment', bn: 'ভুল চিকিৎসা' },
  secondOpinion: { en: 'Second opinion differed', bn: 'দ্বিতীয় মত ভিন্ন ছিল' },
};

const REACTOR_POOL_SIZE = 50;
const DEMO_PASSWORD = 'demo-pass-2026!';

/** Ensures `reactor_1..reactor_N` contributor accounts exist, returns their account ids in order. */
async function ensureReactorPool(db: Db): Promise<string[]> {
  const ids: string[] = [];
  // `algorithm: 2` is `Algorithm.Argon2id` — see seed-accounts.ts's
  // `ARGON2_OPTIONS` comment for why the numeric value is used directly.
  const passwordHash = await hash(DEMO_PASSWORD, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    algorithm: 2,
  });
  for (let i = 1; i <= REACTOR_POOL_SIZE; i += 1) {
    const username = `reactor_${i}`;
    const [existing] = await db
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.username, username))
      .limit(1);
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const authUserId = newId();
    await db
      .insert(authUsers)
      .values({ id: authUserId, email: `${username}@demo.rogikotha.local`, emailVerified: true });
    await db.insert(authAccounts).values({
      id: newId(),
      accountId: authUserId,
      providerId: 'credential',
      userId: authUserId,
      password: passwordHash,
    });
    const now = new Date();
    const [profile] = await db
      .insert(accountProfiles)
      .values({
        id: newId(),
        authUserId,
        username,
        usernameKey: username,
        displayName: username,
        locale: 'en',
        status: 'active',
        ageConfirmedAt: now,
        termsVersion: '1',
        termsAcceptedAt: now,
      })
      .returning();
    await db.insert(accountPreferences).values({ accountId: profile!.id, interfaceLocale: 'en' });
    ids.push(profile!.id);
  }
  return ids;
}

async function seedReactions(
  db: Db,
  pool: string[],
  targetKind: 'review' | 'facility_review' | 'comment',
  targetId: string,
  likes: number,
  dislikes: number,
): Promise<number> {
  const [already] = await db
    .select()
    .from(reactions)
    .where(eq(reactions.targetId, targetId))
    .limit(1);
  if (already) return 0;
  // Each reaction needs its own pool account; wrapping would collide with the unique (target, account) index.
  if (likes + dislikes > pool.length) {
    throw new Error(
      `seed-content: ${targetKind} ${targetId} needs ${likes + dislikes} reactors, the pool holds ${pool.length}`,
    );
  }
  let count = 0;
  for (let i = 0; i < likes; i += 1) {
    await db.insert(reactions).values({
      id: newId(),
      targetKind,
      targetId,
      accountId: pool[i % pool.length]!,
      value: 'like',
    });
    count += 1;
  }
  for (let i = 0; i < dislikes; i += 1) {
    await db.insert(reactions).values({
      id: newId(),
      targetKind,
      targetId,
      accountId: pool[(likes + i) % pool.length]!,
      value: 'dislike',
    });
    count += 1;
  }
  return count;
}

export async function seedContent(db: Db, ctx: SeedContext): Promise<number> {
  let inserted = 0;
  const reactorPool = await ensureReactorPool(db);

  // --- reviews ---------------------------------------------------------------
  for (const r of REVIEWS) {
    const [existing] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.seedRef, r.seedRef))
      .limit(1);
    if (existing) {
      ctx.reviewIdBySeedRef.set(r.seedRef, existing.id);
      ctx.reviewPublicIdBySeedRef.set(r.seedRef, existing.publicId);
      continue;
    }
    const personaKey =
      r.identity === 'anon'
        ? `anon:${r.seedRef}`
        : r.identity === 'real'
          ? `named:${r.author.en}`
          : `pseudonymous:${r.author.en}`;
    const personaId =
      r.identity === 'anon'
        ? await ensureAnonymousPersona(db, ctx, personaKey, null)
        : ctx.personaIdByKey.get(personaKey);
    const doctorId = ctx.doctorIdBySeedRef.get(r.doctorSeedRef);
    if (!personaId || !doctorId)
      throw new Error(`seed-content: review ${r.seedRef} missing persona/doctor`);

    const { year: periodYear, month: periodMonth } = parseMonthYear(r.period.en);
    const publishedAt = new Date(
      Date.UTC(...(Object.values(parseMonthYear(r.posted.en)) as [number, number]), 1),
    );
    const claims: ReviewClaim[] = r.claims.map((code) => ({
      label: CLAIM_LABELS[code]?.bn ?? code,
    }));
    const sections: ReviewSections | null = r.detailed
      ? Object.fromEntries((r.timeline ?? []).map((t) => [t.key, t.text.bn]))
      : null;

    const [row] = await db
      .insert(reviews)
      .values({
        id: newId(),
        publicId: newPublicId(),
        seedRef: r.seedRef,
        authorPersonaId: personaId,
        doctorId,
        kind: r.detailed ? 'detailed' : 'quick',
        relationship: r.relationship,
        identityMode:
          r.identity === 'real' ? 'named' : r.identity === 'pseudo' ? 'pseudonymous' : 'anonymous',
        sentiment: r.sentiment,
        outcome: r.outcome,
        periodYear,
        periodMonth,
        title: r.title.bn,
        body: r.detailed ? null : r.body.bn,
        sections,
        claims,
        language: 'bn',
        state: 'published',
        publishedAt,
        version: 1,
        attestationAt: publishedAt,
      })
      .returning();
    const reviewId = row!.id;
    ctx.reviewIdBySeedRef.set(r.seedRef, reviewId);
    ctx.reviewPublicIdBySeedRef.set(r.seedRef, row!.publicId);
    inserted += 1;

    if (r.identity === 'anon') {
      // The anonymous persona was created before this review existed
      // (`ensureAnonymousPersona(..., null)` above); back-fill the real
      // review id onto its `persona_links` row now that one exists.
      await db.update(personaLinks).set({ reviewId }).where(eq(personaLinks.personaId, personaId));
    }

    for (const tag of r.tags) {
      await db
        .insert(reviewTags)
        .values({ id: newId(), reviewId, group: tag.group, freeText: tag.text.bn });
      inserted += 1;
    }

    await db.insert(reviewVersions).values({
      id: newId(),
      reviewId,
      version: 1,
      snapshot: { title: r.title.bn, body: r.body.bn, sections },
      changeKind: 'publish',
      actorKind: 'author',
      actorId: null,
    });
    inserted += 1;

    inserted += await seedReactions(db, reactorPool, 'review', reviewId, r.likes, r.dislikes);
  }

  // --- follow-ups + later care -------------------------------------------------
  for (const fu of FOLLOW_UPS as readonly CorpusFollowUp[]) {
    const reviewId = ctx.reviewIdBySeedRef.get(fu.reviewSeedRef);
    if (!reviewId) continue;
    const [already] = await db
      .select()
      .from(reviewFollowUps)
      .where(eq(reviewFollowUps.reviewId, reviewId))
      .limit(1);
    // A review can have several follow-up rows; disambiguate by body text
    // rather than "any row exists" so a second, different follow-up for
    // the same review is not skipped.
    const existingForThis = already
      ? await db.select().from(reviewFollowUps).where(eq(reviewFollowUps.reviewId, reviewId))
      : [];
    if (existingForThis.some((row) => row.body === fu.body.bn)) continue;

    const { year, month } = parseMonthYear(fu.date.en);
    await db.insert(reviewFollowUps).values({
      id: newId(),
      reviewId,
      kind: fu.kind,
      datedYear: year,
      datedMonth: month,
      body: fu.body.bn,
      laterProviderText: fu.laterProvider?.bn,
      state: 'published',
    });
    inserted += 1;
  }

  // `latest_status` — the newest follow-up per review (by dated_year/month),
  // never insertion order (data-model §6).
  for (const r of REVIEWS) {
    const reviewId = ctx.reviewIdBySeedRef.get(r.seedRef);
    if (!reviewId) continue;
    const rows = await db
      .select()
      .from(reviewFollowUps)
      .where(eq(reviewFollowUps.reviewId, reviewId));
    if (rows.length === 0) continue;
    const newest = [...rows].sort(
      (a, b) => b.datedYear - a.datedYear || b.datedMonth - a.datedMonth,
    )[0]!;
    await db.update(reviews).set({ latestStatus: newest.body }).where(eq(reviews.id, reviewId));
  }

  // --- facility reviews --------------------------------------------------------
  for (const fr of FACILITY_REVIEWS) {
    const [existing] = await db
      .select()
      .from(facilityReviews)
      .where(eq(facilityReviews.seedRef, fr.seedRef))
      .limit(1);
    if (existing) {
      ctx.facilityReviewIdBySeedRef.set(fr.seedRef, existing.id);
      continue;
    }
    const personaKey =
      fr.identity === 'anon'
        ? `anon:${fr.seedRef}`
        : fr.identity === 'real'
          ? `named:${fr.author.en}`
          : `pseudonymous:${fr.author.en}`;
    // `persona_links.review_id` FKs to `reviews.id` only (not
    // `facility_reviews.id`) — a facility review's anonymous persona is
    // never review-scoped at the database level; `reviewIdForLink: null`.
    const personaId =
      fr.identity === 'anon'
        ? await ensureAnonymousPersona(db, ctx, personaKey, null)
        : ctx.personaIdByKey.get(personaKey);
    const branchId = ctx.branchIdBySeedRef.get(fr.branchSeedRef);
    if (!personaId || !branchId)
      throw new Error(`seed-content: facility review ${fr.seedRef} missing persona/branch`);

    const { year: periodYear, month: periodMonth } = parseMonthYear(fr.period.en);
    const publishedAt = new Date(
      Date.UTC(...(Object.values(parseMonthYear(fr.posted.en)) as [number, number]), 1),
    );

    const [row] = await db
      .insert(facilityReviews)
      .values({
        id: newId(),
        publicId: newPublicId(),
        seedRef: fr.seedRef,
        authorPersonaId: personaId,
        branchId,
        identityMode:
          fr.identity === 'real'
            ? 'named'
            : fr.identity === 'pseudo'
              ? 'pseudonymous'
              : 'anonymous',
        periodYear,
        periodMonth,
        body: fr.body.bn,
        criteria: fr.criteria,
        state: 'published',
        publishedAt,
        version: 1,
      })
      .returning();
    ctx.facilityReviewIdBySeedRef.set(fr.seedRef, row!.id);
    inserted += 1;
  }

  // --- comments ------------------------------------------------------------
  for (const c of COMMENTS) {
    const [existing] = await db
      .select()
      .from(comments)
      .where(eq(comments.seedRef, c.seedRef))
      .limit(1);
    if (existing) {
      ctx.commentIdBySeedRef.set(c.seedRef, existing.id);
      continue;
    }
    const reviewId = ctx.reviewIdBySeedRef.get(c.reviewSeedRef);
    if (!reviewId)
      throw new Error(
        `seed-content: comment ${c.seedRef} references unseeded review ${c.reviewSeedRef}`,
      );
    const personaKey =
      c.identity === 'anon'
        ? `anon:${c.reviewSeedRef}`
        : c.identity === 'real'
          ? `named:${c.author.en}`
          : `pseudonymous:${c.author.en}`;
    // The comment's review already exists at this point (resolved above),
    // so an anonymous commenter's persona can be linked to it directly —
    // no back-fill needed, unlike the review-insertion loop above.
    const personaId =
      c.identity === 'anon'
        ? await ensureAnonymousPersona(db, ctx, personaKey, reviewId)
        : ctx.personaIdByKey.get(personaKey);
    if (!personaId)
      throw new Error(`seed-content: comment ${c.seedRef} missing persona ${personaKey}`);
    // k9's parent is k8 — resolved after k8 is inserted since COMMENTS lists
    // k8 before k9 (corpus order).
    const parentId = c.parentSeedRef ? ctx.commentIdBySeedRef.get(c.parentSeedRef) : null;

    const [row] = await db
      .insert(comments)
      .values({
        id: newId(),
        publicId: newPublicId(),
        seedRef: c.seedRef,
        reviewId,
        parentId,
        authorPersonaId: personaId,
        body: c.body.bn,
        hasExternalLink: Boolean(c.externalLink),
        state: 'published',
      })
      .returning();
    ctx.commentIdBySeedRef.set(c.seedRef, row!.id);
    inserted += 1;

    inserted += await seedReactions(db, reactorPool, 'comment', row!.id, c.likes, c.dislikes);
  }

  // --- bookmarks (USER_BOOKMARKS, idempotent by account + review) ------------
  for (const b of USER_BOOKMARKS) {
    const accountId = ctx.accountIdByUsername.get(b.accountUsername);
    const reviewId = ctx.reviewIdBySeedRef.get(b.reviewSeedRef);
    if (!accountId || !reviewId)
      throw new Error(
        `seed-content: bookmark ${b.accountUsername}/${b.reviewSeedRef} has no seeded account or review`,
      );
    const already = await db.select().from(bookmarks).where(eq(bookmarks.accountId, accountId));
    if (already.some((row) => row.reviewId === reviewId)) continue;
    await db.insert(bookmarks).values({ accountId, reviewId });
    inserted += 1;
  }

  // --- drafts (USER_DRAFTS — payload with the title and excerpt) --------------
  for (const d of USER_DRAFTS) {
    const accountId = ctx.accountIdByUsername.get(d.accountUsername);
    if (!accountId) continue;
    const payload = Buffer.from(JSON.stringify({ title: d.title, excerpt: d.excerpt }));
    // ASSUMPTION(CR-012): a draft is the same draft when its account and stored
    // payload match; counting an account's drafts duplicated them on a top-up
    // run. T-301 must keep an idempotency key when it encrypts the payload.
    const already = await db
      .select()
      .from(reviewDrafts)
      .where(eq(reviewDrafts.accountId, accountId));
    if (already.some((row) => Buffer.from(row.payloadEnc).equals(payload))) continue;
    const doctorId = d.doctorSeedRef ? ctx.doctorIdBySeedRef.get(d.doctorSeedRef) : null;
    const blockedOnSubmissionId = d.blockedOnSubmissionSeedRef
      ? (ctx.submissionIdBySeedRef.get(d.blockedOnSubmissionSeedRef) ?? null)
      : null;
    await db.insert(reviewDrafts).values({
      id: newId(),
      accountId,
      kind: 'quick',
      payloadEnc: payload, // TODO(T-101/T-301): encrypt with the real Crypto port once it exists.
      doctorId,
      blockedOnSubmissionId,
      expiresAt: new Date(Date.now() + d.expiresInDays * 24 * 60 * 60 * 1000),
    });
    inserted += 1;
  }

  return inserted;
}
