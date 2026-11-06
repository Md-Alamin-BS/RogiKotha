// In-memory fake of U47's `ReviewModuleRepository` (functional-spec § 5). It applies the same rules
// as `PgReviewModuleRepository`: drafts are owner-only and live while `expires_at > now` (BR2),
// a review is eligible when published, not deleted, has a publication time and its doctor is
// published and not merged (U46 BR1.3), and a mapped term stands for its published canonical
// target. Reference rows are added with the `add*` helpers; every row is synthetic.
import type {
  ActiveTermRef,
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
  Tx,
} from '@rogikotha/application';
import type {
  IdentityMode,
  Locale,
  PublicationState,
  TagGroup,
  TermKind,
} from '@rogikotha/contracts';

import { seq } from '../builders/seq.js';
import type { Transactional } from './unit-of-work.js';

export interface FakeModuleDoctor {
  id: string;
  publicId: string;
  nameEn: string;
  nameBn: string;
  specialtyEn: string | null;
  specialtyBn: string | null;
  state: PublicationState;
  mergedIntoId: string | null;
  memberAddedNotConfirmed: boolean;
}

export interface FakeModuleBranch {
  id: string;
  publicId: string;
  /** The branch and its organisation are published (U46 BR1.2). */
  visible: boolean;
}

export interface FakeModuleTerm {
  id: string;
  publicId: string;
  kind: TermKind;
  nameEn: string;
  nameBn: string;
  provisional: boolean;
  state: PublicationState;
  canonicalId: string | null;
}

export interface FakeDraftRow extends DraftRecord {
  accountId: string;
}

