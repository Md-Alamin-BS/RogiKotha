CREATE TYPE "public"."account_status" AS ENUM('pending_verification', 'active', 'restricted', 'suspended', 'banned', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."appeal_status" AS ENUM('open', 'upheld', 'changed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."artifact_kind" AS ENUM('original', 'page_png', 'thumbnail', 'derivative_pdf');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('open', 'decided', 'appealed', 'closed');--> statement-breakpoint
CREATE TYPE "public"."criterion" AS ENUM('staff', 'waiting', 'cleanliness', 'billing', 'reportTime', 'reportTrust', 'admission', 'recommend', 'overall');--> statement-breakpoint
CREATE TYPE "public"."criterion_value" AS ENUM('good', 'mixed', 'poor');--> statement-breakpoint
CREATE TYPE "public"."custody_event" AS ENUM('received', 'validated', 'validation_failed', 'scan_started', 'scan_clean', 'scan_detected', 'scan_unavailable', 'sanitised', 'preview_ready', 'redaction_applied', 'privacy_confirmed', 'published', 'failed', 'original_accessed', 'hold_placed', 'hold_released', 'retention_changed', 'original_expired', 'removed');--> statement-breakpoint
CREATE TYPE "public"."data_request_kind" AS ENUM('export', 'delete');--> statement-breakpoint
CREATE TYPE "public"."data_request_status" AS ENUM('requested', 'running', 'ready', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."deletion_action" AS ENUM('delete', 'deidentify', 'tombstone', 'hide', 'retain_until_expiry', 'retain_under_hold');--> statement-breakpoint
CREATE TYPE "public"."enforcement_kind" AS ENUM('warn', 'restrict', 'suspend', 'ban');--> statement-breakpoint
CREATE TYPE "public"."evidence_fail_reason" AS ENUM('type_mismatch', 'too_large', 'malformed', 'malware', 'scanner_unavailable', 'processing_timeout', 'unknown', 'too_many_pages', 'encrypted');--> statement-breakpoint
CREATE TYPE "public"."evidence_group" AS ENUM('reviewed', 'later', 'outcome');--> statement-breakpoint
CREATE TYPE "public"."evidence_state" AS ENUM('quarantined', 'validating', 'scanning', 'sanitising', 'preview_ready', 'privacy_confirmed', 'published', 'failed', 'rejected', 'removed', 'original_expired');--> statement-breakpoint
CREATE TYPE "public"."facility_type" AS ENUM('hospital', 'clinic', 'diagnostic');--> statement-breakpoint
CREATE TYPE "public"."follow_up_kind" AS ENUM('follow_up', 'correction', 'later_care');--> statement-breakpoint
CREATE TYPE "public"."identity_mode" AS ENUM('named', 'pseudonymous', 'anonymous');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'bn');--> statement-breakpoint
CREATE TYPE "public"."moderation_action" AS ENUM('warn', 'redact', 'removeFile', 'lock', 'hide', 'remove', 'restrict', 'suspend', 'ban', 'none', 'restore');--> statement-breakpoint
CREATE TYPE "public"."moderation_lane" AS ENUM('critical', 'standard', 'appeals');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('evidence', 'discussion', 'moderation', 'security', 'draft');--> statement-breakpoint
CREATE TYPE "public"."outcome" AS ENUM('helped', 'none', 'worse', 'uncertain');--> statement-breakpoint
CREATE TYPE "public"."provenance" AS ENUM('community', 'provider', 'admin');--> statement-breakpoint
CREATE TYPE "public"."publication_state" AS ENUM('draft', 'pending_review', 'published', 'hidden_pending_review', 'hidden', 'deleted_tombstone', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."reaction_value" AS ENUM('like', 'dislike');--> statement-breakpoint
CREATE TYPE "public"."relationship" AS ENUM('self', 'parent', 'family', 'witness');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('privacy', 'threat', 'harassment', 'hate', 'spam', 'impersonation', 'dangerous', 'unsafeFile', 'ownership', 'duplicate', 'offtopic', 'factual', 'other');--> statement-breakpoint
CREATE TYPE "public"."review_kind" AS ENUM('quick', 'detailed');--> statement-breakpoint
CREATE TYPE "public"."search_kind" AS ENUM('doctor', 'facility', 'condition', 'review');--> statement-breakpoint
CREATE TYPE "public"."sentiment" AS ENUM('positive', 'mixed', 'negative');--> statement-breakpoint
CREATE TYPE "public"."staff_notification_kind" AS ENUM('newReport', 'newProfile', 'evidence', 'claim', 'protectedChange', 'identityReveal', 'security');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('super_admin', 'admin', 'moderator');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected', 'merged');--> statement-breakpoint
CREATE TYPE "public"."tag_group" AS ENUM('symptom', 'condition', 'treatment', 'medicine');--> statement-breakpoint
CREATE TYPE "public"."target_kind" AS ENUM('review', 'facility_review', 'comment', 'evidence', 'profile');--> statement-breakpoint
CREATE TYPE "public"."term_kind" AS ENUM('condition', 'symptom', 'treatment', 'medicine', 'specialty');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_preferences" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"interface_locale" "locale" NOT NULL,
	"email_security" boolean DEFAULT true NOT NULL,
	"email_moderation" boolean DEFAULT true NOT NULL,
	"email_evidence" boolean DEFAULT true NOT NULL,
	"email_discussion" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "account_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"auth_user_id" text NOT NULL,
	"username" "citext" NOT NULL,
	"username_key" text NOT NULL,
	"display_name" text NOT NULL,
	"locale" "locale" NOT NULL,
	"status" "account_status" DEFAULT 'pending_verification' NOT NULL,
	"staff_role" "staff_role",
	"age_confirmed_at" timestamp with time zone,
	"terms_version" text,
	"terms_accepted_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "account_profiles_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "account_profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"blocker_account_id" uuid NOT NULL,
	"blocked_account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_blocker_account_id_blocked_account_id_pk" PRIMARY KEY("blocker_account_id","blocked_account_id")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"account_id" uuid NOT NULL,
	"review_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_account_id_review_id_pk" PRIMARY KEY("account_id","review_id")
);
--> statement-breakpoint
CREATE TABLE "enforcements" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" "enforcement_kind" NOT NULL,
	"reason_code" text NOT NULL,
	"note_to_user" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"decision_id" uuid,
	"actor_account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"account_id" uuid NOT NULL,
	"body" text NOT NULL,
	"locale" "locale" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_device_approvals" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"device_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_device_approvals_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "staff_devices" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"account_id" uuid NOT NULL,
	"device_hash" text NOT NULL,
	"label" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "identity_reveals" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"requester_account_id" uuid NOT NULL,
	"requester_role" "staff_role" NOT NULL,
	"target_kind" "target_kind" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"granted" boolean NOT NULL,
	"revealed_account_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persona_links" (
	"persona_id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"review_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"kind" "identity_mode" NOT NULL,
	"display_name" text NOT NULL,
	"username" text,
	"avatar_hue" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_chambers" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"branch_id" uuid,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"hours_en" text,
	"hours_bn" text,
	"provenance" "provenance" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"public_id" text NOT NULL,
	"seed_ref" text,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"specialty_id" uuid,
	"qualifications_en" text,
	"qualifications_bn" text,
	"bmdc_number" text,
	"gender" text,
	"languages_en" text,
	"languages_bn" text,
	"fee_display_en" text,
	"fee_display_bn" text,
	"city_en" text,
	"city_bn" text,
	"area_en" text,
	"area_bn" text,
	"about_en" text,
	"about_bn" text,
	"field_provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"avatar_hue" smallint,
	"claimed_by_account_id" uuid,
	"state" "publication_state" NOT NULL,
	"merged_into_id" uuid,
	"name_key" text NOT NULL,
	"bmdc_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "doctors_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"public_id" text NOT NULL,
	"seed_ref" text,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"type" "facility_type" NOT NULL,
	"field_provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"avatar_hue" smallint,
	"state" "publication_state" NOT NULL,
	"claimed_by_account_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "facilities_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "facility_branches" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"public_id" text NOT NULL,
	"seed_ref" text,
	"facility_id" uuid NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"city_en" text NOT NULL,
	"city_bn" text NOT NULL,
	"area_en" text,
	"area_bn" text,
	"address_en" text,
	"address_bn" text,
	"field_provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"state" "publication_state" NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "facility_branches_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "profile_claims" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" uuid NOT NULL,
	"claimant_account_id" uuid NOT NULL,
	"method" text NOT NULL,
	"evidence_note" text,
	"status" text NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_field_changes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" uuid NOT NULL,
	"field" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb NOT NULL,
	"proposed_by_account_id" uuid NOT NULL,
	"provenance" "provenance" NOT NULL,
	"protected" boolean DEFAULT false NOT NULL,
	"status" text NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_merges" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"kind" text NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"reason" text NOT NULL,
	"transferred" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_redirects" (
	"from_public_id" text PRIMARY KEY NOT NULL,
	"to_kind" text NOT NULL,
	"to_public_id" text NOT NULL,
	"merge_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_submissions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"submitted_by_account_id" uuid NOT NULL,
	"status" text NOT NULL,
	"duplicate_of_id" uuid,
	"reviewer_note" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_doctor_id" uuid,
	"created_facility_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxonomy_aliases" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"term_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"alias_key" text NOT NULL,
	"lang" text NOT NULL,
	"provenance" "provenance" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxonomy_terms" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"public_id" text NOT NULL,
	"seed_ref" text,
	"kind" "term_kind" NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"name_key_en" text NOT NULL,
	"name_key_bn" text NOT NULL,
	"provisional" boolean DEFAULT false NOT NULL,
	"canonical_id" uuid,
	"created_by_account_id" uuid,
	"state" "publication_state" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "taxonomy_terms_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"stream" text NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"target_kind" "target_kind",
	"target_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_changes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"version" integer NOT NULL,
	"path" text NOT NULL,
	"before" jsonb,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_versions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"version" integer NOT NULL,
	"schema_version" integer NOT NULL,
	"values" jsonb NOT NULL,
	"actor_account_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"rolled_back_from" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "config_versions_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "demo_clock" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"offset_seconds" bigint DEFAULT 0 NOT NULL,
	"set_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demo_clock_single_row" CHECK ("demo_clock"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_preferences" ADD CONSTRAINT "account_preferences_account_id_account_profiles_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_profiles" ADD CONSTRAINT "account_profiles_auth_user_id_auth_users_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_account_id_account_profiles_id_fk" FOREIGN KEY ("blocker_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_account_id_account_profiles_id_fk" FOREIGN KEY ("blocked_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_account_id_account_profiles_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enforcements" ADD CONSTRAINT "enforcements_account_id_account_profiles_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enforcements" ADD CONSTRAINT "enforcements_actor_account_id_account_profiles_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_account_id_account_profiles_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_device_approvals" ADD CONSTRAINT "staff_device_approvals_device_id_staff_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."staff_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_devices" ADD CONSTRAINT "staff_devices_account_id_account_profiles_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_reveals" ADD CONSTRAINT "identity_reveals_requester_account_id_account_profiles_id_fk" FOREIGN KEY ("requester_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_reveals" ADD CONSTRAINT "identity_reveals_revealed_account_id_account_profiles_id_fk" FOREIGN KEY ("revealed_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_links" ADD CONSTRAINT "persona_links_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_links" ADD CONSTRAINT "persona_links_account_id_account_profiles_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_chambers" ADD CONSTRAINT "doctor_chambers_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_chambers" ADD CONSTRAINT "doctor_chambers_branch_id_facility_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."facility_branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_specialty_id_taxonomy_terms_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_claimed_by_account_id_account_profiles_id_fk" FOREIGN KEY ("claimed_by_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_merged_into_id_doctors_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_claimed_by_account_id_account_profiles_id_fk" FOREIGN KEY ("claimed_by_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_branches" ADD CONSTRAINT "facility_branches_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_claims" ADD CONSTRAINT "profile_claims_claimant_account_id_account_profiles_id_fk" FOREIGN KEY ("claimant_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_claims" ADD CONSTRAINT "profile_claims_decided_by_account_profiles_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_field_changes" ADD CONSTRAINT "profile_field_changes_proposed_by_account_id_account_profiles_id_fk" FOREIGN KEY ("proposed_by_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_field_changes" ADD CONSTRAINT "profile_field_changes_decided_by_account_profiles_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_redirects" ADD CONSTRAINT "profile_redirects_merge_id_profile_merges_id_fk" FOREIGN KEY ("merge_id") REFERENCES "public"."profile_merges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_submissions" ADD CONSTRAINT "profile_submissions_submitted_by_account_id_account_profiles_id_fk" FOREIGN KEY ("submitted_by_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_submissions" ADD CONSTRAINT "profile_submissions_decided_by_account_profiles_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_submissions" ADD CONSTRAINT "profile_submissions_created_doctor_id_doctors_id_fk" FOREIGN KEY ("created_doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_submissions" ADD CONSTRAINT "profile_submissions_created_facility_id_facilities_id_fk" FOREIGN KEY ("created_facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_aliases" ADD CONSTRAINT "taxonomy_aliases_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_canonical_id_taxonomy_terms_id_fk" FOREIGN KEY ("canonical_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_created_by_account_id_account_profiles_id_fk" FOREIGN KEY ("created_by_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "config_versions" ADD CONSTRAINT "config_versions_actor_account_id_account_profiles_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "doctors_seed_ref_unique" ON "doctors" USING btree ("seed_ref") WHERE "doctors"."seed_ref" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "facilities_seed_ref_unique" ON "facilities" USING btree ("seed_ref") WHERE "facilities"."seed_ref" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "facility_branches_seed_ref_unique" ON "facility_branches" USING btree ("seed_ref") WHERE "facility_branches"."seed_ref" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_aliases_term_alias_key_unique" ON "taxonomy_aliases" USING btree ("term_id","alias_key");--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_terms_seed_ref_unique" ON "taxonomy_terms" USING btree ("seed_ref") WHERE "taxonomy_terms"."seed_ref" is not null;--> statement-breakpoint
CREATE INDEX "audit_events_stream_created_at_idx" ON "audit_events" USING btree ("stream","created_at" DESC NULLS LAST);