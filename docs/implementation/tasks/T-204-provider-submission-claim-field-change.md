# T-204 — Provider submission, claim, field change, merge (commands + patient entry points)

| Field | Value |
|---|---|
| Story | STORY-DIR-002 |
| Phase / Lane | 2 / A |
| Class → model | M1 → Claude Sonnet 5 (alternate GPT-5.6 Terra); validator: the other vendor's mid-tier |
| Effort setting | `high` |
| Estimate | 3–4 h agent; validation 1 h |
| Depends on | T-201 (directory module + repositories), T-101 (verified actor, `requires`), T-103 (staff capabilities `providers.decide`), T-105 (audit writer conventions) |
| Parallel-safe with | T-202, T-203, T-206, T-207 (lane B); **not** T-205 (touches `directory` outbox events) — merge T-204 before T-205 starts, or coordinate the `doctor.changed` event name (already fixed in 03 §5) |

## Goal

Contributors can add a doctor or facility that is not in the directory (from the composer), doctors
and facilities can claim their profile, claimants and staff can propose field changes, and staff can
approve, reject or merge — with stable links (redirects), audit history, and drafts unblocked when
their pending profile is approved. The staff **UI** is T-407; this task exposes the staff decisions as
server actions and tests them.

## Read first

1. `docs/implementation/01-conventions.md` §3, §5, §10, §11
2. `docs/implementation/02-data-model.md` §4 (`profile_submissions`, `profile_claims`, `profile_field_changes`, `profile_redirects`, `profile_merges`, `doctors.merged_into_id`, `field_provenance`), §6 (`review_drafts.blocked_on_submission_id`), §9 (`audit_events`), §12 (`staff_notifications`, `outbox_events`), §17
3. `docs/implementation/03-routes-and-contracts.md` §2 (Capability), §4 "directory" commands, §5 events (`doctor.changed`, `facility.changed`)
4. Prototype: composer add-a-doctor panel `app.js` 1395–1412 (fields `ad-name`, `ad-bmdc`, `ad-spec`, `ad-cham`; keys `compose.addDoctor`, `compose.addName`, `compose.addBmdc`, `compose.addSpecialty`, `compose.addChamber`, `compose.addSubmit`, `compose.addPending`); claim stub `app.js` 2549 + key `profile.claimNote`; staff providers view `ui-design-prototype/admin/app.js` 451–525 (`pending`, `claims`, `fieldChanges`; keys `admin.newProfiles`, `admin.possibleDup`, `admin.merge`, `admin.approve`, `admin.reject`, `admin.claims`, `admin.protectedFields`, `admin.wasNow`, `admin.done.*`) and the fixture `RK.moderation.providers` in `rogikotha-data.js` (P-140 duplicate of d2 by BMDC; P-143 clean; C-58 claim on d5; two field changes)
5. `docs/planning/08-product-backlog.md` STORY-DIR-002 acceptance

## Owned paths

