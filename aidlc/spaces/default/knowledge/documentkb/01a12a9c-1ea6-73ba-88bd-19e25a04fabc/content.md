# Routes, contracts, ports and the command catalogue

This is the map between the prototype's hash routes and the product's URLs, the shape of every
contract, the ports adapters implement, and the catalogue of commands/queries each module exposes.
Task files reference entries here by name (e.g. "implement `review.publish`").

## 1. URL map

Locale prefix `/{locale}` is `en` or `bn`. The prototype hash is given for traceability; the render
function named is the component to port.

### Patient (`apps/web/src/app/[locale]/(patient)/`)

| URL | Prototype | Component (from) | Auth | Notes |
|---|---|---|---|---|
| `/` | `#discover` | `Discover` (`renderDiscover`) | public | hero search, browse, emergency panel |
| `/search?q=&tab=doctors|facilities&sort=relevance|volume|recent&specialty=&city=&sentiment=&outcome=&gender=&facilityType=&compare=a,b,c` | `#search` | `SearchResults` (`renderResults`), `CompareTray` (`renderTray`, max 3), compare sheet (`openCompare`) | public | server-rendered results; the module accepts more filters/tabs than the page renders (prototype shows two tabs and five filters; conditions/reviews tabs are a follow-up) |
| `/doctors` | `#doctors` | `DoctorIndex` (`renderDoctorIndex`) | public | |
| `/doctors/{publicId}[-slug]?condition=&outcome=&relationship=&docs=1` | `#doctors/d1` | `DoctorProfile` (`renderProfile`) | public, indexable | account filters as in the prototype's `data-pfilter`; claim sheet requires auth |
| `/facilities` | `#facilities` | `FacilityIndex` | public | |
| `/facilities/{publicId}` | `#facilities/f1` | `FacilityProfile` (`renderFacility`) | public | branch page; parent aggregates disclose denominators |
| `/topics` | `#topics` | `TopicIndex` | public | |
| `/topics/{publicId}` | `#topics/c1` | `ConditionPage` (`renderCondition`) | public | |
| `/experiences` | `#experiences` | `ExperienceIndex` | public | |
| `/experiences/{publicId}` | `#experiences/r1` | `ExperiencePage` (`renderAccount`), `Discussion` (`commentHtml`, `replyBox`), `EvidenceViewer` (`renderViewerBody`…), report sheet (`openReport`) | public read; write actions need verified account | 404 for hidden; tombstone view for `deleted_tombstone` |
| `/write?draft={id}&doctor={publicId}` | `#write` | `Composer` (`renderCompose`), `ComposerPreview` (`renderPreview`) | verified account | signed-out → callout with sign-in/register (spec §3.7) |
| `/me` | `#me` | `Workspace` (`renderMine`) | account | tabs published/drafts, preferences, feedback, data requests, appeal sheet (`openAppeal`) |
| `/me/security` | — | `SecuritySettings` | account | sessions, revoke-all, change password (auth spec §3.6) |
| `/saved` | `#saved` | `Saved` (`renderSaved`) | account | |
| `/notifications` | `#notifications` | `Notifications` (`renderNotifications`) | account | |
| `/authors/{username}` | `#authors/shirin_88` | `PublicProfile` (`renderPerson`) | public, `noindex` | allowlisted projection |
| `/emergency` | `#emergency` | `Emergency` (`renderEmergency`) | public | |
| `/about` | `#about` | `About` (`renderAbout`) | public | |
| `/terms`, `/privacy` | (about sections) | `Policy` | public | needed by registration; content = about-page policy sections + the FD-022 lawful-access sentence in Privacy only |
| `/register`, `/sign-in`, `/verify-email`, `/reset-password` | — | auth spec §3 | public | `noindex` |
| `/sign-out` | — | server action (POST only) | account | |

### Staff (`apps/web/src/app/[locale]/admin/`) — all `noindex`, all require `staffRole`, all render the Chart Tray layout

