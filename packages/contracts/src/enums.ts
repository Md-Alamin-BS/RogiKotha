// Every enum in docs/implementation/02-data-model.md §0, mirrored (not owned)
// in packages/database/src/schema/enums.ts by T-004/T-005. This file is the
// single source of truth for the value lists; the database schema copies
// from here, never the other way round.

export const LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof LOCALES)[number];

export const ACCOUNT_STATUSES = [
  'pending_verification',
  'active',
  'restricted',
  'suspended',
  'banned',
  'deleted',
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const STAFF_ROLES = ['super_admin', 'admin', 'moderator'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const IDENTITY_MODES = ['named', 'pseudonymous', 'anonymous'] as const;
export type IdentityMode = (typeof IDENTITY_MODES)[number];

export const PROVENANCES = ['community', 'provider', 'admin'] as const;
export type Provenance = (typeof PROVENANCES)[number];

export const PUBLICATION_STATES = [
  'draft',
  'pending_review',
  'published',
  'hidden_pending_review',
  'hidden',
  'deleted_tombstone',
  'rejected',
] as const;
export type PublicationState = (typeof PUBLICATION_STATES)[number];

export const REVIEW_KINDS = ['quick', 'detailed'] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const RELATIONSHIPS = ['self', 'parent', 'family', 'witness'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const SENTIMENTS = ['positive', 'mixed', 'negative'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const OUTCOMES = ['helped', 'none', 'worse', 'uncertain'] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const TAG_GROUPS = ['symptom', 'condition', 'treatment', 'medicine'] as const;
export type TagGroup = (typeof TAG_GROUPS)[number];

export const TERM_KINDS = ['condition', 'symptom', 'treatment', 'medicine', 'specialty'] as const;
export type TermKind = (typeof TERM_KINDS)[number];

export const FACILITY_TYPES = ['hospital', 'clinic', 'diagnostic'] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

export const CRITERIA = [
  'staff',
  'waiting',
  'cleanliness',
  'billing',
  'reportTime',
  'reportTrust',
  'admission',
  'recommend',
  'overall',
] as const;
export type Criterion = (typeof CRITERIA)[number];

export const CRITERION_VALUES = ['good', 'mixed', 'poor'] as const;
export type CriterionValue = (typeof CRITERION_VALUES)[number];

export const EVIDENCE_GROUPS = ['reviewed', 'later', 'outcome'] as const;
export type EvidenceGroup = (typeof EVIDENCE_GROUPS)[number];

export const EVIDENCE_STATES = [
  'quarantined',
  'validating',
  'scanning',
  'sanitising',
  'preview_ready',
  'privacy_confirmed',
  'published',
  'failed',
  'rejected',
  'removed',
  'original_expired',
] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];

// `too_many_pages` and `encrypted` are reserved for Phase 2 PDFs (FD-036);
// kept in the enum, unused by Phase 1 code.
export const EVIDENCE_FAIL_REASONS = [
  'type_mismatch',
  'too_large',
  'malformed',
  'malware',
  'scanner_unavailable',
  'processing_timeout',
  'unknown',
  'too_many_pages',
  'encrypted',
] as const;
export type EvidenceFailReason = (typeof EVIDENCE_FAIL_REASONS)[number];

// `derivative_pdf` is reserved for Phase 2.
export const ARTIFACT_KINDS = ['original', 'page_png', 'thumbnail', 'derivative_pdf'] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const CUSTODY_EVENTS = [
  'received',
  'validated',
  'validation_failed',
  'scan_started',
  'scan_clean',
  'scan_detected',
  'scan_unavailable',
  'sanitised',
  'preview_ready',
  'redaction_applied',
  'privacy_confirmed',
  'published',
  'failed',
  'original_accessed',
  'hold_placed',
  'hold_released',
  'retention_changed',
  'original_expired',
  'removed',
] as const;
export type CustodyEvent = (typeof CUSTODY_EVENTS)[number];

export const FOLLOW_UP_KINDS = ['follow_up', 'correction', 'later_care'] as const;
export type FollowUpKind = (typeof FOLLOW_UP_KINDS)[number];

export const REACTION_VALUES = ['like', 'dislike'] as const;
export type ReactionValue = (typeof REACTION_VALUES)[number];

export const REPORT_REASONS = [
  'privacy',
  'threat',
  'harassment',
  'hate',
  'spam',
  'impersonation',
  'dangerous',
  'unsafeFile',
  'ownership',
  'duplicate',
  'offtopic',
  'factual',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// Critical report reasons hide content on first credible report (FD-017).
export const CRITICAL_REPORT_REASONS = ['privacy', 'threat', 'unsafeFile'] as const;

// Protected profile fields always pend staff review, whoever proposes them.
export const PROTECTED_PROFILE_FIELDS = ['name', 'bmdc_number'] as const;

export const MODERATION_LANES = ['critical', 'standard', 'appeals'] as const;
export type ModerationLane = (typeof MODERATION_LANES)[number];

export const CASE_STATUSES = ['open', 'decided', 'appealed', 'closed'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const MODERATION_ACTIONS = [
  'warn',
  'redact',
  'removeFile',
  'lock',
  'hide',
  'remove',
  'restrict',
  'suspend',
  'ban',
  'none',
  'restore',
] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export const APPEAL_STATUSES = ['open', 'upheld', 'changed', 'expired'] as const;
export type AppealStatus = (typeof APPEAL_STATUSES)[number];

export const ENFORCEMENT_KINDS = ['warn', 'restrict', 'suspend', 'ban'] as const;
export type EnforcementKind = (typeof ENFORCEMENT_KINDS)[number];

export const NOTIFICATION_KINDS = [
  'evidence',
  'discussion',
  'moderation',
  'security',
  'draft',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const STAFF_NOTIFICATION_KINDS = [
  'newReport',
  'newProfile',
  'evidence',
  'claim',
  'protectedChange',
  'identityReveal',
  'security',
] as const;
export type StaffNotificationKind = (typeof STAFF_NOTIFICATION_KINDS)[number];

export const SUBMISSION_STATUSES = ['pending', 'approved', 'rejected', 'merged'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const DATA_REQUEST_KINDS = ['export', 'delete'] as const;
export type DataRequestKind = (typeof DATA_REQUEST_KINDS)[number];

export const DATA_REQUEST_STATUSES = [
  'requested',
  'running',
  'ready',
  'completed',
  'failed',
] as const;
export type DataRequestStatus = (typeof DATA_REQUEST_STATUSES)[number];

export const DELETION_ACTIONS = [
  'delete',
  'deidentify',
  'tombstone',
  'hide',
  'retain_until_expiry',
  'retain_under_hold',
] as const;
export type DeletionAction = (typeof DELETION_ACTIONS)[number];

export const SEARCH_KINDS = ['doctor', 'facility', 'condition', 'review'] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export const TARGET_KINDS = [
  'review',
  'facility_review',
  'comment',
  'evidence',
  'profile',
] as const;
export type TargetKind = (typeof TARGET_KINDS)[number];
