// In-memory fakes of U46's three repository ports (directory, taxonomy, review reads), in a file of
// their own so the shared `repositories.ts` stays untouched (BR8.4). They apply the same rules as
// the PostgreSQL repositories: a doctor is visible when published and not merged (BR1.1), a branch
// when it and its organisation are published (BR1.2), and a review counts only when it is
// published, not deleted, has a publication time and its doctor is visible (BR1.3, ISS-222).
import type {
  AboutTermRecord,
  BranchFeedbackRecord,
  BranchRecord,
  ChamberRecord,
  DirectoryRepository,
  DoctorRecord,
  DoctorRefRecord,
  DoctorWithChambersRecord,
  FacilityReviewRecord,
  MentionRecord,
  NameKeyCandidate,
  NewMemberDoctor,
  NewProvisionalTerm,
  NewTermAlias,
  PageOfRows,
  PageRequest,
  RecentCardsRequest,
  ReviewCardRecord,
  ReviewReadRepository,
  ReviewSummaryRecord,
  TaxonomyRepository,
  TermMatchRecord,
  TermRecord,
  TermReviewRecord,
  Tx,
} from '@rogikotha/application';
import {
  doctorNameKey,
  newId,
  newPublicId,
  type Criterion,
  type CriterionValue,
  type IdentityMode,
  type Locale,
  type Outcome,
  type PublicationState,
  type Relationship,
  type Sentiment,
  type TagGroup,
  type TermKind,
} from '@rogikotha/contracts';
import { normalizeAliasKey } from '@rogikotha/domain';

import { seq } from '../builders/seq.js';
import type { Transactional } from './unit-of-work.js';

const BASE_DATE = new Date('2026-10-01T06:00:00.000Z');

function byText(locale: Locale) {
  return (a: string, b: string) => a.localeCompare(b, locale);
}

// --- Directory --------------------------------------------------------------

export interface FakeDoctor extends DoctorWithChambersRecord {
  state: PublicationState;
  mergedIntoId: string | null;
  /** Branch ids of the chambers, in chamber order (the only doctor–branch link). */
  chamberBranchIds: (string | null)[];
}

export interface FakeBranch extends BranchRecord {
  state: PublicationState;
  facilityState: PublicationState;
}

export interface FakeSubmission {
  doctorId: string;
  kind: 'doctor' | 'facility';
  status: 'pending' | 'approved' | 'rejected' | 'merged';
  submittedByAccountId: string;
  payload: Record<string, unknown>;
}

export function aDoctorRecord(overrides: Partial<FakeDoctor> = {}): FakeDoctor {
  const n = seq('fake-directory-doctor');
  return {
    id: newId(),
    publicId: newPublicId(),
    nameEn: `Dr. Synthetic Doctor ${n}`,
    nameBn: `ডা. কাল্পনিক ডাক্তার ${n}`,
    specialtyId: null,
    specialtyEn: 'Endocrinology',
    specialtyBn: 'এন্ডোক্রাইনোলজি',
    qualificationsEn: 'MBBS, FCPS',
    qualificationsBn: 'এমবিবিএস, এফসিপিএস',
    bmdcNumber: null,
    languagesEn: 'Bangla, English',
    languagesBn: 'বাংলা, ইংরেজি',
    feeDisplayEn: '৳800',
    feeDisplayBn: '৮০০ টাকা',
    cityEn: 'Dhaka',
    cityBn: 'ঢাকা',
    areaEn: 'Mirpur',
    areaBn: 'মিরপুর',
    aboutEn: 'Sees adults with thyroid and diabetes care.',
    aboutBn: 'থাইরয়েড ও ডায়াবেটিসের প্রাপ্তবয়স্ক রোগী দেখেন।',
    fieldProvenance: {},
    avatarHue: 210,
    claimed: false,
    createdAt: BASE_DATE,
    updatedAt: null,
    memberAddedNotConfirmed: false,
    chambers: [],
    state: 'published',
    mergedIntoId: null,
    chamberBranchIds: [],
    ...overrides,
  };
}

export function aChamberRecord(overrides: Partial<ChamberRecord> = {}): ChamberRecord {
  const n = seq('fake-directory-chamber');
  return {
    nameEn: `Synthetic Clinic ${n}`,
    nameBn: `কাল্পনিক ক্লিনিক ${n}`,
    hoursEn: 'Sat–Wed, 6–9 pm',
    hoursBn: 'শনি–বুধ, সন্ধ্যা ৬–৯টা',
    provenance: 'community',
    createdAt: BASE_DATE,
    branchPublicId: null,
    ...overrides,
  };
}

