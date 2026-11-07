# Release 1 gate matrix

Status: skeleton. The rows are copied from the acceptance tables of the release-1 Units' task files
(first cell and expected result, shortened; the task file has the full text and any "replaces" note).
Every Observed, Evidence and Verdict cell stays empty until Build and Test, where each row is
re-executed on the final `main` after the last merge. A row is never filled from an earlier Unit
record (BR11.2): a row whose evidence exists only in an earlier record is `fail` until rerun.
Verdict is `pass`, `fail (ISS-nnn)` or `deferred to release 2 (FD-105)`; `open` means not yet run. A
row that a later task amendment replaced ("replaces ...") is marked `superseded by <row>` and not
run. The verdict rule is in `docs/validation/U50.md` (BR11.4, FD-121).

A behaviour row is backed by a journey test title (`P<part>.<step> [<locale>]`, see
[U50-walkthrough.md](U50-walkthrough.md)) or a walk-through row. U41's rows (T-502) are filled after
U41 has merged and the Bolt is rebased.

## Header (filled at Build and Test)

| Field | Value |
|---|---|
| `main` commit | |
| Date | |
| Environment (OS, Docker, Node, pnpm, Chromium) | |

| Command (run on `main` after the last merge) | Exit code | Counts or note |
|---|---|---|
| `pnpm check` | | |
| `pnpm smoke` | | |
| `pnpm test:int` | | |
| `pnpm e2e`, run 1 | | |
| `pnpm e2e`, run 2 | | |
| `pnpm e2e:perf` | | |
| `pnpm check:motion` | | |
| `pnpm contrast` | | |
| `pnpm contrast:patient` | | |
| `npx impeccable detect apps/web/src --no-advisory` | | |
| `pnpm i18n:check` | | |
| coverage floor in `test:coverage` (`apps/web` at or above 80%) | | |

## Part A: Units and acceptance rows

One table per Unit, in the order U9, U11, U20, U22, U41, U46, U47, U48, U49, U50.

### U9

Task T-102 (`docs/implementation/tasks/T-102-patient-auth-screens.md`), 25 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U9 | T-102 | Spec §6 flow | register → Mailpit → confirm → `/me?welcome=1` with `auth.verify.done` | | | open |
| U9 | T-102 | Same-email register | identical pending screen; "someone tried" mail | | | open |
| U9 | T-102 | No-JS | full-page re-render with summary + inline error | | | open |
| U9 | T-102 | Focus | focus on the summary; after navigation focus on `h1` | | | open |
| U9 | T-102 | `next` safety | redirect to `/me`; `next=/experiences/abc` → honoured | | | open |
| U9 | T-102 | Rate limit copy | `errors.auth.rateLimited` with minutes | | | open |
| U9 | T-102 | Sessions | two rows, one `auth.security.thisDevice`; sign out everywhere kills both | | | open |
| U9 | T-102 | Both locales | Bengali strings, Bengali digits in dates/minutes, cap-drop, no overflow at 360 px | | | open |
| U9 | T-102 | noindex | `<meta name="robots" content="noindex">` | | | open |
| U9 | T-102 | Detector + contrast | clean | | | open |
| U9 | T-102 | FD-053: D-001 gate recorded | the owner's approval of the D-001 auth-screen review is recorded with its date and covers `en` and `bn`, both themes and 360 px width | | | open |
| U9 | T-102 | FD-053: built screens match the approved review | each matches the approved D-001 screen; no horizontal or Bengali text overflow | | | open |
| U9 | T-102 | FD-057: security page scope (AC3.2.3) | a sessions table with both sessions and a Sign out everywhere control; no recent-logins list and no failed-login alert anywhere on the page | | | open |
| U9 | T-102 | FD-057: sign out everywhere (AC3.2.3) | both browsers are signed out; the next request in each is treated as signed out | | | open |
| U9 | T-102 | Checks | exit 0 | | | open |
| U9 | T-102 | FD-091: motion check | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens | | | open |
| U9 | T-102 | FD-091: reduced-motion journey (AC2.4.3) | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never a… | | | open |
| U9 | T-102 | FD-091: detector and contrast on the new styles | zero findings | | | open |
| U9 | T-102 | FD-091: auth screens re-reviewed on the T-011 look | explicit gate before T-102 closes: the owner's approval is recorded in this Unit's record with its date; the earlier D-001 approval (FD-053) was give… | | | open |
| U9 | T-102 | FD-103: Spec §6 flow (Q17, replaces "Spec §6 flow") | register → pending screen showing the address → Mailpit → Confirm (POST) → `/verify-email?confirmed=1` with `auth.verify.done` | | | open |
| U9 | T-102 | FD-103: same-email register (replaces "Same-email register") | identical pending screen, redirect and `rk.pending` cookie; no sign-in; "someone tried" mail | | | open |
| U9 | T-102 | FD-074: `next` safety (BR1.5, R-03, R-04, replaces "`next` safety") | the first four go to `/{locale}/me`; the last is honoured | | | open |
| U9 | T-102 | FD-063: rate limit copy (Q5, replaces "Rate limit copy") | the seconds copy (`formErrors.auth.rateLimitedSeconds`) under 60 s; the minutes copy (`errors.auth.rateLimited`) from 60 s, in the active language's… | | | open |
| U9 | T-102 | FD-057: sign out everywhere (Q7, replaces the password wording above) | both browsers are signed out; no password is asked | | | open |
| U9 | T-102 | FD-053, FD-091: owner reviews (Q13) | moved to the U50 release check; on `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` | | | open |

