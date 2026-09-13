// Hand-authored types for the ported synthetic corpus (task step 2). The
// corpus is data, not a view model: bilingual `{en, bn}` pairs stay intact
// exactly as the prototype shipped them (01-conventions.md §1's "corpus/
// the synthetic data, typed"). Every record keeps a `seedRef` equal to the
// prototype's own id (`d1`, `r6`, `k8`, `MOD-2041`, `Q-882`, `P-140`,
// `C-58`, …) so the seed can look records up by their old ids and so this
// file and `scripts/port-corpus.mjs` can prove byte-identical regeneration.
import type {
  Criterion,
  CriterionValue,
  EvidenceGroup,
  IdentityMode,
  Outcome,
  Provenance,
  Relationship,
  ReportReason,
  Sentiment,
  StaffRole,
  TagGroup,
} from '@rogikotha/contracts';

export interface Bilingual {
  en: string;
  bn: string;
}

export type PrototypeIdentity = 'real' | 'pseudo' | 'anon';

export function identityToMode(identity: PrototypeIdentity): IdentityMode {
  if (identity === 'real') return 'named';
  if (identity === 'pseudo') return 'pseudonymous';
  return 'anonymous';
}

export interface CorpusChamber {
  name: Bilingual;
  hours: Bilingual;
  provenance: Provenance;
}

export interface CorpusDoctor {
  seedRef: string;
  name: Bilingual;
  specialty: Bilingual;
  qualifications: Bilingual;
  bmdc: string;
  gender: string;
  languages: Bilingual;
  fee: Bilingual;
  city: Bilingual;
  area: Bilingual;
  chambers: CorpusChamber[];
  /** field -> provenance, verbatim from the prototype's `provenance` object. */
  fieldProvenance: Record<string, Provenance>;
  claimed: boolean;
  avatarHue: number;
}

export interface CorpusCondition {
  seedRef: string;
  name: Bilingual;
  aliases: string[];
}

/** One alias row, derived from `conditions[].aliases` (step 6's lang-guess rule). */
export interface CorpusAlias {
  termSeedRef: string;
  alias: string;
  lang: 'en' | 'bn' | 'banglish';
}

export interface CorpusFacilityOrg {
  seedRef: string;
  name: Bilingual;
}

export interface CorpusBranch {
  seedRef: string;
  /** `null` when the record itself has no `parent` (it is its own organisation). */
  orgSeedRef: string;
  name: Bilingual;
  branchLabel: Bilingual | null;
  type: 'hospital' | 'clinic' | 'diagnostic';
  city: Bilingual;
  area: Bilingual;
  fieldProvenance: Record<string, Provenance>;
  avatarHue: number;
  doctorSeedRefs: string[];
}

export interface CorpusTag {
  group: TagGroup;
  text: Bilingual;
}

export interface CorpusTimelineEntry {
  key: 'symptoms' | 'diagnosis' | 'treatment' | 'after';
  text: Bilingual;
}

/** One row of `RK.followUps[reviewId]` or `RK.laterCare[reviewId]` (own file, `follow-ups.ts` — the
 * addendum: "followUps and laterCare are seeded with real dated_year/dated_month so ordering is by
 * date, never array position"). `laterProvider` is set only for `kind: 'later_care'`. */
export interface CorpusFollowUp {
  seedRef: string;
  reviewSeedRef: string;
  kind: 'follow_up' | 'later_care';
  date: Bilingual;
  body: Bilingual;
  laterProvider?: Bilingual;
}

export interface CorpusReview {
  seedRef: string;
  doctorSeedRef: string;
  conditionSeedRef: string;
  sentiment: Sentiment;
  outcome: Outcome;
  relationship: Relationship;
  identity: PrototypeIdentity;
  /** Author display text as the prototype rendered it (`shirin_88`, `Anonymous`, `Kamrul Islam`, …). */
  author: Bilingual;
  period: Bilingual;
  posted: Bilingual;
  detailed: boolean;
  evidenceCount: number;
  likes: number;
  dislikes: number;
  commentsCount: number;
  claims: string[];
  title: Bilingual;
  body: Bilingual;
  timeline?: CorpusTimelineEntry[];
  tags: CorpusTag[];
}