export function aBranchRecord(overrides: Partial<FakeBranch> = {}): FakeBranch {
  const n = seq('fake-directory-branch');
  return {
    id: newId(),
    publicId: newPublicId(),
    facilityId: newId(),
    nameEn: `Synthetic Care Hospital ${n}`,
    nameBn: `কাল্পনিক কেয়ার হাসপাতাল ${n}`,
    ownNameEn: null,
    ownNameBn: null,
    avatarHue: 180,
    cityEn: 'Dhaka',
    cityBn: 'ঢাকা',
    areaEn: 'Mirpur',
    areaBn: 'মিরপুর',
    addressEn: null,
    addressBn: null,
    fieldProvenance: {},
    createdAt: BASE_DATE,
    updatedAt: null,
    facilityNameEn: `Synthetic Care Hospital ${n}`,
    facilityNameBn: `কাল্পনিক কেয়ার হাসপাতাল ${n}`,
    type: 'hospital',
    claimed: false,
    state: 'published',
    facilityState: 'published',
    ...overrides,
  };
}

interface DirectoryState {
  doctors: Map<string, FakeDoctor>;
  branches: Map<string, FakeBranch>;
  submissions: FakeSubmission[];
}

export class FakeDirectoryModuleRepository implements DirectoryRepository, Transactional {
  doctors = new Map<string, FakeDoctor>();
  branches = new Map<string, FakeBranch>();
  submissions: FakeSubmission[] = [];
  /** Published specialty term ids. */
  readonly specialties = new Set<string>();
  readonly locks: string[] = [];

  addDoctor(overrides: Partial<FakeDoctor> = {}): FakeDoctor {
    const doctor = aDoctorRecord(overrides);
    this.doctors.set(doctor.id, doctor);
    return doctor;
  }

  addBranch(overrides: Partial<FakeBranch> = {}): FakeBranch {
    const branch = aBranchRecord(overrides);
    this.branches.set(branch.id, branch);
    return branch;
  }

  /** A chamber of the doctor at the branch, appended in chamber order. */
  linkChamber(doctorId: string, branchId: string | null, chamber: Partial<ChamberRecord> = {}) {
    const doctor = this.doctors.get(doctorId);
    if (!doctor) throw new Error(`FakeDirectoryModuleRepository: no doctor ${doctorId}`);
    doctor.chambers.push(aChamberRecord(chamber));
    doctor.chamberBranchIds.push(branchId);
  }

  snapshot(): DirectoryState {
    return {
      doctors: new Map([...this.doctors].map(([k, v]) => [k, structuredClone(v)])),
      branches: new Map(this.branches),
      submissions: this.submissions.map((s) => ({ ...s })),
    };
  }

  restore(state: unknown): void {
    const s = state as DirectoryState;
    this.doctors = s.doctors;
    this.branches = s.branches;
    this.submissions = s.submissions;
  }

  private visibleDoctor(d: FakeDoctor | undefined): d is FakeDoctor {
    return d !== undefined && d.state === 'published' && d.mergedIntoId === null;
  }

  private visibleBranch(b: FakeBranch | undefined): b is FakeBranch {
    return b !== undefined && b.state === 'published' && b.facilityState === 'published';
  }

  private withMark(d: FakeDoctor): DoctorWithChambersRecord {
    const marked = this.submissions.some(
      (s) => s.kind === 'doctor' && s.doctorId === d.id && s.status === 'pending',
    );
    const chambers = d.chambers.map((c, i) => {
      const branch = this.branches.get(d.chamberBranchIds[i] ?? '');
      return { ...c, branchPublicId: this.visibleBranch(branch) ? branch.publicId : null };
    });
    const {
      state: _state,
      mergedIntoId: _merged,
      chamberBranchIds: _links,
      ...record
    } = structuredClone(d);
    void _state;
    void _merged;
    void _links;
    return { ...record, chambers, memberAddedNotConfirmed: d.memberAddedNotConfirmed || marked };
  }

  private branchRecord(b: FakeBranch): BranchRecord {
    const { state: _s, facilityState: _f, ...record } = b;
    void _s;
    void _f;
    return { ...record };
  }

