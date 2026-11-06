// U46's review read repository (functional-spec § 8, FD-067), in a file of its own so the T-201
// stub in `review.ts` stays untouched (BR8.4, F9). Every doctor-review read applies BR1.3 in SQL:
// the review is published, not deleted, has a publication time, and its doctor is published and
// not merged. Facility reviews apply BR1.4 and never meet a doctor's figures (BR2.6, BR2.7).
// Nothing here reads evidence: document counts come only through `PublicEvidenceCount` (BR1.5).
// Bylines select public persona columns only (BR2.10).
import type {
  AboutTermRecord,
  BranchFeedbackRecord,
  BranchRefRecord,
  FacilityReviewRecord,
  MentionRecord,
  RecentCardsRequest,
  ReviewCardRecord,
  ReviewReadRepository,
  ReviewSummaryRecord,
  TermReviewRecord,
  Tx,
} from '@rogikotha/application';
import type { CriterionValue, IdentityMode, TagGroup } from '@rogikotha/contracts';
import {
  aliasedTable,
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
  type SQL,
} from 'drizzle-orm';

import { doctors, facilities, facilityBranches } from '../schema/directory';
import { personas } from '../schema/identity';
import { facilityReviews, reviews, reviewTags } from '../schema/review';
import { taxonomyTerms } from '../schema/taxonomy';
import { executorOf, type Executor } from '../unit-of-work';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuids(ids: readonly string[]): string[] {
  return [...new Set(ids)].filter((id) => UUID_RE.test(id));
}

/** BR1.3, with the subject doctor joined. */
const isEligibleReview = and(
  eq(reviews.state, 'published'),
  isNull(reviews.deletedAt),
  isNotNull(reviews.publishedAt),
  eq(doctors.state, 'published'),
  isNull(doctors.mergedIntoId),
)!;

/** BR1.4. */
const isEligibleVisit = and(
  eq(facilityReviews.state, 'published'),
  isNull(facilityReviews.deletedAt),
  isNotNull(facilityReviews.publishedAt),
)!;

/** An active condition term, the only kind BR1.7 relates a review to. */
function isActiveCondition(alias: string): SQL {
  const t = sql.raw(alias);
  return sql`${t}.kind = 'condition' and ${t}.state = 'published' and ${t}.canonical_id is null`;
}

/**
 * BR1.7, the one "about" rule: the tag `rt` (with its linked term `lt`) is about the term `q`
 * when `lt`'s effective term is `q`, or its free text is `q`'s name or alias, ignoring case and
 * outer spaces. Written with explicit aliases so a correlated sub-query never reads an ambiguous
 * column.
 */
function tagIsAbout(rt: string, lt: string, q: string): SQL {
  const [tag, linked, term] = [sql.raw(rt), sql.raw(lt), sql.raw(q)];
  const freeKey = sql`lower(btrim(normalize(${tag}.free_text, NFC)))`;
  return sql`(
    coalesce(${linked}.canonical_id, ${linked}.id) = ${term}.id
    or (${tag}.free_text is not null and (
      ${freeKey} in (lower(normalize(${term}.name_en, NFC)), lower(normalize(${term}.name_bn, NFC)))
      or exists (
        select 1 from taxonomy_aliases ta
        where ta.term_id = ${term}.id and lower(normalize(ta.alias, NFC)) = ${freeKey}
      )
    ))
  )`;
}

/** The review in the outer query is about the active condition term `termId` (BR1.7). */
function reviewIsAbout(termId: string): SQL {
  return sql`exists (
    select 1 from review_tags rt
    left join taxonomy_terms lt on lt.id = rt.term_id
    join taxonomy_terms q on q.id = ${termId} and ${isActiveCondition('q')}
    where rt.review_id = "reviews"."id" and rt."group" = 'condition'
      and ${tagIsAbout('rt', 'lt', 'q')}
  )`;
}

const specialty = aliasedTable(taxonomyTerms, 'doctor_specialty');

const anonymousByline = sql<boolean>`(${personas.kind} = 'anonymous' or ${reviews.identityMode} = 'anonymous')`;

const cardColumns = {
  id: reviews.id,
  publicId: reviews.publicId,
  doctorId: reviews.doctorId,
  doctorPublicId: doctors.publicId,
  doctorNameEn: doctors.nameEn,
  doctorNameBn: doctors.nameBn,
  branchId: reviews.branchId,
  title: reviews.title,
  body: reviews.body,
  sections: reviews.sections,
  sentiment: reviews.sentiment,
  outcome: reviews.outcome,
  relationship: reviews.relationship,
  periodYear: reviews.periodYear,
  periodMonth: reviews.periodMonth,
  publishedAt: reviews.publishedAt,
  anonymous: anonymousByline.mapWith(Boolean),
  personaKind: personas.kind,
  displayName: personas.displayName,
  username: personas.username,
};