| URL | Prototype | Component | Role |
|---|---|---|---|
| `/admin` | — | redirect → `/admin/queue` | any staff |
| `/admin/queue?lane=` | `#queue` | `QueueView` (`renderQueue`, `queueBody`), `BulkToolbar`, bulk sheet (`openBulkSheet`) | any staff |
| `/admin/queue/{caseCode}` | (selected case) | `CaseTray` (`caseDetail`), `AuditTimeline` (`auditTimeline`) | any staff; reveal buttons by capability |
| `/admin/evidence` | `#evidence` | `EvidenceQuarantine` (`renderEvidence`) + hold/retention controls | any staff; original access by capability |
| `/admin/providers` | `#providers` | `Providers` (`renderProviders`) | admin, super_admin (moderator read-only) |
| `/admin/notifications` | `#notifications` | `StaffNotifications` (`renderNotifications`) | any staff |
| `/admin/config` | `#config` | `ConfigView` (`renderConfig`) + history + rollback | super_admin (others read-only) |
| `/admin/sign-in`, `/admin/approve-device` | — | auth spec §4 — live in the unguarded route group `admin/(public)/` | none |
| `/admin/security` | — | auth spec §4.3 | any staff |

### Route handlers (`apps/web/src/app/api/`)

| Path | Method | Purpose | Auth |
|---|---|---|---|
| `/api/auth/[...all]` | * | Better Auth handler | — |
| `/api/health` | GET | `{ ok, db, queue, mail, scanner }` — scanner reported, not required | none |
| (proxy) | — | `profile_redirects` lookup → 301 from an old public id after a merge | none |
| `/api/evidence/upload` | POST multipart (streamed) | `evidence.intake` per file; returns item ids and states | verified account |
| `/api/evidence/items/{id}/preview/{page}` | GET | author-only preview PNG of a `preview_ready` item | owner |
| `/api/evidence/artifacts/{artifactId}?download=1` | GET | **public artifacts only** (`public = true`), immutable cache headers; `download=1` adds `Content-Disposition: attachment` for the processed image | none |
| `/api/evidence/items/{id}/original` | GET | original bytes; requires `capability: originalEvidence` + `stepUp`; writes `original_accessed` custody + audit | staff |
| `/api/search/suggest?q=` | GET | ≤ 8 suggestions with kind + public id | none |
| `/api/data-requests/{id}/download` | GET | export zip | owner |
| `/api/demo/clock` | GET/POST | read/set `demo_clock` | `APP_MODE != production` only |
| `/manifest.webmanifest`, `/sw.js` | GET | PWA (T-501) | none |

## 2. Contracts

```ts
// contracts/actor.ts
export type StaffRole = 'super_admin' | 'admin' | 'moderator';
export type Capability =
  | 'reports.read' | 'content.act' | 'identity.reveal' | 'evidence.original'
  | 'providers.decide' | 'config.write' | 'retention.bulk' | 'holds.manage';
// super_admin: all. admin: reports.read, content.act, providers.decide, holds.manage (+ identity.reveal / evidence.original only if config enables). moderator: reports.read, content.act (+ the two toggles).

// contracts/errors.ts — ErrorCode (prefix.name). Each maps to `errors.<prefix>.<name>` in i18n.
'auth.invalid_credentials' | 'auth.email_unverified' | 'auth.rate_limited' | 'auth.token_invalid' | 'auth.token_expired'
| 'auth.step_up_required' | 'auth.device_unapproved' | 'auth.password_too_short' | 'auth.username_taken'
| 'auth.username_invalid' | 'auth.age_required' | 'auth.terms_required' | 'auth.account_suspended'
| 'forbidden' | 'not_found' | 'conflict' | 'validation' | 'rate_limited' | 'internal'
| 'review.min_fields' | 'review.attestation_required' | 'review.not_editable' | 'review.restore_expired'
| 'evidence.too_many' | 'evidence.too_large' | 'evidence.total_too_large' | 'evidence.type_rejected' | 'evidence.not_previewable' | 'evidence.confirmation_required'
| 'community.reply_depth' | 'community.blocked' | 'community.mention_anonymous'
| 'moderation.duplicate_report' | 'moderation.narrative_locked' | 'moderation.self_appeal_review'
| 'config.invariant' | 'config.out_of_range' | 'retention.preview_drift' | 'hold.active'

// AppError (01-conventions §3) also carries `retryAfterSec?: number` on rate-limit errors.

export interface PageMeta { cursor?: string; nextCursor?: string; total?: number; page?: number; pageSize?: number }
```