### U11

Task T-104 (`docs/implementation/tasks/T-104-identity-module.md`), 7 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U11 | T-104 | Alias scoped | same persona for r1; different alias for r2 | | | open |
| U11 | T-104 | No linkage in projection | no denylisted key in projection JSON | | | open |
| U11 | T-104 | Reveal always recorded | three `identity_reveals` rows: false, false, true; three audit rows; three staff notifications | | | open |
| U11 | T-104 | Worker cannot read links | permission denied on `persona_links` and `identity_reveals` | | | open |
| U11 | T-104 | Register still works | personas created via the identity command; counts unchanged | | | open |
| U11 | T-104 | Deidentify | `persona_links` rows gone; named/pseudonymous display names replaced; anonymous aliases untouched; public pages still render | | | open |
| U11 | T-104 | Checks | exit 0 | | | open |

### U20

Task T-207 (`docs/implementation/tasks/T-207-discover-emergency-about.md`), 14 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U20 | T-207 | Discover block order | opener → emergency → browse → facilities → how → latest | | | open |
| U20 | T-207 | Chips and grid | 5 chips link to `/search?q=`; grid shows only conditions with accounts; counts in Bengali under `bn` | | | open |
| U20 | T-207 | Emergency numbers from config | three `tel:` cards + BMDC card; `href="tel:09612-119911"`; last-verified line formatted | | | open |
| U20 | T-207 | About sections | five sections in order; foot note present | | | open |
| U20 | T-207 | FD-022 placement | `policy.privacy.lawfulBody` rendered on `/privacy` only; absent from `/terms`, `/`, `/about` | | | open |
| U20 | T-207 | Terms/Privacy reachable from register | links resolve in both locales | | | open |
| U20 | T-207 | Locales | all five pages render `bn` with no English fallback | | | open |
| U20 | T-207 | Impeccable + contrast | zero findings | | | open |
| U20 | T-207 | Visual (FD-091) | same content, order and states (hero box empty instead of prefilled); the look follows T-011 | | | open |
| U20 | T-207 | Full check | green | | | open |
| U20 | T-207 | FD-091: motion check | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens | | | open |
| U20 | T-207 | FD-091: reduced-motion journey (AC2.4.3) | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never a… | | | open |
| U20 | T-207 | FD-091: detector and contrast on the new styles | zero findings | | | open |
| U20 | T-207 | FD-091: early performance check (NFR13, AC2.4.6) | LCP <= 2.5 s and CLS <= 0.1 recorded in the hand-off; any miss becomes an ISSUES.md row before the next UI Unit starts | | | open |

### U22

Task T-302 (`docs/implementation/tasks/T-302-review-changes-and-tombstones.md`), 17 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U22 | T-302 | Latest on top, no pinning | given follow-ups dated May, Aug, Jun inserted in that order, display order is Aug, Jun, May and `isCurrent` is Aug regardless of insertion order; the… | | | open |
| U22 | T-302 | Material edit creates version + dated correction | after `correct({body})` → `review_versions.length === 1`, one `correction` follow-up, `version === 2`, VM `editedAt` set; `correct({tags})` alone → v… | | | open |
| U22 | T-302 | Tombstone vs delete | with 1 comment → `deleted_tombstone`, `getExperience` returns tombstone VM; with 0 comments → `not_found` | | | open |
| U22 | T-302 | Restore window | `FakeClock` at +29 d → restored; at +31 d → `review.restore_expired` | | | open |
| U22 | T-302 | Redaction only | ranges replaced by token; a payload with `replacement: 'x'` or `field: 'sentiment'` → `moderation.narrative_locked`; overlapping ranges merged | | | open |
| U22 | T-302 | Grapheme safety | redacting inside a Bengali conjunct snaps to grapheme boundaries (assert with `Intl.Segmenter`) | | | open |
| U22 | T-302 | Events | `review.changed` on follow-up/correct, `review.deleted`, `review.restored`, `review.hidden` on `setState(autoHide)` | | | open |
| U22 | T-302 | Hidden not editable | state `hidden` → `review.not_editable` | | | open |
| U22 | T-302 | DB | versions append-only trigger fires on UPDATE attempt (expect `append_only_violation`) | | | open |
| U22 | T-302 | FD-049: soft delete is domain-only state (AC6.3.4) | deleting a `published` review with 0 comments leaves the stored `state = 'published'`, sets `deleted_at` and `restore_until = deleted_at + 30 d`; the… | | | open |
| U22 | T-302 | FD-049: soft-deleted review leaves summaries (AC6.3.4) | after the soft delete, `publishedForDoctor`, `review.sentimentDistribution`, `review.outcomeDistribution` and `listRecentCards` no longer include the… | | | open |
| U22 | T-302 | FD-075: Hide and restore email from the web tier (AC10.1.4, AC10.1.5) | see T-403 (`report.file` hide) and T-404 (`moderation.decide`, `moderation.restore`, `appeal.decide`) | | | open |
| U22 | T-302 | FD-087: `review.setState` sends nothing (C9) | state changes and `review.hidden` / `review.restored` outbox rows are written; zero `email_deliveries` rows, zero `mail.send` jobs and zero notice ro… | | | open |
| U22 | T-302 | FD-087: author's own delete and restore send nothing (C9) | no `email_deliveries` row, no `mail.send` job and no notice for either command | | | open |
| U22 | T-302 | FD-077: deletion step skips held rows (C9) | web entry removes the drafts and facility review; worker entry soft-deletes R1, tombstones R3 and leaves R2 untouched; running it twice changes nothi… | | | open |
| U22 | T-302 | FD-079: held delete looks normal to the author (C3) | the result and the author's list are identical to an unheld delete; the data stays; no message or field mentions a hold | | | open |
| U22 | T-302 | Tree | green | | | open |