- `packages/domain/src/directory/{submission.ts,submission-state.ts,claim.ts,field-change.ts,merge.ts}` (+ tests)
- `packages/application/src/modules/directory/commands/*.ts`, `…/directory/authorization.ts`
- `packages/application/src/ports/repositories/directory.ts` — **add** write methods (do not change T-201's read signatures)
- `packages/database/src/repositories/directory.ts` — write methods; `packages/database/src/repositories/review.ts` — `unblockDraftsFor(submissionId)` only
- `packages/contracts/src/schemas/directory.ts`
- `apps/web/src/server/actions/directory.ts` (server actions: `submitProfileAction`, `claimProfileAction`, `proposeFieldChangeAction`, `decideSubmissionAction`, `decideClaimAction`, `decideFieldChangeAction`)
- `apps/web/src/components/patient/AddDoctorPanel.tsx` (client), `apps/web/src/components/patient/ClaimSheet.tsx` — **replace** T-202's stub body with the real form + action
- `apps/web/src/proxy.ts` (Next 16 name for middleware) — only the `profile_redirects` branch; if T-008 already created the file, add a clearly delimited block
- `packages/i18n/messages/{en,bn}.json` — new keys listed in step 7

## Not in scope

- Staff providers page rendering (T-407). Composer (T-306) — this task delivers `AddDoctorPanel` as a standalone component with its own action; T-306 mounts it.
- Photo upload for profiles (backlog "photo/source approval") — Phase 1 demo omits profile photos; avatars are generative.
- Automated registry scrape, BMDC verification.

## Steps

1. **Domain.** `submission-state.ts`: `pending → approved | rejected | merged`; `claim`: `pending → approved | rejected`; `field-change`: `pending → approved | rejected`, and `isProtectedField(kind, field)` = `doctor: name_en, name_bn, bmdc_number`; `facility: name_en, name_bn`. `merge.ts`: pure `planMerge(source, target)` returning what transfers (chambers appended, reviews re-pointed, aliases merged, `field_provenance` of target kept, source `state = 'rejected'`, `merged_into_id = target`). `duplicateCandidates(payload, existing)` compares `bmdc_key` equality first, then `name_key` equality.
2. **Schemas.** `SubmitProfileInput` `{kind: 'doctor'|'facility', payload: {nameEn?, nameBn?, bmdc?, specialty?, chamber?, city?, area?, type?}}` — at least one of `nameEn`/`nameBn` required; `ClaimProfileInput` `{targetKind, targetPublicId, method (≤200), evidenceNote (≤2000)}`; `ProposeFieldChangeInput` `{targetKind, targetPublicId, field, newValue}`; `DecideSubmissionInput` `{submissionId, decision: 'approve'|'reject'|'merge', mergeIntoPublicId?, reason (≤500)}`; `DecideClaimInput`, `DecideFieldChangeInput` `{id, decision, reason}`.
3. **Commands** (`requires` per catalogue):
   - `directory.submitProfile` — verified, notRestricted, rate `directory.submit:account:<id>` 5/day. Runs `duplicateCandidates` → `duplicate_of_id`; inserts `pending`; audit `directory` action `profile_submitted` (details: kind, submissionId, duplicateOf?); staff notification kind `claim`? **No** — use `staff_notifications.kind = 'evidence'`? Neither fits; add enum value `newProfile` to `staff_notification_kind` in `contracts/enums.ts` and the DB enum via a new migration `00xx_staff_notification_new_profile.sql` (record in hand-off). Returns `{submissionId}`.
   - `directory.decideSubmission` — `capability: providers.decide`. `approve`: create the doctor/facility(+primary branch) `published` with `field_provenance = community` for every supplied field, `public_id` new; outbox `doctor.changed`/`facility.changed`; `unblockDraftsFor(submissionId)` sets `review_drafts.doctor_id` and clears `blocked_on_submission_id`; notification `draft` to each affected draft owner (`message_key = notif.draft.profileReady`). `reject`: state + reason; notification to submitter (`notif.draft.profileRejected`) and drafts stay blocked. `merge`: requires `mergeIntoPublicId`; executes `planMerge` in one transaction, writes `profile_merges`, `profile_redirects(from_public_id → to)`, outbox for both ids, unblocks drafts onto the target. Audit action `submission_decided` with `{decision, submissionId, createdId?, mergedInto?}`.
   - `directory.claimProfile` — verified; one open claim per (target, account); audit; staff notification `claim`.
   - `directory.decideClaim` — `providers.decide`; approve sets `claimed_by_account_id`, notification `notif.claim.approved`; reject → `notif.claim.rejected`.
   - `directory.proposeFieldChange` — actor is claimant of the target **or** staff with `providers.decide`; protected field or non-claimant-staff → row `pending` + staff notification `protectedChange`; unprotected field by claimant → applied immediately with `field_provenance[field] = {source:'provider', updated_at}` and the row stored `approved` for history; outbox `*.changed`.
   - `directory.decideFieldChange` — `providers.decide`; approve applies with provenance `admin` (staff-checked) or `provider` (claimant-proposed) — store which in `reason`; reject leaves the value.
4. **Redirect proxy.** In `apps/web/src/proxy.ts`, for paths matching `/{locale}/(doctors|facilities)/{publicId}`, look up `profile_redirects` (via a small edge-safe fetch to `/api/internal/redirect?…` **or** do the lookup in the page with `redirect()` — choose the page-level lookup from T-201's `directory.resolvePublicId`; the proxy branch is then unnecessary. Decide, document in hand-off; the acceptance check only requires the 301).
5. **Server actions** — thin: parse → `getActor()` → command → `Result`. Staff decisions live in the same file with `requires` enforced by the command, not the action.
6. **`AddDoctorPanel`** — port `#add-doctor-panel`: the `link-btn` `compose.addDoctor` toggles a `.callout` with four fields (`compose.addName`, `compose.addBmdc`, `compose.addSpecialty`, `compose.addChamber`), `.btn.small` `compose.addSubmit`, note `compose.addPending`. On success it emits `onSubmitted(submissionId)` so the composer can store `blocked_on_submission_id` and render the "waiting for a doctor profile" draft state (`mine.*` copy is T-409's). Signed-out → auth gate.
7. **`ClaimSheet`** real body: method field (`claim.method` — new key: "How can we reach you to confirm?" / "নিশ্চিত করতে আপনার সঙ্গে কীভাবে যোগাযোগ করব?"), evidence note (`claim.evidenceNote` — "Anything that helps us check (kept private)" / "যাচাইয়ে সাহায্য করে এমন কিছু (গোপন থাকবে)"), submit `claim.submit` ("Send claim" / "দাবি পাঠান"), success `claim.sent` ("Claim received. We will check it and let you know." / "দাবি পাওয়া গেছে। আমরা যাচাই করে জানাব।"). Also `notif.draft.profileReady` ("The doctor you wrote about is now in the directory. Your draft is ready to finish." / "আপনি যে ডাক্তারকে নিয়ে লিখেছেন তিনি এখন ডিরেক্টরিতে আছেন। আপনার খসড়া শেষ করার জন্য প্রস্তুত।"), `notif.draft.profileRejected` ("The profile you submitted was not added: {reason}" / "আপনার জমা দেওয়া প্রোফাইল যোগ করা হয়নি: {reason}"), `notif.claim.approved` ("Your profile claim was approved. You can now correct the facts." / "আপনার প্রোফাইল দাবি অনুমোদিত হয়েছে। এখন তথ্য সংশোধন করতে পারবেন।"), `notif.claim.rejected` ("Your profile claim was not approved: {reason}" / "আপনার প্রোফাইল দাবি অনুমোদিত হয়নি: {reason}"), `admin.notif.kind.newProfile` ("New profile submission" / "নতুন প্রোফাইল জমা").
8. Tests, `pnpm check`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Duplicate detection | `pnpm vitest run -t "duplicate"` | submitting BMDC `A-38054` (seed P-140 case) yields `duplicate_of_id = d2` |
| Merge transfers and redirects | `pnpm vitest run packages/database -t "merge"` | source chambers appended to target, source reviews now `doctor_id = target`, `profile_redirects` row exists, `GET /en/doctors/{oldId}` → 301 `{newId}`, `profile_merges.transferred` lists counts |
| Draft unblocked | `pnpm vitest run -t "unblock"` | a draft with `blocked_on_submission_id` gets `doctor_id` set on approve/merge and its owner receives a `draft` notification |
| Protected field pends | `pnpm vitest run -t "protected"` | claimant changing `bmdc_number` → `pending` + staff notification; changing `fee_display_en` → applied with provenance `provider` |
| Authorization | `pnpm vitest run -t "forbidden"` | moderator calling `decideSubmission` → `forbidden`; non-claimant calling `proposeFieldChange` → `forbidden`; unverified `submitProfile` → `auth.email_unverified` |
| Rate limit | `pnpm vitest run -t "rate"` | 6th submission in a day → `rate_limited` |
| Audit | `pnpm vitest run -t "audit"` | every command writes one `audit_events` row with allowlisted details (no free text of the payload) |
| Claim never controls reviews | `pnpm vitest run -t "claim grants"` | approved claimant cannot call any `review.*` command on reviews about them (assert `forbidden`) |
| Full check | `pnpm check` | green |

## Tests to write

- domain: state tables; `isProtectedField`; `planMerge` (idempotent on re-run; refuses self-merge; refuses merging into a `merged_into_id` doctor — must chase to the final target or reject with `conflict`).
- application with fakes: each command × (allowed actor, refused actor); duplicate detection; unblocking; notifications/outbox appended.
- database: merge transaction atomicity (inject a failure after chambers copy → nothing committed); redirect lookup.
- component: `AddDoctorPanel` toggle + submit + pending note; `ClaimSheet` gate for signed-out.

## Hard-rule checklist

- [ ] Every doctor created by approve/merge still renders "Registration not verified" (no verified flag introduced).
- [ ] Field provenance recorded per field (`community` / `provider` / `admin`) — never silently overwritten.
- [ ] Claim evidence note stays private (no VM exposes it; staff VM in T-407 will read it through a staff-only query).
- [ ] Redirects never point at a rejected profile (test: reject after merge attempt).
- [ ] Audit rows for all six commands; details allowlisted.
- [ ] Rate limits per account (5/day submissions).
- [ ] Both locales for the new keys.
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