  private branchSort(locale: Locale) {
    const compare = byText(locale);
    const title = (b: FakeBranch) =>
      (locale === 'bn' ? b.ownNameBn : b.ownNameEn) ??
      (locale === 'bn' ? b.facilityNameBn : b.facilityNameEn);
    const label = (b: FakeBranch) => (locale === 'bn' ? b.nameBn : b.nameEn);
    return (a: FakeBranch, b: FakeBranch) =>
      compare(title(a), title(b)) || compare(label(a), label(b)) || compare(a.publicId, b.publicId);
  }

  findDoctorByPublicId(_tx: Tx, publicId: string): Promise<DoctorWithChambersRecord | null> {
    const doctor = [...this.doctors.values()].find((d) => d.publicId === publicId);
    return Promise.resolve(this.visibleDoctor(doctor) ? this.withMark(doctor) : null);
  }

  listDoctors(_tx: Tx, request: PageRequest): Promise<PageOfRows<DoctorRecord>> {
    const compare = byText(request.locale);
    const name = (d: FakeDoctor) => (request.locale === 'bn' ? d.nameBn : d.nameEn);
    const visible = [...this.doctors.values()]
      .filter((d) => this.visibleDoctor(d))
      .sort((a, b) => compare(name(a), name(b)) || compare(a.publicId, b.publicId));
    const start = (request.page - 1) * request.pageSize;
    const rows = visible.slice(start, start + request.pageSize).map((d) => {
      const { chambers: _c, ...row } = this.withMark(d);
      void _c;
      return row;
    });
    return Promise.resolve({ rows, total: visible.length });
  }

  findBranchByPublicId(_tx: Tx, publicId: string): Promise<BranchRecord | null> {
    const branch = [...this.branches.values()].find((b) => b.publicId === publicId);
    return Promise.resolve(this.visibleBranch(branch) ? this.branchRecord(branch) : null);
  }

  listBranches(_tx: Tx, request: PageRequest): Promise<PageOfRows<BranchRecord>> {
    const visible = [...this.branches.values()]
      .filter((b) => this.visibleBranch(b))
      .sort(this.branchSort(request.locale));
    const start = (request.page - 1) * request.pageSize;
    return Promise.resolve({
      rows: visible.slice(start, start + request.pageSize).map((b) => this.branchRecord(b)),
      total: visible.length,
    });
  }

  branchesOfFacility(_tx: Tx, facilityId: string): Promise<BranchRecord[]> {
    return Promise.resolve(
      [...this.branches.values()]
        .filter((b) => b.facilityId === facilityId && this.visibleBranch(b))
        .sort(this.branchSort('en'))
        .map((b) => this.branchRecord(b)),
    );
  }

  doctorsAtBranch(_tx: Tx, branchId: string, locale: Locale): Promise<DoctorRefRecord[]> {
    const compare = byText(locale);
    const name = (d: FakeDoctor) => (locale === 'bn' ? d.nameBn : d.nameEn);
    return Promise.resolve(
      [...this.doctors.values()]
        .filter((d) => this.visibleDoctor(d) && d.chamberBranchIds.includes(branchId))
        .sort((a, b) => compare(name(a), name(b)) || compare(a.publicId, b.publicId))
        .map((d) => ({
          id: d.id,
          publicId: d.publicId,
          nameEn: d.nameEn,
          nameBn: d.nameBn,
          specialtyEn: d.specialtyEn,
          specialtyBn: d.specialtyBn,
          avatarHue: d.avatarHue,
        })),
    );
  }

  branchesForDoctor(_tx: Tx, doctorId: string): Promise<BranchRecord[]> {
    const doctor = this.doctors.get(doctorId);
    if (!doctor) return Promise.resolve([]);
    const seen = new Set<string>();
    const rows: BranchRecord[] = [];
    for (const id of doctor.chamberBranchIds) {
      const branch = this.branches.get(id ?? '');
      if (!this.visibleBranch(branch) || seen.has(branch.id)) continue;
      seen.add(branch.id);
      rows.push(this.branchRecord(branch));
    }
    return Promise.resolve(rows);
  }