function selectCards(db: Executor, where: SQL | undefined) {
  return db
    .select(cardColumns)
    .from(reviews)
    .innerJoin(doctors, eq(doctors.id, reviews.doctorId))
    .innerJoin(personas, eq(personas.id, reviews.authorPersonaId))
    .where(and(isEligibleReview, where))
    .orderBy(desc(reviews.publishedAt), desc(reviews.publicId));
}

type CardRow = Awaited<ReturnType<typeof selectCards>>[number];

interface ConditionTagFacts {
  /** Per review, its condition tags in tag order, each with the active terms it is about. */
  tags: Map<string, { freeText: string | null; linked: boolean; terms: AboutTermRecord[] }[]>;
}

/** One query for every condition tag of the given reviews and the active terms each is about. */
async function conditionTagFacts(db: Executor, reviewIds: string[]): Promise<ConditionTagFacts> {
  const tags: ConditionTagFacts['tags'] = new Map();
  if (reviewIds.length === 0) return { tags };
  const linkedTerm = aliasedTable(taxonomyTerms, 'lt');
  const aboutTerm = aliasedTable(taxonomyTerms, 'q');
  const rows = await db
    .select({
      reviewId: reviewTags.reviewId,
      tagId: reviewTags.id,
      freeText: reviewTags.freeText,
      linked: sql<boolean>`(${reviewTags.termId} is not null)`.mapWith(Boolean),
      termId: aboutTerm.id,
      termPublicId: aboutTerm.publicId,
      termNameEn: aboutTerm.nameEn,
      termNameBn: aboutTerm.nameBn,
    })
    .from(reviewTags)
    .leftJoin(linkedTerm, eq(linkedTerm.id, reviewTags.termId))
    .leftJoin(aboutTerm, sql`${isActiveCondition('q')} and ${tagIsAbout('review_tags', 'lt', 'q')}`)
    .where(and(inArray(reviewTags.reviewId, reviewIds), eq(reviewTags.group, 'condition')))
    .orderBy(asc(reviewTags.reviewId), asc(reviewTags.createdAt), asc(reviewTags.id));

  const byTag = new Map<
    string,
    { freeText: string | null; linked: boolean; terms: AboutTermRecord[] }
  >();
  for (const row of rows) {
    let tag = byTag.get(row.tagId);
    if (!tag) {
      tag = { freeText: row.freeText, linked: row.linked, terms: [] };
      byTag.set(row.tagId, tag);
      const list = tags.get(row.reviewId) ?? [];
      list.push(tag);
      tags.set(row.reviewId, list);
    }
    if (row.termId !== null && row.termPublicId !== null) {
      tag.terms.push({
        id: row.termId,
        publicId: row.termPublicId,
        nameEn: row.termNameEn ?? '',
        nameBn: row.termNameBn ?? '',
      });
    }
  }
  return { tags };
}

function aboutTermsOf(facts: ConditionTagFacts, reviewId: string): AboutTermRecord[] {
  const seen = new Map<string, AboutTermRecord>();
  for (const tag of facts.tags.get(reviewId) ?? []) {
    for (const term of tag.terms) if (!seen.has(term.id)) seen.set(term.id, term);
  }
  return [...seen.values()].sort((a, b) => a.nameEn.localeCompare(b.nameEn, 'en'));
}

/** BR3.9: the first tag that makes the review about an active term; a free-text tag must match one. */
function cardTermOf(facts: ConditionTagFacts, reviewId: string): AboutTermRecord | null {
  for (const tag of facts.tags.get(reviewId) ?? []) {
    if (tag.linked && tag.terms[0]) return tag.terms[0];
    if (!tag.linked && tag.terms.length === 1) return tag.terms[0]!;
  }
  return null;
}

function cardFreeTextOf(facts: ConditionTagFacts, reviewId: string): string | null {
  return (facts.tags.get(reviewId) ?? []).find((t) => t.freeText !== null)?.freeText ?? null;
}