### U41

Task T-502 (`docs/implementation/tasks/T-502-security-hardening.md`), 20 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U41 | T-502 | Headers present | all present; `X-Powered-By` absent | | | open |
| U41 | T-502 | CSP nonce rotates | different nonces; `script-src` has no `unsafe-inline` | | | open |
| U41 | T-502 | Prod policy strict | test asserting no `unsafe-eval` passes | | | open |
| U41 | T-502 | Zero CSP violations | 0 violations, both locales | | | open |
| U41 | T-502 | Host check | 403 | | | open |
| U41 | T-502 | Server action origin | rejected (Next returns 403/400 for disallowed origin) | | | open |
| U41 | T-502 | Upload route origin | 403 | | | open |
| U41 | T-502 | Upload overflow aborts | 16 MB single file → 413 within the first 16 MB read; 11 parts → 413; `.exe` renamed `.png` → 415 before storage is touched | | | open |
| U41 | T-502 | Sign-in throttle | 11th returns `rate_limited` with `retryAfterSec`; another email from same network still allowed until 30 | | | open |
| U41 | T-502 | Comment throttle | 31st `comment.post` in an hour refused; key differs per account | | | open |
| U41 | T-502 | Cookies | every row of the cookie table asserted | | | open |
| U41 | T-502 | Log scrub | no `@`, bodies, filenames, tokens | | | open |
| U41 | T-502 | APP_MODE | refuses to start with `app.mode.refused` | | | open |
| U41 | T-502 | Demo marker | refuses to start | | | open |
| U41 | T-502 | FD-072: timing bypass (AC3.1.5) | no concurrent attempt completes without a delay; the next attempt after them gets the 9th-attempt delay (30 s), so all 5 were counted | | | open |
| U41 | T-502 | FD-072: no enumeration through delay differences (AC3.1.5) | identical delay per attempt, identical response shape and status; median timing difference < 15 %; Mailpit has a severe-activity email only for the r… | | | open |
| U41 | T-502 | FD-072: counter cannot be reset by the attacker (AC3.1.5) | the next attempt is still delayed by the next step of the schedule each time | | | open |
| U41 | T-502 | FD-072: one severe notice under concurrency (AC3.1.5) | exactly one `email_deliveries` row (category `security`) and one outbox event for the severe-activity notice | | | open |
| U41 | T-502 | FD-072: T-502 adds no FD-058 code | no change under `packages/application/src/modules/account/` or to the FD-058 setting keys; the FD-058 additions are tests only | | | open |
| U41 | T-502 | Quality gates | green | | | open |

### U46