  findVisibleDoctorsByNameKey(_tx: Tx, key: string): Promise<NameKeyCandidate[]> {
    return Promise.resolve(
      [...this.doctors.values()]
        .filter(
          (d) =>
            this.visibleDoctor(d) &&
            (doctorNameKey(d.nameEn) === key || doctorNameKey(d.nameBn) === key),
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
        .map((d) => ({ id: d.id, specialtyId: d.specialtyId })),
    );
  }

  lockDoctorNameKey(_tx: Tx, key: string): Promise<void> {
    this.locks.push(`doctor-name:${key}`);
    return Promise.resolve();
  }

  isPublishedSpecialty(_tx: Tx, specialtyId: string): Promise<boolean> {
    return Promise.resolve(this.specialties.has(specialtyId));
  }

  insertMemberDoctor(_tx: Tx, doctor: NewMemberDoctor): Promise<void> {
    const community = { source: 'community' as const, updatedAt: doctor.now.toISOString() };
    const created = aDoctorRecord({
      id: doctor.id,
      publicId: doctor.publicId,
      nameEn: doctor.name,
      nameBn: doctor.name,
      specialtyId: doctor.specialtyId,
      specialtyEn: null,
      specialtyBn: null,
      qualificationsEn: null,
      qualificationsBn: null,
      languagesEn: null,
      languagesBn: null,
      feeDisplayEn: null,
      feeDisplayBn: null,
      cityEn: null,
      cityBn: null,
      areaEn: null,
      areaBn: null,
      aboutEn: null,
      aboutBn: null,
      avatarHue: null,
      createdAt: doctor.now,
      fieldProvenance: {
        name_en: community,
        name_bn: community,
        ...(doctor.specialtyId ? { specialty_id: community } : {}),
      },
    });
    this.doctors.set(created.id, created);
    if (doctor.practiceArea) {
      this.linkChamber(created.id, null, {
        nameEn: doctor.practiceArea,
        nameBn: doctor.practiceArea,
        hoursEn: null,
        hoursBn: null,
        createdAt: doctor.now,
      });
    }
    this.submissions.push({
      doctorId: created.id,
      kind: 'doctor',
      status: 'pending',
      submittedByAccountId: doctor.submittedByAccountId,
      payload: {
        nameEn: doctor.name,
        nameBn: doctor.name,
        specialtyId: doctor.specialtyId,
        chamber: doctor.practiceArea,
        bmdc: doctor.bmdcNumber,
      },
    });
    return Promise.resolve();
  }
}

// --- Taxonomy ---------------------------------------------------------------

export interface FakeTerm extends TermRecord {
  nameKeyEn: string;
  nameKeyBn: string;
  suggested: boolean;
  suggestedOrder: number | null;
}

export interface FakeAlias extends NewTermAlias {
  provenance: 'community' | 'provider' | 'admin';
}

export function aTermRecord(overrides: Partial<FakeTerm> = {}): FakeTerm {
  const n = seq('fake-taxonomy-term');
  const nameEn = overrides.nameEn ?? `Synthetic condition ${n}`;
  const nameBn = overrides.nameBn ?? `কাল্পনিক রোগ ${n}`;
  return {
    id: newId(),
    publicId: newPublicId(),
    kind: 'condition',
    provisional: false,
    canonicalId: null,
    published: true,
    suggested: false,
    suggestedOrder: null,
    ...overrides,
    nameEn,
    nameBn,
    nameKeyEn: overrides.nameKeyEn ?? normalizeAliasKey(nameEn),
    nameKeyBn: overrides.nameKeyBn ?? normalizeAliasKey(nameBn),
  };
}

interface TaxonomyState {
  terms: Map<string, FakeTerm>;
  aliases: FakeAlias[];
}

export class FakeTaxonomyModuleRepository implements TaxonomyRepository, Transactional {
  terms = new Map<string, FakeTerm>();
  aliases: FakeAlias[] = [];

  addTerm(overrides: Partial<FakeTerm> = {}, aliases: string[] = []): FakeTerm {
    const term = aTermRecord(overrides);
    this.terms.set(term.id, term);
    for (const alias of aliases) {
      this.aliases.push({
        termId: term.id,
        alias,
        aliasKey: normalizeAliasKey(alias),
        lang: 'en',
        provenance: 'community',
      });
    }
    return term;
  }

  snapshot(): TaxonomyState {
    return {
      terms: new Map([...this.terms].map(([k, v]) => [k, { ...v }])),
      aliases: [...this.aliases],
    };
  }

  restore(state: unknown): void {
    const s = state as TaxonomyState;
    this.terms = s.terms;
    this.aliases = s.aliases;
  }

  private record(t: FakeTerm): TermRecord {
    return {
      id: t.id,
      publicId: t.publicId,
      kind: t.kind,
      nameEn: t.nameEn,
      nameBn: t.nameBn,
      provisional: t.provisional,
      canonicalId: t.canonicalId,
      published: t.published,
    };
  }