function toCard(row: CardRow, facts: ConditionTagFacts): ReviewCardRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    doctorId: row.doctorId,
    doctorPublicId: row.doctorPublicId,
    doctorNameEn: row.doctorNameEn,
    doctorNameBn: row.doctorNameBn,
    branchId: row.branchId,
    title: row.title,
    body: row.body,
    sections: row.sections ?? null,
    sentiment: row.sentiment,
    outcome: row.outcome,
    relationship: row.relationship,
    periodYear: row.periodYear,
    periodMonth: row.periodMonth,
    // `isEligibleReview` leaves out a null publication time.
    publishedAt: row.publishedAt!,
    author: {
      personaKind: row.anonymous ? 'anonymous' : row.personaKind,
      displayName: row.displayName,
      username: row.username,
    },
    cardTerm: cardTermOf(facts, row.id),
    cardFreeText: cardFreeTextOf(facts, row.id),
    aboutTerms: aboutTermsOf(facts, row.id),
  };
}

async function cardsOf(db: Executor, rows: CardRow[]): Promise<ReviewCardRecord[]> {
  const facts = await conditionTagFacts(
    db,
    rows.map((r) => r.id),
  );
  return rows.map((row) => toCard(row, facts));
}

async function isActiveConditionTerm(db: Executor, termId: string): Promise<boolean> {
  if (!UUID_RE.test(termId)) return false;
  const [row] = await db
    .select({ id: taxonomyTerms.id })
    .from(taxonomyTerms)
    .where(
      and(
        eq(taxonomyTerms.id, termId),
        eq(taxonomyTerms.kind, 'condition'),
        eq(taxonomyTerms.state, 'published'),
        isNull(taxonomyTerms.canonicalId),
      ),
    )
    .limit(1);
  return row !== undefined;
}

function bylineOfVisit(row: {
  anonymous: boolean;
  personaKind: string;
  displayName: string;
  username: string | null;
}) {
  return {
    personaKind: row.anonymous ? ('anonymous' as const) : (row.personaKind as IdentityMode),
    displayName: row.displayName,
    username: row.username,
  };
}

export class PgReviewReadRepository implements ReviewReadRepository {
  async publishedForDoctor(tx: Tx, doctorId: string): Promise<ReviewCardRecord[]> {
    if (!UUID_RE.test(doctorId)) return [];
    const db = executorOf(tx);
    return cardsOf(db, await selectCards(db, eq(reviews.doctorId, doctorId)));
  }

  async publishedForTerm(tx: Tx, termId: string): Promise<TermReviewRecord[]> {
    const db = executorOf(tx);
    if (!(await isActiveConditionTerm(db, termId))) return [];
    const rows = await db
      .select({
        ...cardColumns,
        doctorSpecialtyEn: specialty.nameEn,
        doctorSpecialtyBn: specialty.nameBn,
        doctorAreaEn: doctors.areaEn,
        doctorAreaBn: doctors.areaBn,
        doctorCityEn: doctors.cityEn,
        doctorCityBn: doctors.cityBn,
        doctorAvatarHue: doctors.avatarHue,
        doctorPrimaryChamberEn: sql<
          string | null
        >`(select dc.name_en from doctor_chambers dc where dc.doctor_id = "doctors"."id" order by dc.sort_order, dc.created_at, dc.id limit 1)`,
        doctorPrimaryChamberBn: sql<
          string | null
        >`(select dc.name_bn from doctor_chambers dc where dc.doctor_id = "doctors"."id" order by dc.sort_order, dc.created_at, dc.id limit 1)`,
        branchPublicId: facilityBranches.publicId,
        branchNameEn: facilityBranches.nameEn,
        branchNameBn: facilityBranches.nameBn,
        branchOwnNameEn: facilityBranches.ownNameEn,
        branchOwnNameBn: facilityBranches.ownNameBn,
        branchAvatarHue: facilityBranches.avatarHue,
        branchVisible:
          sql<boolean>`(${facilityBranches.state} = 'published' and ${facilities.state} = 'published')`.mapWith(
            Boolean,
          ),
        facilityNameEn: facilities.nameEn,
        facilityNameBn: facilities.nameBn,
        facilityType: facilities.type,
      })
      .from(reviews)
      .innerJoin(doctors, eq(doctors.id, reviews.doctorId))
      .innerJoin(personas, eq(personas.id, reviews.authorPersonaId))
      .leftJoin(
        specialty,
        and(eq(specialty.id, doctors.specialtyId), eq(specialty.state, 'published')),
      )
      .leftJoin(facilityBranches, eq(facilityBranches.id, reviews.branchId))
      .leftJoin(facilities, eq(facilities.id, facilityBranches.facilityId))
      .where(and(isEligibleReview, reviewIsAbout(termId)))
      .orderBy(desc(reviews.publishedAt), desc(reviews.publicId));

    const facts = await conditionTagFacts(
      db,
      rows.map((r) => r.id),
    );
    const mentions = await mentionsOf(
      db,
      rows.map((r) => r.id),
    );
    return rows.map((row) => {
      const branch: BranchRefRecord | null =
        row.branchVisible && row.branchId && row.branchPublicId
          ? {
              id: row.branchId,
              publicId: row.branchPublicId,
              nameEn: row.branchNameEn!,
              nameBn: row.branchNameBn!,
              ownNameEn: row.branchOwnNameEn,
              ownNameBn: row.branchOwnNameBn,
              facilityNameEn: row.facilityNameEn!,
              facilityNameBn: row.facilityNameBn!,
              type: row.facilityType!,
              avatarHue: row.branchAvatarHue,
            }
          : null;
      return {
        ...toCard(row, facts),
        doctorSpecialtyEn: row.doctorSpecialtyEn,
        doctorSpecialtyBn: row.doctorSpecialtyBn,
        doctorAreaEn: row.doctorAreaEn,
        doctorAreaBn: row.doctorAreaBn,
        doctorCityEn: row.doctorCityEn,
        doctorCityBn: row.doctorCityBn,
        doctorAvatarHue: row.doctorAvatarHue,
        doctorPrimaryChamberEn: row.doctorPrimaryChamberEn,
        doctorPrimaryChamberBn: row.doctorPrimaryChamberBn,
        branch,
        mentions: mentions.get(row.id) ?? [],
      };
    });
  }

