# API Documentation: rogikotha

## External Surface (built)

| Kind | Path or name | Behaviour | Auth |
|---|---|---|---|
| Route handler | `GET /api/health` | Returns `{ok: true, db, queue, mail, scanner: 'unknown', mode: APP_MODE}`; the probes are static | none |
| Server action | `setLang(locale)` | Sets the `rk.lang` cookie, revalidates the layout | none |
| Server action | `setTheme(theme)` | Sets or deletes the theme cookie | none |
| Server action | `setMotion(motion)` | Sets the motion cookie | none |
| Pages | `/{en,bn}/…` | 34 locale pages; route list and placeholder owners in `code-structure.md` | none (no session exists) |

The proxy (`apps/web/src/proxy.ts`) matches everything except `api`, `_next` and files with an extension. It adds the `x-pathname` header and delegates to next-intl (prefix `always`, cookie `rk.lang`).

## Command Contracts (designed, not implemented)

The zod input schemas in `packages/contracts/src/schemas/` are the contract for every planned command. No command, route or action consumes them yet. The ones the demo slice needs:

| Command (module) | Schema | Notes |
|---|---|---|
| `account.register` | `RegisterInput` (email, password ≥ 10, username `[a-z0-9_]{3,24}`, displayName, locale, ageConfirmed, termsAccepted) | A false confirmation is refused by the command, not by the schema |
| `account.verifyEmail`, `resendVerification` | `VerifyEmailInput`, `ResendVerificationInput` | |
| `account.signIn` | none | Handled by Better Auth directly |
| `account.signOut` | `SignOutInput` | |
| `account.updatePreferences` | `UpdatePreferencesInput` (interfaceLocale, four email flags) | No schema exists for a display-name change |
| `identity.createDefaultPersonas` | `CreateDefaultPersonasInput` | |
| `directory.getDoctor`, `listDoctors` | `GetDoctorInput`, `ListDoctorsInput` | |
| `review.saveDraft`, `getDraft` | `SaveDraftInput` (`payload: unknown`), `GetDraftInput` | The payload shape is owned by T-301/T-306 |
| `review.publish` | `PublishReviewInput` (draftId, identityMode, `attestation: true`) | |
| `review.correct` | `CorrectReviewInput` (`fields: unknown`) | The edit path; the shape is owned by T-301 |
| `review.getExperience` | `GetExperienceInput` (publicId) | |
| `evidence.intake` | `IntakeEvidenceInput` | JPEG and PNG only (FD-036) |
| `evidence.publish`, `remove`, `getForAuthor`, `getPublic` | matching `*Input` | |
| `comment.post`, `edit`, `delete` | `CommentPostInput` (reviewId, parentId?, body ≤ 4000), `CommentEditInput`, `CommentDeleteInput` | One reply level, enforced by a trigger |
| `community.getThread` | `GetThreadInput` | |

View models for the responses are in `packages/contracts/src/view-models/` (for example `experience.ts`, `thread.ts`, `composer.ts`, `doctor.ts`, `public-profile.ts`). `ComposerVM.payload` is still `unknown`.

## Internal Interfaces

### Repositories (`packages/database/src/repositories/`)

All are classes without an `implements` clause; method bodies throw `NotImplemented('<task>')` unless marked real.

| Class | Stub methods | Owning tasks | Demo-relevant methods |
|---|---|---|---|
| `PgAccountRepository` | 16 | T-101, T-103, T-401, T-409 | `findByAuthUserId`, `findByUsername`, `createProfile`, `updateStatus` |
| `PgIdentityRepository` | 5 | T-104 | default personas |
| `PgDirectoryRepository` | 15 | T-201, T-204, T-407 | `getDoctor`, `listDoctors` |
| `PgTaxonomyRepository` | 6 | T-201 | |
| `PgConfigRepository` | 3 | T-105, T-408 | |
| `PgReviewRepository` | 21 | T-201, T-301, T-302 | `saveDraft`, `getDraft`, `insertReview`, `getByPublicId`, `correctReview`, `listForDoctor` |
| `PgEvidenceRepository` | 12 | T-301 to T-308, T-407 | `intake`, `updateState`, `insertArtifact`, `recordCustodyEvent`, `publish`, `getForAuthor`, `getPublic` |
| `PgCommunityRepository` | 6 | T-401, T-402 | `postComment`, `editComment`, `thread` |
| `PgModerationRepository` | 10 | T-403, T-404 | |
| `PgNotificationRepository` | 8 | T-405, T-408 | |
| `PgRetentionRepository` | 7 | T-309 | |
| `PgDataRequestRepository` | 4 | T-410 | |
| `PgAuditRepository` | 1 | T-404 | |
| `PgSearchIndex` (`search/index.ts`) | 4 | T-205 | |
| `PgOutbox` (`outbox.ts`) | real | T-009 | `append` inside a command's transaction |
| `PgAuditWriter` (`audit-writer.ts`) | real | T-009 | |
| `PgBossQueue`, `PgOutboxRelayStore` (`queue/`) | real | T-009 | |

### Worker jobs (`apps/worker/src/registry.ts`)

Named job types: `outbox.relay`, `evidence.process`, `search.refresh`, `notification.deliver`, `mail.send`, `retention.expire`, `data.export`, `data.delete`. Only `outbox.relay` is registered. `RELAY` (in `handlers/outbox-relay.ts`) maps events to jobs; for the demo, `account.registered` maps to `mail.send`, `review.published` to `search.refresh` and `notification.deliver`, `evidence.received` to `evidence.process`, and `comment.posted` to `notification.deliver`.