  /** The effective term of an active term: its canonical target when mapped (BR1.6). */
  effective(t: FakeTerm): FakeTerm | undefined {
    if (t.canonicalId === null) return t;
    const target = this.terms.get(t.canonicalId);
    return target?.published ? target : undefined;
  }

  findTermByPublicId(_tx: Tx, publicId: string): Promise<TermRecord | null> {
    const term = [...this.terms.values()].find((t) => t.publicId === publicId);
    return Promise.resolve(term ? this.record(term) : null);
  }

  listTerms(
    _tx: Tx,
    kind: TermKind,
    options: { canonicalOnly: boolean; locale: Locale },
  ): Promise<TermRecord[]> {
    const compare = byText(options.locale);
    const name = (t: FakeTerm) => (options.locale === 'bn' ? t.nameBn : t.nameEn);
    return Promise.resolve(
      [...this.terms.values()]
        .filter(
          (t) =>
            t.kind === kind &&
            t.published &&
            t.canonicalId === null &&
            (!options.canonicalOnly || !t.provisional),
        )
        .sort((a, b) => compare(name(a), name(b)) || compare(a.publicId, b.publicId))
        .map((t) => this.record(t)),
    );
  }

  aliasesOf(_tx: Tx, termId: string): Promise<string[]> {
    return Promise.resolve(
      this.aliases
        .filter((a) => a.termId === termId)
        .map((a) => a.alias)
        .sort(),
    );
  }

  findByKey(_tx: Tx, key: string, kind?: TermKind): Promise<TermMatchRecord[]> {
    const matches = new Map<string, TermMatchRecord>();
    for (const t of this.terms.values()) {
      if (!t.published || (kind !== undefined && t.kind !== kind)) continue;
      const alias = this.aliases.find((a) => a.termId === t.id && a.aliasKey === key);
      const byName = t.nameKeyEn === key || t.nameKeyBn === key;
      if (!byName && !alias) continue;
      const effective = this.effective(t);
      if (!effective || matches.has(effective.id)) continue;
      matches.set(effective.id, {
        term: this.record(effective),
        matchedAlias: byName ? null : (alias?.alias ?? null),
      });
    }
    return Promise.resolve([...matches.values()]);
  }

  listSuggested(_tx: Tx, kind: TermKind, locale: Locale): Promise<TermRecord[]> {
    const compare = byText(locale);
    const name = (t: FakeTerm) => (locale === 'bn' ? t.nameBn : t.nameEn);
    return Promise.resolve(
      [...this.terms.values()]
        .filter((t) => t.kind === kind && t.suggested && t.published && t.canonicalId === null)
        .sort(
          (a, b) =>
            (a.suggestedOrder ?? Number.MAX_SAFE_INTEGER) -
              (b.suggestedOrder ?? Number.MAX_SAFE_INTEGER) || compare(name(a), name(b)),
        )
        .map((t) => this.record(t)),
    );
  }

  insertProvisional(_tx: Tx, term: NewProvisionalTerm): Promise<{ termId: string } | null> {
    const taken = [...this.terms.values()].some(
      (t) =>
        t.provisional && t.canonicalId === null && t.kind === term.kind && t.nameKeyEn === term.key,
    );
    if (taken) return Promise.resolve(null);
    this.terms.set(term.id, {
      id: term.id,
      publicId: term.publicId,
      kind: term.kind,
      nameEn: term.text,
      nameBn: term.text,
      nameKeyEn: term.key,
      nameKeyBn: term.key,
      provisional: true,
      canonicalId: null,
      published: true,
      suggested: false,
      suggestedOrder: null,
    });
    return Promise.resolve({ termId: term.id });
  }

  findOpenProvisional(_tx: Tx, kind: TermKind, key: string): Promise<TermRecord | null> {
    const term = [...this.terms.values()].find(
      (t) => t.provisional && t.canonicalId === null && t.kind === kind && t.nameKeyEn === key,
    );
    return Promise.resolve(term ? this.record(term) : null);
  }

