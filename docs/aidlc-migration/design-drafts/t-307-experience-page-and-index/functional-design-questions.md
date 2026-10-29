# Functional Design — questions (U27 `t-307-experience-page-and-index`)

Draft written ahead of the stage on 2026-10-29 while another Unit builds. The lead finalises it when the workflow reaches this Unit's Functional Design; then it moves to `<record>/construction/t-307-experience-page-and-index/functional-design/`.

Every question is answered A, decided by the agent under the owner's no-questions instruction of 2026-10-29. Each is added to `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` when this draft is finalised. `functional-spec.md` § 13 lists what changes under each other option. No answer changes a hard rule, a data boundary or a founder decision, so this Unit appends no FD entry (`functional-spec.md` § 15).

Context:
- Unit U27 (kind `ui`, size L, not high risk) delivers T-307 (`docs/implementation/tasks/T-307-experience-page-and-index.md`, with its FD-091 amendment) for US6.2, US6.3, US6.4, US3.3 and US10.2 (`unit-of-work-story-map.md`). It is Bolt 22, the milestone demo "share and read" (`bolt-plan.md`). It depends on U22 T-302, U15 T-202, U16 T-203, U9 T-102, U3 T-010 and U45 T-011 (`unit-of-work-dependency.md`). U28 T-308, U31 T-402 and U42 T-503 depend on it; U26 T-306 imports `ExperienceBody`; U38 T-409 lists `AccountRow`.
- Inputs read: `unit-of-work.md` (U27), `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `bolt-plan.md`, `requirements.md` (FR10, FR11, FR39, FR41, FR42, FR45–FR47, FR55, FR69–FR71, FR78, FR95, NFR1, NFR4, NFR6, NFR7, NFR13), `stories.md` (AC3.3.1–AC3.3.6, AC6.2.1–AC6.2.5, AC6.3.1–AC6.3.5, AC6.4.1–AC6.4.5, AC10.2.1–AC10.2.5, AC2.4.3, AC2.4.4, AC2.4.6), `docs/status/decision-log.md` (FD-008, FD-015, FD-022, FD-024, FD-032, FD-042, FD-049, FD-089, FD-091, FD-093, FD-094), `01-conventions.md` §2, §6–§9 and §14, `03-routes-and-contracts.md` §1, §4 and §6, `docs/design/auth-screens-spec.md` §3.7, `design-direction-research.md` §4, the T-204, T-306, T-308, T-402, T-403 and T-409 task files, `eslint.boundaries.mjs`.
- Upstream drafts read (none of these Units is built yet, so the drafts are the interface): `t-301-review-module-core` (page view model, `getExperience`, `listExperiences`), `t-302-review-changes-and-tombstones` (written 2026-10-29: `FollowUpVM`, `currentStatus`, `LaterCareVM`, `editedAt`, `TombstoneVM`, the redaction token, its seven new keys), `t-202-doctor-index-and-profile` (shared primitives `Byline`, `AccountRow`, `Badge`, `NotVerified`, `DoctorLink`, `IndexHead`, the key `label.documentsCount`), `t-203-facility-and-condition-pages` (`ConditionLink`), `t-104-identity-module` (the one `BylineVM`, alias, "Former member"), `t-201-directory-and-taxonomy-modules` (`ExperienceCardVM`, document counting BR1.5), `t-204-provider-submission-claim-field-change` (`AddDoctorPanel`), `t-305-privacy-preview-redaction-publish` (`evidenceGroups`, `hasDocuments` from Bolt 28), `t-306-composer-wizard` (its Q7: T-307 swaps the preview body), `t-102-patient-auth-screens` (`useAuthGate`, `AuthGateProvider`), `t-011-patient-design-and-motion-system` (tokens, `Reveal`, static groups, press list, `data-press`, no morph).
- Code read on the working tree (branch `bolt/t-011-patient-design-and-motion-system`, 2026-10-29): `experiences/page.tsx` and `experiences/[id]/page.tsx` (T-008 placeholders), `(patient)/layout.tsx` (`RouteTransition` already wraps `<main>`'s content), `components/patient/{ViewShell,motion/Reveal}.tsx`, `lib/{titles,metadata}.ts`, `app/not-found.tsx`, `app/pages.test.tsx` (rows `/experiences` and `/experiences/[id]`), `packages/contracts/src/{ids,page}.ts`, `view-models/experience.ts` (the T-003 stub), `packages/i18n/src/format.ts`, `messages/{en,bn}.json` (781 keys), `styles/patient.css` (`.a-*`, `.story-lead::first-letter`, `.chapters`, `.spine`, `.related-card h4`, `.react`), `styles/motion.css` (press list with `.related-card` and `.react`, `[data-static]`, reading-progress bar).
- Prototype read: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` (`titleForView` case `account`, `byline` at line 582, `CHAPTER_KEYS` and `renderAccount` at 899–1038, `reactBtn`, `evidenceSection`, `relatedCard` at 1157, `indexHead`, `renderExperienceIndex` at 1927) and `ui-design-prototype/shared/rogikotha-data.js` (`followUps`, `laterCare`, `relatedByCondition`, `accountsByAuthor`). The task's line numbers predate FD-089 and are stale.
- Open `ISSUES.md` rows naming this Unit: ISS-083 (task-file map of `thread`/`evidence`, fixed in CR-002). Related: ISS-053 (the routing barrel in plain Vitest), ISS-161 (seed text in Bengali only), ISS-268 (Not provided check).

