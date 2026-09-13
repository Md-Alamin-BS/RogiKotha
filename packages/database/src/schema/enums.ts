// One `pgEnum` per enum in docs/implementation/02-data-model.md §0. Values
// are imported from `@rogikotha/contracts`'s `as const` arrays, never
// retyped here, so the two cannot drift (01-conventions.md §1).
import { pgEnum } from 'drizzle-orm/pg-core';
import {
  ACCOUNT_STATUSES,
  APPEAL_STATUSES,
  ARTIFACT_KINDS,
  CASE_STATUSES,
  CRITERIA,
  CRITERION_VALUES,
  CUSTODY_EVENTS,
  DATA_REQUEST_KINDS,
  DATA_REQUEST_STATUSES,
  DELETION_ACTIONS,
  ENFORCEMENT_KINDS,
  EVIDENCE_FAIL_REASONS,
  EVIDENCE_GROUPS,
  EVIDENCE_STATES,
  FACILITY_TYPES,
  FOLLOW_UP_KINDS,
  IDENTITY_MODES,
  LOCALES,
  MODERATION_ACTIONS,
  MODERATION_LANES,
  NOTIFICATION_KINDS,
  OUTCOMES,
  PROVENANCES,
  PUBLICATION_STATES,
  REACTION_VALUES,
  RELATIONSHIPS,
  REPORT_REASONS,
  REVIEW_KINDS,
  SEARCH_KINDS,
  SENTIMENTS,
  STAFF_NOTIFICATION_KINDS,
  STAFF_ROLES,
  SUBMISSION_STATUSES,
  TAG_GROUPS,
  TARGET_KINDS,
  TERM_KINDS,
} from '@rogikotha/contracts';

export const localeEnum = pgEnum('locale', LOCALES);
export const accountStatusEnum = pgEnum('account_status', ACCOUNT_STATUSES);
export const staffRoleEnum = pgEnum('staff_role', STAFF_ROLES);
export const identityModeEnum = pgEnum('identity_mode', IDENTITY_MODES);
export const provenanceEnum = pgEnum('provenance', PROVENANCES);
export const publicationStateEnum = pgEnum('publication_state', PUBLICATION_STATES);
export const reviewKindEnum = pgEnum('review_kind', REVIEW_KINDS);
export const relationshipEnum = pgEnum('relationship', RELATIONSHIPS);
export const sentimentEnum = pgEnum('sentiment', SENTIMENTS);
export const outcomeEnum = pgEnum('outcome', OUTCOMES);
export const tagGroupEnum = pgEnum('tag_group', TAG_GROUPS);
export const termKindEnum = pgEnum('term_kind', TERM_KINDS);
export const facilityTypeEnum = pgEnum('facility_type', FACILITY_TYPES);
export const criterionEnum = pgEnum('criterion', CRITERIA);
export const criterionValueEnum = pgEnum('criterion_value', CRITERION_VALUES);
export const evidenceGroupEnum = pgEnum('evidence_group', EVIDENCE_GROUPS);
export const evidenceStateEnum = pgEnum('evidence_state', EVIDENCE_STATES);
export const evidenceFailReasonEnum = pgEnum('evidence_fail_reason', EVIDENCE_FAIL_REASONS);
export const artifactKindEnum = pgEnum('artifact_kind', ARTIFACT_KINDS);
export const custodyEventEnum = pgEnum('custody_event', CUSTODY_EVENTS);
export const followUpKindEnum = pgEnum('follow_up_kind', FOLLOW_UP_KINDS);
export const reactionValueEnum = pgEnum('reaction_value', REACTION_VALUES);
export const reportReasonEnum = pgEnum('report_reason', REPORT_REASONS);
export const moderationLaneEnum = pgEnum('moderation_lane', MODERATION_LANES);
export const caseStatusEnum = pgEnum('case_status', CASE_STATUSES);
export const moderationActionEnum = pgEnum('moderation_action', MODERATION_ACTIONS);
export const appealStatusEnum = pgEnum('appeal_status', APPEAL_STATUSES);
export const enforcementKindEnum = pgEnum('enforcement_kind', ENFORCEMENT_KINDS);
export const notificationKindEnum = pgEnum('notification_kind', NOTIFICATION_KINDS);
export const staffNotificationKindEnum = pgEnum('staff_notification_kind', STAFF_NOTIFICATION_KINDS);
export const submissionStatusEnum = pgEnum('submission_status', SUBMISSION_STATUSES);
export const dataRequestKindEnum = pgEnum('data_request_kind', DATA_REQUEST_KINDS);
export const dataRequestStatusEnum = pgEnum('data_request_status', DATA_REQUEST_STATUSES);
export const deletionActionEnum = pgEnum('deletion_action', DELETION_ACTIONS);
export const searchKindEnum = pgEnum('search_kind', SEARCH_KINDS);
export const targetKindEnum = pgEnum('target_kind', TARGET_KINDS);