Task T-201 (`docs/implementation/tasks/T-201-directory-and-taxonomy-modules.md`), 10 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U46 | T-201 | Seeded doctor d1 profile | facts list omits empty fields; `registrationNotVerified === true`; `facts` provenance matches seed `field_provenance` | | | open |
| U46 | T-201 | Facility feedback isolation | adding 20 `facility_reviews` at a branch where d1 practises leaves `review.sentimentDistribution(d1)` unchanged | | | open |
| U46 | T-201 | Limited data threshold | total 4 with threshold 5 → `limited: true`; total 5 → false; total 0 → `empty: true, limited: false` | | | open |
| U46 | T-201 | Hidden content excluded | a review set to `hidden_pending_review` disappears from `publishedForDoctor`, counts and `listRecentCards` | | | open |
| U46 | T-201 | Zero-count topics listed | `taxonomy.listConditions` returns all 8 seed conditions, two with `accountsTotal: 0` | | | open |
| U46 | T-201 | Locale mapping | `getDoctor` in `bn` returns Bengali names and no `_en` keys anywhere in the VM (deep assertion) | | | open |
| U46 | T-201 | No private data in VMs | JSON of every VM contains no `accountId`, `email`, `reporter`, `originalFilename` keys | | | open |
| U46 | T-201 | FD-067: review figures only through ports | no file under `modules/directory` or `modules/taxonomy` imports `modules/review` or `ReviewRepository`; with a fake `ProviderExperience` returning se… | | | open |
| U46 | T-201 | FD-067/C6/C7: Review stub is ports-only | only `provider-experience.ts`, `condition-stats.ts`, `index.ts`, the read queries listed above and tests exist; no `review.publish`, `review.saveDraf… | | | open |
| U46 | T-201 | Full check | green | | | open |

Task T-202 (`docs/implementation/tasks/T-202-doctor-index-and-profile.md`), 13 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U46 | T-202 | Index renders both locales | 6 entries alphabetical by localized name; Bengali digits in counts under `bn` | | | open |
| U46 | T-202 | Profile block order | headings appear in the order of step 5 | | | open |
| U46 | T-202 | Not provided semantics | a doctor with no `fee` shows no fee row; a doctor with zero accounts shows `label.notProvided` in both blocks, never `0` | | | open |
| U46 | T-202 | Filters via URL | `?condition=&outcome=helped&docs=1` yields pressed pills and `showing x / y` | | | open |
| U46 | T-202 | Redirect | 301 to the new URL | | | open |
| U46 | T-202 | Anonymous byline | no `<a>` inside `.byline` for an anonymous card; text = `byline.anonSentence` | | | open |
| U46 | T-202 | Impeccable + contrast | zero findings | | | open |
| U46 | T-202 | Visual (FD-091) | same content, fields, order and states as the prototype; the look follows T-011 | | | open |
| U46 | T-202 | Full check | green | | | open |
| U46 | T-202 | FD-091: motion check | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens | | | open |
| U46 | T-202 | FD-091: reduced-motion journey (AC2.4.3) | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never a… | | | open |
| U46 | T-202 | FD-091: detector and contrast on the new styles | zero findings | | | open |
| U46 | T-202 | FD-091: early performance check (NFR13, AC2.4.6) | LCP <= 2.5 s and CLS <= 0.1 recorded in the hand-off; any miss becomes an ISSUES.md row before the next UI Unit starts | | | open |

Task T-203 (`docs/implementation/tasks/T-203-facility-and-condition-pages.md`), 13 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U46 | T-203 | Nine criteria always rendered | 9 `.crit` blocks in enum order even when all are empty (each shows `label.notProvided`) | | | open |
| U46 | T-203 | Facility separation callout | `.callout.warn` text = `facility.separation` present on every branch page | | | open |
| U46 | T-203 | Siblings exclude self | branch page of a multi-branch facility lists the other branches only | | | open |
| U46 | T-203 | Empty topics listed | 8 cards; zero-count ones show `index.emptyTopic` | | | open |
| U46 | T-203 | Places sorted, unknown hospital | descending by count; missing hospital renders `label.notProvided` with class `pl-unk` | | | open |
| U46 | T-203 | Freq bars relative to max | first row `--w:1`; panel absent when list empty | | | open |
| U46 | T-203 | Locales | all four pages render in `bn` with Bengali digits and no English fallback text | | | open |
| U46 | T-203 | Impeccable + contrast | zero findings | | | open |
| U46 | T-203 | Visual (FD-091) | same content, order and states; the look follows T-011 | | | open |
| U46 | T-203 | Full check | green | | | open |
| U46 | T-203 | FD-091: motion check | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens | | | open |
| U46 | T-203 | FD-091: reduced-motion journey (AC2.4.3) | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never a… | | | open |
| U46 | T-203 | FD-091: detector and contrast on the new styles | zero findings | | | open |

### U47

Task T-301 (`docs/implementation/tasks/T-301-review-module-core.md`), 16 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U47 | T-301 | Transition table complete | every (state, event) pair asserted; illegal ones return `err('conflict')` | | | open |
| U47 | T-301 | Publish minimum fields | quick review without tag and without `notSure` → `review.min_fields`; with `notSure` → ok | | | open |
| U47 | T-301 | Rate limit | 6th publish in a day → `rate_limited` | | | open |
| U47 | T-301 | Anonymous alias scoped | two anonymous reviews by one account get different personas; `otherAccounts` is `[]` on both | | | open |
| U47 | T-301 | Preview equals public | `review.preview(draft)` deep-equals `review.getExperience(publicId)` after publish, ignoring `publicId`/`postedMonthYear` | | | open |
| U47 | T-301 | Not provided | `sentiment: null` → VM `sentiment: null` and `flags[0].key === 'label.notProvided'`; distribution `notProvided` counts it, never `0` in a count that… | | | open |
| U47 | T-301 | Limited data | `limitedDataThreshold = 5`, 4 published → `limitedData: true`; 5 → `false` | | | open |
| U47 | T-301 | Facility isolation | 3 doctor reviews + 8 facility reviews on the doctor's branch → doctor distribution `total = 3` | | | open |
| U47 | T-301 | No scalar score | a test enumerates exported functions of `domain/review` and asserts none returns a plain number for a review set (see Tests) | | | open |
| U47 | T-301 | Exact date private | `rg exact_date packages/application/src/modules/review/projection.ts` → no match | | | open |
| U47 | T-301 | Migrations + repo | green against compose PostgreSQL | | | open |
| U47 | T-301 | FD-080: repeat episode flagged (C9) | account A publishes a review of d1 tagged diabetes for March 2026, then a second review of d1 tagged diabetes for March 2026: the second `review.publ… | | | open |
| U47 | T-301 | FD-080: no flag for a different period or doctor | a second review of d1 for a different treatment period, and one of d2 with the same tag and period, both have `repeatEpisode: false` | | | open |
| U47 | T-301 | FD-080: payload hygiene (C9) | the outbox payload keys are exactly `reviewId, doctorId, branchId, repeatEpisode`; no earlier review id appears anywhere in it | | | open |
| U47 | T-301 | FD-090: worker grant is narrow (C9) | `select id, account_id, expires_at from review_drafts` and `delete from review_drafts where expires_at < now()` succeed; `select payload_enc from rev… | | | open |
| U47 | T-301 | Whole tree | green | | | open |

Task T-306 (`docs/implementation/tasks/T-306-composer-wizard.md`), 15 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U47 | T-306 | Visual parity (FD-091) | same blocks in the same order with the same copy and states; colours and fonts come only from T-011 tokens | | | open |
| U47 | T-306 | Gate | signed-out → only the callout with two buttons; no form controls | | | open |
| U47 | T-306 | Autosave | edit → after 1.5 s `saveDraft` called once; `#saved-flag` gets `.on` | | | open |
| U47 | T-306 | Upload + polling | after upload, `getForAuthor` polled every 2 s until terminal; chip text follows `ev.state.*`; failed chip shows `ev.fail.encrypted` + `ev.failNote` | | | open |
| U47 | T-306 | Redaction coords | drawing 50×20 css px on a 400 px-wide preview of a 1200 px page → `applyRedaction` receives `{x,y,w:150,h:60}` | | | open |
| U47 | T-306 | Publish gating | Publish `disabled` until 4 checkboxes; unverified actor → disabled with `auth.gate.verifyToPublish` | | | open |
| U47 | T-306 | Publish error | `review.min_fields` → summary callout + focus on doctor select | | | open |
| U47 | T-306 | Preview parity | preview VM equals `review.preview` result (mock) — rendered title/byline/claims present | | | open |
| U47 | T-306 | i18n | zero missing keys in either locale; `errors.review.periodInvalid` added in both | | | open |
| U47 | T-306 | Detector | 0 findings | | | open |
| U47 | T-306 | Tree | green | | | open |
| U47 | T-306 | FD-091: motion check | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens | | | open |
| U47 | T-306 | FD-091: reduced-motion journey (AC2.4.3) | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never a… | | | open |
| U47 | T-306 | FD-091: detector and contrast on the new styles | zero findings | | | open |
| U47 | T-306 | FD-091: step motion and publish tick | a step change runs the T-011 slide; publish shows one `PublishTick` and plain confirmation text; no gamification (`rg -i "confetti\|streak\|badge-ear… | | | open |

Task T-307 (`docs/implementation/tasks/T-307-experience-page-and-index.md`), 14 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U47 | T-307 | Section order | headings appear in the order: (title) → timeline → follow-up → later care → evidence → discussion → related condition → related doctor | | | open |
| U47 | T-307 | Byline rules | named → display name link; pseudonymous → `@username` initial; anonymous → `—` + `byline.anonSentence`, no link | | | open |
| U47 | T-307 | Latest on top | VM `[Aug, Jun, May]` → first `li.current`, text contains `experience.currentStatus` | | | open |
| U47 | T-307 | Not provided | `sentiment: null` → badge text `label.notProvided`; never "0" | | | open |
| U47 | T-307 | Reviewer's label | claims render `<i>` with `label.reviewerLabel` and the why-note | | | open |
| U47 | T-307 | Tombstone | no `h1` with a title, no byline, `DiscussionSlot` present | | | open |
| U47 | T-307 | Hidden → 404 | `getExperience` returning `not_found` → `notFound()` called | | | open |
| U47 | T-307 | Doctor not verified | `label.notVerified` present under the doctor link | | | open |
| U47 | T-307 | Numerals | comment count and page counts render Bengali digits | | | open |
| U47 | T-307 | Detector | 0 findings | | | open |
| U47 | T-307 | Tree | green | | | open |
| U47 | T-307 | FD-091: motion check | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens | | | open |
| U47 | T-307 | FD-091: reduced-motion journey (AC2.4.3) | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never a… | | | open |
| U47 | T-307 | FD-091: detector and contrast on the new styles | zero findings | | | open |

### U48

Task T-303 (`docs/implementation/tasks/T-303-evidence-intake.md`), 9 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U48 | T-303 | Streams, no buffering | first chunk written before body end | | | open |
| U48 | T-303 | Limits | 11th file → `evidence.too_many`; 16 MB → `evidence.too_large` and partial file deleted; total > 100 MB → `evidence.total_too_large`; `.pdf.exe` and `… | | | open |
| U48 | T-303 | Idempotent | same `idempotencyKey` twice → one item, one storage object | | | open |
| U48 | T-303 | Custody + outbox | `received` event and `evidence.received` outbox row in the same transaction; on storage failure nothing is inserted | | | open |
| U48 | T-303 | Path traversal | key `../x` refused; `quarantine/<uuid>/a` accepted | | | open |
| U48 | T-303 | Owner only | foreign `getForAuthor` → `forbidden`; foreign `remove` → `forbidden` | | | open |
| U48 | T-303 | Remove states | `remove` from `published` → `conflict`; from `failed` → `rejected` + files deleted | | | open |
| U48 | T-303 | Worker grants | `rk_worker` `SELECT original_filename_enc FROM evidence_items` → permission denied | | | open |
| U48 | T-303 | Tree | green | | | open |

Task T-304 (`docs/implementation/tasks/T-304-worker-evidence-pipeline.md`), 18 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U48 | T-304 | Stage order | from `quarantined`, states visited are exactly `validating, scanning, sanitising, preview_ready`; custody has one event per stage in order | | | open |
| U48 | T-304 | Resume after crash | an item left at `scanning` is resumed at `scanning`, not re-validated | | | open |
| U48 | T-304 | Fail closed | state remains `scanning`; custody `scan_unavailable`; job rescheduled (`startAfter` grows 30 s → 2 m → 10 m → 1 h); after the fake returns `clean` on… | | | open |
| U48 | T-304 | Malware | `failed(malware)`; original still in storage; no artifacts | | | open |
| U48 | T-304 | Type mismatch | `failed(type_mismatch)` before any scan call (`FakeScanner.calls === 0`) | | | open |
| U48 | T-304 | Encrypted PDF | `failed(encrypted)` | | | open |
| U48 | T-304 | Metadata stripped | output `metadata().exif` undefined; orientation applied (a 90°-tagged fixture comes out rotated) | | | open |
| U48 | T-304 | Pixel bomb | `failed(too_large)` without allocating (test asserts elapsed < 2 s) | | | open |
| U48 | T-304 | PDF pages | 2 artifacts for `prescription.pdf`; 31-page fixture → `too_many_pages` at validation | | | open |
| U48 | T-304 | Timeout | `failed(processing_timeout)` | | | open |
| U48 | T-304 | Artifact rows | every artifact has `sha256` matching the bytes, `sanitiser_version` non-empty, `public = false` | | | open |
| U48 | T-304 | Real clamd (if up) | EICAR → `detected`; `photo.jpg` → `clean`; with the container stopped → suite skipped with the explicit message | | | open |
| U48 | T-304 | Worker boundary | `apps/worker` importing `modules/identity` or `better-auth` fails lint | | | open |
| U48 | T-304 | FD-070: ready is in-app only (AC10.1.1, AC10.1.5 as narrowed) | one outbox `evidence.stateChanged` event whose payload holds ids only; no `mail.send` job queued and no `email_deliveries` row written | | | open |
| U48 | T-304 | FD-070: failure is in-app only (AC10.1.1) | `failed(malware)` / `failed(type_mismatch)` each write one outbox event; no `mail.send` job and no `email_deliveries` row | | | open |
| U48 | T-304 | FD-070: scanner outage notice is in-app only | one `notif.evidence.scanUnavailable` outbox event (dedupe); no `mail.send` job and no `email_deliveries` row | | | open |
| U48 | T-304 | FD-070: the worker needs no address | no read of `auth_users`, `to_email_enc` or any email column; no call to the `Mailer` port | | | open |
| U48 | T-304 | Tree | green | | | open |

### U49

Task T-401 (`docs/implementation/tasks/T-401-community-module.md`), 21 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U49 | T-401 | One reply level | replying to a reply returns `community.reply_depth` | | | open |
| U49 | T-401 | k8/k9/k10 scenarios | delete k10 → `deleted_at` set, absent from thread; delete k8 → tombstone present with k9 nested | | | open |
| U49 | T-401 | Mention refusal | `@anon_author_r2`'s anonymous persona cannot be mentioned; error `community.mention_anonymous` | | | open |
| U49 | T-401 | Reaction idempotency | like → like → dislike → null leaves 0 rows; concurrent 20 likes from one account leave 1 row | | | open |
| U49 | T-401 | Anonymous linkage | reaction by the anonymous author of r2 has `public_persona_id = null`; `reactionsOf` returns counts only | | | open |
| U49 | T-401 | Block effect | blocked user posting a reply on blocker's thread → `community.blocked`; existing comments still render | | | open |
| U49 | T-401 | Rate limits | 31st comment in an hour → `rate_limited` with `retryAfter` | | | open |
| U49 | T-401 | Audit + outbox | `comment.post` writes one audit row and one outbox row in the same transaction; details contain no body text | | | open |
| U49 | T-401 | Boundaries | no import of `database`/`adapters` from `application` or `domain` | | | open |
| U49 | T-401 | FD-062: Like then Dislike on a comment (AC8.2.1) | a verified synthetic user who has not reacted to comment k1 sets `like`, then `dislike` → exactly one reaction row with `value = 'dislike'`; k1's `li… | | | open |
| U49 | T-401 | FD-062: Dislike on a comment is accepted and removable (AC8.2.1, AC8.2.2) | on a comment with no other reactions, `reaction.set {targetKind: 'comment', value: 'dislike'}` is not a validation error; the same dislike sent twice… | | | open |
| U49 | T-401 | FD-062: anonymous author's comment dislike stays unlinked (AC8.2.3) | a dislike on a comment by the anonymous author of r2 has `public_persona_id = null`; `reactionsOf` returns counts only, no list | | | open |
| U49 | T-401 | FD-062: comment reactions never weight summaries (AC8.2.5) | adding 10 dislikes to comments on r1 leaves the doctor's sentiment and outcome distributions and the search ranking inputs unchanged | | | open |
| U49 | T-401 | FD-075: Discussion email from the web tier (AC10.1.4, AC10.1.5) | `comment.post` queues the email through T-405's web-tier queueing in the same transaction as the comment: off → no `email_deliveries` row and the in-… | | | open |
| U49 | T-401 | C10: recipient ids filtered in the web tier | for B's comment the payload has `reviewAuthorAccountId` absent (A blocked B), `mentionedAccountIds = [C]`; for A's own comment no self id appears in… | | | open |
| U49 | T-401 | C10: `notification.deliver` needs no persona link | the in-app rows are created for exactly the ids in the payload; the handler issues no query on `persona_links` or `blocks` | | | open |
| U49 | T-401 | C5: `account.blocksBetween` | with A blocking B and C blocking A, `blocksBetween(A, [B, C, D])` returns `blocked = [B, C]` | | | open |
| U49 | T-401 | C9/C10: `hasDiscussion` | `hasDiscussion` is true for a review with a published or tombstoned comment and false for one with none or only a hard-removed comment | | | open |
| U49 | T-401 | FD-077: community deletion step (C10) | web entry removes all the account's reactions; worker entry tombstones the account's comments (replies kept) and skips a comment a fake hold lookup m… | | | open |
| U49 | T-401 | FD-046: no emergency-language banner (AC8.1.2) | posting a synthetic comment containing "chest pain now" and "999" stores and returns the body unchanged, and `CommentVM` carries no banner, emergency… | | | open |
| U49 | T-401 | FD-046: comment edit stays under FR-EDIT-005 (AC8.1.3) | editing k1 sets `editedAt` and `community.thread` shows only the new text; delete is covered by the k8/k9/k10 row above | | | open |

Task T-402 (`docs/implementation/tasks/T-402-discussion-ui.md`), 8 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U49 | T-402 | Smoke parity | the eight prototype smoke assertions pass against the React thread | | | open |
| U49 | T-402 | Both locales | Bengali labels, Bengali numerals in counts, no English fallback text | | | open |
| U49 | T-402 | Gate | composer absent, gate button present; clicking opens the sheet with `auth.gate.body` | | | open |
| U49 | T-402 | Server round-trip | matches storyboard step 15 | | | open |
| U49 | T-402 | a11y | no findings on these components | | | open |
| U49 | T-402 | FD-091: motion check | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens | | | open |
| U49 | T-402 | FD-091: reduced-motion journey (AC2.4.3) | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never a… | | | open |
| U49 | T-402 | FD-091: detector and contrast on the new styles | zero findings | | | open |

### U50

Task T-503 (`docs/implementation/tasks/T-503-parity-accessibility-e2e.md`), 12 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U50 | T-503 | Suite green, all engines | 0 failed; `fixme` count listed with CR ids | | | open |
| U50 | T-503 | CI green under budget | passes; ≤ 10 min | | | open |
| U50 | T-503 | Both locales per journey | equal test counts; equal passes | | | open |
| U50 | T-503 | No serious/critical axe | 0 violations; any excluded rule has a CR | | | open |
| U50 | T-503 | Viewport matrix | green | | | open |
| U50 | T-503 | Reduced motion | every journey completes; `getComputedStyle(el).animationName === 'none'` sampled on the hero | | | open |
| U50 | T-503 | Keyboard-only | register → confirm → sign-in → write → publish → report completed without a mouse; focus returned to trigger after every sheet | | | open |
| U50 | T-503 | 200 % + text spacing | no horizontal scroll; no clipped text on profile and composer | | | open |
| U50 | T-503 | Bengali overflow | no element wider than its container at 360 px | | | open |
| U50 | T-503 | Live region | announcements match the prototype's (`View: …`, sheet titles, `Language: বাংলা`) | | | open |
| U50 | T-503 | Screenshots committed | ≥ 2 locales × 5 viewports × ~28 pages × 2 themes ≈ 560 files, < 40 MB | | | open |
| U50 | T-503 | Quality gates | green; zero findings; every text pair ≥ 4.5:1 | | | open |

Task T-504 (`docs/implementation/tasks/T-504-demo-composition.md`), 11 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U50 | T-504 | Clean clone to running demo | banner printed with URLs and accounts; `/api/health` `ok`; timing recorded | | | open |
| U50 | T-504 | Health | `{ ok: true, db: 'ok', queue: 'ok', mail: 'ok', scanner: 'ok' \| 'unavailable' }` | | | open |
| U50 | T-504 | Seed idempotence | second run says "existing data kept"; no duplicate doctors (`select count(*) from doctors` = 6) | | | open |
| U50 | T-504 | Reset | works; `.data/storage` regenerated; Mailpit empty; clock 0 | | | open |
| U50 | T-504 | Clock | e3's original `original_expired` in custody; e1 (held) untouched; `pnpm demo:clock -- reset` returns | | | open |
| U50 | T-504 | ClamAV optional | item stays `scanning` with `scan_unavailable`; start it → proceeds (storyboard step 12 optional path) | | | open |
| U50 | T-504 | Port conflict message | clear message naming the port and the holder; exit 1 | | | open |
| U50 | T-504 | Ctrl+C | web and worker both exit; containers keep running; `pnpm demo:down` stops them | | | open |
| U50 | T-504 | Storyboard complete | 28 steps ticked, each with observation; any fail has a CR id | | | open |
| U50 | T-504 | Presenter doc | ≤ 10 prose lines + table; no attribution; matches the banner | | | open |
| U50 | T-504 | Quality gates | green | | | open |

Task T-505 (`docs/implementation/tasks/T-505-final-validation-and-docs.md`), 11 rows.

| Unit | Task | Row | Expected | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|---|---|
| U50 | T-505 | Branch green | green | | | open |
| U50 | T-505 | Gate matrix complete | every bullet of both gate lists classified; every stop condition addressed; no stop condition hit | | | open |
| U50 | T-505 | Coverage regenerated | rollup printed; product-code proofs for every `Done`/`Partial` row | | | open |
| U50 | T-505 | Proofs resolve | exit 0 | | | open |
| U50 | T-505 | Page review filled | all URL × locale rows filled; four negative probes recorded | | | open |
| U50 | T-505 | Validation log | ≥ 35 entries; each has a verdict line | | | open |
| U50 | T-505 | Status coherent | dates and phase agree; every CR with a rule change has an FD | | | open |
| U50 | T-505 | README rewritten | mentions `DEMO.md`, the repo map, no docx-only wording | | | open |
| U50 | T-505 | Links | zero broken | | | open |
| U50 | T-505 | No attribution | no hits (model ids appear only inside `docs/validation/*.md` records) | | | open |
| U50 | T-505 | Verdict | PASS or PASS WITH FOLLOW-UP with owners; FAIL blocks the demo from being called delivered | | | open |

### Merged foundation Units

One row each: the Unit's record, and the final `pnpm check` and `pnpm smoke` on `main`.

| Unit | Record | Observed on main (commit) | Evidence | Verdict |
|---|---|---|---|---|
| U1 CR-009 | `docs/implementation/handoffs/CR-009.md` | | | open |
| U2 CR-007 | `docs/implementation/handoffs/CR-007.md` | | | open |
| U3 T-010 | `docs/implementation/handoffs/T-010.md` | | | open |
| U4 CR-011 | `docs/implementation/handoffs/CR-011.md` | | | open |
| U5 CR-006 | `docs/implementation/handoffs/CR-006.md` | | | open |
| U6 CR-012 | `docs/implementation/handoffs/CR-012.md` | | | open |
| U7 CR-004 | `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/cr-004-live-region-announcements/` | | | open |
| U8 T-101 | `docs/implementation/handoffs/T-101.md` | | | open |
| U45 T-011 | `docs/implementation/handoffs/T-011.md` | | | open |
| The earlier CR Units (CR-002, CR-005, CR-008) and the demo slice | `docs/implementation/handoffs/` | | | open |
| Final `pnpm check` and `pnpm smoke` on `main` | the header table above | | | open |

## Part B: production capability and architecture acceptance gates

Each bullet of "Production capability gates" in
[10-validation-strategy.md](../planning/10-validation-strategy.md) and of "Architecture acceptance
gates" in [05-recommended-architecture.md](../planning/05-recommended-architecture.md), classified
`demonstrated locally (evidence)` or `deferred (reason)` (BR11.3).

### Production capability gates

| Gate | What it asks | Classification | Evidence or reason |
|---|---|---|---|
| Authentication and identity | Enumeration, confirmation and reset expiry and replay, session fixation, rotation and revoke-all, CSRF, origin and cookie settings, rate limits, staff-device approval, ownership and capability matrices, anonymous aliases across profiles, feeds, reactions, mentions, notifications, URLs, caches, exports and logs; human security and privacy approval | | |
| Evidence | A legally safe malicious and edge corpus (MIME mismatch, polyglot, scanner detection, encrypted, malformed, truncated, bombs, timeouts, outages, repeated jobs, direct URL probes), pixel and PDF inspection after redaction, derivative immutability, original isolation | | |
| Moderation and legal response | Duplicate and concurrent reports, the five-account threshold, reporter identity boundaries, hide and restore, forbidden narrative rewrite, appeal segregation, blocking and enforcement; counsel and healthcare scenario review | | |
| Retention, deletion and recovery | A controllable clock, 90 and 180-day defaults, prospective config, preview drift, holds, partial deletion failure, tombstones, de-identification, search and cache removal; a clean-environment restore reconciled to the RPO and RTO | | |
| Search and language | A reviewed Bengali, English and Banglish corpus, recall and precision bands, neutral ranking, hidden-record probes, P95 latency; bilingual human review of copy, shaping, line breaks and truncation | | |

### Architecture acceptance gates

| Gate | Classification | Evidence or reason |
|---|---|---|
| 1. Auth registration, reset, session, revocation and protected-command authorization | | |
| 2. Anonymous identity separation and audited, normally-disabled staff reveal | | |
| 3. Publication filtering across direct URL, search, cache, notification, sitemap and analytics | | |
| 4. Evidence malicious-corpus processing, bounded failure, exact derivative preview and original isolation | | |
| 5. Retention defaults, prospective changes, previewed bulk action, holds, deletion idempotency and restore | | |
| 6. Bengali and English parity across every critical journey and state | | |
| 7. Five-reporter auto-hide resistance to duplicate-account actions and logged restoration | | |
| 8. Full production backup restore within the agreed recovery objective | | |

### US2.2 checks

| Check | Expected | Observed | Verdict |
|---|---|---|---|
| The live prototype gallery | shows only 04b and the staff console | | |
| Earlier concepts | open from `ui-design-prototype/.archive/` | | |
| Plain CSS guard | no Tailwind, CSS-in-JS or animation library in any `package.json` | | |

## Part C: release stop conditions

From "Release stop conditions" in [10-validation-strategy.md](../planning/10-validation-strategy.md).
Each is `not hit (evidence)` or `hit (ISS-nnn)`. A hit stop condition makes the verdict FAIL.

| Stop condition | Status | Evidence or ISS |
|---|---|---|
| An unresolved critical or high security or privacy finding | | |
| Missing legal or clinical approval | | |
| A failed restore | | |
| Public access to an original | | |
| Anonymous linkage | | |
| A hidden or deleted search or cache leak | | |
| An incomplete Bengali or English critical journey | | |
| Automated classification introduced contrary to scope | | |
| A demo that accepts or transmits real data | | |

## Related records

- Walk-through: [U50-walkthrough.md](U50-walkthrough.md)
- Page review: [RELEASE-1-REVIEW-CHECKLIST.md](RELEASE-1-REVIEW-CHECKLIST.md)
- Owner review: [U50-owner-review.md](U50-owner-review.md)
