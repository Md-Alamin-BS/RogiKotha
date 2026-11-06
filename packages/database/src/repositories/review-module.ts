// U47's Review module repository (functional-spec § 5), in a file of its own so the T-201 stub in
// `review.ts` stays untouched. Eligibility, doctor visibility and branch visibility are U46's
// predicates, imported and never rewritten (R-04). Draft queries filter by the owning account and
// `expires_at > now`; `payload_enc` is stored and returned as bytes (BR2.2). Nothing here reads
// `persona_links` or `evidence_items`, and no public read selects `exact_date_enc` (FR42).
import type {
  ActiveTermRef,
  PreviewDoctorRecord,
  DraftChange,
  DraftRecord,
  EligibleReviewRecord,
  EligibleTagRecord,
  NewDraftRecord,
  NewFacilityReviewRecord,
  NewReviewRecord,
  NewReviewTag,
  NewReviewVersion,
  OwnReviewRecord,
  ReviewModuleRepository,
  PreviewTermRecord,
  Tx,
} from '@rogikotha/application';
import { isPublicId, type IdentityMode, type Locale, type TermKind } from '@rogikotha/contracts';
import {
  aliasedTable,
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  max,
  sql,
} from 'drizzle-orm';

import { doctors, facilities, facilityBranches } from '../schema/directory';
import {
  facilityReviews,
  reviewDrafts,
  reviews,
  reviewTags,
  reviewVersions,
} from '../schema/review';
import { taxonomyTerms } from '../schema/taxonomy';
import { executorOf } from '../unit-of-work';
import { isVisibleBranch, isVisibleDoctor, memberAddedNotConfirmed } from './directory-module';
import { isEligibleReview } from './review-reads';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (id: string) => UUID_RE.test(id);

function uuids(ids: readonly string[]): string[] {
  return [...new Set(ids)].filter(isUuid);
}

const draftColumns = {
  id: reviewDrafts.id,
  kind: reviewDrafts.kind,
  payloadEnc: reviewDrafts.payloadEnc,
  doctorId: reviewDrafts.doctorId,
  updatedAt: reviewDrafts.updatedAt,
  expiresAt: reviewDrafts.expiresAt,
};

function toDraft(row: {
  id: string;
  kind: DraftRecord['kind'];
  payloadEnc: Buffer;
  doctorId: string | null;
  updatedAt: Date;
  expiresAt: Date;
}): DraftRecord {
  return {
    ...row,
    payloadEnc: new Uint8Array(
      row.payloadEnc.buffer,
      row.payloadEnc.byteOffset,
      row.payloadEnc.length,
    ),
  };
}

function ownLiveDraft(accountId: string, draftId: string, now: Date) {
  return and(
    eq(reviewDrafts.id, draftId),
    eq(reviewDrafts.accountId, accountId),
    gt(reviewDrafts.expiresAt, now),
  );
}

const bytes = (value: Uint8Array) => Buffer.from(value.buffer, value.byteOffset, value.byteLength);

const specialty = aliasedTable(taxonomyTerms, 'doctor_specialty');
const linkedTerm = aliasedTable(taxonomyTerms, 'linked_term');
const canonicalTerm = aliasedTable(taxonomyTerms, 'canonical_term');

/** A correction version of the review in the outer query exists (BR7.3). */
const hasCorrection = sql<boolean>`exists (
  select 1 from ${reviewVersions}
  where ${reviewVersions.reviewId} = "reviews"."id" and ${reviewVersions.changeKind} = 'correction'
)`.mapWith(Boolean);

export class PgReviewModuleRepository implements ReviewModuleRepository {
  async insertDraft(tx: Tx, draft: NewDraftRecord): Promise<void> {
    await executorOf(tx)
      .insert(reviewDrafts)
      .values({
        id: draft.id,
        accountId: draft.accountId,
        kind: draft.kind,
        payloadEnc: bytes(draft.payloadEnc),
        doctorId: draft.doctorId,
        createdAt: draft.now,
        updatedAt: draft.now,
        expiresAt: draft.expiresAt,
      });
  }

  async updateOwnDraft(
    tx: Tx,
    accountId: string,
    draftId: string,
    change: DraftChange,
  ): Promise<boolean> {
    if (!isUuid(accountId) || !isUuid(draftId)) return false;
    const rows = await executorOf(tx)
      .update(reviewDrafts)
      .set({
        kind: change.kind,
        payloadEnc: bytes(change.payloadEnc),
        doctorId: change.doctorId,
        updatedAt: change.now,
        expiresAt: change.expiresAt,
      })
      .where(ownLiveDraft(accountId, draftId, change.now))
      .returning({ id: reviewDrafts.id });
    return rows.length > 0;
  }

