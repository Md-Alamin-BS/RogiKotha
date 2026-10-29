# Functional Design — questions (U26 `t-306-composer-wizard`)

This draft was written ahead of the stage while another Unit builds. The lead finalises it when the workflow reaches this Unit's Functional Design. It then moves to `<record>/construction/t-306-composer-wizard/functional-design/`.

Context:
- **Unit.** U26 (kind `ui`, size XL, not high risk) delivers T-306 for US6.1, US6.2, US7.1, US3.3 and US5.3. It is Bolt 21, after U21 T-301 (17), U23 T-303 (18) and U22 T-302 (20), and before U27 T-307 (22). U24 T-304 (27) and U25 T-305 (28) come later. FD-094 lets Units that do not collide build in parallel; `functional-spec.md` § 15 says what this Unit shares.
- **Owner instruction.** Since 2026-10-29 the owner has asked agents to decide every open point by the recommended option. Each question below therefore carries its answer, decided by the agent. Each is listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` when this draft is finalised. `functional-spec.md` § 14 lists what changes under each other option.
- **Inputs read.** T-306 (with its FD-091 amendment and FD-036 block); `unit-of-work.md` U26; `unit-of-work-dependency.md`; `bolt-plan.md`; `stories.md` US6.1, US6.2, US7.1, US3.3, US5.3 and AC7.2.3; `requirements.md` FR10, FR36–FR47, FR55, FR60–FR68, FR95, NFR2, NFR4, NFR6, NFR7, NFR13; `contract-summary.md` C6–C9 and C14; `decision-log.md` up to FD-094; `01-conventions.md`; `02-data-model.md`; `03-routes-and-contracts.md` §1 and §4; `PRODUCT.md`; the T-301, T-201, T-102, T-204, T-011, T-101, T-104, T-105, T-202, T-203, T-302, T-304 and T-305 drafts and the T-307 questions draft; the T-303, T-307 and T-409 task files (T-303 has no draft yet); the prototype (`app.js` composer, handlers and `styles.css`); `en.json`/`bn.json`; `eslint.boundaries.mjs`; `OWNER-REVIEW-QUEUE.md`; `ISSUES.md`. No open `ISSUES.md` row names T-306.

## What the code and data show that the task file does not

1. **Components cannot import the domain.** T-010's matrix lets `web-components` import `contracts`, `i18n`, actions and `web-shared` only. The task's `period.ts`, "pure parse helpers re-exported from domain", would turn `pnpm lint` red (F1). The same applies to `normalizeAliasKey` for the duplicate check.
2. **The evidence pipeline is not there at Bolt 21.** T-304 and T-305 are Bolts 27 and 28. Uploads stay `quarantined`, `applyRedaction` and `confirmPrivacy` do not exist, and the preview route is T-305's (F3).
3. **The task's `accept` list still names `.pdf`** (step 6), against FD-036 (F2). Its acceptance row expects `ev.fail.encrypted`, a value reserved for Phase 2 (F12).
4. **The prototype is one long form.** FR39 and AC6.1.2 ask for a step-by-step wizard with progress and Back/Next, and step 13 asks for a step slide. The prototype's data already has `compose.step`, `compose.of`, `compose.next` and `compose.back`.
5. **The prototype preselects** the first doctor and "The patient", and starts in detailed mode with "My username".
6. **Prototype bugs and literals.** `T('compose.identity')` reads a namespace object (the label key is `compose.identity.label`). The preview hard-codes "Your words will appear here.", "Your name", `shirin_88` and "March 2026". The preview shows claims without "Reviewer's label" and drops a missing outcome. The checks read only the first story field. The emergency pattern hard-codes 999.
7. **Contract drift.** For the upload response, C14 says `[{itemId, state}]` and T-303 says `{items: [{clientKey, result}]}`. For `getForAuthor`, 03 §4 says `{draftId}` and T-303 says `{itemIds}`. T-204 returns `submissionId`, while T-301's payload names a `doctorSubmissionPublicId` that has no column. 03 §4 lets the composer call `taxonomy.createProvisional`, which T-201 F12 forbids.
8. **T-301 asks things of this Unit**: the anonymity note rewording (FD entry (b)), the facility section (R1), the exact-date input (F20), the container wiring (F21) and honest username copy (F11).
9. **Line numbers moved.** The prototype composer is at `app.js` 1411–1720 and its handlers at 3105–3165 and 3290–3320, not the task's 1314–1608.
10. **Downstream drafts ask things of this Unit.** T-305 asks for the Skip privacy editing confirmation (AC7.2.3, its Question 10 A), a per-item confirm control, `previewPages[0].url` on the canvas, and notes that one call per stroke re-encodes the image each time (its F21). T-302 F17 asks the composer to add later-care entries after publish. T-304 F12 says the sanitising chip must not read "Making the public copy".
11. **T-204 settled the submission id.** `profile_submissions.public_id` is added (T-204 Q16 A) and `AddDoctorPanel` owns its toggle and gate and returns only `submissionPublicId`.
12. **The prototype's failed-file note is wrong before publish.** `ev.failNote` reads "Your words stayed published" inside the composer (F27).

## Settled before this stage

- **Look and motion.** The look is T-011's (FD-091), and page rules go in T-306's own `patient.css` section. Motion comes only from T-011's hooks (`data-step-dir`, `data-press`, `PublishTick`, static groups).
- **Server-side drafts.** Drafts are encrypted on the server and never kept in browser storage (01-conventions §8). Drafts save for unconfirmed accounts (T-301 Q3).
- **Rules owned elsewhere.** Minimum fields, publish rules, the title derivation, the persona and alias are T-301's. Upload limits and states are T-303's. Redaction and confirmation semantics are T-305's (FD-023).
- **Release 1 narrowings.** FR46's checkboxes are deferred (T-301 FD entry (a)). Release 1 has the three suggested Reviewer's labels only (T-301 FD entry (c)). The anonymity note is reworded with T-301 FD entry (b)'s exact text, and the lawful-access text lives on Terms and Privacy (the owner's T-207 answer).
- **Facility feedback is in this Unit** (T-301 R1), on the owner's criteria model (T-203).
- **The `/write` page.** It stays indexable and shows no address (T-102 Q14 A; the owner's masked-email answer). The gate components are T-102's.
- **Taxonomy.** Provisional terms are created at publish, never by the composer (T-201 F12).
- **Owner answers that apply.** Counts only (no percentages anywhere in the preview), "Former member" bylines, no public anonymity caveat, and FD-094 parallel building.

## Settled in this design without a question

- **Prototype defaults.** The composer starts in detailed mode with the pseudonymous identity, as the prototype does. These are safe defaults; the risky defaults are covered by Q2.
- **Safety checks.** They read all story text, Bengali digits included, and the configured ambulance number (F19, F20, T-105 BR10.1).
- **Wording and order.** The identity label is `compose.identity.label`, and the prototype's literals become keys (F9, F10). The preview always prefixes claims with "Reviewer's label" and shows "Not provided" (hard rules).
- **Images only.** The picker accepts JPEG and PNG, and client pre-checks never replace the server's (FD-036).
- **Tag limits.** At most 20 tags (T-301's bound). A free-text tag is at most 80 characters, marked `ASSUMPTION(T-306)`.
- **Autosave.** Saves are serialised, failed saves are retried and shown, and `beforeunload` warns only while a save is pending or failed.
- **The step in the URL.** The step is kept through `replaceState`, so the browser's Back leaves the composer.
- **No branch on doctor reviews.** The prototype offers no branch field, so none is offered. T-301 keeps the field optional.
- **No editing.** The composer does not edit published reviews or add follow-ups. Both are T-302 and T-409's (F15).
- **Doctor select.** It lists up to 100 doctors (F21). A search picker is a later Unit's.

## Question 1

**How is the one long prototype form turned into the wizard FR39 asks for?**

A. **Five steps that group the prototype's blocks in its order, with free movement between them** (recommended). The steps are: about the care; your story (tags and live checks included); how it went; name and documents; check and publish. A rail of five numbered buttons and Back/Next move to any step, and nothing is checked until Publish, which names each missing field and jumps to its step. The preview and disclaimer stay in the aside. An FD entry records that this one screen leaves FD-091's "prototype structure" (§ 17 (a)).
B. **One long form, as the prototype.** It meets FD-091 to the letter but not FR39 or AC6.1.2 (no progress indicator, no Back/Next), and it is long on a phone.
C. **Steps that check their own fields before Next.** Errors come earlier, but an author cannot look ahead, and the prototype's "nothing blocks until publish" is lost.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 2

**Does the composer preselect a doctor and "The patient", as the prototype does?**

A. **No. Doctor and relationship start empty and are required at Publish** (recommended). The select's first option is "Choose a doctor". `?doctor=` from a profile still preselects. The relationship is FD-014's attestation, so the author states it.
B. **Keep the prototype's preselection.** One less tap. But a caregiver's account reads as the patient's by default, a review can land on the first doctor in the list, and AC6.1.3's missing-relationship case cannot occur.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 3

**Components may not import the domain. How is the period checked?**

A. **On the server only.** The preview omits the parsed period when the text does not parse, and the field then shows `errors.review.periodInvalid` after blur; Publish refuses it as well (recommended). There is one parser, T-301's, and no new code path. The error appears after the 1.5 s save rather than at once.
B. **Move `parsePeriod` to `contracts`** so the field can check on blur. The feedback is instant, but this changes T-301's placement and adds a pure function to a package meant for schemas.
C. **A `checkPeriodAction` on each blur.** The feedback is instant, but it adds one more server call and one more action.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 4

**T-304 and T-305 come seven Bolts later. What does the composer ship for documents?**

A. **The whole evidence UI now** (recommended): upload, pre-checks, polling, chips, Replace and Remove, the redaction canvas and the per-item confirmation. `applyRedactionAction` and `confirmPrivacyAction` are stubs that refuse with `evidence.not_previewable` and carry a `TODO` naming the ISS row; T-305 replaces their bodies. The canvas and confirmation stay unreachable until an item can be `preview_ready`. T-305 changes two function bodies and adds one end-to-end acceptance row.
B. **Upload and chips only.** T-305 adds the canvas and confirmation to the composer as owned-path additions. This keeps stubs out of the code, but moves UI work into a high-risk backend Unit, which would then edit T-306's components.
C. **Reorder: build T-306 after T-305.** The composer is complete when it lands, but milestone 1's demo ("write and publish") moves seven Bolts later.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 5

**How often does the composer poll a file's state?**

A. **Every 2 s for 2 minutes, then every 10 s. Pause while the tab is hidden. Stop after 15 minutes with "Still processing…" and a "Check again" button** (recommended). It follows the task's 2 s while processing is normal, never runs forever (until T-304, nothing ever finishes), and promises no time (AC7.1.5).
B. **Every 2 s while the page is open, as the task text says.** Simple, but before T-304 it polls without end, and afterwards a stuck item does the same.
C. **No polling; a "Check again" button only.** No background calls, but no live states, which the task and AC6.1.6 rely on.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 6

**The duplicate check ("you already wrote about this doctor for this condition") needs the author's own published reviews, including anonymous ones. Where is it computed?**

A. **On the server. A new query `review.repeatHint({draftId})`, built by T-301, returns `{duplicate: boolean}` to the draft's author only** (recommended). Ownership is checked through `identity.ownsAnyPersona`, and no review id or title leaves the server. An FD entry records the boundary (§ 17 (b)). If T-301 merges without it, this Unit adds it as a recorded addition.
B. **The page passes the author's published doctor and condition pairs to the client**, as the task suggests. No new query, but the page payload then lists the account's anonymous reviews' doctors and conditions, a link Identity is meant to keep.
C. **Drop the composer's duplicate check** and rely on the server's `repeatEpisode` flag for moderators. Least code, but AC6.1.5's "duplicates" check becomes a gap.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 7

**T-307 owns `ExperienceBody` but builds after this Unit. How does the preview render?**

A. **A compact preview from T-301's exact `ExperiencePageVM` now. T-307 swaps the body for its `ExperienceBody` as a recorded addition** (recommended). Ownership stays as the task files set it, the two Units do not need a fixed merge order, and the preview is exact from day one, because the view model is.
B. **This Unit builds `ExperienceBody` and T-307 extends it.** There is no second rendering, but ownership moves, and the two Units collide on one file if built in parallel.
C. **Wait for T-307.** Build Bolt 22 first. Milestone 1 stays complete, but the order changes.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 8

**What happens after a successful publish?**

A. **Confirmation in place, with no automatic redirect** (recommended). The page shows one drawn tick, the plain confirmation text and a "Read your experience" link that takes focus; the text is announced once. The author decides when to leave, which suits screen-reader users (WCAG 2.2.1, 3.2.5).
B. **Redirect after 1.5 s, at once with reduced motion** (task step 9). It is faster, but the page changes without a request, and with reduced motion the confirmation is never seen.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 9

**`compose.redact` reads "Hide private details before you upload". In the product, the author covers details on the processed copy after uploading and before publishing. Change it?**

A. **Reword it to "Hide private details before you publish" / "প্রকাশের আগে ব্যক্তিগত তথ্য ঢাকুন"** (recommended). The heading then describes the real order. The body text (`compose.redactBody`) is unchanged, and the Bengali is flagged for the owner's review (FD-042).
B. **Keep the prototype's wording.** No copy change, but it tells authors to do something they cannot do here.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 10

**`review.preview` has no projection for facility feedback. What does the facility target preview?**

A. **T-301's preview gains a facility branch** returning the facility account as its branch page will show it (branch name, period, criteria as answered, story, byline). If T-301 merges without it, this Unit adds the branch as a recorded addition (recommended). FR39's final preview then holds for both targets.
B. **A local sketch labelled "Sketch — not the exact page".** No server change, but this is the only preview that is not exact.
C. **No preview for facility feedback.** Least work, but it falls short of FR39.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 11

**FR42 allows a private exact treatment date, which T-301 stores, but the prototype has no field for it. Add one?**

A. **Yes. An optional date input under the period, labelled as private** ("Only you and moderators see the exact date") (recommended). It meets FR42 and AC6.2.2. T-301 refuses a date outside the period, and the preview never shows it.
B. **No field.** The prototype is unchanged, but FR42's author half becomes a gap row.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 12

**The server never returns a file's name. What does a file chip show as its name?**

A. **The name from the author's own browser for this page session only, otherwise "Document 1", "Document 2"…** (recommended). The author recognises the file they just chose, and the name is never sent anywhere beyond the upload itself, never saved and never logged.
B. **The state text as the name** (task step 6: "name = label or `ev.state.*`"). Nothing is kept even in memory, but every chip reads alike, which is hard with several files.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 13

**T-302 (its F17) asks the composer to add later-care entries ("care I got elsewhere afterwards", with an optional later doctor) through `review.addFollowUp` right after publish, for AC6.2.5. The prototype composer has no such field. Add one?**

A. **No later-care block in the composer** (recommended). Later care is added after publish through T-302's `addFollowUp`, from T-409's add-follow-up entry point; T-302 links a later doctor and T-307 shows the callout, which is all AC6.2.5 asks. The composer keeps the prototype's fields, and the "after" section still takes free text. Publish stays one call that either succeeds or not.
B. **An optional later-care block on step 3**, saved in the draft (a new `DraftPayload` field in T-301) and posted with `addFollowUpAction` after a successful publish. It serves AC6.2.5 in one sitting, but it adds a field the prototype lacks, a dependency on U22, and a publish that can half-succeed (review public, later care lost) when the second call fails.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 14

**Covering a private detail cannot be undone (T-305 flattens it into new pixels), and each `applyRedaction` call re-encodes the image. The task sends one call per stroke on pointer-up. Keep that?**

A. **Draw masks locally, let the author undo or clear them, then send all of them in one call with "Cover these areas"** (recommended). The author sees every mask before anything is final, one call re-encodes once (T-305 allows up to 200 rectangles), and T-305's rate limit (120 per hour) is never near. The acceptance row still holds: a 50 × 20 css px mask arrives as `{w: 150, h: 60}` in the batch. Three short strings are added.
B. **One call per stroke, as the task says.** Immediate feedback, but every slip of the finger is permanent and each stroke costs a full re-encode.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Raised points, decided without a question

- **R1 — Documents that finish processing after publish (F6, S2).** No composer screen lets the author confirm them, so FD-023 keeps them private until someone builds one. **Decided:** this Unit lists them as staying private at publish (BR8.11) and keeps `EvidenceFileChip` and `RedactionCanvas` props-driven (BR8.10), so U38 T-409's "documents waiting for you" list (T-305 Question 16 A, `getForAuthor {reviewId}`) reuses them.
- **R5 — Skip privacy editing (AC7.2.3).** T-305 checks `skipEditing` on the server (its Question 10 A). **Decided:** an item with no covered area shows a Skip privacy editing checkbox that must be checked before its confirmation (BR8.9); two new key pairs (`compose.confirmItem`, `compose.skipEditing`).
- **R6 — The failed-file note before publish (F27).** **Decided:** the composer shows `compose.evidenceFailedNote` ("Your words can still be published…"); `ev.failNote` stays for published reviews.
- **R2 — FD-009's "short warning discouraging uncertain or unqualified advice".** The prototype composer has no such copy. **Decided:** release 1 relies on `compose.safetyNote`, `compose.claimsNote`, `compose.confirm3` and the persistent `disclaimer.long`. No new copy; recorded as an S4 note for the owner's queue.
- **R3 — `/write` stays indexable** (T-102 Q14 A) while signed-in content is private. Crawlers only ever see the gate, so nothing changes.
- **R4 — More than 100 doctors (F21).** A searchable picker is a later Unit's; an S4 row records it.