  async publishedForBranch(tx: Tx, branchId: string): Promise<FacilityReviewRecord[]> {
    if (!UUID_RE.test(branchId)) return [];
    const rows = await executorOf(tx)
      .select({
        publicId: facilityReviews.publicId,
        anonymous:
          sql<boolean>`(${personas.kind} = 'anonymous' or ${facilityReviews.identityMode} = 'anonymous')`.mapWith(
            Boolean,
          ),
        personaKind: personas.kind,
        displayName: personas.displayName,
        username: personas.username,
        periodYear: facilityReviews.periodYear,
        periodMonth: facilityReviews.periodMonth,
        publishedAt: facilityReviews.publishedAt,
        body: facilityReviews.body,
        criteria: facilityReviews.criteria,
      })
      .from(facilityReviews)
      .innerJoin(personas, eq(personas.id, facilityReviews.authorPersonaId))
      .where(and(isEligibleVisit, eq(facilityReviews.branchId, branchId)))
      .orderBy(desc(facilityReviews.publishedAt), desc(facilityReviews.publicId));
    return rows.map((row) => ({
      publicId: row.publicId,
      author: bylineOfVisit(row),
      periodYear: row.periodYear,
      periodMonth: row.periodMonth,
      publishedAt: row.publishedAt!,
      body: row.body,
      criteria: { ...row.criteria },
    }));
  }

  async summariesForDoctors(tx: Tx, doctorIds: readonly string[]): Promise<ReviewSummaryRecord[]> {
    const ids = uuids(doctorIds);
    if (ids.length === 0) return [];
    const db = executorOf(tx);
    const rows = await db
      .select({ id: reviews.id, doctorId: reviews.doctorId, sentiment: reviews.sentiment })
      .from(reviews)
      .innerJoin(doctors, eq(doctors.id, reviews.doctorId))
      .where(and(isEligibleReview, inArray(reviews.doctorId, ids)))
      .orderBy(desc(reviews.publishedAt), desc(reviews.publicId));
    const facts = await conditionTagFacts(
      db,
      rows.map((r) => r.id),
    );
    return rows.map((row) => ({
      reviewId: row.id,
      doctorId: row.doctorId,
      sentiment: row.sentiment,
      aboutTerms: aboutTermsOf(facts, row.id),
    }));
  }

  async summariesForBranches(
    tx: Tx,
    branchIds: readonly string[],
  ): Promise<BranchFeedbackRecord[]> {
    const ids = uuids(branchIds);
    if (ids.length === 0) return [];
    const rows = await executorOf(tx)
      .select({
        branchId: facilityReviews.branchId,
        overall: sql<CriterionValue | null>`${facilityReviews.criteria} ->> 'overall'`,
      })
      .from(facilityReviews)
      .where(and(isEligibleVisit, inArray(facilityReviews.branchId, ids)));
    return rows.map((row) => ({ branchId: row.branchId, overall: row.overall ?? null }));
  }