  async countOwnLiveDrafts(tx: Tx, accountId: string, now: Date): Promise<number> {
    if (!isUuid(accountId)) return 0;
    const [row] = await executorOf(tx)
      .select({ n: count() })
      .from(reviewDrafts)
      .where(and(eq(reviewDrafts.accountId, accountId), gt(reviewDrafts.expiresAt, now)));
    return row?.n ?? 0;
  }

  async findOwnLiveDraft(
    tx: Tx,
    accountId: string,
    draftId: string,
    now: Date,
  ): Promise<DraftRecord | null> {
    if (!isUuid(accountId) || !isUuid(draftId)) return null;
    const [row] = await executorOf(tx)
      .select(draftColumns)
      .from(reviewDrafts)
      .where(ownLiveDraft(accountId, draftId, now))
      .limit(1);
    return row ? toDraft(row) : null;
  }

  async listOwnLiveDrafts(
    tx: Tx,
    accountId: string,
    now: Date,
    limit: number,
  ): Promise<DraftRecord[]> {
    const n = Math.max(0, Math.floor(limit));
    if (n === 0 || !isUuid(accountId)) return [];
    const rows = await executorOf(tx)
      .select(draftColumns)
      .from(reviewDrafts)
      .where(and(eq(reviewDrafts.accountId, accountId), gt(reviewDrafts.expiresAt, now)))
      .orderBy(desc(reviewDrafts.updatedAt), desc(reviewDrafts.id))
      .limit(n);
    return rows.map(toDraft);
  }

  async deleteOwnDraft(tx: Tx, accountId: string, draftId: string, now: Date): Promise<boolean> {
    if (!isUuid(accountId) || !isUuid(draftId)) return false;
    const rows = await executorOf(tx)
      .delete(reviewDrafts)
      .where(ownLiveDraft(accountId, draftId, now))
      .returning({ id: reviewDrafts.id });
    return rows.length > 0;
  }

  async visibleDoctorIdByPublicId(tx: Tx, publicId: string): Promise<string | null> {
    if (!isPublicId(publicId)) return null;
    const [row] = await executorOf(tx)
      .select({ id: doctors.id })
      .from(doctors)
      .where(and(isVisibleDoctor, eq(doctors.publicId, publicId)))
      .limit(1);
    return row?.id ?? null;
  }

  async visibleBranchIdByPublicId(tx: Tx, publicId: string): Promise<string | null> {
    if (!isPublicId(publicId)) return null;
    const [row] = await executorOf(tx)
      .select({ id: facilityBranches.id })
      .from(facilityBranches)
      .innerJoin(facilities, eq(facilities.id, facilityBranches.facilityId))
      .where(and(isVisibleBranch, eq(facilityBranches.publicId, publicId)))
      .limit(1);
    return row?.id ?? null;
  }

  async activeTermIdsByPublicIds(
    tx: Tx,
    publicIds: readonly string[],
  ): Promise<Map<string, ActiveTermRef>> {
    const result = new Map<string, ActiveTermRef>();
    const ids = [...new Set(publicIds)].filter(isPublicId);
    if (ids.length === 0) return result;
    // A mapped term stands for its canonical target, active only when that target is (U46 BR1.6).
    // The outer column is written qualified: a one-table select renders columns unqualified.
    const rows = await executorOf(tx)
      .select({
        publicId: taxonomyTerms.publicId,
        termId: sql<string | null>`case
          when ${taxonomyTerms.state} <> 'published' then null
          when ${taxonomyTerms.canonicalId} is null then ${taxonomyTerms.id}
          else (select c.id from taxonomy_terms c
                where c.id = "taxonomy_terms"."canonical_id" and c.state = 'published')
        end`,
        kind: sql<TermKind>`coalesce(
          (select c.kind from taxonomy_terms c where c.id = "taxonomy_terms"."canonical_id"),
          ${taxonomyTerms.kind}
        )`,
      })
      .from(taxonomyTerms)
      .where(inArray(taxonomyTerms.publicId, ids));
    for (const row of rows) {
      if (row.termId !== null) result.set(row.publicId, { termId: row.termId, kind: row.kind });
    }
    return result;
  }