  insertAlias(_tx: Tx, alias: NewTermAlias): Promise<void> {
    this.aliases.push({ ...alias, provenance: 'community' });
    return Promise.resolve();
  }
}

// --- Review reads -----------------------------------------------------------

export interface FakeReviewTag {
  group: TagGroup;
  termId?: string;
  freeText?: string;
  notSure?: boolean;
}

export interface FakeReview {
  id: string;
  publicId: string;
  doctorId: string;
  branchId: string | null;
  state: PublicationState;
  deletedAt: Date | null;
  publishedAt: Date | null;
  title: string;
  body: string | null;
  sections: ReviewCardRecord['sections'];
  sentiment: Sentiment | null;
  outcome: Outcome | null;
  relationship: Relationship;
  identityMode: IdentityMode;
  periodYear: number;
  periodMonth: number;
  personaKind: IdentityMode;
  displayName: string;
  username: string | null;
  /** In tag order. */
  tags: FakeReviewTag[];
}

export interface FakeFacilityReview {
  publicId: string;
  branchId: string;
  state: PublicationState;
  deletedAt: Date | null;
  publishedAt: Date | null;
  identityMode: IdentityMode;
  personaKind: IdentityMode;
  displayName: string;
  username: string | null;
  periodYear: number;
  periodMonth: number;
  body: string;
  criteria: Partial<Record<Criterion, CriterionValue | null>>;
}

export function aReviewRow(overrides: Partial<FakeReview> = {}): FakeReview {
  const n = seq('fake-review-row');
  return {
    id: newId(),
    publicId: newPublicId(),
    doctorId: newId(),
    branchId: null,
    state: 'published',
    deletedAt: null,
    publishedAt: new Date(BASE_DATE.getTime() + n * 60_000),
    title: `A careful visit ${n}`,
    body: 'Waited two hours, then a careful exam and a clear plan.',
    sections: null,
    sentiment: 'positive',
    outcome: 'helped',
    relationship: 'self',
    identityMode: 'named',
    periodYear: 2026,
    periodMonth: 3,
    personaKind: 'named',
    displayName: 'Rina Akter',
    username: null,
    tags: [],
    ...overrides,
  };
}

export function aFacilityReviewRow(
  overrides: Partial<FakeFacilityReview> = {},
): FakeFacilityReview {
  const n = seq('fake-facility-review-row');
  return {
    publicId: newPublicId(),
    branchId: newId(),
    state: 'published',
    deletedAt: null,
    publishedAt: new Date(BASE_DATE.getTime() + n * 60_000),
    identityMode: 'named',
    personaKind: 'named',
    displayName: 'Rina Akter',
    username: null,
    periodYear: 2026,
    periodMonth: 2,
    body: 'The reception was calm and the queue moved quickly.',
    criteria: { staff: 'good', overall: 'mixed' },
    ...overrides,
  };
}

/** `lower(btrim(normalize(text, NFC)))`, as the repository's SQL fragment reads free text. */
function freeTextKey(text: string): string {
  return text.normalize('NFC').trim().toLowerCase();
}

export class FakeReviewReadRepository implements ReviewReadRepository {
  reviews: FakeReview[] = [];
  facilityReviews: FakeFacilityReview[] = [];

  constructor(
    private readonly directory: FakeDirectoryModuleRepository,
    private readonly taxonomy: FakeTaxonomyModuleRepository,
  ) {}

  addReview(overrides: Partial<FakeReview> = {}): FakeReview {
    const review = aReviewRow(overrides);
    this.reviews.push(review);
    return review;
  }

  addFacilityReview(overrides: Partial<FakeFacilityReview> = {}): FakeFacilityReview {
    const review = aFacilityReviewRow(overrides);
    this.facilityReviews.push(review);
    return review;
  }

  /** BR1.3: published, not deleted, has a publication time, and its doctor is visible. */
  private eligible(r: FakeReview): boolean {
    const doctor = this.directory.doctors.get(r.doctorId);
    return (
      r.state === 'published' &&
      r.deletedAt === null &&
      r.publishedAt !== null &&
      doctor !== undefined &&
      doctor.state === 'published' &&
      doctor.mergedIntoId === null
    );
  }

  private eligibleVisit(r: FakeFacilityReview): boolean {
    return r.state === 'published' && r.deletedAt === null && r.publishedAt !== null;
  }

  /** Active canonical condition terms, the candidates of BR1.7. */
  private conditions(): FakeTerm[] {
    return [...this.taxonomy.terms.values()].filter(
      (t) => t.kind === 'condition' && t.published && t.canonicalId === null,
    );
  }

  private matchesFreeText(text: string, term: FakeTerm): boolean {
    const key = freeTextKey(text);
    const names = [term.nameEn, term.nameBn, ...this.aliasesOf(term.id)].map((n) =>
      n.normalize('NFC').toLowerCase(),
    );
    return names.includes(key);
  }