Every command input is a zod schema in `contracts/schemas/<module>.ts` named `<VerbNoun>Input`; every view model is a plain serialisable type in `contracts/view-models/`. View models never contain `accountId`, emails, private linkage, or original filenames.

## 3. Ports (`packages/application/src/ports/`)

| Port | Methods | Real adapter | Fake |
|---|---|---|---|
| `Clock` | `now(): Date` | `adapters/clock` (system + `demo_clock` offset) | `FakeClock.set()` |
| `IdGenerator` | `newId()`, `newPublicId()` | contracts/ids | deterministic sequence |
| `Crypto` | `encrypt(bytes)`, `decrypt(bytes)`, `hash(bytes)` (sha256), `randomToken()` | `adapters/crypto` | same, test key |
| `PasswordHasher` | `hash(pw)`, `verify(pw, phc)` | `@node-rs/argon2` (m=64 MiB, t=3, p=1 — benchmark in T-101) | fast fake |
| `Mailer` | `send({ to, category, messageKey, params, locale })` → `Result<{deliveryId}>` | `adapters/mail-smtp` (nodemailer → Mailpit) | records sends |
| `Storage` | `putQuarantine(stream, {itemId}) → key`, `getPrivate(key) → stream`, `putDerivative(bytes, meta) → key` (immutable), `head(key)`, `delete(key, {reason})` | `adapters/storage-fs` under `STORAGE_ROOT/{quarantine,private,public}` | in-memory map |
| `MalwareScanner` | `scan(stream) → {status:'clean'|'detected'|'unavailable', signatureVersion?}` | `adapters/scanner-clamd` (INSTREAM to `CLAMD_HOST:3310`, 30 s timeout) | scripted |
| `ImageSanitiser` | `sanitise(bytes, {maxPixels}) → {png: bytes, width, height, version}` | sharp: decode → strip metadata → re-encode PNG (or JPEG for photos > 2 MP) | passthrough |
| `PdfRasteriser`, `PdfAssembler` | **Phase 2** (FD-036) — see `07-phase-2-document-evidence.md`; not created in Phase 1 | — | — |
| `JobQueue` | `enqueue(name, payload, {key, retryLimit, startAfter})`, `work(name, handler)` | `database/queue` (pg-boss) | in-memory |
| `Outbox` | `append(tx, name, payload)` | `database` | list |
| `SearchIndex` | `upsert(doc)`, `remove(kind, refId)`, `search(query, filters, page)`, `suggest(q)` | `database/search` | naive in-memory |
| `RateLimiter` | `hit(key, limit, windowSec) → {allowed, retryAfter}` | in-memory sliding window (per process; enough for the demo), keys `action:account:<id>` or `action:net:<hash>` | always allowed |
| `Logger` | `info|warn|error(event, fields)` | pino-like JSON to stdout | collects |
| `ConfigProvider` | `current() → ConfigValues` | `database` (cached 5 s) | static |
| `AuditWriter` | `write(tx, {stream, action, actor, target, details})` | `database` | list |
| Repositories | one per module (`AccountRepository`, `IdentityRepository`, `DirectoryRepository`, `TaxonomyRepository`, `ReviewRepository`, `EvidenceRepository`, `CommunityRepository`, `ModerationRepository`, `NotificationRepository`, `ConfigRepository`, `RetentionRepository`, `DataRequestRepository`) | `database/repositories` | `test-support/fakes` |

## 4. Command and query catalogue

Format: `name` — input → output · requires · audit stream · notes. "→ outbox" lists events appended.