  async visibleDoctorRefByPublicId(
    tx: Tx,
    publicId: string,
    locale: Locale,
  ): Promise<PreviewDoctorRecord | null> {
    if (!isPublicId(publicId)) return null;
    const bn = locale === 'bn';
    const [row] = await executorOf(tx)
      .select({
        id: doctors.id,
        publicId: doctors.publicId,
        name: bn ? doctors.nameBn : doctors.nameEn,
        specialty: bn ? specialty.nameBn : specialty.nameEn,
        memberAddedNotConfirmed,
      })
      .from(doctors)
      .leftJoin(
        specialty,
        and(eq(specialty.id, doctors.specialtyId), eq(specialty.state, 'published')),
      )
      .where(and(isVisibleDoctor, eq(doctors.publicId, publicId)))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      publicId: row.publicId,
      name: row.name,
      specialty: row.specialty,
      memberAddedNotConfirmed: Boolean(row.memberAddedNotConfirmed),
    };
  }

  async activeTermRefsByPublicIds(
    tx: Tx,
    publicIds: readonly string[],
    locale: Locale,
  ): Promise<Map<string, PreviewTermRecord>> {
    const result = new Map<string, PreviewTermRecord>();
    const ids = [...new Set(publicIds)].filter(isPublicId);
    if (ids.length === 0) return result;
    const bn = locale === 'bn';
    const columns = {
      id: taxonomyTerms.id,
      publicId: taxonomyTerms.publicId,
      state: taxonomyTerms.state,
      canonicalId: taxonomyTerms.canonicalId,
      nameEn: taxonomyTerms.nameEn,
      nameBn: taxonomyTerms.nameBn,
      provisional: taxonomyTerms.provisional,
      kind: taxonomyTerms.kind,
    };
    const db = executorOf(tx);
    const given = await db
      .select(columns)
      .from(taxonomyTerms)
      .where(inArray(taxonomyTerms.publicId, ids));
    const canonicalIds = [
      ...new Set(given.flatMap((t) => (t.canonicalId === null ? [] : [t.canonicalId]))),
    ];
    const targets =
      canonicalIds.length === 0
        ? []
        : await db
            .select(columns)
            .from(taxonomyTerms)
            .where(inArray(taxonomyTerms.id, canonicalIds));
    const byId = new Map(targets.map((t) => [t.id, t]));
    for (const term of given) {
      if (term.state !== 'published') continue;
      // A mapped term stands for its canonical target, active only when that target is (U46 BR1.6).
      const effective = term.canonicalId === null ? term : byId.get(term.canonicalId);
      if (effective?.state !== 'published') continue;
      result.set(term.publicId, {
        publicId: effective.publicId,
        name: bn ? effective.nameBn : effective.nameEn,
        provisional: Boolean(effective.provisional),
        kind: effective.kind,
      });
    }
    return result;
  }

  async insertReview(tx: Tx, review: NewReviewRecord): Promise<void> {
    await executorOf(tx)
      .insert(reviews)
      .values({
        id: review.id,
        publicId: review.publicId,
        authorPersonaId: review.authorPersonaId,
        doctorId: review.doctorId,
        branchId: null,
        kind: review.kind,
        relationship: review.relationship,
        identityMode: review.identityMode,
        sentiment: review.sentiment,
        outcome: review.outcome,
        periodYear: review.periodYear,
        periodMonth: review.periodMonth,
        exactDateEnc: review.exactDateEnc === null ? null : bytes(review.exactDateEnc),
        title: review.title,
        body: review.body,
        sections: review.sections,
        claims: review.claims,
        language: review.language,
        state: 'published',
        publishedAt: review.now,
        attestationAt: review.now,
        version: 1,
        createdAt: review.now,
        updatedAt: review.now,
      });
  }

  async insertTags(tx: Tx, reviewId: string, tags: readonly NewReviewTag[]): Promise<void> {
    if (tags.length === 0) return;
    // Tag order is read back by `created_at`, so each row is a millisecond after the one before.
    await executorOf(tx)
      .insert(reviewTags)
      .values(
        tags.map((tag, i) => ({
          reviewId,
          group: tag.group,
          termId: 'termId' in tag ? tag.termId : null,
          notSure: 'notSure' in tag,
          createdAt: sql`now() + ${i} * interval '1 millisecond'`,
        })),
      );
  }

  async insertVersion(tx: Tx, version: NewReviewVersion): Promise<void> {
    await executorOf(tx).insert(reviewVersions).values({
      reviewId: version.reviewId,
      version: version.version,
      snapshot: version.snapshot,
      changeKind: version.changeKind,
      actorKind: version.actorKind,
      actorId: version.actorId,
      createdAt: version.now,
    });
  }

  async insertFacilityReview(tx: Tx, review: NewFacilityReviewRecord): Promise<void> {
    await executorOf(tx).insert(facilityReviews).values({
      id: review.id,
      publicId: review.publicId,
      authorPersonaId: review.authorPersonaId,
      branchId: review.branchId,
      identityMode: review.identityMode,
      periodYear: review.periodYear,
      periodMonth: review.periodMonth,
      body: review.body,
      criteria: review.criteria,
      state: 'published',
      publishedAt: review.now,
      version: 1,
      createdAt: review.now,
      updatedAt: review.now,
    });
  }

  async findEligibleByPublicId(
    tx: Tx,
    publicId: string,
    locale: Locale,
  ): Promise<EligibleReviewRecord | null> {
    if (!isPublicId(publicId)) return null;
    const db = executorOf(tx);
    const bn = locale === 'bn';
    const [row] = await db
      .select({
        id: reviews.id,
        publicId: reviews.publicId,
        authorPersonaId: reviews.authorPersonaId,
        kind: reviews.kind,
        relationship: reviews.relationship,
        identityMode: reviews.identityMode,
        sentiment: reviews.sentiment,
        outcome: reviews.outcome,
        periodYear: reviews.periodYear,
        periodMonth: reviews.periodMonth,
        title: reviews.title,
        body: reviews.body,
        sections: reviews.sections,
        claims: reviews.claims,
        language: reviews.language,
        publishedAt: reviews.publishedAt,
        doctorId: doctors.id,
        doctorPublicId: doctors.publicId,
        doctorName: bn ? doctors.nameBn : doctors.nameEn,
        doctorSpecialty: bn ? specialty.nameBn : specialty.nameEn,
        memberAddedNotConfirmed,
      })
      .from(reviews)
      .innerJoin(doctors, eq(doctors.id, reviews.doctorId))
      .leftJoin(
        specialty,
        and(eq(specialty.id, doctors.specialtyId), eq(specialty.state, 'published')),
      )
      .where(and(isEligibleReview, eq(reviews.publicId, publicId)))
      .limit(1);
    if (!row) return null;

    const tagRows = await db
      .select({
        group: reviewTags.group,
        notSure: reviewTags.notSure,
        freeText: reviewTags.freeText,
        linkedPublicId: linkedTerm.publicId,
        linkedNameEn: linkedTerm.nameEn,
        linkedNameBn: linkedTerm.nameBn,
        linkedProvisional: linkedTerm.provisional,
        linkedState: linkedTerm.state,
        canonicalPublicId: canonicalTerm.publicId,
        canonicalNameEn: canonicalTerm.nameEn,
        canonicalNameBn: canonicalTerm.nameBn,
        canonicalProvisional: canonicalTerm.provisional,
        canonicalState: canonicalTerm.state,
      })
      .from(reviewTags)
      .leftJoin(linkedTerm, eq(linkedTerm.id, reviewTags.termId))
      .leftJoin(canonicalTerm, eq(canonicalTerm.id, linkedTerm.canonicalId))
      .where(eq(reviewTags.reviewId, row.id))
      .orderBy(asc(reviewTags.createdAt), asc(reviewTags.id));

    const tags: EligibleTagRecord[] = tagRows.map((t) => {
      if (t.notSure) return { group: 'condition', notSure: true };
      // A mapped term stands for its canonical target (U46 BR1.6).
      const canonical = t.canonicalPublicId !== null;
      const termPublicId = canonical ? t.canonicalPublicId : t.linkedPublicId;
      const nameEn = canonical ? t.canonicalNameEn : t.linkedNameEn;
      const nameBn = canonical ? t.canonicalNameBn : t.linkedNameBn;
      return {
        group: t.group,
        notSure: false,
        termPublicId,
        termName: termPublicId === null ? null : bn ? nameBn : nameEn,
        provisional: Boolean(canonical ? t.canonicalProvisional : t.linkedProvisional),
        termActive:
          termPublicId !== null &&
          t.linkedState === 'published' &&
          (!canonical || t.canonicalState === 'published'),
        freeText: t.freeText,
      };
    });

    return {
      id: row.id,
      publicId: row.publicId,
      authorPersonaId: row.authorPersonaId,
      kind: row.kind,
      relationship: row.relationship,
      identityMode: row.identityMode,
      sentiment: row.sentiment,
      outcome: row.outcome,
      periodYear: row.periodYear,
      periodMonth: row.periodMonth,
      title: row.title,
      body: row.body,
      sections: row.sections,
      claims: row.claims.map((c) => ({ label: c.label })),
      language: row.language,
      publishedAt: row.publishedAt!,
      tags,
      doctor: {
        id: row.doctorId,
        publicId: row.doctorPublicId,
        name: row.doctorName,
        specialty: row.doctorSpecialty,
        memberAddedNotConfirmed: Boolean(row.memberAddedNotConfirmed),
      },
    };
  }

  async idForPublicId(tx: Tx, publicId: string): Promise<string | null> {
    if (!isPublicId(publicId)) return null;
    const [row] = await executorOf(tx)
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.publicId, publicId))
      .limit(1);
    return row?.id ?? null;
  }

  async authorPersonaIdOf(tx: Tx, reviewId: string): Promise<string | null> {
    if (!isUuid(reviewId)) return null;
    const [row] = await executorOf(tx)
      .select({ personaId: reviews.authorPersonaId })
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);
    return row?.personaId ?? null;
  }

  async identityModeOf(tx: Tx, reviewId: string): Promise<IdentityMode | null> {
    if (!isUuid(reviewId)) return null;
    const [row] = await executorOf(tx)
      .select({ mode: reviews.identityMode })
      .from(reviews)
      .where(eq(reviews.id, reviewId))
      .limit(1);
    return row?.mode ?? null;
  }

  async isEligible(tx: Tx, reviewId: string): Promise<boolean> {
    if (!isUuid(reviewId)) return false;
    const [row] = await executorOf(tx)
      .select({ id: reviews.id })
      .from(reviews)
      .innerJoin(doctors, eq(doctors.id, reviews.doctorId))
      .where(and(isEligibleReview, eq(reviews.id, reviewId)))
      .limit(1);
    return row !== undefined;
  }

  async lastCorrectionAt(tx: Tx, reviewId: string): Promise<Date | null> {
    if (!isUuid(reviewId)) return null;
    const [row] = await executorOf(tx)
      .select({ at: max(reviewVersions.createdAt) })
      .from(reviewVersions)
      .where(
        and(eq(reviewVersions.reviewId, reviewId), eq(reviewVersions.changeKind, 'correction')),
      );
    return row?.at ?? null;
  }

  async countEligible(tx: Tx): Promise<number> {
    const [row] = await executorOf(tx)
      .select({ n: count() })
      .from(reviews)
      .innerJoin(doctors, eq(doctors.id, reviews.doctorId))
      .where(isEligibleReview);
    return row?.n ?? 0;
  }

  async listByPersonas(
    tx: Tx,
    personaIds: readonly string[],
    locale: Locale,
    limit: number,
  ): Promise<OwnReviewRecord[]> {
    const ids = uuids(personaIds);
    const n = Math.max(0, Math.floor(limit));
    if (ids.length === 0 || n === 0) return [];
    return executorOf(tx)
      .select({
        publicId: reviews.publicId,
        title: reviews.title,
        doctorName: locale === 'bn' ? doctors.nameBn : doctors.nameEn,
        state: reviews.state,
        publishedAt: reviews.publishedAt,
        edited: hasCorrection,
      })
      .from(reviews)
      .innerJoin(doctors, eq(doctors.id, reviews.doctorId))
      .where(and(inArray(reviews.authorPersonaId, ids), isNull(reviews.deletedAt)))
      .orderBy(desc(sql`coalesce(${reviews.publishedAt}, ${reviews.createdAt})`), desc(reviews.id))
      .limit(n);
  }

  async existsEligibleOfDoctorByPersonas(
    tx: Tx,
    doctorId: string,
    personaIds: readonly string[],
  ): Promise<boolean> {
    const ids = uuids(personaIds);
    if (ids.length === 0 || !isUuid(doctorId)) return false;
    const [row] = await executorOf(tx)
      .select({ id: reviews.id })
      .from(reviews)
      .innerJoin(doctors, eq(doctors.id, reviews.doctorId))
      .where(
        and(
          isEligibleReview,
          eq(reviews.doctorId, doctorId),
          inArray(reviews.authorPersonaId, ids),
        ),
      )
      .limit(1);
    return row !== undefined;
  }
}