export interface CorpusFacilityReview {
  seedRef: string;
  branchSeedRef: string;
  identity: PrototypeIdentity;
  author: Bilingual;
  period: Bilingual;
  posted: Bilingual;
  likes: number;
  dislikes: number;
  body: Bilingual;
  criteria: Partial<Record<Criterion, CriterionValue | null>>;
}

export interface CorpusComment {
  seedRef: string;
  reviewSeedRef: string;
  parentSeedRef: string | null;
  author: Bilingual;
  identity: PrototypeIdentity;
  when: Bilingual;
  likes: number;
  dislikes: number;
  body: Bilingual;
  dangerous: boolean;
  externalLink: string | null;
  mentions: string[];
  /** author account holds an approved `profile_claims` row for this doctor. */
  providerForDoctorSeedRef: string | null;
}

export interface CorpusEvidenceItem {
  seedRef: string;
  reviewSeedRef: string;
  group: EvidenceGroup;
  label: Bilingual;
  /** `ready`/`failed` from the prototype, mapped to Phase-1 states by the seed. */
  prototypeState: 'ready' | 'failed';
  pageCount: number;
  failReason?: Bilingual;
}

/** One seeded account (task step 3's storyboard table + "every other author -> contributor"). */
export interface CorpusAccount {
  username: string;
  displayName: Bilingual;
  email: string;
  role: StaffRole | null;
  /** the persona this account writes under by default (named or pseudonymous). */
  personaKind: 'named' | 'pseudonymous';
}

export interface CorpusPersona {
  /** stable key for cross-referencing from reviews/comments/facilityReviews. */
  key: string;
  kind: IdentityMode;
  displayName: Bilingual;
  username: string | null;
  avatarHue: number;
  /** set only for `anonymous` — the persona is scoped to exactly one review. */
  reviewSeedRef?: string;
  /** the account this persona belongs to (username), null for accounts not in the seeded roster. */
  accountUsername: string | null;
}

export interface CorpusQuarantineStage {
  seedRef: string;
  reviewSeedRef: string;
  file: string;
  sizeLabel: string;
  note: Bilingual;
}

export interface CorpusModerationCase {
  seedRef: string;
  lane: 'critical' | 'standard' | 'appeals';
  ageHours: number;
  /** The prototype's own `reports` count (CR-008 / ISS-174) — may exceed
   * `reportReasons.length` when several reporters gave the same reason
   * (MOD-2033: 6 reports, 3 authored reasons). The seed pads
   * `reportReasons` up to this length rather than truncating it down, so
   * `reportReasons` never loses information the corpus actually states. */
  reportCount: number;
  reportReasons: ReportReason[];
  autoHidden: boolean;
  coordinated: boolean;
  targetKind: 'comment' | 'evidence' | 'account' | 'profile';
  targetSeedRef: string;
  reviewSeedRef: string | null;
  summary: Bilingual;
  note: Bilingual;
  appealText?: Bilingual;
}

export interface CorpusAuditRow {
  seedRef: string;
  caseSeedRef: string;
  action: string;
  actor: string;
  timeMinAgo: number;
  targetSeedRef: string;
}

export interface CorpusProviderSubmission {
  seedRef: string;
  name: Bilingual;
  specialty: Bilingual;
  city: Bilingual;
  bmdc: string;
  duplicateOfDoctorSeedRef: string | null;
  note: Bilingual;
}

export interface CorpusProviderClaim {
  seedRef: string;
  doctorSeedRef: string;
  method: Bilingual;
  note: Bilingual;
}

export interface CorpusFieldChange {
  seedRef: string;
  doctorSeedRef: string;
  field: Bilingual;
  from: Bilingual;
  to: Bilingual;
  protected: boolean;
}

export interface CorpusStaffNotification {
  seedRef: string;
  kind: 'newReport' | 'newProfile' | 'evidence' | 'claim' | 'protectedChange' | 'identityReveal' | 'security';
  when: Bilingual;
  target: Bilingual;
  text: Bilingual;
}

export interface CorpusNotification {
  seedRef: string;
  accountUsername: string;
  kind: 'evidence' | 'discussion' | 'moderation' | 'security' | 'draft';
  when: Bilingual;
  unread: boolean;
  text: Bilingual;
}

export interface CorpusDraft {
  seedRef: string;
  accountUsername: string;
  expiresInDays: number;
  doctorSeedRef: string | null;
  conditionSeedRef: string | null;
  title: Bilingual;
  excerpt: Bilingual;
  blockedOnSubmissionSeedRef: string | null;
}
