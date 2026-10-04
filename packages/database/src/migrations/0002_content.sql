CREATE SEQUENCE "public"."moderation_case_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 2050 CACHE 1;--> statement-breakpoint
CREATE TABLE "legal_holds" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"target_kind" "target_kind" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"placed_by_account_id" uuid NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"released_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_bulk_actions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"policy_version" integer NOT NULL,
	"preview" jsonb NOT NULL,
	"previewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"executed_at" timestamp with time zone,
	"actor_account_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"affected_ids" jsonb,
	"drift_detected" boolean DEFAULT false NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retention_bulk_actions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "retention_policies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"version" integer NOT NULL,
	"original_days" integer DEFAULT 90 NOT NULL,
	"audit_days" integer DEFAULT 180 NOT NULL,
	"notification_days" integer DEFAULT 90 NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"actor_account_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"superseded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retention_policies_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "facility_reviews" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"public_id" text NOT NULL,
	"seed_ref" text,
	"author_persona_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"identity_mode" "identity_mode" NOT NULL,
	"period_year" smallint NOT NULL,
	"period_month" smallint NOT NULL,
	"body" text NOT NULL,
	"criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"state" "publication_state" NOT NULL,
	"published_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"restore_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "facility_reviews_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "review_drafts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"account_id" uuid NOT NULL,
	"review_id" uuid,
	"kind" "review_kind" NOT NULL,
	"payload_enc" "bytea" NOT NULL,
	"doctor_id" uuid,
	"blocked_on_submission_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '30 days' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"review_id" uuid NOT NULL,
	"kind" "follow_up_kind" NOT NULL,
	"dated_year" smallint NOT NULL,
	"dated_month" smallint NOT NULL,
	"body" text NOT NULL,
	"later_provider_text" text,
	"later_doctor_id" uuid,
	"state" "publication_state" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_tags" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"review_id" uuid NOT NULL,
	"group" "tag_group" NOT NULL,
	"term_id" uuid,
	"free_text" text,
	"not_sure" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_tags_one_of_term_free_text_not_sure" CHECK ((
        (case when "review_tags"."term_id" is not null then 1 else 0 end) +
        (case when "review_tags"."free_text" is not null then 1 else 0 end) +
        (case when "review_tags"."not_sure" then 1 else 0 end)
      ) = 1)
);
--> statement-breakpoint
CREATE TABLE "review_versions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"review_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"change_kind" text NOT NULL,
	"reason" text,
	"actor_kind" text NOT NULL,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_versions_change_kind_check" CHECK ("review_versions"."change_kind" in ('publish', 'correction', 'moderation_redaction', 'restore')),
	CONSTRAINT "review_versions_actor_kind_check" CHECK ("review_versions"."actor_kind" in ('author', 'moderator', 'system'))
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"public_id" text NOT NULL,
	"seed_ref" text,
	"author_persona_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"branch_id" uuid,
	"kind" "review_kind" NOT NULL,
	"relationship" "relationship" NOT NULL,
	"identity_mode" "identity_mode" NOT NULL,
	"sentiment" "sentiment",
	"outcome" "outcome",
	"period_year" smallint NOT NULL,
	"period_month" smallint NOT NULL,
	"exact_date_enc" "bytea",
	"title" text NOT NULL,
	"body" text,
	"sections" jsonb,
	"claims" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"language" text NOT NULL,
	"state" "publication_state" NOT NULL,
	"published_at" timestamp with time zone,
	"hidden_at" timestamp with time zone,
	"hidden_reason_code" text,
	"deleted_at" timestamp with time zone,
	"restore_until" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"latest_status" text,
	"attestation_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "reviews_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "reviews_language_check" CHECK ("reviews"."language" in ('en', 'bn', 'mixed'))
);
--> statement-breakpoint
CREATE TABLE "evidence_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"item_id" uuid NOT NULL,
	"kind" "artifact_kind" NOT NULL,
	"page_no" integer,
	"storage_key" text NOT NULL,
	"sha256" text NOT NULL,
	"bytes" integer NOT NULL,
	"mime" text NOT NULL,
	"width" integer,
	"height" integer,
	"sanitiser_version" text,
	"scanner_version" text,
	"signature_version" text,
	"immutable" boolean DEFAULT true NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"superseded_by_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_artifacts_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "evidence_artifacts_original_not_public_check" CHECK (not ("evidence_artifacts"."kind" = 'original' and "evidence_artifacts"."public"))
);
--> statement-breakpoint
CREATE TABLE "evidence_custody_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"item_id" uuid NOT NULL,
	"event" "custody_event" NOT NULL,
	"actor" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"public_id" text NOT NULL,
	"seed_ref" text,
	"review_id" uuid NOT NULL,
	"group" "evidence_group" NOT NULL,
	"label_en" text,
	"label_bn" text,
	"state" "evidence_state" NOT NULL,
	"fail_reason" "evidence_fail_reason",
	"declared_mime" text NOT NULL,
	"detected_mime" text,
	"original_bytes" bigint NOT NULL,
	"original_sha256" text NOT NULL,
	"original_filename_enc" "bytea" NOT NULL,
	"page_count" integer DEFAULT 1 NOT NULL,
	"uploaded_by_account_id" uuid NOT NULL,
	"retention_expires_at" timestamp with time zone,
	"hold_id" uuid,
	"published_artifact_id" uuid,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "evidence_items_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "evidence_items_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "evidence_items_declared_mime_check" CHECK ("evidence_items"."declared_mime" in ('image/jpeg', 'image/png')),
	CONSTRAINT "evidence_items_detected_mime_check" CHECK ("evidence_items"."detected_mime" is null or "evidence_items"."detected_mime" in ('image/jpeg', 'image/png'))
);
--> statement-breakpoint
CREATE TABLE "evidence_redactions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"item_id" uuid NOT NULL,
	"page_no" integer NOT NULL,
	"rects" jsonb NOT NULL,
	"applied_to_artifact_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_mentions" (
	"comment_id" uuid NOT NULL,
	"mentioned_persona_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_mentions_comment_id_mentioned_persona_id_pk" PRIMARY KEY("comment_id","mentioned_persona_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"public_id" text NOT NULL,
	"seed_ref" text,
	"review_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_persona_id" uuid NOT NULL,
	"body" text NOT NULL,
	"has_external_link" boolean DEFAULT false NOT NULL,
	"state" "publication_state" NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"tombstone" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "comments_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"public_persona_id" uuid,
	"value" "reaction_value" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_target_kind_check" CHECK ("reactions"."target_kind" in ('review', 'facility_review', 'comment'))
);
--> statement-breakpoint
CREATE TABLE "appeals" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"case_id" uuid NOT NULL,
	"appellant_account_id" uuid NOT NULL,
	"text" text NOT NULL,
	"status" "appeal_status" NOT NULL,
	"checklist" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"decided_by" uuid,
	"decision_reason" text,
	"decided_at" timestamp with time zone,
	"due_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_case_reasons" (
	"case_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_case_reasons_case_id_reason_pk" PRIMARY KEY("case_id","reason")
);
--> statement-breakpoint
CREATE TABLE "moderation_cases" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"code" text DEFAULT ('MOD-' || nextval('moderation_case_seq')) NOT NULL,
	"lane" "moderation_lane" NOT NULL,
	"status" "case_status" NOT NULL,
	"target_kind" "target_kind" NOT NULL,
	"target_id" uuid NOT NULL,
	"review_id" uuid,
	"report_count" integer DEFAULT 0 NOT NULL,
	"distinct_reporters" integer DEFAULT 0 NOT NULL,
	"auto_hidden" boolean DEFAULT false NOT NULL,
	"coordinated_signal" boolean DEFAULT false NOT NULL,
	"summary_en" text,
	"summary_bn" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sla_due_at" timestamp with time zone,
	"assigned_to" uuid,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_cases_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "moderation_decisions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"case_id" uuid NOT NULL,
	"action" "moderation_action" NOT NULL,
	"reason_code" text NOT NULL,
	"reason_to_author" text,
	"policy_version" text,
	"actor_account_id" uuid NOT NULL,
	"public_effect" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"target_kind" "target_kind" NOT NULL,
	"target_id" uuid NOT NULL,
	"review_id" uuid,
	"reporter_account_id" uuid NOT NULL,
	"reason" "report_reason" NOT NULL,
	"detail" text,
	"evidence_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"account_id" uuid NOT NULL,
	"to_email_enc" "bytea" NOT NULL,
	"locale" "locale" NOT NULL,
	"category" text NOT NULL,
	"message_key" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error_code" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_deliveries_category_check" CHECK ("email_deliveries"."category" in ('verification', 'reset', 'security', 'moderation', 'evidence', 'device_approval', 'deletion')),
	CONSTRAINT "email_deliveries_status_check" CHECK ("email_deliveries"."status" in ('queued', 'sent', 'failed', 'suppressed'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"message_key" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"route" text NOT NULL,
	"read_at" timestamp with time zone,
	"dedupe_key" text NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '90 days' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"kind" "staff_notification_kind" NOT NULL,
	"target_code" text,
	"message_key" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"route" text NOT NULL,
	"acked_by" uuid,
	"acked_at" timestamp with time zone,
	"dedupe_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_notifications_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "search_aliases" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"kind" "search_kind" NOT NULL,
	"ref_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"alias_key" text NOT NULL,
	"lang" text NOT NULL,
	"provenance" "provenance" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_documents" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"kind" "search_kind" NOT NULL,
	"ref_id" uuid NOT NULL,
	"public_id" text NOT NULL,
	"title_en" text,
	"title_bn" text,
	"body_en" text,
	"body_bn" text,
	"key_nfc" text NOT NULL,
	"tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title_en,'') || ' ' || coalesce(title_bn,'') || ' ' || coalesce(body_en,'') || ' ' || coalesce(body_bn,''))) STORED,
	"published" boolean DEFAULT false NOT NULL,
	"accounts_count" integer DEFAULT 0 NOT NULL,
	"recent_at" timestamp with time zone,
	"city_key" text,
	"specialty_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "data_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" "data_request_kind" NOT NULL,
	"status" "data_request_status" NOT NULL,
	"plan" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"result_storage_key" text,
	"idempotency_key" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_requests_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "staff_devices" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "demo_clock" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_placed_by_account_id_account_profiles_id_fk" FOREIGN KEY ("placed_by_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_released_by_account_profiles_id_fk" FOREIGN KEY ("released_by") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_bulk_actions" ADD CONSTRAINT "retention_bulk_actions_actor_account_id_account_profiles_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_actor_account_id_account_profiles_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_reviews" ADD CONSTRAINT "facility_reviews_author_persona_id_personas_id_fk" FOREIGN KEY ("author_persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_reviews" ADD CONSTRAINT "facility_reviews_branch_id_facility_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."facility_branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_drafts" ADD CONSTRAINT "review_drafts_account_id_account_profiles_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_drafts" ADD CONSTRAINT "review_drafts_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_drafts" ADD CONSTRAINT "review_drafts_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_drafts" ADD CONSTRAINT "review_drafts_blocked_on_submission_id_profile_submissions_id_fk" FOREIGN KEY ("blocked_on_submission_id") REFERENCES "public"."profile_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_follow_ups" ADD CONSTRAINT "review_follow_ups_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_follow_ups" ADD CONSTRAINT "review_follow_ups_later_doctor_id_doctors_id_fk" FOREIGN KEY ("later_doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tags" ADD CONSTRAINT "review_tags_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tags" ADD CONSTRAINT "review_tags_term_id_taxonomy_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_versions" ADD CONSTRAINT "review_versions_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_persona_id_personas_id_fk" FOREIGN KEY ("author_persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_branch_id_facility_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."facility_branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_artifacts" ADD CONSTRAINT "evidence_artifacts_item_id_evidence_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."evidence_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_artifacts" ADD CONSTRAINT "evidence_artifacts_superseded_by_id_evidence_artifacts_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."evidence_artifacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_custody_events" ADD CONSTRAINT "evidence_custody_events_item_id_evidence_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."evidence_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_uploaded_by_account_id_account_profiles_id_fk" FOREIGN KEY ("uploaded_by_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_hold_id_legal_holds_id_fk" FOREIGN KEY ("hold_id") REFERENCES "public"."legal_holds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_redactions" ADD CONSTRAINT "evidence_redactions_item_id_evidence_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."evidence_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_redactions" ADD CONSTRAINT "evidence_redactions_applied_to_artifact_id_evidence_artifacts_id_fk" FOREIGN KEY ("applied_to_artifact_id") REFERENCES "public"."evidence_artifacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_mentioned_persona_id_personas_id_fk" FOREIGN KEY ("mentioned_persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_persona_id_personas_id_fk" FOREIGN KEY ("author_persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_account_id_account_profiles_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_public_persona_id_personas_id_fk" FOREIGN KEY ("public_persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_case_id_moderation_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_appellant_account_id_account_profiles_id_fk" FOREIGN KEY ("appellant_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_decided_by_account_profiles_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_case_reasons" ADD CONSTRAINT "moderation_case_reasons_case_id_moderation_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_assigned_to_account_profiles_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_case_id_moderation_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_actor_account_id_account_profiles_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_account_id_account_profiles_id_fk" FOREIGN KEY ("reporter_account_id") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_deliveries" ADD CONSTRAINT "email_deliveries_account_id_account_profiles_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_account_id_account_profiles_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_notifications" ADD CONSTRAINT "staff_notifications_acked_by_account_profiles_id_fk" FOREIGN KEY ("acked_by") REFERENCES "public"."account_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_specialty_id_taxonomy_terms_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."taxonomy_terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_account_id_account_profiles_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "facility_reviews_branch_id_state_idx" ON "facility_reviews" USING btree ("branch_id","state");--> statement-breakpoint
CREATE INDEX "review_drafts_account_id_updated_at_idx" ON "review_drafts" USING btree ("account_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "review_follow_ups_review_id_dated_idx" ON "review_follow_ups" USING btree ("review_id","dated_year" DESC NULLS LAST,"dated_month" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reviews_doctor_id_state_idx" ON "reviews" USING btree ("doctor_id","state");--> statement-breakpoint
CREATE INDEX "reviews_branch_id_state_idx" ON "reviews" USING btree ("branch_id","state");--> statement-breakpoint
CREATE INDEX "reviews_author_persona_id_idx" ON "reviews" USING btree ("author_persona_id");--> statement-breakpoint
CREATE INDEX "evidence_artifacts_item_id_kind_page_no_idx" ON "evidence_artifacts" USING btree ("item_id","kind","page_no");--> statement-breakpoint
CREATE INDEX "evidence_items_review_id_group_idx" ON "evidence_items" USING btree ("review_id","group");--> statement-breakpoint
CREATE INDEX "evidence_items_state_idx" ON "evidence_items" USING btree ("state");--> statement-breakpoint
CREATE INDEX "evidence_items_retention_expires_at_idx" ON "evidence_items" USING btree ("retention_expires_at") WHERE "evidence_items"."hold_id" is null and "evidence_items"."state" = 'published';--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_target_account_unique" ON "reactions" USING btree ("target_kind","target_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_target_reporter_unique" ON "reports" USING btree ("target_kind","target_id","reporter_account_id");--> statement-breakpoint
CREATE INDEX "outbox_events_processed_at_created_at_idx" ON "outbox_events" USING btree ("processed_at" NULLS FIRST,"created_at");--> statement-breakpoint
CREATE INDEX "search_aliases_alias_key_trgm_idx" ON "search_aliases" USING gin ("alias_key" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "search_documents_kind_ref_id_unique" ON "search_documents" USING btree ("kind","ref_id");--> statement-breakpoint
CREATE INDEX "search_documents_tsv_idx" ON "search_documents" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "search_documents_key_nfc_trgm_idx" ON "search_documents" USING gin ("key_nfc" gin_trgm_ops);