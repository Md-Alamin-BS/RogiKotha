# Business rules — U26 `t-306-composer-wizard`

Source of truth for the Unit's decision logic. Built from T-306 (with its FD-091 amendment and the FD-036 images-only block), US6.1, US6.2, US7.1, US3.3, US5.3 and the author side of AC7.2.3, the hard rules in `project.md` and `PRODUCT.md`, `01-conventions.md`, contracts C6–C9 and C14, and the upstream drafts (T-301, T-201, T-102, T-204, T-011, T-101, T-105, T-305). Workflows are in `functional-spec.md`, shapes in `entities.md`, components in `frontend-components.md`.

Rules that depend on an answer name the question. Q1–Q14 are answered A, decided by the agent under the owner's no-questions instruction of 2026-10-29; `functional-spec.md` § 14 lists what changes under each other option. A rule that restates an upstream Unit's rule names it, and the upstream rule wins if they differ.

```yaml
rules:
  # 1. Page, gate and loading
  - id: BR1.1
    statement: "A signed-out visitor on /write sees the page head and the gate callout, and no form control."
    category: authorization
    applies_to: "write/page.tsx, WriteGateCallout (U9)"
    logic: ".a-head (nav.compose, compose.title, compose.intro) + WriteGateCallout; Composer not rendered; no composer data loaded"
    violation: "A form or a local-only draft for a signed-out visitor"
    source: "auth-screens-spec §3.7, T-102 BR10.1, T-306 step 1, acceptance 'Gate'"
  - id: BR1.2
    statement: "A signed-in, unconfirmed account gets the pending banner without an address and the composer; drafts save, but Publish, upload and add-a-doctor stay closed."
    category: authorization
    applies_to: "write/page.tsx, Composer, EvidenceField, AddDoctorPanel (U17)"
    logic: "PendingVerificationBanner without ownEmailMasked (T-102 Q14 A); #publish disabled with auth.gate.verifyToPublish; auth.gate.verifyToAct in place of #add-file; the panel gates itself through useAuthGate"
    violation: "Publish or upload offered to an unconfirmed account, or an address on an indexable page"
    source: "T-102 BR10.2 and Q14 A, T-301 Q3 (drafts need authentication only), T-303 step 4, T-204 AddDoctorPanel"
  - id: BR1.3
    statement: "The page loads its data through the web composition root and passes view models to the client root; components import server actions only."
    category: constraint
    applies_to: "write/page.tsx, components/patient/composer/**"
    logic: "page -> getActor() + container -> listDoctors, listSuggested x4, config.current(), listFacilities (facility on), getDraft, preview, repeatHint -> ComposerVM; components import contracts, i18n, server actions and web-shared only"
    violation: "pnpm lint fails (eslint.boundaries.mjs, FD-093)"
    source: "01-conventions §2, §8, FD-093"
  - id: BR1.4
    statement: "Without a draft the composer starts with the prototype's mode and identity defaults, no doctor, no relationship and this month in the period."
    category: calculation
    applies_to: "Composer initial state"
    logic: "target doctor, mode detailed, identity pseudonymous, doctor and relationship unset, periodText = formatMonthYear(clock.now(), locale), other fields empty, step 1"
    violation: "A preselected doctor or relationship, or an English month on the Bengali page"
    source: "prototype state (composeMode detailed, composeIdentity pseudo), Question 2"
  - id: BR1.5
    statement: "Query parameters only preselect; an unknown or hidden value is ignored without an error."
    category: validation
    applies_to: "write/page.tsx"
    logic: "doctor: isPublicId, listed, and the draft names no doctor; facility: facility feedback on and the branch listed -> target facility; step: integer 1..5 else 1"
    violation: "A crafted parameter that errors the page or selects a hidden doctor"
    source: "03-routes-and-contracts §1, construction.md (validate inputs at boundaries)"
  - id: BR1.6
    statement: "The page is indexable and titled in the active language."
    category: constraint
    applies_to: "write/page.tsx generateMetadata"
    logic: "documentTitle('compose'); no robots field"
    violation: "The pages.test.tsx route row fails"
    source: "T-102 Q14 A, 01-conventions §8, T-010 pages.test.tsx"

  # 2. Wizard
  - id: BR2.1
    statement: "The composer is five steps holding the prototype's blocks in the prototype's order."
    category: constraint
    applies_to: "Composer, StepPanel"
    logic: "1 care (target, mode, doctor + add, relationship, period, exact date); 2 story (quick story or four sections, tags, safety checks); 3 how it went (sentiment, outcome, claims); 4 identity and documents; 5 check and publish (checks, preview, confirmations, Publish, Save and finish later, saved flag); facility uses steps 1, 2, 4, 5"
    violation: "A block missing, reordered or reworded against the prototype"
    source: "FR39, AC6.1.2, T-306 steps 2 and 13, Question 1, FD entry (a)"
  - id: BR2.2
    statement: "Every step can be reached at any time; nothing is validated until Publish."
    category: policy
    applies_to: "StepRail, Back/Next"
    logic: "rail buttons and Back/Next set the step without checks; no Back on step 1, no Next on step 5"
    violation: "A step that blocks progress before Publish"
    source: "prototype (advisory checks), Question 1"
  - id: BR2.3
    statement: "A step change moves focus to the new step's heading and announces 'Step n of 5: name' once."
    category: constraint
    applies_to: "Composer"
    logic: "h2[tabindex=-1].focus(); announce compose.announce.step {n, total, name} in active-language digits; aria-current='step' on the rail item"
    violation: "Focus on a hidden control or a silent change (FR95, WCAG 2.4.3)"
    source: "T-306 step 13, AC6.1.2, FR95"
  - id: BR2.4
    statement: "The step lives in the URL through replaceState and never adds a history entry."
    category: policy
    applies_to: "Composer"
    logic: "history.replaceState(null, '', '?draft=<id>&step=<n>') (no draft before the first save); no pushState"
    violation: "Browser Back cycling through steps, or a reload losing the step"
    source: "AC6.1.2, T-306 step 3"
  - id: BR2.5
    statement: "Only the incoming step panel carries the direction of travel; the outgoing one leaves at once."
    category: constraint
    applies_to: "StepPanel"
    logic: "data-step-dir = forward when the new step is greater, else back; one panel in the DOM; no motion rule in T-306's CSS"
    violation: "Two panels animating, or a motion declaration in T-306's CSS (check:motion)"
    source: "T-011 BR6.3"

  # 3. Fields
  - id: BR3.1
    statement: "Mode switches between one story field and four section fields without losing text."
    category: calculation
    applies_to: "ModeSwitch, StoryFields"
    logic: "mode = quick | detailed; story and sections both stay in state and the draft; announce compose.announce.mode"
    violation: "Text lost on a switch"
    source: "prototype data-mode handler"
  - id: BR3.2
    statement: "The doctor is chosen from the listed doctors or added through T-204's panel; nothing is preselected."
    category: validation
    applies_to: "DoctorField, AddDoctorPanel (U17)"
    logic: "select with first empty option compose.doctorChoose, options 'name — specialty'; a choice sets doctorPublicId and clears doctorSubmissionPublicId; onSubmitted sets doctorSubmissionPublicId (+ pending name when given) and clears doctorPublicId; Publish stays disabled while a submission is pending"
    violation: "A review attributed to the first doctor by default"
    source: "prototype #f-doctor, T-204 AddDoctorPanel and Q16 A, T-301 BR2.4, Question 2"
  - id: BR3.3
    statement: "The relationship is one explicit choice of four, required at publish."
    category: validation
    applies_to: "RelationshipField"
    logic: "relationship = self | parent | family | witness; none until chosen; pressing the pressed one keeps it"
    violation: "A default that answers FD-014's attestation for the author"
    source: "FR40, FD-014, AC6.1.3, Question 2"
  - id: BR3.4
    statement: "Sentiment and outcome are optional single choices that a second press clears; nothing numeric is offered."
    category: policy
    applies_to: "SentimentField, OutcomeField"
    logic: "value or null; no rating, score, star or slider"
    violation: "A rating field or a forced choice (FR45)"
    source: "prototype data-sent and data-out, PRODUCT.md, AC6.1.1"
  - id: BR3.5
    statement: "The period is free text, prefilled with this month in the active language and checked on the server."
    category: validation
    applies_to: "PeriodField"
    logic: "no client parsing; IF periodText not empty AND the latest preview has no margin.period AND the field was blurred once THEN errors.review.periodInvalid under it; publish refusals name it too"
    violation: "A domain import in a component (F1), or an error shown while typing"
    source: "T-306 step 2, T-301 BR3.5, Question 3"
  - id: BR3.6
    statement: "An exact treatment date may be entered, is marked private and never appears in the preview."
    category: policy
    applies_to: "PeriodField, ComposerPreview"
    logic: "<input type=date> compose.exactDate with compose.exactDateNote; exactDate YYYY-MM-DD; preview shows month and year only; T-301 refuses a date outside the period"
    violation: "An exact date in a public projection (FR42, AC6.2.2)"
    source: "FR42, AC6.2.2, T-301 F20, Question 11"
  - id: BR3.7
    statement: "Claims are the three suggested codes, each toggled, framed as the author's claim."
    category: constraint
    applies_to: "ClaimsField"
    logic: "claims ⊆ {wrongDx, wrongRx, secondOpinion}; compose.claimsNote under the label; no custom label in release 1"
    violation: "A free-text label (T-301 FD entry (c)) or a claim worded as a finding"
    source: "FR47, AC6.2.4, T-301 FD entry (c)"
  - id: BR3.8
    statement: "The identity is chosen per review from three options; the anonymous note says only what readers see."
    category: constraint
    applies_to: "IdentityField"
    logic: "named | pseudonymous | anonymous (compose.identity.real | pseudo | anon, legend compose.identity.label); anonymous shows p.limited compose.identity.anonNote in T-301 FD entry (b)'s wording; no copy about staff access, lawful disclosure, or usernames hiding real names on the profile"
    violation: "AC3.3.6, or T-301 F11"
    source: "FR10, AC3.3.1, AC3.3.6, FD-008, FD-022, T-301 FD entry (b) and F11"
  - id: BR3.9
    statement: "The four confirmations are composer state; the server receives one attestation."
    category: calculation
    applies_to: "ConfirmList, publish"
    logic: "confirmations[4] saved in the draft; publish sends attestation: true only when all four are checked"
    violation: "Publish with an unchecked confirmation"
    source: "T-301 DraftPayload and BR3.6, prototype data-confirm, AC6.1.1 (adult account: compose.age)"

  # 4. Autosave and drafts
  - id: BR4.1
    statement: "A change saves the draft once, 1.5 s after the last edit, with one save in flight."
    category: calculation
    applies_to: "useAutosave"
    logic: "debounce 1500 ms; in flight -> mark dirty, save once more after; no second create before the first returns"
    violation: "Two drafts for one composer, or one save per keystroke"
    source: "T-306 step 3, acceptance 'Autosave'"
  - id: BR4.2
    statement: "A successful save shows 'Draft saved' for 1.8 s without movement, then refreshes the preview and the duplicate hint."
    category: constraint
    applies_to: "useAutosave, SavedFlag"
    logic: "store draftId; replaceState; #saved-flag.on 1800 ms; previewAction and repeatHintAction tagged with the save's sequence number; older responses dropped"
    violation: "A stale preview or an animated status"
    source: "prototype #save-draft timing, T-306 step 13"
  - id: BR4.3
    statement: "A failed save is shown and retried; the author's work is never silently dropped."
    category: policy
    applies_to: "useAutosave"
    logic: "compose.draftNotSaved; retry at 5, 15, 30 s then on the next change; validation -> errors.common.validation, no retry until a change; not_found -> next save creates a new draft, compose.draftMissing once"
    violation: "Lost text after a network error"
    source: "AC6.1.2, construction.md (no silent failure)"
  - id: BR4.4
    statement: "Drafts live only on the server; nothing goes to localStorage, sessionStorage or IndexedDB."
    category: constraint
    applies_to: "components/patient/composer/**"
    logic: "no Web Storage or IndexedDB call; a test greps the Unit's files"
    violation: "Private health text left on a shared phone"
    source: "01-conventions §8, T-306 step 3, hard-rule checklist"
  - id: BR4.5
    statement: "Save and finish later saves at once and then goes to the drafts tab."
    category: calculation
    applies_to: "#save-draft"
    logic: "flush; ok -> router.push('/{locale}/me?tab=drafts'); error -> stay with compose.draftNotSaved"
    violation: "Leaving with an unsaved change"
    source: "T-306 step 3, prototype #save-draft"
  - id: BR4.6
    statement: "A ?draft= that is missing, expired or another account's starts a new draft and says so once, without saying why."
    category: validation
    applies_to: "write/page.tsx"
    logic: "BR1.4 defaults; .callout compose.draftMissing above the rail; the first save replaces the id in the URL"
    violation: "An error page, or a hint that another account's draft exists"
    source: "T-301 BR1.2, BR2.3"
  - id: BR4.7
    statement: "A loaded draft restores every field; the server's doctor mirror wins over a pending submission."
    category: calculation
    applies_to: "write/page.tsx, Composer initial state"
    logic: "state = payload fields; IF payload has no doctorPublicId AND ComposerDraftVM.doctorPublicId THEN use it and drop doctorSubmissionPublicId (T-204 unblock); step from ?step=; tag labels from the preview's tags"
    violation: "A field not restored (AC6.1.2) or a draft unblocked by staff still shown as pending"
    source: "AC6.1.2, T-301 WF3 and BR2.4, T-204"

  # 5. Tags
  - id: BR5.1
    statement: "Each group offers its suggested terms as toggle chips."
    category: calculation
    applies_to: "TagGroups"
    logic: "groups symptom, condition, treatment, medicine (compose.tagGroup.<g>); chips from listSuggested({group}); tag {group, termPublicId}"
    violation: "Hard-coded suggestion names"
    source: "prototype TAG_GROUPS, T-201 WF9, FR36"
  - id: BR5.2
    statement: "Free text is resolved on Add; a match becomes the canonical chip, anything else stays the author's wording marked provisional."
    category: calculation
    applies_to: "TagGroups"
    logic: "trim; empty -> nothing; resolveTagAction({text, kind}); {publicId} -> {group, termPublicId}; none, ambiguous or error -> {group, freeText}, title condition.provisional"
    violation: "An unmapped tag refused (AC5.3.2) or rewritten (FR37)"
    source: "FR37, AC5.3.2, T-201 BR4.3, T-306 step 4"
  - id: BR5.3
    statement: "The composer never creates a taxonomy term."
    category: constraint
    applies_to: "server/actions/taxonomy.ts"
    logic: "no createProvisional action; review.publish creates provisional terms with the persona as actor"
    violation: "An account tied to a wording on an anonymous review (T-201 F12, FD-015)"
    source: "T-201 F12 and BR5.5, F4"
  - id: BR5.4
    statement: "Not sure is its own chip and may sit beside other tags."
    category: policy
    applies_to: "TagGroups"
    logic: "notSure = !notSure (top-level DraftPayload flag)"
    violation: "Not sure clearing other tags"
    source: "prototype data-tag notsure, T-306 step 4, F24"
  - id: BR5.5
    statement: "At most 20 tags, each free text at most 80 characters."
    category: validation
    applies_to: "TagGroups"
    logic: "20 tags -> Add disabled with compose.tagsMax; input maxLength 80 (ASSUMPTION(T-306): T-301 states no free-text bound)"
    violation: "A payload refused by T-301 BR2.2"
    source: "T-301 DraftPayload"
  - id: BR5.6
    statement: "Adding or removing a tag is announced."
    category: constraint
    applies_to: "TagGroups"
    logic: "announce compose.announce.tagAdded {tag} or tagRemoved {tag}"
    violation: "A silent chip change for screen-reader users"
    source: "T-306 step 10"

  # 6. Safety checks
  - id: BR6.1
    statement: "The phone-number check runs on all story text in both scripts."
    category: calculation
    applies_to: "safety-checks.ts"
    logic: "text = story + every section; ০-৯ mapped to 0-9; /(\\+?8801|01)[0-9\\s-]{7,}/ -> {pii, warn, compose.safetyPii, compose.safetyPiiFix}"
    violation: "A Bengali-digit number missed, or only the first section checked (F19)"
    source: "prototype safetyChecks, AC6.1.5"
  - id: BR6.2
    statement: "The emergency check matches the prototype's words and the configured ambulance number in both scripts."
    category: calculation
    applies_to: "safety-checks.ts"
    logic: "/(emergency|জরুরি|chest pain now|ambulance|অ্যাম্বুলেন্স|<number>|<number in Bengali digits>)/i, number escaped -> {emerg, danger, compose.safetyEmerg, compose.safetyEmergFix {ambulance: formatDigits(number, locale)}}"
    violation: "A configured number the check does not know (F20)"
    source: "prototype safetyChecks, T-105 BR10.1, AC6.1.5"
  - id: BR6.3
    statement: "The duplicate check comes from the server's boolean hint for this draft."
    category: calculation
    applies_to: "safety-checks.ts, repeatHintAction"
    logic: "repeatHint({draftId}).duplicate true -> {dup, warn, compose.safetyDup, compose.safetyDupFix}; no draft or error -> no finding"
    violation: "The author's reviews listed in the page payload (F7)"
    source: "AC6.1.5, FR43, Question 6, FD entry (b)"
  - id: BR6.4
    statement: "Ignored checks stay ignored for this draft; no check blocks publishing."
    category: policy
    applies_to: "SafetyChecks, #publish"
    logic: "ignoredChecks += id (saved); findings filtered by it; Publish enablement never reads findings"
    violation: "A check that blocks publication (FR44, FD-009)"
    source: "prototype data-ignore, FR44, FD-009"
  - id: BR6.5
    statement: "With no finding the list shows the pass item."
    category: constraint
    applies_to: "SafetyChecks"
    logic: ".safety-item.ok with the check mark, compose.safetyPass and compose.publishedNote"
    violation: "An empty block"
    source: "prototype renderCompose"
  - id: BR6.6
    statement: "Safety findings never animate and never disturb the caret."
    category: constraint
    applies_to: "SafetyChecks"
    logic: ".safety carries data-static='emergency' (T-011 static group); findings re-render from state without remounting the text field"
    violation: "AC2.4.4, or a lost caret"
    source: "AC2.4.4, T-011 BR7.2"

  # 7. Evidence
  - id: BR7.1
    statement: "Only confirmed accounts can attach files."
    category: authorization
    applies_to: "EvidenceField"
    logic: "verified -> #add-file; else auth.gate.verifyToAct in its place"
    violation: "An upload the route refuses with 403"
    source: "T-303 steps 3-4, C8"
  - id: BR7.2
    statement: "The file picker accepts JPEG and PNG only."
    category: validation
    applies_to: "EvidenceField"
    logic: "accept='image/jpeg,image/png,.jpg,.jpeg,.png'"
    violation: "A PDF offered (FD-036, F2)"
    source: "FD-036, T-306 scope change block"
  - id: BR7.3
    statement: "Each file is checked before upload, and the server checks again."
    category: validation
    applies_to: "EvidenceField"
    logic: "extension in {jpg, jpeg, png} and type in {image/jpeg, image/png} else errors.evidence.typeRejected; ≤ 15 MB else tooLarge; existing + new ≤ 10 else tooMany; total ≤ 100 MB else totalTooLarge; refused files not sent; server errors shown the same way"
    violation: "A refused file uploaded, or accept treated as the only guard"
    source: "FR61, AC7.1.2, AC7.1.3, T-303 limits, T-306 threat notes"
  - id: BR7.4
    statement: "The group of the next upload is chosen before upload, default reviewed treatment."
    category: calculation
    applies_to: "EvidenceField"
    logic: ".opt-row evidence.group.reviewed | later | outcome; default reviewed"
    violation: "Later-care evidence filed under the reviewed treatment"
    source: "T-306 step 6, EVIDENCE_GROUPS"
  - id: BR7.5
    statement: "An upload needs a saved draft and one idempotency key per file."
    category: calculation
    applies_to: "EvidenceField"
    logic: "no draftId -> flush first; FormData {draftId, group, idempotencyKey per file (crypto.randomUUID()), files}; POST /api/evidence/upload; ok ids appended to evidenceItemIds"
    violation: "A file uploaded twice on retry, or before its draft exists"
    source: "T-303 steps 3-4, 01-conventions §3"
  - id: BR7.6
    statement: "Polling runs only while an item is in flight, slows down, pauses when hidden and stops after 15 minutes."
    category: policy
    applies_to: "useEvidencePolling"
    logic: "getForAuthorAction({itemIds}) every 2 s for 120 s, then every 10 s; paused while document.hidden; at 15 min stop with compose.evidenceStillProcessing and compose.checkAgain (restarts fast); no time promised"
    violation: "An endless loop before T-304 exists (F3), or a promised time (AC7.1.5)"
    source: "T-306 step 6, NFR2, AC7.1.5, Question 5"
  - id: BR7.7
    statement: "The chip's static bar shows the stage out of six."
    category: calculation
    applies_to: "EvidenceFileChip, evidence-stage.ts"
    logic: "uploading 0, quarantined 1, validating 2, scanning 3, sanitising 4, preview_ready 5, privacy_confirmed 6; failed full with .bad; --w = stage / 6; no transition"
    violation: "An animated width or a bar that goes backwards"
    source: "prototype evFileHtml, T-306 step 6, T-011 BR6.10"
  - id: BR7.8
    statement: "A failed file shows its reason privately with Replace and Remove and never blocks the text."
    category: constraint
    applies_to: "EvidenceFileChip"
    logic: ".ev-file.bad; t(stateKey); t(failKey); compose.evidenceFailedNote (BR7.11); Replace = remove then open the picker; Remove; Publish ignores evidence"
    violation: "FR66, AC7.1.4, or text blocked by a file"
    source: "FR66, AC7.1.4, hard-rule checklist"
  - id: BR7.9
    statement: "A chip names a file by its local name for this page session only, otherwise 'Document n'."
    category: policy
    applies_to: "EvidenceFileChip"
    logic: "in-memory File.name for items uploaded in this session, else compose.evidenceItem {n}; never saved, logged or sent beyond the upload itself"
    violation: "A file name in a log, the payload or a URL (FR68)"
    source: "FR68, T-303 threat notes, Question 12"
  - id: BR7.10
    statement: "Every chip state change is announced once."
    category: constraint
    applies_to: "EvidenceField"
    logic: "announce compose.announce.fileState {file, state}"
    violation: "A silent failure for screen-reader users"
    source: "T-306 step 10"
  - id: BR7.11
    statement: "Before publish, a failed file's note says the words can still be published."
    category: constraint
    applies_to: "EvidenceFileChip"
    logic: "compose.evidenceFailedNote instead of the prototype's ev.failNote ('Your words stayed published'), which stays for published reviews"
    violation: "Copy claiming a publication that has not happened (F27)"
    source: "AC7.1.4, F27"

  # 8. Covering private details and confirmation
  - id: BR8.1
    statement: "Covering and confirmation are offered only for items in preview_ready."
    category: authorization
    applies_to: "EvidenceFileChip, RedactionCanvas"
    logic: "preview_ready -> compose.redactOpen + confirmation + .pending-confirm; any other state -> neither"
    violation: "A canvas on an unprocessed or confirmed item"
    source: "T-305 WF2-WF3, FD-023"
  - id: BR8.2
    statement: "The canvas draws on the item's processed preview image, one page."
    category: constraint
    applies_to: "RedactionCanvas"
    logic: "img src previewPages[0].url + '?v=<n>' inside .redact-canvas; alt compose.redactAlt; no page selector (FD-036)"
    violation: "The original or a stale image shown"
    source: "T-305 WF10 and cross-Unit note, FD-036, T-306 step 7"
  - id: BR8.3
    statement: "Masks are converted to page pixels, rounded and clamped; a tiny mask is dropped."
    category: calculation
    applies_to: "redaction-geometry.ts"
    logic: "sx = naturalWidth / clientWidth, sy = naturalHeight / clientHeight; {x: round(left*sx), y: round(top*sy), w: round(width*sx), h: round(height*sy)} clamped to the image; under 4 x 4 css px dropped"
    violation: "Acceptance 'Redaction coords' (50x20 css on 400 px of 1200 px -> w 150, h 60)"
    source: "T-306 step 7 and acceptance, T-305 BR2.2"
  - id: BR8.4
    statement: "Masks stay local and removable until the author commits them in one call."
    category: policy
    applies_to: "RedactionCanvas"
    logic: "pointer or keyboard adds a .mask; compose.redactUndo removes the last, compose.redactClear all; compose.redactApply sends every mask in one applyRedactionAction({itemId, pageNo: 1, rects}) (≤ 200); compose.redactApplyNote says covering cannot be undone and Replace starts again"
    violation: "An irreversible re-encode per stroke (T-305 F21)"
    source: "Question 14, T-305 F21 and BR9.1 (rects 1..200)"
  - id: BR8.5
    statement: "The canvas works with the keyboard."
    category: constraint
    applies_to: "RedactionCanvas"
    logic: "tabindex 0, role application, aria-label compose.redactTool, hint compose.redactKeyboard; arrows move a 10 px box (Shift 50), Alt + arrows resize, Enter adds it as a mask, Escape cancels"
    violation: "A pointer-only control (FR95)"
    source: "T-306 step 7, FR95, 01-conventions §14"
  - id: BR8.6
    statement: "A successful covering reloads the flattened image and is announced."
    category: calculation
    applies_to: "RedactionCanvas"
    logic: "v += 1; masks cleared; announce compose.redactApplied; error -> .callout.warn t(messageKey)"
    violation: "A mask overlay left on an image that was not flattened"
    source: "T-305 WF2 step 7"
  - id: BR8.7
    statement: "Until U25 T-305 merges, the two actions are stubs that refuse."
    category: constraint
    applies_to: "server/actions/evidence.ts"
    logic: "applyRedactionAction and confirmPrivacyAction return err('evidence.not_previewable') with TODO(<ISS id>): U25 T-305 wires the command; tested; unreachable while no item is preview_ready"
    violation: "Imports of missing exports, or a fake success"
    source: "Question 4, F3, construction.md (TODO with rationale)"
  - id: BR8.8
    statement: "Confirming privacy is per item and final."
    category: calculation
    applies_to: "EvidenceFileChip"
    logic: "confirmPrivacyAction({itemId, confirmed: true[, skipEditing: true]}); ok -> privacy_confirmed, canvas and checkboxes removed; no unconfirm (Replace to change); evidence.confirmation_required -> errors.evidence.confirmationRequired"
    violation: "A confirmed item covered again (T-305 refuses with conflict)"
    source: "FD-023, T-305 WF3"
  - id: BR8.9
    statement: "An item with no covered area needs the extra Skip privacy editing confirmation before it can be confirmed."
    category: validation
    applies_to: "EvidenceFileChip"
    logic: "compose.skipEditing checkbox shown above compose.confirmItem; confirmItem disabled until it is checked; the call then carries skipEditing: true"
    violation: "AC7.2.3 (skip without an extra confirmation)"
    source: "AC7.2.3, FR63, T-305 Question 10 A and BR3.2"
  - id: BR8.10
    statement: "Chip and canvas are driven by props only, so the author's workspace can reuse them."
    category: constraint
    applies_to: "EvidenceFileChip, RedactionCanvas"
    logic: "props {item, onRemove, onReplace, onApplied, onConfirmed}; no import of the composer reducer or context"
    violation: "T-409 forced to copy the canvas (F6)"
    source: "T-305 Question 16, F6"
  - id: BR8.11
    statement: "Items not confirmed at publish are listed as staying private and never block Publish."
    category: constraint
    applies_to: "PublishStep, published state"
    logic: "items in flight or preview_ready -> compose.evidenceUnconfirmed {names}"
    violation: "An author expecting an unconfirmed file to appear (AC6.1.6)"
    source: "AC6.1.6, FD-023, T-301 BR4.6"

  # 9. Preview
  - id: BR9.1
    statement: "The preview renders the server's exact projection of the saved draft."
    category: constraint
    applies_to: "ComposerPreview"
    logic: "render PreviewVM fields only; nothing computed from local state except the empty note"
    violation: "A preview that differs from the public page (FR39)"
    source: "T-306 step 8, T-301 WF4 and BR6.12"
  - id: BR9.2
    statement: "Claims in the preview carry the Reviewer's label prefix."
    category: constraint
    applies_to: "ComposerPreview"
    logic: ".reviewer-label with label.reviewerLabel before each claim"
    violation: "PRODUCT.md hard rule (F10)"
    source: "PRODUCT.md, AC6.2.4"
  - id: BR9.3
    statement: "A missing sentiment or outcome shows 'Not provided', never 0 or nothing."
    category: constraint
    applies_to: "ComposerPreview"
    logic: "FlagVM key label.notProvided -> plain badge"
    violation: "PRODUCT.md hard rule (F10)"
    source: "PRODUCT.md, T-301 BR6.5"
  - id: BR9.4
    statement: "The excerpt is cut at 220 graphemes."
    category: calculation
    applies_to: "ComposerPreview"
    logic: "truncateGraphemes(text, 220) with an ellipsis when cut"
    violation: "A split Bengali conjunct"
    source: "prototype renderPreview, 01-conventions §4"
  - id: BR9.5
    statement: "Before the first save the preview shows only the empty note."
    category: constraint
    applies_to: "ComposerPreview"
    logic: "p compose.previewEmpty"
    violation: "A guessed byline"
    source: "prototype renderPreview, F10"
  - id: BR9.6
    statement: "The disclaimer panel is always visible beside or below the form and never animates."
    category: constraint
    applies_to: "aside.c-side"
    logic: "section.panel disclaimer.long with data-static='disclaimer', outside any details; below the form at 360 px"
    violation: "PRODUCT.md (persistent disclaimer), AC2.4.4"
    source: "prototype renderCompose aside, T-011 BR7.3"
  - id: BR9.7
    statement: "The preview's byline shows the chosen identity only, with no alias before publish."
    category: constraint
    applies_to: "ComposerPreview"
    logic: "named -> display name; pseudonymous -> username; anonymous -> byline.anonSentence; formerMember -> byline.formerMember; never an alias, account id or email"
    violation: "AC3.3.1, or a private value in the DOM"
    source: "T-301 F26 and BR6.4, T-306 threat notes"

  # 10. Publish
  - id: BR10.1
    statement: "Publish is enabled only for a confirmed account with four confirmations, no failing save, no pending doctor submission and no call in flight."
    category: authorization
    applies_to: "#publish"
    logic: "else disabled with aria-describedby to the first reason: auth.gate.verifyToPublish | compose.addPending | compose.confirmTitle | compose.draftNotSaved"
    violation: "Acceptance 'Publish gating'"
    source: "T-306 step 9, T-102 BR10.2, T-301 BR2.4"
  - id: BR10.2
    statement: "Publish flushes the pending save and sends the identity and the attestation."
    category: calculation
    applies_to: "PublishStep"
    logic: "pause autosave; await flush; publishAction({draftId, identityMode, attestation: true}) or facilityPublishAction"
    violation: "Publishing an older payload than the one on screen, or a double submit"
    source: "T-301 WF5, BR3.7"
  - id: BR10.3
    statement: "A successful publish shows one drawn tick with plain text and a focused link, and does not redirect."
    category: constraint
    applies_to: "published state"
    logic: "PublishTick(compose.publishedNote) + Link compose.publishedLink to /{locale}/experiences/{publicId}, focused; announce compose.publishedNote; autosave stopped; no confetti, badge, points, streak, countdown or share nudge"
    violation: "AC2.4.5, or a timed context change (F16)"
    source: "T-306 steps 9 and 13, T-011 BR6.4, AC2.4.5, Question 8"
  - id: BR10.4
    statement: "Missing minimum fields are listed in one summary and the wizard goes to the first one."
    category: validation
    applies_to: "ErrorSummary"
    logic: ".callout.warn above the rail: errors.review.minFields + one link per fieldErrors entry in the server's order; step of the field (doctor, relationship, period, branch: 1; story, section, tag: 2); focus it; announce; a line disappears when its field changes"
    violation: "AC6.1.3, acceptance 'Publish error'"
    source: "AC6.1.3, AC5.3.1, T-301 BR3.3, auth spec §2"
  - id: BR10.5
    statement: "A refused attestation goes to the confirmations."
    category: validation
    applies_to: "PublishStep"
    logic: "step 5, focus the first unchecked box, errors.review.attestationRequired"
    violation: "A refusal without a way to fix it"
    source: "T-301 BR3.6"
  - id: BR10.6
    statement: "A rate limit shows the wait in minutes in the active language."
    category: calculation
    applies_to: "PublishStep"
    logic: "errors.common.rateLimited {minutes: formatNumber(ceil(retryAfterSec / 60), locale)}"
    violation: "Seconds or Latin digits on the Bengali page"
    source: "T-306 step 9, T-301 BR1.4"
  - id: BR10.7
    statement: "Any other refusal keeps the draft and says so."
    category: policy
    applies_to: "PublishStep"
    logic: ".callout.warn t(messageKey); autosave resumes"
    violation: "A lost draft or an unexplained failure"
    source: "T-301 WF5, 01-conventions §3"
  - id: BR10.8
    statement: "Publish does not depend on evidence state."
    category: policy
    applies_to: "PublishStep"
    logic: "no evidence term in BR10.1; T-301 links confirmed items and binds pending ones"
    violation: "Text blocked by a file (FR44, AC6.1.6)"
    source: "FR44, AC6.1.6"
  - id: BR10.9
    statement: "The page never renders the account's email, account id or persona id."
    category: constraint
    applies_to: "write/page.tsx, every composer component"
    logic: "ComposerVM carries none of them; a test scans the HTML and the client props"
    violation: "T-306 threat notes, T-102 Q14 A"
    source: "T-306 threat notes, T-102 Q14 A"

  # 11. Facility target
  - id: BR11.1
    statement: "The facility target is offered only while facility feedback is on."
    category: authorization
    applies_to: "TargetSwitch"
    logic: "featureVisibility.facilityAccounts -> compose.target.doctor | facility; off -> doctor only, ?facility= ignored"
    violation: "Facility feedback offered while off (T-301 BR8.4)"
    source: "T-301 R1 and BR8.4"
  - id: BR11.2
    statement: "Facility feedback has branch, period, story, nine optional criteria and identity."
    category: constraint
    applies_to: "Composer (facility)"
    logic: "step 1 branch select (compose.branch) + period + exact date; step 2 story (compose.facilityStoryHint) + criteria (compose.criteria); step 3 skipped; step 4 identity only; step 5 as BR2.1; no tags, sentiment, outcome, claims or documents"
    violation: "A doctor field on facility feedback, or a score from criteria (FR27)"
    source: "T-301 BR8.1, the owner's facility criteria answer (T-203 Q1), FR27"
  - id: BR11.3
    statement: "Switching the target keeps shared fields and hides the rest."
    category: calculation
    applies_to: "TargetSwitch"
    logic: "story, period, exactDate, identity, confirmations kept; target-specific fields hidden but kept in the draft"
    violation: "Text lost on a switch"
    source: "BR3.1 by analogy"
  - id: BR11.4
    statement: "Criteria are clearable toggles with no number."
    category: constraint
    applies_to: "CriteriaField"
    logic: "per criterion an .opt-row crit.good | crit.mixed | crit.poor; second press clears; crit.reportTrustNote under reportTrust"
    violation: "A score or average (FR27, PRODUCT.md)"
    source: "FR27, PRODUCT.md"
  - id: BR11.5
    statement: "The facility preview is the server's projection of the facility draft."
    category: constraint
    applies_to: "ComposerPreview (facility)"
    logic: "render T-301's facility preview (Q10); fallback query of functional-spec § 12 if T-301 merged without it"
    violation: "A guessed facility preview (F8)"
    source: "FR39, Question 10"
  - id: BR11.6
    statement: "Facility publish uses its own action and the same refusals."
    category: calculation
    applies_to: "PublishStep (facility)"
    logic: "facilityPublishAction({draftId, identityMode, attestation: true}); BR10.4-BR10.7 with fieldErrors.branch -> step 1"
    violation: "A facility draft sent to review.publish (T-301 refuses)"
    source: "T-301 WF5 step 3, WF6"

  # 12. Look, motion, accessibility, copy
  - id: BR12.1
    statement: "The look comes only from T-011 tokens and classes; T-306's rules go in its own section."
    category: constraint
    applies_to: "patient.css T-306 section"
    logic: "prototype class names where T-011 kept them; new classes as frontend-components § 7, each marked /* added: T-306 reason */; --space-* spacing; no literal colour; tokens.css and motion.css untouched (a missing token is an ISSUES row for U45)"
    violation: "FD-091 amendment, T-011 BR3.6"
    source: "T-306 FD-091 amendment, project.md Code Style"
  - id: BR12.2
    statement: "Motion is only T-011's: step slide, press, one publish tick; with reduced motion nothing moves and every step completes."
    category: constraint
    applies_to: "Composer"
    logic: "data-step-dir on the incoming panel; pressables are .opt, .c-mode, .btn or carry data-press; PublishTick on success; no transition or animation in T-306's CSS"
    violation: "pnpm check:motion fails; AC2.4.3"
    source: "T-306 step 13, T-011 BR6.3, BR6.4, BR6.11, AC2.4.3"
  - id: BR12.3
    statement: "Disclaimer, emergency finding and demo marker never animate."
    category: constraint
    applies_to: "aside disclaimer, .safety, layout demo marker"
    logic: "data-static='disclaimer' on the disclaimer; data-static='emergency' on .safety, which T-011's static set exempts even inside a sliding panel"
    violation: "AC2.4.4"
    source: "AC2.4.4, T-011 BR7.1-BR7.4"
  - id: BR12.4
    statement: "Every user-facing string is a key in both languages, added in one commit; numerals follow the language."
    category: constraint
    applies_to: "composer components, packages/i18n/messages/{en,bn}.json"
    logic: "ENT-009 keys in both files; numbers through formatNumber or formatDigits; no text-transform on Bengali; new Bengali flagged for the owner's review (FD-042)"
    violation: "pnpm i18n:check fails; project.md Forbidden (hard-coded string)"
    source: "project.md Mandated, 01-conventions §6, FD-024, FD-042"
  - id: BR12.5
    statement: "The composer works at 360 px without horizontal scrolling, with 44 px targets."
    category: constraint
    applies_to: "Composer, T-306 CSS"
    logic: ".c-grid one column below 60rem; five 44 px rail targets; wrapping chips; preview in details on steps 1-4"
    violation: "NFR4"
    source: "NFR4, T-011 (44 px targets)"
  - id: BR12.6
    statement: "Controls have labels, choice groups have legends, errors are tied to fields."
    category: constraint
    applies_to: "every field component"
    logic: "label[for] for inputs; fieldset/legend per .opt-row; aria-describedby to errors and hints; aria-pressed on choice buttons"
    violation: "FR95, NFR6, axe serious or critical"
    source: "FR95, NFR6"
  - id: BR12.7
    statement: "The only inline styles are the bar's custom property and the live mask's box."
    category: constraint
    applies_to: "EvidenceFileChip, RedactionCanvas"
    logic: "style={{'--w': stage/6}} on .ev-bar i; left/top/width/height on a .mask (prototype); every other prototype inline style becomes a T-306 class"
    violation: "Inline styles beyond the prototype's"
    source: "01-conventions §7.2, T-306 hard-rule checklist"
  - id: BR12.8
    statement: "Two prototype strings are reworded."
    category: constraint
    applies_to: "compose.identity.anonNote, compose.redact"
    logic: "anonNote = T-301 FD entry (b)'s en and bn text; compose.redact en 'Hide private details before you publish', bn 'প্রকাশের আগে ব্যক্তিগত তথ্য ঢাকুন'"
    violation: "AC3.3.6, or copy describing the wrong order (F11)"
    source: "T-301 FD entry (b), Question 9"

  # 13. Build constraints
  - id: BR13.1
    statement: "Server actions follow parse, getActor, container call, Result, and catch thrown errors."
    category: constraint
    applies_to: "server/actions/{review,taxonomy,evidence}.ts"
    logic: "contracts schema; getActor(); container call; Result; catch -> err('internal', fresh correlationId), log {event, correlationId} only"
    violation: "01-conventions §3, §11"
    source: "01-conventions §3, T-101 § 6.3"
  - id: BR13.2
    statement: "No component imports domain, database, adapters, test-support, non-action server modules or Node built-ins."
    category: constraint
    applies_to: "components/patient/composer/**, lib/graphemes.ts"
    logic: "eslint.boundaries.mjs web-components and web-shared rules"
    violation: "F1"
    source: "FD-093"
  - id: BR13.3
    statement: "apps/web stays at or above 80% line coverage with the new files counted."
    category: constraint
    applies_to: "apps/web"
    logic: "each component, hook, helper and action has a test; builders in composer-test-support.ts, never @rogikotha/test-support"
    violation: "T-010 coverage floor"
    source: "T-010, team.md Testing Posture"
  - id: BR13.4
    statement: "The Unit edits only its owned paths and the recorded additions."
    category: constraint
    applies_to: "the Bolt diff"
    logic: "functional-spec § 12; anything else is a recorded addition with its reason in the hand-off"
    violation: "team.md (owned paths only)"
    source: "team.md, 01-conventions §12"
  - id: BR13.5
    statement: "The gate is the full pnpm check, pnpm smoke, the detector, contrast and CI on the Bolt head."
    category: constraint
    applies_to: "Build and Test"
    logic: "pnpm check (eleven steps), pnpm smoke with composer.smoke.test.tsx, npx impeccable detect apps/web/src --no-advisory, pnpm contrast, CI green"
    violation: "team.md steps 2-3"
    source: "team.md Way of Working, T-011 WF8"
  - id: BR13.6
    statement: "The two FD entries are in the decision log before any code."
    category: constraint
    applies_to: "docs/status/decision-log.md"
    logic: "functional-spec § 17 rows appended with the next free ids"
    violation: "project.md Mandated (decision log first)"
    source: "project.md Mandated"
```