### account (T-101, T-102, T-103, T-105)

- `account.register` — `{email, password, username, displayName, locale, ageConfirmed, termsAccepted}` → `{accountId}` (**same success shape even if the email exists** — the existing owner gets a "someone tried to register" security email instead) · anonymous · rate 5/hour/network · `account:<id>` · creates auth user via Better Auth, `account_profiles`, preferences, then calls `identity.createDefaultPersonas` (named + pseudonymous); enqueues verification mail → outbox `account.registered`
- Rate limits (all via the RateLimiter port; keys `action:account:<id>` or `action:net:<hash>`): sign-in **6 failures per 15 min per email+network key** (the 7th attempt is refused even with the right password until the window passes), sign-up 5/hour/network, reset request 3/hour/email, resend verification 3/hour/email, step-up 5 failures/15 min/account
- `account.resendVerification` — `{email}` → `{}` · anonymous · rate limit 3/hour/email
- `account.verifyEmail` — `{token}` → `{}` · anonymous · sets `status active`, signs the user in
- `account.signIn` — via Better Auth; application hook maps session → Actor; refuses `suspended|banned`; `restricted` may sign in but commands check `notRestricted`
- `account.signOut`, `account.signOutEverywhere` — revokes sessions · `account:<id>`
- `account.requestPasswordReset` — `{email}` → `{}` (always) · rate limited
- `account.resetPassword` — `{token, newPassword}` → `{}` · rotates password, revokes all sessions, security email
- `account.changePassword` — `{currentPassword, newPassword}` · account · revokes other sessions
- `account.listSessions` (query) → `[{id, current, label, firstSeen, lastSeen}]`
- `account.updatePreferences` — `{interfaceLocale?, emailSecurity?, emailModeration?, emailEvidence?, emailDiscussion?}`
- `account.submitFeedback` — `{body}` · account · rate 5/day
- `account.stepUp` — `{password}` → `{rechecked_at}` · account · sets a 5-minute signed step-up cookie; audit `account:<id>` action `step_up`
- `staff.beginDeviceApproval` — `{deviceSecret}` (from cookie or newly minted) → `{}` · staff after credential check · emails approval link (30 min)
- `staff.approveDevice` — `{token, password}` → `{}` · marks device approved; audit
- `staff.listDevices` (query), `staff.revokeDevice` — `{deviceId}`
- `staff.setStaffRole` — `{accountId, role|null}` · super_admin + stepUp · seed only for the demo plus the config route

### identity (T-104)