  private aliasesOf(termId: string): string[] {
    return this.taxonomy.aliases.filter((a) => a.termId === termId).map((a) => a.alias);
  }

  private tagTerm(tag: FakeReviewTag): FakeTerm | undefined {
    if (tag.termId === undefined) return undefined;
    const term = this.taxonomy.terms.get(tag.termId);
    return term ? this.taxonomy.effective(term) : undefined;
  }

  /** BR1.7: a condition tag points at the term, or its free text is the term's name or alias. */
  private isAbout(r: FakeReview, term: FakeTerm): boolean {
    return r.tags.some(
      (tag) =>
        tag.group === 'condition' &&
        (this.tagTerm(tag)?.id === term.id ||
          (tag.freeText !== undefined && this.matchesFreeText(tag.freeText, term))),
    );
  }

  private ref(t: FakeTerm): AboutTermRecord {
    return { id: t.id, publicId: t.publicId, nameEn: t.nameEn, nameBn: t.nameBn };
  }

  private cardTerm(r: FakeReview): AboutTermRecord | null {
    for (const tag of r.tags) {
      if (tag.group !== 'condition') continue;
      const linked = this.tagTerm(tag);
      if (linked && linked.published && linked.kind === 'condition') return this.ref(linked);
      if (tag.freeText !== undefined) {
        const matched = this.conditions().filter((t) => this.matchesFreeText(tag.freeText!, t));
        if (matched.length === 1) return this.ref(matched[0]!);
      }
    }
    return null;
  }

  private card(r: FakeReview): ReviewCardRecord {
    const doctor = this.directory.doctors.get(r.doctorId)!;
    const anonymous = r.personaKind === 'anonymous' || r.identityMode === 'anonymous';
    return {
      id: r.id,
      publicId: r.publicId,
      doctorId: r.doctorId,
      doctorPublicId: doctor.publicId,
      doctorNameEn: doctor.nameEn,
      doctorNameBn: doctor.nameBn,
      branchId: r.branchId,
      title: r.title,
      body: r.body,
      sections: r.sections,
      sentiment: r.sentiment,
      outcome: r.outcome,
      relationship: r.relationship,
      periodYear: r.periodYear,
      periodMonth: r.periodMonth,
      publishedAt: r.publishedAt!,
      author: {
        personaKind: anonymous ? 'anonymous' : r.personaKind,
        displayName: r.displayName,
        username: r.username,
      },
      cardTerm: this.cardTerm(r),
      cardFreeText:
        r.tags.find((t) => t.group === 'condition' && t.freeText !== undefined)?.freeText ?? null,
      aboutTerms: this.conditions()
        .filter((t) => this.isAbout(r, t))
        .sort((a, b) => a.nameEn.localeCompare(b.nameEn))
        .map((t) => this.ref(t)),
    };
  }

  private newestFirst(a: FakeReview, b: FakeReview): number {
    return (
      b.publishedAt!.getTime() - a.publishedAt!.getTime() || b.publicId.localeCompare(a.publicId)
    );
  }

  private eligibleSorted(): FakeReview[] {
    return this.reviews.filter((r) => this.eligible(r)).sort((a, b) => this.newestFirst(a, b));
  }

  publishedForDoctor(_tx: Tx, doctorId: string): Promise<ReviewCardRecord[]> {
    return Promise.resolve(
      this.eligibleSorted()
        .filter((r) => r.doctorId === doctorId)
        .map((r) => this.card(r)),
    );
  }

  publishedForTerm(_tx: Tx, termId: string): Promise<TermReviewRecord[]> {
    const term = this.taxonomy.terms.get(termId);
    if (!term) return Promise.resolve([]);
    return Promise.resolve(
      this.eligibleSorted()
        .filter((r) => this.isAbout(r, term))
        .map((r) => {
          const doctor = this.directory.doctors.get(r.doctorId)!;
          const branch = r.branchId ? this.directory.branches.get(r.branchId) : undefined;
          const visibleBranch =
            branch && branch.state === 'published' && branch.facilityState === 'published';
          const mentions: MentionRecord[] = r.tags.flatMap((tag): MentionRecord[] => {
            if (tag.group === 'condition' || tag.notSure) return [];
            const linked = this.tagTerm(tag);
            return [
              {
                group: tag.group,
                termNameEn: linked?.nameEn ?? null,
                termNameBn: linked?.nameBn ?? null,
                freeText: tag.freeText ?? null,
              },
            ];
          });
          return {
            ...this.card(r),
            doctorSpecialtyEn: doctor.specialtyEn,
            doctorSpecialtyBn: doctor.specialtyBn,
            doctorAreaEn: doctor.areaEn,
            doctorAreaBn: doctor.areaBn,
            doctorCityEn: doctor.cityEn,
            doctorCityBn: doctor.cityBn,
            doctorAvatarHue: doctor.avatarHue,
            doctorPrimaryChamberEn: doctor.chambers[0]?.nameEn ?? null,
            doctorPrimaryChamberBn: doctor.chambers[0]?.nameBn ?? null,
            branch: visibleBranch
              ? {
                  id: branch.id,
                  publicId: branch.publicId,
                  nameEn: branch.nameEn,
                  nameBn: branch.nameBn,
                  ownNameEn: branch.ownNameEn,
                  ownNameBn: branch.ownNameBn,
                  facilityNameEn: branch.facilityNameEn,
                  facilityNameBn: branch.facilityNameBn,
                  type: branch.type,
                  avatarHue: branch.avatarHue,
                }
              : null,
            mentions,
          };
        }),
    );
  }