  async totalsForTerms(tx: Tx, termIds: readonly string[]): Promise<Map<string, number>> {
    const totals = new Map<string, number>(termIds.map((id) => [id, 0]));
    const ids = uuids(termIds);
    if (ids.length === 0) return totals;
    // One grouped read for the whole index (BR3.10): each review counts once per term.
    const rows = await executorOf(tx).execute<{ term_id: string; n: string | number }>(sql`
      select q.id as term_id, count(distinct r.id) as n
      from reviews r
      join doctors d on d.id = r.doctor_id
      join review_tags rt on rt.review_id = r.id and rt."group" = 'condition'
      left join taxonomy_terms lt on lt.id = rt.term_id
      join taxonomy_terms q on q.id in (${sql.join(
        ids.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}) and ${isActiveCondition('q')} and ${tagIsAbout('rt', 'lt', 'q')}
      where r.state = 'published' and r.deleted_at is null and r.published_at is not null
        and d.state = 'published' and d.merged_into_id is null
      group by q.id
    `);
    for (const row of rows.rows) totals.set(row.term_id, Number(row.n));
    return totals;
  }

  async listRecentCards(tx: Tx, request: RecentCardsRequest): Promise<ReviewCardRecord[]> {
    const limit = Math.max(0, Math.floor(request.limit));
    if (limit === 0) return [];
    const db = executorOf(tx);
    let termFilter: SQL | undefined;
    if (request.termPublicId !== undefined) {
      const [term] = await db
        .select({ id: taxonomyTerms.id })
        .from(taxonomyTerms)
        .where(eq(taxonomyTerms.publicId, request.termPublicId))
        .limit(1);
      if (!term) return [];
      termFilter = reviewIsAbout(term.id);
    }
    const after = request.after;
    const rows = await selectCards(
      db,
      and(
        request.doctorPublicId === undefined
          ? undefined
          : eq(doctors.publicId, request.doctorPublicId),
        termFilter,
        after
          ? sql`(${reviews.publishedAt}, ${reviews.publicId}) < (${after.publishedAt.toISOString()}::timestamptz, ${after.publicId})`
          : undefined,
      ),
    ).limit(limit);
    return cardsOf(db, rows);
  }
}

/** Medicine, treatment and symptom tags in tag order; `not sure` tags are not mentions (BR3.4). */
async function mentionsOf(
  db: Executor,
  reviewIds: string[],
): Promise<Map<string, MentionRecord[]>> {
  const mentions = new Map<string, MentionRecord[]>();
  if (reviewIds.length === 0) return mentions;
  const linkedTerm = aliasedTable(taxonomyTerms, 'lt');
  const target = aliasedTable(taxonomyTerms, 'target');
  const rows = await db
    .select({
      reviewId: reviewTags.reviewId,
      group: reviewTags.group,
      freeText: reviewTags.freeText,
      linkedNameEn: linkedTerm.nameEn,
      linkedNameBn: linkedTerm.nameBn,
      linkedPublished: sql<boolean>`(${linkedTerm.state} = 'published')`.mapWith(Boolean),
      mapped: sql<boolean>`(${linkedTerm.canonicalId} is not null)`.mapWith(Boolean),
      targetNameEn: target.nameEn,
      targetNameBn: target.nameBn,
      targetPublished: sql<boolean>`(${target.state} = 'published')`.mapWith(Boolean),
    })
    .from(reviewTags)
    .leftJoin(linkedTerm, eq(linkedTerm.id, reviewTags.termId))
    .leftJoin(target, eq(target.id, linkedTerm.canonicalId))
    .where(
      and(
        inArray(reviewTags.reviewId, reviewIds),
        sql`${reviewTags.group} <> 'condition'`,
        eq(reviewTags.notSure, false),
      ),
    )
    .orderBy(asc(reviewTags.reviewId), asc(reviewTags.createdAt), asc(reviewTags.id));
  for (const row of rows) {
    // The effective term's names, when that term is active (BR1.6).
    const names = row.mapped
      ? row.targetPublished
        ? { en: row.targetNameEn, bn: row.targetNameBn }
        : null
      : row.linkedPublished
        ? { en: row.linkedNameEn, bn: row.linkedNameBn }
        : null;
    if (!names && row.freeText === null) continue;
    const list = mentions.get(row.reviewId) ?? [];
    list.push({
      group: row.group as Exclude<TagGroup, 'condition'>,
      termNameEn: names?.en ?? null,
      termNameBn: names?.bn ?? null,
      freeText: row.freeText,
    });
    mentions.set(row.reviewId, list);
  }
  return mentions;
}