- `identity.personaFor` (query) — `{accountId, reviewId?, mode}` → `{personaId}` · internal · creates the thread-scoped anonymous persona on first use
- `identity.publicProjection` (query) — `{personaId}` → `{displayName, username?, kind, avatarHue}`
- `identity.reveal` — `{targetKind, targetId, reason}` → `{accountId, username, email?}` · `capability: identity.reveal` + `stepUp` · `identity` · **every** call, granted or refused, writes `identity_reveals` + audit + staff notification `identityReveal` (refusals are recorded through the command's `onRefused` hook, 01-conventions §3)
- `identity.createDefaultPersonas` (internal) — `{accountId, username, displayName}` → `{namedPersonaId, pseudonymousPersonaId}` · called by `account.register`
- `identity.accountsOf` (query, **private**) — used only by data-requests and moderation enforcement

### directory (T-201, T-204)

- Queries: `directory.getDoctor` `{publicId, condition?, outcome?, relationship?, docs?}` → `DoctorProfileVM` (fields omitted when empty; `provenance` per field; chambers; `avatarHue`; `registrationNotVerified: true` always; account list filtered by the four params); `directory.listDoctors` `{page, filters}`; `directory.getFacility` `{publicId}` → branch VM with parent + sibling branches; `directory.listFacilities`; `directory.doctorsAtBranch`; `directory.facilitiesForDoctor`
- `directory.submitProfile` — `{kind, payload}` → `{submissionId}` · verified · rate 5/day · duplicate check by `bmdc_key`/`name_key` fills `duplicate_of_id` → staff notification `newProfile`; claims raise `claim`; protected field changes raise `protectedChange`
- Staff queries: `directory.listSubmissions`, `directory.listClaims`, `directory.listFieldChanges` (`{status, page}`) — consumed by T-407
- `directory.decideSubmission` — `{submissionId, decision: approve|reject|merge, mergeIntoId?, reason}` · `providers.decide` · `providers` · approve creates the doctor/facility `published`; merge records `profile_merges` + `profile_redirects` and unblocks drafts with `blocked_on_submission_id`
- `directory.claimProfile` — `{targetKind, targetId, method, evidenceNote}` · verified · claims never grant control over accounts
- `directory.decideClaim` — `{claimId, decision, reason}` · `providers.decide`
- `directory.proposeFieldChange` — `{targetKind, targetId, field, newValue}` · claimant or staff · protected fields (`name`, `bmdc_number`) always `pending`; others by claimant apply immediately with `provenance provider`
- `directory.decideFieldChange` — `{changeId, decision, reason}` · `providers.decide`

### taxonomy (T-201)

- Queries: `taxonomy.getCondition` `{publicId}` → `ConditionPageVM` (spread of sentiment/outcome across all accounts tagged, medicines/treatments/symptoms mentioned with counts, doctors written about, facilities, districts); `taxonomy.listConditions`; `taxonomy.resolve` `{text}` → `{termId?, matchedAlias?, provisional?}`
- `taxonomy.listSuggested` (query) — `{group}` → the suggested terms per tag group (the prototype's hard-coded `TAG_GROUPS`, app.js ≈ 1314–1330, become seeded `taxonomy_terms` flagged `suggested = true` in T-007; owned by T-201)
- `taxonomy.createProvisional` — `{kind, text, lang}` → `{termId}` · verified · used by the composer for unmapped tags
- `taxonomy.mapProvisional` — `{termId, canonicalId}` · admin · original wording stays on reviews; search redirects

### search (T-205)

- `search.query` (query) — `{q, tab, sort, filters (specialty, condition, city, sentiment, outcome, hasEvidence, gender, language, facilityType), page}` → `{results, resolvedNote?: {original, resolvedTo, kind: 'banglish'|'alias'|'typo'}, keepOriginalUrl}` · public · **no** sentiment/outcome/evidence/reaction boost; exact native-script match > alias > fuzzy; then relevance | accounts_count | recent_at
- `search.suggest` — `{q}` → `[{kind, publicId, title}]` (≤ 8)
- job `search.refresh` — `{kind, refId}`

### review (T-301, T-302, T-306, T-307)

- `review.saveDraft` — `{draftId?, payload}` → `{draftId, expiresAt}` · verified · payload encrypted; 30-day expiry; blocked flag when `doctor` is a pending submission
- `review.getDraft` (query) · owner
- `review.publish` — `{draftId, identityMode, attestation: true}` → `{publicId}` · verified + notRestricted + rate 5/day · `review:<id>` · minimum fields: doctor, short experience (quick) or ≥ 1 section (detailed), relationship, ≥ 1 tag or `notSure`; optional sentiment/outcome/claims/evidence; evidence items referenced must be `privacy_confirmed` (others stay private and do not block text) → outbox `review.published`
- `review.preview` (query) — `{draftId}` → the **exact** `ExperiencePageVM` the public would see
- `review.addFollowUp` — `{reviewId, kind, datedYear, datedMonth, body, laterProvider?}` · owner · sets `latest_status`; version bump → outbox `review.changed`
- `review.correct` — `{reviewId, fields}` · owner · material edit creates `review_versions` row + dated correction entry; if discussion exists the public page shows "edited {date}"
- `review.delete` — `{reviewId}` · owner · tombstone if comments exist, else soft delete; `restore_until = now + 30 d` → outbox `review.deleted`
- `review.restore` — `{reviewId}` · owner within window · `review.restore_expired` after
- Ownership note: `review.sentimentDistribution`, `review.outcomeDistribution`, `review.criteriaDistribution`, `review.listExperienceCards` and `domain/review/policies.ts` (`distribution`, `isLimitedData`) are created by **T-201** (the directory pages need them first); T-301 extends but may not rewrite them.
- Queries: `review.getExperience` `{publicId}` → `ExperiencePageVM` (thirteen sections; `Not provided` semantics; follow-ups ordered by date desc with latest at top; related by condition); `review.listExperiences`; `review.forDoctor`, `review.forBranch`, `review.forCondition`; `review.sentimentDistribution(doctorId)`, `review.outcomeDistribution(doctorId)` → `{counts: {positive, mixed, negative}, total, limitedData}`; `review.criteriaDistribution(branchId)`
- `facilityReview.publish` / `.delete` / `.restore` — same shape with `criteria`

### evidence (T-303, T-304, T-305, T-309)

- `evidence.intake` — stream + `{reviewDraftId, group, declaredMime, declaredName, bytes, idempotencyKey}` → `{itemId, state:'quarantined'}` · verified · limits: 10 per draft, 15 MB each, 100 MB total; extension ∈ {jpg, jpeg, png} and declared MIME ∈ {image/jpeg, image/png} (**images only in Phase 1**, FD-036; anything else → `evidence.type_rejected` before storage); writes custody `received`; enqueues `evidence.process`
- job `evidence.process` — `{itemId}` (worker): `validating` (magic bytes via file-type must be `image/jpeg`/`image/png` and match declared; ≤ 40 MP) → `scanning` (scanner: `unavailable` ⇒ custody `scan_unavailable`, retry with backoff, **state stays**; `detected` ⇒ `failed(malware)`) → `sanitising` (sharp: orientation applied, metadata stripped, re-encoded) → `preview_ready` (one `page_png` + `thumbnail`, `public = false`) → notification `evidence` to author; any failure ⇒ `failed(reason)` + notification with replace/remove guidance; bounded: 120 s per item, retryLimit 3
- `evidence.applyRedaction` — `{itemId, pageNo, rects}` · owner · flattens black rectangles into a **new** page artifact (old kept private), custody `redaction_applied`
- `evidence.confirmPrivacy` — `{itemId, confirmed: true}` · owner · `privacy_confirmed` (Phase 2 adds derivative-PDF assembly here)
- `evidence.publish` (internal, called by `review.publish`) — marks artifacts `public`, sets `retention_expires_at = now + originalDays`, custody `published`
- `evidence.remove` — `{itemId}` · owner (`preview_ready|failed|privacy_confirmed`) or moderator `removeFile` · `removed`
- `evidence.getForAuthor` (query) `{draftId}` → items with states, fail reasons, preview page urls
- `evidence.listForStaff` (query) `{state?, page}` → quarantine rows with stages (from custody events), retention expiry, hold, fail reason — consumed by T-407
- `evidence.getPublic` (query) `{reviewId}` → groups → items → `{pages: [{artifactUrl, width, height}], downloadUrl (processed image, attachment disposition), label, pageCount (1)}` — **only** `published`
- `retention.currentPolicy` (query); `retention.setPolicy` — `{originalDays, auditDays, reason}` · `config.write` + stepUp · prospective; `retention.previewBulk` — `{fromDays, toDays}` → `{count, sampleIds, previewToken}`; `retention.executeBulk` — `{previewToken, reason, idempotencyKey}` · `retention.bulk` + stepUp · `retention.preview_drift` if the affected set changed
- `hold.place` — `{targetKind, targetId, reason, expiresAt?}` · `holds.manage` · custody `hold_placed`; `hold.release` — `{holdId, reason}`
- job `retention.expire` — hourly: originals past `retention_expires_at` without an active hold → delete original artifact, `original_expired`; audit rows past `audit_days`; notifications past 90 d
- `evidence.readOriginal` — `{itemId, reason}` · `evidence.original` + stepUp · custody `original_accessed` + audit + staff notification

### community (T-401, T-402)

- `comment.post` — `{reviewId, parentId?, body}` → `{publicId}` · verified + notRestricted + not blocked by the author · rate 30/hour · one reply level (`community.reply_depth`); mentions parsed `@username` → `comment_mentions` (anonymous personas refused); `has_external_link` flags the warning → outbox `comment.posted` (notification `discussion` to the review author and mentioned users, unless blocked)
- `comment.edit` — `{commentId, body}` · owner · sets `edited_at`
- `comment.delete` — `{commentId}` · owner · tombstone if replies exist
- `reaction.set` — `{targetKind, targetId, value|null}` · verified · rate 100/hour · idempotent upsert; `public_persona_id` null when the actor is anonymous on that thread
- `block.set` / `block.unset` — `{username}` · account
- Queries: `community.thread` `{reviewId}` → comments with replies, tombstones, `(edited)`, reaction counts, `mine` flags; `community.reactionsOf` → counts only (no lists for anonymous)

### moderation (T-403, T-404)

- `report.file` — `{targetKind, targetId, reason, detail, evidenceNote}` → `{}` · verified · `moderation.duplicate_report` on repeat by same account (no increment) · creates/updates case: `distinct_reporters += 1`; if reason critical ⇒ `hidden_pending_review` immediately, lane `critical`; else if `distinct_reporters >= thresholds.fiveAccountHide` and reason ≠ `factual` ⇒ `hidden_pending_review` once, lane `standard`; `coordinated_signal` when ≥ 3 reports within 10 min from accounts created < 24 h ago; audit `case:<code>` action `report` (actor opaque `reporter:restricted` in the timeline); staff notification `newReport`
- `moderation.queue` (query) `{lane?, status?, page}` → cases with age, report count, auto-hidden flag, reasons; SLA due from config
- `moderation.case` (query) `{code}` → `CaseTrayVM` (summary, note, reasons, coordinated, target excerpt, **reporter = restricted**, evidence gate state, decisions, audit timeline last 10)
- `moderation.decide` — `{caseCode, action, reasonCode, reasonToAuthor, policyVersion}` · `content.act` (`restrict|suspend|ban` need admin+) · `case:<code>` · applies public effect through the owning module's command (`review.setState`, `comment.setState`, `evidence.remove`, `review.redact` = versioned removal of identifiers only — body edits beyond redaction refused with `moderation.narrative_locked`); notification `moderation` to the affected author with action + policy reason + appeal route, **never** reporter identity
- `moderation.restore` — `{caseCode, reasonCode}` · `content.act`
- `appeal.file` — `{caseCode, text}` · affected author · lane `appeals`, `due_at = now + appealDays`
- `appeal.decide` — `{appealId, status: upheld|changed, reason, checklist}` · super_admin (the founder conducts Phase 1 appeals, `docs/scope-of-work.md` §6) and `decided_by ≠ original actor` (`moderation.self_appeal_review`); a moderator's `freshReview` audit row (as in the seed) is a checklist step, not the decision
- `moderation.myAppealable` (query) — cases where the actor is the affected author and an appeal is still possible (feeds the workspace appeal sheet)
- `moderation.bulkPreview` — `{caseCodes[], action}` → `{affected: [...], previewToken}`; `moderation.bulkApply` — `{previewToken, reasonCode, idempotencyKey}` · drift warning when set changed
- `moderation.revealReporter` — `{caseCode, reason}` · `identity.reveal` + stepUp → via `identity.reveal`

### notification (T-405)

- `notification.list` (query) `{cursor}` → items; `notification.markRead` `{ids|all}`; `notification.unreadCount`
- worker: outbox relay → `notification.deliver` job: insert `notifications` (dedupe_key = `<event>:<targetId>:<accountId>`), and `email_deliveries` when category allowed by preferences (verification, reset, security, device approval, deletion are always allowed)
- `staffNotification.list` `{cursor?, limit ≤ 50, unackedOnly?}` → `{items, nextCursor}`; `staffNotification.ack` `{id}` · staff

### administration (T-105, T-408)

- `config.current` (query) → `ConfigValues` + version; `config.history` (query) → versions with change rows
- `config.propose` — `{values}` → `{diff, validation}` (preview only)
- `config.apply` — `{values, reason, expectedVersion}` · `config.write` + stepUp · `config` · validates ranges (`fiveAccountHide 2–50`, `criticalHours 1–168`, `standardDays 1–30`, `appealDays 1–30`, `originalDays 1–retention max 3650`, `auditDays 30–3650`, `limitedDataThreshold 1–50`); rejects any key outside the schema (`config.invariant`); optimistic concurrency (`conflict`)
- `config.rollback` — `{toVersion, reason}` · `config.write` + stepUp · creates a new version copying old values
- `adminNavCounts` (query) · staff → `{queue: open cases, critical: open critical cases, evidence: items not published/removed, providers: pending submissions + claims + protected changes, notifications: unacked staff notifications}` — feeds the console nav (T-406)

### data-requests (T-410)

- `dataRequest.export` — `{idempotencyKey}` → `{requestId}` · account · job `data.export` builds a zip (profile, preferences, reviews incl. drafts decrypted, comments, reactions, bookmarks, notifications, evidence **derivatives** only) → `ready` + notification + email
- `dataRequest.delete` — `{idempotencyKey, password}` → `{requestId, plan}` · account + stepUp · plan per module: `account: delete`, `identity: deidentify` (personas keep snapshot text but link rows removed), `review: tombstone if discussion else delete`, `community: tombstone`, `evidence: retain_under_hold if hold else delete originals now + derivatives with the review`, `notification: delete`, `search: remove` · executed by job `data.delete` step by step; each step idempotent; partial failure recorded and retried
- `dataRequest.status` (query)

## 5. Outbox events and jobs

| Event (outbox) | Payload (ids only) | Consumers (jobs) |
|---|---|---|
| `account.registered` | accountId | `mail.send` (verification) |
| `account.securityEvent` | accountId, kind | `notification.deliver`, `mail.send` |
| `review.published` / `review.changed` / `review.hidden` / `review.restored` / `review.deleted` | reviewId, doctorId, branchId? | `search.refresh`, `notification.deliver` |
| `doctor.changed` / `facility.changed` / `term.changed` | id | `search.refresh` |
| `evidence.received` | itemId | `evidence.process` |
| `evidence.stateChanged` | itemId, state | `notification.deliver` |
| `comment.posted` / `comment.changed` | commentId, reviewId | `notification.deliver` |
| `report.filed` / `case.decided` / `appeal.decided` | caseCode | `notification.deliver` (staff + user) |
| `config.applied` / `hold.changed` / `retention.policyChanged` | version / holdId | audit only |
| `dataRequest.created` | requestId | `data.export` / `data.delete` |

Jobs: `evidence.process`, `search.refresh`, `notification.deliver`, `mail.send`, `retention.expire` (cron hourly), `outbox.relay` (every 2 s), `data.export`, `data.delete`. All handlers idempotent by `singletonKey`.

## 6. View models (names; fields are derived from what the prototype renders)

`DiscoverVM`, `SearchResultsVM`, `DoctorCardVM`, `DoctorProfileVM`, `FacilityCardVM`, `FacilityProfileVM`, `ConditionPageVM`, `ExperienceCardVM`, `ExperiencePageVM`, `ThreadVM`, `EvidenceGroupVM`, `ViewerDocVM`, `ComposerVM` (doctors list, tag groups, draft), `PreviewVM = ExperiencePageVM`, `WorkspaceVM`, `SecurityVM`, `NotificationVM`, `PublicProfileVM`, `QueueVM`, `CaseTrayVM`, `QuarantineVM`, `ProvidersVM`, `StaffNotificationsVM`, `ConfigVM`.

Each VM file starts with a comment naming the prototype function whose output it replaces and the
`RK.*` fields it maps from; T-003 creates the types with `// TODO(T-xxx)` markers where the owning
task will fill details, so later tasks change the VM file they own and nothing else.