## What the code and data show that the task file does not

1. **The route folder is `experiences/[id]`.** The task's owned path is `[publicId]`. Next.js refuses two slug names at one level, so the placeholder must be moved with `git mv`, as T-202 does for doctors.
2. **The shared primitives are T-202's.** T-202 builds `Byline`, `AccountRow` (the port of `accountRow`), `Badge`, `NotVerified`, `DoctorLink` and `IndexHead` in `components/patient/shared/` for every patient page. The task lists its own `Byline.tsx`, `Initials.ts`, `ExperienceCard.tsx`, `IndexHead.tsx` and maybe `Badge.tsx`; building them again gives two bylines (Question 1). T-402 ("reuse T-307's `Byline`") and T-409 ("`AccountRow` (T-307's row component)") then read T-202's.
3. **Initials come from Identity.** T-104 computes `initials` (the `Dr.`/`ডা.` strip, `@` for pseudonymous) in `domain/identity/byline.ts`; the view model carries them. `Initials.ts` would be a second definition.
4. **The drafts disagree on the named byline.** T-301 (Question 18 A) gives named and pseudonymous bylines a `profileUsername` for a profile link, as task step 2 asks. T-104 (its Q17) says a named byline carries no username and is plain text (T-202 Q7 A), and puts `profileUsername` on its denylist (Question 2).
5. **The anonymous byline now shows the thread alias.** T-301 Question 17 A and T-104 Q6 A: the lede "Written anonymously", then the alias (`patient-xxxx`), the Anonymous chip, no link. Task step 2 says "no lede, no name".
6. **No anonymity caveat in the margin.** T-301 Question 16 A (its BR6.13 and FD entry (b)): the page does not show `compose.identity.anonNote`. Task step 4 still lists the "anon note block"; built as written it contradicts FD-022 and AC3.3.6.
7. **`experience.publishedLabel` already exists** in both dictionaries ("Published" / "প্রকাশ"). Task step 4 says to add it.
8. **The page would say "No documents" over published documents.** The seed has six published evidence items (`seed-evidence.ts`). T-201 counts them on cards (BR1.5: published items of an eligible review), while T-301's page view model carries `evidenceGroups: []` and `hasDocuments: false` until U25 T-305 (Bolt 28). From Bolt 22 to Bolt 28 the card says "2 documents" and the page says "No documents" (Question 3).
9. **The placeholder counts would be false.** Task step 3 renders the discussion count `0` and the reaction counts `0`. Seeded reviews have comments and reactions, and T-301 removed the reaction counts from the view model. "0" would state something untrue, the harm the "never render a missing value as 0" rule guards against (Question 4). The prototype's empty discussion line `mine.empty` ("Nothing here yet.") has the same problem.
10. **A loading file would hide the 404.** With `loading.tsx` beside `[publicId]/page.tsx`, Next streams the shell first, so a later `notFound()` reaches the browser with status 200 (a soft 404). 01-conventions §9 asks for a 404 for hidden content (Question 12).
11. **The task asks for `RouteTransition` around each page.** The layout already wraps `<main>`'s content in the one `RouteTransition` (T-011 Q4 A). A second one gives two elements named `page`, and the browser then skips every route transition.
12. **The follow-up order changed upstream.** The task says newest first with the first item current. The T-302 draft (its Question 1 A, F15) decided the prototype's order: date order below the story, the newest `follow_up` marked current, and `currentStatus` for a summary at the top (Questions 6 and 17).
13. **T-302 now supplies what the task did not.** Its draft adds the later doctor's link (`laterCare.doctor`, `followUps[].laterProvider.doctor`) and `offerProfileSubmission`, sets `editedAt` for every author correction and never for a redaction, gives the tombstone `threadSlot` as the public id with `noindex: true` and two message keys (`experience.tombstone`, `experience.tombstoneRemoved`), and adds `experience.editedOn`, `experience.laterCareSubmit`, `label.correction` and `label.redacted` (Questions 7–10, 14).
14. **Redactions arrive as a token.** T-302 stores U+2063 `[redacted]` U+2063 in the text and leaves the wording to render time (its BR7.3 names this Unit). The token can sit in a title, a story, a section, a follow-up, later-care text or a card excerpt (Question 14).
15. **The prototype's chapters list is unordered.** AC6.2.1 asks for "semantic ordered content"; `.chapters` and `.spine` already reset `list-style`, so `ol` keeps the look.
16. **The prototype index uses `nav.discover` as its kicker** and `nav.account` as its title; the task says kicker `nav.account`. The prototype is the source of truth for content.
17. **The related card is a button holding an `h4`** under an `h2`, which skips a heading level, and `patient.css` styles `.related-card h4`. As a link its accessible name would be every word in the card.
18. **Inline styles.** The prototype sets `style=` on the discussion count, the margin's tag row, the other-accounts links, three notes and the disclaimer. They become classes in T-307's section of `patient.css`, on T-011 spacing tokens.
19. **The card-to-story morph is parked here.** T-011 (its Q10 A, F12) builds no shared-element morph and records "the card-to-story move is deferred to T-307 with an FD note"; its `check:motion` M11 allows only six view-transition names (Question 16).
20. **No localised 404 exists.** The only `not-found.tsx` is the root one, which renders outside the locale tree with two hard-coded lines. The task's `[publicId]/not-found.tsx` gives hidden experiences a localised 404 inside the patient layout.

## Settled before this stage

- The look is T-011's, with page rules only in T-307's own appended section of `patient.css` (FD-091 amendment, `project.md` Code Style 2026-10-27). No motion declaration in `patient.css` (`check:motion` M6).
- The page view model, its projection and the queries are U21 T-301's, extended by U22 T-302 (follow-ups, current status, later care, `editedAt`, tombstone) and later by U25 T-305 (evidence groups). This Unit adds no query, command, table or migration.
- Gated controls use T-102's `useAuthGate()` and the one `AuthGateProvider` in the patient layout.
- Experience pages are indexable (01-conventions §8); the experiences index too.
- The owner's answers apply: counts only, no percentages (T-202 Q1 B); "Former member" for a de-identified named or pseudonymous persona (T-104 Q15 B); no public anonymity caveat, with the lawful-access text on Terms and Privacy (T-301 Q16 A, T-207 Q1); FR46 checkboxes deferred (T-301 Q15 A); release 1 shows the three suggested Reviewer's labels only (T-301 R3).
- T-010's boundary matrix, coverage floor, route-table test and CI apply as merged (FD-093). FD-094 lets independent Units build in parallel; it changes nothing in this design, except that the fallbacks below name what to do when a dependency is not merged yet.

## Settled in this design without a question

Each is explained in `functional-spec.md` § 12.
- The route folder moves from `[id]` to `[publicId]` with `git mv`; the segment is parsed with `stripSlug` from `@rogikotha/contracts`.
- No page adds a `RouteTransition` (the layout's one covers them).
- `ol.chapters` and `ol.spine` instead of `ul` (AC6.2.1).
- The index kicker is `nav.discover` and its title `nav.account`, as in the prototype.
- The related card is an anchor whose accessible name is its title (`aria-labelledby`), with the meta line as its description; its heading is an `h3`, styled in T-307's section.
- The prototype's inline styles become T-307 classes on T-011 tokens.
- `experience.publishedLabel` is reused, not added.
- One cached loader serves `generateMetadata` and the page, and the page calls it first.
- The document title names the author only for named and pseudonymous bylines; anonymous and "Former member" bylines give the title alone.
- `[publicId]/not-found.tsx` renders `errors.common.notFound` and a link to the index inside the patient layout, keeping status 404.

## Question 1

The task file lists its own `Byline.tsx`, `Initials.ts`, `ExperienceCard.tsx` (the `accountRow` port), `IndexHead.tsx` and maybe `Badge.tsx`. T-202, which this Unit depends on, builds the same primitives in `components/patient/shared/` for every patient page (fact 2). Which does this Unit use?

A. **Reuse T-202's primitives and ask for the few additive props this page needs** (recommended): `Byline` gets the anonymous alias form and a machine-readable `whenDateTime`; `AccountRow` is the index row; `IndexHead`, `Badge`, `NotVerified` and `DoctorLink` are used as they are; T-203's `ConditionLink` is the margin's condition. `Byline.tsx`, `Initials.ts`, `ExperienceCard.tsx`, `IndexHead.tsx` and `Badge.tsx` are not created under `experience/`. If T-202 has merged without the additions, this Unit adds them to T-202's files as a recorded owned-path change, with their tests. One byline on every page, as the prototype's comment demands ("THE ONLY place an author is rendered").
B. **Build the task's own copies under `experience/`.** Two bylines and two account rows that can drift; the prototype comment says it removed exactly that.
C. **Move T-202's primitives into `experience/`.** Moves a merged Unit's files for no gain and breaks its imports.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 2

**Is a named author's name a link to their public profile?** Task step 2 and T-301 Question 18 A say yes (through `profileUsername`). T-104 (its Q17) and T-202 Q7 A say no: a named byline carries no username, the name is plain text, and only a pseudonymous `@username` links to `/authors/{username}`. Identity owns the byline shape.

A. **Follow Identity: a named name is plain text; a pseudonymous username links to `/authors/{username}`; anonymous and "Former member" are never links** (recommended). `Byline` never reads a `profileUsername` field, so the page is correct whichever way T-301 is finalised. It is the narrower, reversible choice: the profile still lists the named contributions (AC10.2.1), and a link can be added later without taking anything back. T-307's acceptance row "named → display name link" reads "named → display name as text".
B. **Link the named name through `profileUsername`** (task step 2, T-301 Q18 A). Needs T-104 to drop it from its denylist and reverse T-202 Q7 A; T-104's draft says that needs an FD entry first.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 3

**What does the evidence section say before U25 T-305 fills the groups and U28 T-308 renders them?** The seed has published documents, which T-201's cards count; T-301's page model carries no groups and `hasDocuments: false` until Bolt 28 (fact 8).

A. **The page model carries `documentsCount` (T-201 BR1.5, the same count as the card); the slot shows "No documents" only when it is 0, and otherwise the heading, the "Documents attached — not medically validated" notice and "{n} documents", without a viewer link until T-308** (recommended). Card and page agree, the hard-rule wording is kept, and nothing private is shown (published items only). Needs one additive field from U21 T-301 (or U22 T-302, which extends the same view model); if it is absent at build time, the slot renders the heading with no statement either way and raises an S2 row.
B. **Always "No documents" until T-308**, as the task says. False on six seeded reviews and contradicted by their cards for six Bolts.
C. **Hide the evidence section until T-308.** The page loses the "evidence notice slot reserved" that the checklist asks for.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 4

**What do the discussion heading and the reaction buttons show before U31 T-402?** The task renders the count `0`; seeded reviews have comments and reactions, and T-301's page model carries no counts (fact 9).

A. **No count until the data exists** (recommended): the heading "Discussion" without a number, the provider note under it, no empty-state line, and the Like and Dislike buttons without a number. T-402 adds the counts and the thread. Nothing on the page states something false.
B. **Show "0" as the task says.** States a false value on every seeded review.
C. **Hide the discussion block and the buttons until T-402.** The page loses its structure and the tombstone loses its thread slot.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 5

**What do Like, Dislike, Report and Save do before T-402 and T-403 exist?** T-102's `guard(fn)` opens the sign-in sheet for signed-out visitors and the confirm-email sheet for unconfirmed accounts; for a confirmed account it runs `fn`, which has nothing to call yet.

A. **Every control goes through `guard`; for a confirmed account the control carries `aria-disabled="true"` and does nothing, marked `TODO(T-402)` or `TODO(T-403)`, with an S3 row** (recommended). The signed-out and unconfirmed paths (auth spec §3.7) work and can be shown at the phase gate; no temporary copy is added; T-402 and T-403 replace the bodies before the milestone gate. `aria-disabled` keeps the control focusable and announced as unavailable.
B. **Native `disabled` buttons for everyone.** The gate sheet never opens, so the auth spec's signed-out behaviour cannot be checked here.
C. **No controls until T-402.** The page structure and the gate check move to T-402.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 6

**In which order does the follow-up spine read?** The task says newest first with the first item current. The T-302 draft (its Question 1 A) decided date order below the story with the newest `follow_up` marked `isCurrent`, plus `currentStatus` for a summary at the top; the prototype and its note `experience.currentNote` ("Older updates stay in place so the story still reads in order") read the same way.

A. **Render the view model's order as given: oldest first, the item with `isCurrent` marked `.current` with "Most recent status"; the summary at the top comes from `currentStatus` (Question 17)** (recommended). Matches T-302, the prototype, its copy and AC6.3.3 ("chronologically below the original, the newest reported status summarized at the top"). The page never sorts and has no control that picks the current item. The task's acceptance row becomes "VM May, Jun, Aug → `li.current` is Aug".
B. **Newest first, current on the first** (the task). The page would re-sort T-302's list against its design, and `experience.currentNote` would no longer be true.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 7

**How does the page "offer profile submission" for a later provider that has no profile (FR55, AC6.2.5)?** T-302 sets `laterCare.offerProfileSubmission` and adds `experience.laterCareSubmit` ("This provider has no profile yet. You can submit one."). U17 T-204 (Bolt 16) builds `AddDoctorPanel`, a standalone client component with its own `compose.addDoctor` toggle and gate.

A. **Under an unlinked later provider: the note `experience.laterCareSubmit` and T-204's `AddDoctorPanel`, prefilled with the provider text when T-204 accepts an `initialName`, with its pending note replaced by `experience.laterCarePending`** (recommended). The panel's default note (`compose.addPending`) says "Your experience stays a private draft", which is false for a reader. Meets AC6.2.5 with existing copy; the panel's own checks, gate and staff review apply; the offer sits inside the later-care callout, apart from the reviewed care. If `AddDoctorPanel` is not merged, the note shows without the panel and an S3 row is raised.
B. **Text only, with a deferral row.** AC6.2.5's offer is not met in release 1.
C. **A link to `/write`.** Sends a reader into the composer to add a doctor, which is not what they came for.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 8

**Where does the later doctor's link come from?** The table `review_follow_ups` has `later_doctor_id`; the T-302 draft now gives `laterCare.doctor` and `followUps[].laterProvider.doctor` (`{publicId, name}`), filled only while the doctor is visible (its BR3.4).

A. **Render T-302's field with `DoctorLink` and "Registration not verified"; without it, the provider text** (recommended). Nothing reaches a provider's summaries (the projection only reads). If T-302 merged without the field, the provider shows as text, with an S2 row for U22.
B. **The page resolves the doctor with a second directory query.** A second read per page and a page-level join the projection exists to avoid.
C. **Never link.** AC6.2.5's first half fails.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 9

**When does the page show "Edited {month year}"?** AC6.3.1 and FR69: a non-substantive edit is shown with an Edited timestamp. The T-302 draft (its Question 3 A, F4) sets `editedAt` for every accepted author edit and never for a redaction; its task's acceptance row said "only for material edits".

A. **Whenever `editedAt` is set, as `experience.editedOn` under the story; a material edit also shows its dated correction entry in the spine, labelled `label.correction`** (recommended). Meets AC6.3.1 and AC6.3.2; this Unit only renders the field.
B. **Only for material edits.** A title-only correction is invisible to readers, against AC6.3.1.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 10

**Is the tombstone page indexable?** 01-conventions §8 makes experience pages indexable; a tombstone has no title, no author and no story. The T-302 draft gives `TombstoneVM.noindex: true`.

A. **The tombstone answers status 200 with `robots: {index: false}` from `noindex`** (recommended). Search engines drop a page whose content was removed, and replies keep their context for readers who follow a link. The route-table test asserts `robots` absent only for the live experience.
B. **Indexable like every experience.** Search results keep pointing at "This experience was deleted".
C. **Status 410 Gone.** The thread would no longer be readable, against FR71's tombstone.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 11

**How is the tombstone notice kept still?** The task's FD-091 step says the tombstone notice is never animated. T-011 gives only two in-page static groups, `emergency` and `disclaimer`, each at most once per page (its BR7.3); everything else in `<main>` fades with the route transition.

A. **The notice gets no motion of its own (not in a reveal, no press, `data-static="notice"` so T-011's `[data-static]` set covers it) and joins no view-transition group; it fades with the page on a client navigation like every other block, and is static on a direct load** (recommended). AC2.4.4 names only the disclaimer and the emergency guidance; the disclaimer under the notice keeps its own static group. No change to T-011.
B. **Ask T-011 for a third static group, `notice`.** A cross-Unit change to a merged design for a block no acceptance criterion protects.
C. **Turn the route transition off for tombstones.** Needs a per-page escape in the layout's one `RouteTransition`.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 12

**Which routes get a `loading.tsx`?** The task lists "`loading.tsx` files". A stream before `notFound()` turns the 404 into a 200 (fact 10). The research brief allows skeletons only as static blocks sized to the final layout.

A. **Only the index (`experiences/loading.tsx`): a static, non-animated skeleton of the head and three rows, sized like the real ones; none under `[publicId]`** (recommended). Hidden content keeps its real 404 status; the index has no 404 to lose. No shimmer (it would loop, `check:motion` M3).
B. **Both routes.** Hidden and unknown experiences answer 200.
C. **None.** The index shows nothing while a slow list loads.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 13

**How does the index page through the list, and what does its count line say?** T-301's `listExperiences({cursor?, limit?})` returns `CursorPage<ExperienceCardVM>` (newest first, limit 20, no total). The prototype prints "{n} patient experiences" above the list.

A. **"More experiences" link with `?cursor=` when there is a next page, "Back to the newest" on a later page; the count line shows `total`, which T-301 adds to the result, and is left out when no total is given** (recommended). Works without script, shares as a URL, never prints a page size as if it were the total. An invalid cursor redirects (307) to `/experiences`.
B. **No count line.** Loses the prototype's line; nothing to ask of T-301.
C. **Page numbers.** Needs an offset query against T-301's keyset design.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 14

**Who turns T-302's redaction token into words, and where?** The token can sit in any public text field and in card excerpts (fact 14). T-302 adds `label.redacted` ("[private detail removed]").

A. **One `web-shared` helper, `apps/web/src/lib/redaction.ts`, splits text on the token; `RedactedText` renders each token as `label.redacted` in a `span.redacted`; the page, the metadata title (plain-text form) and T-202's `AccountRow` use it; this Unit adds `label.redacted` to both dictionaries only if T-302 has not** (recommended). One rendering everywhere; both languages; the token never shows. T-201 and T-301 are asked to keep the token whole when they truncate an excerpt.
B. **Leave it to T-302 or T-404.** Neither has a screen; readers would see the raw token.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 15

**Does author text carry its own language?** T-301's page model has `contentLanguage` (`en`, `bn` or `mixed`). An English story on `/bn` is read by a screen reader with Bengali rules.

A. **The title, story, sections, follow-ups and later care get `lang="en"` or `lang="bn"` when `contentLanguage` is one of those and differs from the page locale; `mixed` adds nothing** (recommended). Correct pronunciation (WCAG 3.1.2), no change to the text; `:lang(bn)` type rules then follow the text, not the page.
B. **No `lang` attributes.** English stories on Bengali pages are mispronounced.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 16

**Does this Unit build the card-to-story move (an experience card growing into the page's head) that FD-091 allows and T-011 parked here?** T-011 builds no morph (its Q10 A); `check:motion` M11 allows only `page`, `masthead`, `demo`, `colophon`, `emergency`, `disclaimer` and `none` as view-transition names; T-011 says the move needs an FD note on animating the group's size and U42 T-503's frame-cost measurement first.

A. **Not in this Unit: the index and related cards get T-011's reveal and press, the page gets the layout's route transition, and the move stays the S4 deferral T-011 recorded, to be taken up after U42 measures frame cost** (recommended). No change to T-011's check or names, no size animation outside `transform` and `opacity`, nothing that can delay the page's LCP element (the title). The motion the owner asked for still shows on every step of the reading journey.
B. **Build it now.** Needs T-011 to allow a per-card name (M11) and a size-animation exception, an FD note before code, and a per-card unique name on every list; the frame cost on a mid-range Android is unmeasured until U42.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 17

**Where and how is "the newest reported status summarized at the top" (AC6.3.3, FR70)?** T-302 gives `currentStatus {dated, body}`; follow-up bodies may be up to 2 000 graphemes; the prototype has no summary.

A. **In the page head, under the flags: a compact block "Most recent status · {month year}", the body cut to 200 graphemes with "…" when longer (never inside a redaction token), and a link "Read the update" to the current spine item (`#follow-up-current`); absent when `currentStatus` is null** (recommended). The status is the first thing a reader sees after the title and flags, the full text stays in the spine, and the head does not grow with a long update. Static (no reveal), so the head is painted at once.
B. **At the top of the follow-up section only.** It is not "at the top" of the page; on a long story it sits below the fold.
C. **The whole body in the head.** A long update is printed twice in full.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)