  publishedForBranch(_tx: Tx, branchId: string): Promise<FacilityReviewRecord[]> {
    return Promise.resolve(
      this.facilityReviews
        .filter((r) => r.branchId === branchId && this.eligibleVisit(r))
        .sort((a, b) => b.publishedAt!.getTime() - a.publishedAt!.getTime())
        .map((r) => ({
          publicId: r.publicId,
          author: {
            personaKind:
              r.personaKind === 'anonymous' || r.identityMode === 'anonymous'
                ? 'anonymous'
                : r.personaKind,
            displayName: r.displayName,
            username: r.username,
          },
          periodYear: r.periodYear,
          periodMonth: r.periodMonth,
          publishedAt: r.publishedAt!,
          body: r.body,
          criteria: { ...r.criteria },
        })),
    );
  }

  summariesForDoctors(_tx: Tx, doctorIds: readonly string[]): Promise<ReviewSummaryRecord[]> {
    const wanted = new Set(doctorIds);
    return Promise.resolve(
      this.eligibleSorted()
        .filter((r) => wanted.has(r.doctorId))
        .map((r) => ({
          reviewId: r.id,
          doctorId: r.doctorId,
          sentiment: r.sentiment,
          aboutTerms: this.card(r).aboutTerms,
        })),
    );
  }

  summariesForBranches(_tx: Tx, branchIds: readonly string[]): Promise<BranchFeedbackRecord[]> {
    const wanted = new Set(branchIds);
    return Promise.resolve(
      this.facilityReviews
        .filter((r) => wanted.has(r.branchId) && this.eligibleVisit(r))
        .map((r) => ({ branchId: r.branchId, overall: r.criteria.overall ?? null })),
    );
  }

  totalsForTerms(_tx: Tx, termIds: readonly string[]): Promise<Map<string, number>> {
    const eligible = this.eligibleSorted();
    return Promise.resolve(
      new Map(
        termIds.map((id) => {
          const term = this.taxonomy.terms.get(id);
          return [id, term ? eligible.filter((r) => this.isAbout(r, term)).length : 0];
        }),
      ),
    );
  }

  listRecentCards(_tx: Tx, request: RecentCardsRequest): Promise<ReviewCardRecord[]> {
    const term = request.termPublicId
      ? [...this.taxonomy.terms.values()].find((t) => t.publicId === request.termPublicId)
      : undefined;
    if (request.termPublicId && !term) return Promise.resolve([]);
    const after = request.after;
    return Promise.resolve(
      this.eligibleSorted()
        .filter((r) => {
          const doctor = this.directory.doctors.get(r.doctorId)!;
          if (request.doctorPublicId && doctor.publicId !== request.doctorPublicId) return false;
          if (term && !this.isAbout(r, term)) return false;
          if (!after) return true;
          const at = r.publishedAt!.getTime();
          return (
            at < after.publishedAt.getTime() ||
            (at === after.publishedAt.getTime() && r.publicId < after.publicId)
          );
        })
        .slice(0, request.limit)
        .map((r) => this.card(r)),
    );
  }
}

/** The three fakes wired together: the review fake reads the other two, as SQL joins them. */
export function makeDirectoryFakes() {
  const directory = new FakeDirectoryModuleRepository();
  const taxonomy = new FakeTaxonomyModuleRepository();
  const reviews = new FakeReviewReadRepository(directory, taxonomy);
  return { directory, taxonomy, reviews };
}