export interface FakeModuleReview extends Omit<NewReviewRecord, 'now'> {
  state: PublicationState;
  publishedAt: Date | null;
  attestationAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface FakeModuleTag {
  reviewId: string;
  group: TagGroup;
  termId: string | null;
  freeText: string | null;
  notSure: boolean;
}

export interface FakeModuleVersion {
  reviewId: string;
  version: number;
  snapshot: Record<string, unknown>;
  changeKind: 'publish' | 'correction' | 'moderation_redaction' | 'restore';
  actorKind: 'author' | 'moderator' | 'system';
  actorId: string | null;
  createdAt: Date;
}

export interface FakeModuleFacilityReview extends Omit<NewFacilityReviewRecord, 'now'> {
  state: PublicationState;
  publishedAt: Date;
}

interface State {
  drafts: FakeDraftRow[];
  doctors: FakeModuleDoctor[];
  branches: FakeModuleBranch[];
  terms: FakeModuleTerm[];
  reviews: FakeModuleReview[];
  tags: FakeModuleTag[];
  versions: FakeModuleVersion[];
  facilityReviews: FakeModuleFacilityReview[];
}

const BASE_DATE = new Date('2026-10-01T06:00:00.000Z');

function fakeUuid(prefix: string): string {
  const n = seq(`review-module-${prefix}`).toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${n}`;
}

/** A well-formed public id: the prefix letter and nine digits. */
function fakePublicId(prefix: 'd' | 'b' | 't' | 'r'): string {
  return `${prefix}${String(seq(`review-module-public-${prefix}`)).padStart(9, '0')}`;
}

const copyBytes = (value: Uint8Array) => new Uint8Array(value);

export class FakeReviewModuleRepository implements ReviewModuleRepository, Transactional {
  drafts: FakeDraftRow[] = [];
  doctors: FakeModuleDoctor[] = [];
  branches: FakeModuleBranch[] = [];
  terms: FakeModuleTerm[] = [];
  reviews: FakeModuleReview[] = [];
  tags: FakeModuleTag[] = [];
  versions: FakeModuleVersion[] = [];
  facilityReviews: FakeModuleFacilityReview[] = [];

  snapshot(): unknown {
    const state: State = {
      drafts: this.drafts,
      doctors: this.doctors,
      branches: this.branches,
      terms: this.terms,
      reviews: this.reviews,
      tags: this.tags,
      versions: this.versions,
      facilityReviews: this.facilityReviews,
    };
    return structuredClone(state);
  }

  restore(state: unknown): void {
    Object.assign(this, structuredClone(state as State));
  }

  addDoctor(overrides: Partial<FakeModuleDoctor> = {}): FakeModuleDoctor {
    const doctor: FakeModuleDoctor = {
      id: fakeUuid('doctor'),
      publicId: fakePublicId('d'),
      nameEn: 'Dr. Synthetic Rahman',
      nameBn: 'ডা. কাল্পনিক রহমান',
      specialtyEn: null,
      specialtyBn: null,
      state: 'published',
      mergedIntoId: null,
      memberAddedNotConfirmed: false,
      ...overrides,
    };
    this.doctors.push(doctor);
    return doctor;
  }

  addBranch(overrides: Partial<FakeModuleBranch> = {}): FakeModuleBranch {
    const branch: FakeModuleBranch = {
      id: fakeUuid('branch'),
      publicId: fakePublicId('b'),
      visible: true,
      ...overrides,
    };
    this.branches.push(branch);
    return branch;
  }

  addTerm(overrides: Partial<FakeModuleTerm> = {}): FakeModuleTerm {
    const term: FakeModuleTerm = {
      id: fakeUuid('term'),
      publicId: fakePublicId('t'),
      kind: 'condition',
      nameEn: 'Synthetic cough',
      nameBn: 'কাল্পনিক কাশি',
      provisional: false,
      state: 'published',
      canonicalId: null,
      ...overrides,
    };
    this.terms.push(term);
    return term;
  }

  /** Seeds a stored review directly, for read tests; published now unless overridden. */
  addReview(
    doctorId: string,
    authorPersonaId: string,
    overrides: Partial<FakeModuleReview> = {},
  ): FakeModuleReview {
    const review: FakeModuleReview = {
      id: fakeUuid('review'),
      publicId: fakePublicId('r'),
      authorPersonaId,
      doctorId,
      kind: 'quick',
      relationship: 'self',
      identityMode: 'pseudonymous',
      sentiment: 'positive',
      outcome: 'helped',
      periodYear: 2026,
      periodMonth: 3,
      exactDateEnc: null,
      title: 'A careful visit',
      body: 'The doctor listened and wrote the plan down.',
      sections: null,
      claims: [],
      language: 'en',
      state: 'published',
      publishedAt: BASE_DATE,
      attestationAt: BASE_DATE,
      deletedAt: null,
      createdAt: BASE_DATE,
      ...overrides,
    };
    this.reviews.push(review);
    return review;
  }

  /** Seeds a correction version (U22 writes these; U47 only reads them, BR6.7). */
  addCorrection(reviewId: string, at: Date): void {
    const version = 1 + this.versions.filter((v) => v.reviewId === reviewId).length;
    this.versions.push({
      reviewId,
      version,
      snapshot: {},
      changeKind: 'correction',
      actorKind: 'author',
      actorId: null,
      createdAt: at,
    });
  }

  private liveDraft(accountId: string, draftId: string, now: Date): FakeDraftRow | undefined {
    return this.drafts.find(
      (d) => d.id === draftId && d.accountId === accountId && d.expiresAt > now,
    );
  }

  private eligible(review: FakeModuleReview): boolean {
    const doctor = this.doctors.find((d) => d.id === review.doctorId);
    return (
      review.state === 'published' &&
      review.deletedAt === null &&
      review.publishedAt !== null &&
      doctor !== undefined &&
      doctor.state === 'published' &&
      doctor.mergedIntoId === null
    );
  }

  private effectiveTerm(termId: string | null): FakeModuleTerm | undefined {
    const term = this.terms.find((t) => t.id === termId);
    if (!term || term.canonicalId === null) return term;
    return this.terms.find((t) => t.id === term.canonicalId);
  }

  private toDraft(row: FakeDraftRow): DraftRecord {
    return {
      id: row.id,
      kind: row.kind,
      payloadEnc: copyBytes(row.payloadEnc),
      doctorId: row.doctorId,
      updatedAt: row.updatedAt,
      expiresAt: row.expiresAt,
    };
  }

  insertDraft(_tx: Tx, draft: NewDraftRecord): Promise<void> {
    this.drafts.push({
      id: draft.id,
      accountId: draft.accountId,
      kind: draft.kind,
      payloadEnc: copyBytes(draft.payloadEnc),
      doctorId: draft.doctorId,
      updatedAt: draft.now,
      expiresAt: draft.expiresAt,
    });
    return Promise.resolve();
  }

  updateOwnDraft(
    _tx: Tx,
    accountId: string,
    draftId: string,
    change: DraftChange,
  ): Promise<boolean> {
    const row = this.liveDraft(accountId, draftId, change.now);
    if (!row) return Promise.resolve(false);
    row.kind = change.kind;
    row.payloadEnc = copyBytes(change.payloadEnc);
    row.doctorId = change.doctorId;
    row.updatedAt = change.now;
    row.expiresAt = change.expiresAt;
    return Promise.resolve(true);
  }

  countOwnLiveDrafts(_tx: Tx, accountId: string, now: Date): Promise<number> {
    return Promise.resolve(
      this.drafts.filter((d) => d.accountId === accountId && d.expiresAt > now).length,
    );
  }

  findOwnLiveDraft(
    _tx: Tx,
    accountId: string,
    draftId: string,
    now: Date,
  ): Promise<DraftRecord | null> {
    const row = this.liveDraft(accountId, draftId, now);
    return Promise.resolve(row ? this.toDraft(row) : null);
  }

  listOwnLiveDrafts(_tx: Tx, accountId: string, now: Date, limit: number): Promise<DraftRecord[]> {
    const n = Math.max(0, Math.floor(limit));
    return Promise.resolve(
      this.drafts
        .filter((d) => d.accountId === accountId && d.expiresAt > now)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.id.localeCompare(a.id))
        .slice(0, n)
        .map((d) => this.toDraft(d)),
    );
  }

  deleteOwnDraft(_tx: Tx, accountId: string, draftId: string, now: Date): Promise<boolean> {
    const row = this.liveDraft(accountId, draftId, now);
    if (!row) return Promise.resolve(false);
    this.drafts = this.drafts.filter((d) => d !== row);
    return Promise.resolve(true);
  }

  visibleDoctorIdByPublicId(_tx: Tx, publicId: string): Promise<string | null> {
    const doctor = this.doctors.find(
      (d) => d.publicId === publicId && d.state === 'published' && d.mergedIntoId === null,
    );
    return Promise.resolve(doctor?.id ?? null);
  }

  visibleBranchIdByPublicId(_tx: Tx, publicId: string): Promise<string | null> {
    const branch = this.branches.find((b) => b.publicId === publicId && b.visible);
    return Promise.resolve(branch?.id ?? null);
  }

  activeTermIdsByPublicIds(
    _tx: Tx,
    publicIds: readonly string[],
  ): Promise<Map<string, ActiveTermRef>> {
    const result = new Map<string, ActiveTermRef>();
    for (const publicId of new Set(publicIds)) {
      const term = this.terms.find((t) => t.publicId === publicId);
      if (!term || term.state !== 'published') continue;
      const effective = this.effectiveTerm(term.id);
      if (effective?.state === 'published') {
        result.set(publicId, { termId: effective.id, kind: effective.kind });
      }
    }
    return Promise.resolve(result);
  }

  insertReview(_tx: Tx, review: NewReviewRecord): Promise<void> {
    const { now, ...columns } = review;
    this.reviews.push({
      ...columns,
      exactDateEnc: columns.exactDateEnc === null ? null : copyBytes(columns.exactDateEnc),
      state: 'published',
      publishedAt: now,
      attestationAt: now,
      deletedAt: null,
      createdAt: now,
    });
    return Promise.resolve();
  }

  insertTags(_tx: Tx, reviewId: string, tags: readonly NewReviewTag[]): Promise<void> {
    for (const tag of tags) {
      this.tags.push({
        reviewId,
        group: tag.group,
        termId: 'termId' in tag ? tag.termId : null,
        freeText: null,
        notSure: 'notSure' in tag,
      });
    }
    return Promise.resolve();
  }

  insertVersion(_tx: Tx, version: NewReviewVersion): Promise<void> {
    const { now, ...columns } = version;
    this.versions.push({ ...columns, createdAt: now });
    return Promise.resolve();
  }

  insertFacilityReview(_tx: Tx, review: NewFacilityReviewRecord): Promise<void> {
    const { now, ...columns } = review;
    this.facilityReviews.push({ ...columns, state: 'published', publishedAt: now });
    return Promise.resolve();
  }

  findEligibleByPublicId(
    _tx: Tx,
    publicId: string,
    locale: Locale,
  ): Promise<EligibleReviewRecord | null> {
    const review = this.reviews.find((r) => r.publicId === publicId);
    if (!review || !this.eligible(review)) return Promise.resolve(null);
    const doctor = this.doctors.find((d) => d.id === review.doctorId)!;
    const bn = locale === 'bn';
    const tags: EligibleTagRecord[] = this.tags
      .filter((t) => t.reviewId === review.id)
      .map((t) => {
        if (t.notSure) return { group: 'condition', notSure: true };
        const linked = this.terms.find((x) => x.id === t.termId);
        const effective = this.effectiveTerm(t.termId);
        return {
          group: t.group,
          notSure: false,
          termPublicId: effective?.publicId ?? null,
          termName: effective ? (bn ? effective.nameBn : effective.nameEn) : null,
          provisional: effective?.provisional ?? false,
          termActive:
            effective !== undefined &&
            linked?.state === 'published' &&
            effective.state === 'published',
          freeText: t.freeText,
        };
      });
    return Promise.resolve({
      id: review.id,
      publicId: review.publicId,
      authorPersonaId: review.authorPersonaId,
      kind: review.kind,
      relationship: review.relationship,
      identityMode: review.identityMode,
      sentiment: review.sentiment,
      outcome: review.outcome,
      periodYear: review.periodYear,
      periodMonth: review.periodMonth,
      title: review.title,
      body: review.body,
      sections: review.sections,
      claims: review.claims.map((c) => ({ label: c.label })),
      language: review.language,
      publishedAt: review.publishedAt!,
      tags,
      doctor: {
        id: doctor.id,
        publicId: doctor.publicId,
        name: bn ? doctor.nameBn : doctor.nameEn,
        specialty: bn ? doctor.specialtyBn : doctor.specialtyEn,
        memberAddedNotConfirmed: doctor.memberAddedNotConfirmed,
      },
    });
  }

  idForPublicId(_tx: Tx, publicId: string): Promise<string | null> {
    return Promise.resolve(this.reviews.find((r) => r.publicId === publicId)?.id ?? null);
  }

  authorPersonaIdOf(_tx: Tx, reviewId: string): Promise<string | null> {
    return Promise.resolve(this.reviews.find((r) => r.id === reviewId)?.authorPersonaId ?? null);
  }

  identityModeOf(_tx: Tx, reviewId: string): Promise<IdentityMode | null> {
    return Promise.resolve(this.reviews.find((r) => r.id === reviewId)?.identityMode ?? null);
  }

  isEligible(_tx: Tx, reviewId: string): Promise<boolean> {
    const review = this.reviews.find((r) => r.id === reviewId);
    return Promise.resolve(review !== undefined && this.eligible(review));
  }

  lastCorrectionAt(_tx: Tx, reviewId: string): Promise<Date | null> {
    const times = this.versions
      .filter((v) => v.reviewId === reviewId && v.changeKind === 'correction')
      .map((v) => v.createdAt.getTime());
    return Promise.resolve(times.length === 0 ? null : new Date(Math.max(...times)));
  }

  countEligible(): Promise<number> {
    return Promise.resolve(this.reviews.filter((r) => this.eligible(r)).length);
  }

  listByPersonas(
    _tx: Tx,
    personaIds: readonly string[],
    locale: Locale,
    limit: number,
  ): Promise<OwnReviewRecord[]> {
    const ids = new Set(personaIds);
    const at = (r: FakeModuleReview) => (r.publishedAt ?? r.createdAt).getTime();
    return Promise.resolve(
      this.reviews
        .filter((r) => ids.has(r.authorPersonaId) && r.deletedAt === null)
        .sort((a, b) => at(b) - at(a) || b.id.localeCompare(a.id))
        .slice(0, Math.max(0, Math.floor(limit)))
        .map((r) => {
          const doctor = this.doctors.find((d) => d.id === r.doctorId);
          return {
            publicId: r.publicId,
            title: r.title,
            doctorName: (locale === 'bn' ? doctor?.nameBn : doctor?.nameEn) ?? '',
            state: r.state,
            publishedAt: r.publishedAt,
            edited: this.versions.some((v) => v.reviewId === r.id && v.changeKind === 'correction'),
          };
        }),
    );
  }

  existsEligibleOfDoctorByPersonas(
    _tx: Tx,
    doctorId: string,
    personaIds: readonly string[],
  ): Promise<boolean> {
    const ids = new Set(personaIds);
    return Promise.resolve(
      this.reviews.some(
        (r) => r.doctorId === doctorId && ids.has(r.authorPersonaId) && this.eligible(r),
      ),
    );
  }
}
