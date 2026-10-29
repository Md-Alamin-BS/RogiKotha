# Entities — U26 `t-306-composer-wizard`

Source of truth for the data shapes this Unit reads and the state it holds. The Unit adds no table, column, migration or `packages/contracts` type. It holds client state in one reducer and persists it through T-301's encrypted draft. Its entities: the page's view model, the composer state and its mapping to T-301's `DraftPayload`, the chips and findings derived from it, the evidence view it polls (T-303's, extended by T-305), the redaction rectangle (T-305's input), the step model, the server actions and the message keys. Workflows are in `functional-spec.md`, rules in `rules.md`, components in `frontend-components.md`.

Built from T-301's `entities.md` (`DraftPayload`, `ComposerDraftVM`, `PreviewVM = ExperiencePageVM`, `PageBylineVM`, `FlagVM`, `TagVM`), T-201's view models, T-204's `submitProfile → {submissionPublicId}`, T-303's task file (`EvidenceAuthorItemVM`, upload response), T-305's draft (`previewPages`, `needsSkipAcknowledgement`, `Rect`, `ConfirmPrivacyInput`), `packages/contracts/src/enums.ts` and `packages/i18n/messages/{en,bn}.json` on `main` at `14c21a9`.

```yaml
entities:
  - id: ENT-001
    name: ComposerVM
    owner: this Unit (components/patient/composer/types.ts; built by write/page.tsx)
    description: "Everything the client root needs on first render. Serialisable; no email, account id or persona id (BR10.9)."
    attributes:
      - { name: locale, type: "enum en|bn", required: true }
      - { name: verified, type: boolean, required: true, constraints: "Actor.emailVerified" }
      - { name: publishDisabledReason, type: string, required: false, constraints: "T-102's export; auth.gate.verifyToPublish when unverified" }
      - { name: doctors, type: "list<{publicId, label}>", required: true, constraints: "'name — specialty' in locale, listDoctors order, ≤ 100 (F21)" }
      - { name: suggestions, type: "map<TagGroup, list<{publicId, name}>>", required: true }
      - { name: facilityEnabled, type: boolean, required: true, constraints: "featureVisibility.facilityAccounts" }
      - { name: branches, type: "list<{publicId, label}>", required: false, constraints: "only when facilityEnabled; T-202 facilityLabel" }
      - { name: ambulanceNumber, type: string, required: true, constraints: "config.emergency.ambulance" }
      - { name: defaultPeriodText, type: string, required: true, constraints: "formatMonthYear(clock.now(), locale)" }
      - { name: draft, type: ComposerDraftVM, required: false, constraints: "T-301; absent for a new draft" }
      - { name: draftMissing, type: boolean, required: true, constraints: "BR4.6" }
      - { name: initialPreview, type: "PreviewVM | FacilityPreviewVM", required: false }
      - { name: initialDuplicate, type: boolean, required: true, default: false }
      - { name: initialEvidence, type: "list<EvidenceAuthorItemVM>", required: false, constraints: "getForAuthor for the draft's evidenceItemIds" }
      - { name: preselect, type: "{doctorPublicId?, branchPublicId?, step}", required: true, constraints: "BR1.5" }

  - id: ENT-002
    name: ComposerState
    owner: this Unit (Composer reducer)
    description: "The prototype's state.compose* fields plus server-side ids. Everything except the ui block and display-only fields is saved as DraftPayload."
    attributes:
      - { name: target, type: "enum doctor|facility", required: true, default: doctor }
      - { name: mode, type: "enum quick|detailed", required: true, default: detailed }
      - { name: doctorPublicId, type: string, required: false }
      - { name: doctorSubmissionPublicId, type: string, required: false, constraints: "T-204 submissionPublicId (T-204 Q16 A); T-301 BR2.4 blocks the draft" }
      - { name: pendingDoctorName, type: string, required: false, constraints: "display only, from the panel; not saved" }
      - { name: branchPublicId, type: string, required: false, constraints: "facility target" }
      - { name: relationship, type: "enum self|parent|family|witness", required: false, constraints: "no default (Q2)" }
      - { name: periodText, type: text, required: true }
      - { name: exactDate, type: string, required: false, constraints: "YYYY-MM-DD; private (Q11)" }
      - { name: story, type: text, required: false, max: 10000 }
      - { name: sections, type: "map<symptoms|diagnosis|treatment|after, text>", required: false, constraints: "each ≤ 5000" }
      - { name: tags, type: "list<TagChip>", required: false, max: 20 }
      - { name: notSure, type: boolean, required: true, default: false }
      - { name: sentiment, type: "enum positive|mixed|negative", required: false }
      - { name: outcome, type: "enum helped|none|worse|uncertain", required: false }
      - { name: claims, type: "list<wrongDx|wrongRx|secondOpinion>", required: false, max: 3 }
      - { name: criteria, type: "map<criterion, good|mixed|poor>", required: false, constraints: "facility; the nine crit.* keys; absent = not answered" }
      - { name: identity, type: "enum named|pseudonymous|anonymous", required: true, default: pseudonymous }
      - { name: evidenceItemIds, type: "list<string>", required: false, max: 10 }
      - { name: ignoredChecks, type: "list<pii|emerg|dup>", required: false }
      - { name: confirmations, type: "list<boolean> (4)", required: true, default: "[false, false, false, false]" }
      - { name: draftId, type: string, required: false }
      - { name: ui, type: "{step 1..5, saveStatus idle|pending|saving|saved|failed, saveSeq, publishing, publishedPublicId?, errorSummary?, uploadGroup, blurredPeriod}", required: true, constraints: "not saved" }

  - id: ENT-003
    name: TagChip
    owner: this Unit
    attributes:
      - { name: group, type: "enum symptom|condition|treatment|medicine", required: true }
      - { name: termPublicId, type: string, required: false }
      - { name: freeText, type: text, required: false, max: 80, constraints: "exactly one of termPublicId and freeText" }
      - { name: label, type: string, required: true, constraints: "display only; restored from the preview's tags" }
      - { name: provisional, type: boolean, required: true, constraints: "freeText present" }

  - id: ENT-004
    name: SafetyFinding
    owner: this Unit (safety-checks.ts, pure)
    attributes:
      - { name: id, type: "enum pii|emerg|dup", required: true }
      - { name: level, type: "enum warn|danger", required: true, constraints: "pii warn, emerg danger, dup warn" }
      - { name: titleKey, type: string, required: true }
      - { name: fixKey, type: string, required: true }
      - { name: fixParams, type: map, required: false, constraints: "emerg: {ambulance}" }

  - id: ENT-005
    name: EvidenceChipVM
    owner: this Unit, from T-303's EvidenceAuthorItemVM (T-305 adds the preview fields)
    description: "One file as the author sees it. Never carries a file name from the server, a storage key or an account field."
    attributes:
      - { name: itemId, type: string, required: true }
      - { name: group, type: "enum reviewed|later|outcome", required: true }
      - { name: state, type: "EvidenceState | uploading", required: true }
      - { name: stateKey, type: string, required: true, constraints: "T-303's key per state; uploading -> compose.uploading" }
      - { name: failKey, type: string, required: false, constraints: "ev.fail.<reason>" }
      - { name: canRemove, type: boolean, required: true }
      - { name: canReplace, type: boolean, required: true }
      - { name: previewUrl, type: string, required: false, constraints: "previewPages[0].url (T-305); absent before T-305" }
      - { name: needsSkipAcknowledgement, type: boolean, required: false, constraints: "T-305: redactionCount = 0 (BR8.9)" }
      - { name: stage, type: integer, required: true, min: 0, max: 6, constraints: "evidence-stage.ts (BR7.7)" }
      - { name: localName, type: string, required: false, constraints: "File.name from this page session only (BR7.9)" }
      - { name: previewVersion, type: integer, required: true, default: 0, constraints: "cache-bust after a covering" }

  - id: ENT-006
    name: RedactionRect
    owner: T-305 (Rect, input of evidence.applyRedaction); computed here
    attributes:
      - { name: x, type: integer, required: true, min: 0 }
      - { name: y, type: integer, required: true, min: 0 }
      - { name: w, type: integer, required: true, min: 1 }
      - { name: h, type: integer, required: true, min: 1 }
    constraints:
      - "Page pixels of the processed image, clamped to it (BR8.3)"
      - "Sent as one batch of 1..200 with pageNo 1 (BR8.4, FD-036)"

  - id: ENT-007
    name: Step
    owner: this Unit
    attributes:
      - { name: n, type: integer, required: true, min: 1, max: 5 }
      - { name: key, type: "enum care|story|outcome|identity|publish", required: true }
      - { name: nameKey, type: string, required: true, constraints: "compose.stepName.<key>" }
      - { name: fields, type: "list<fieldErrors key>", required: true, constraints: "care: doctor, relationship, period, branch; story: story, section, tag; facility skips outcome" }

  - id: ENT-008
    name: Server actions (the Unit's)
    owner: this Unit (server/actions/*)
    attributes:
      - { name: saveDraftAction, type: "({draftId?, payload: DraftPayload}) -> Result<{draftId, expiresAt}>", required: true }
      - { name: previewAction, type: "({draftId}) -> Result<PreviewVM | FacilityPreviewVM>", required: true }
      - { name: repeatHintAction, type: "({draftId}) -> Result<{duplicate: boolean}>", required: true, constraints: "Q6, FD entry (b)" }
      - { name: publishAction, type: "({draftId, identityMode, attestation: true}) -> Result<{publicId}>", required: true }
      - { name: facilityPublishAction, type: "({draftId, identityMode, attestation: true}) -> Result<{publicId}>", required: true }
      - { name: resolveTagAction, type: "({text, kind}) -> Result<{publicId?, name?, ambiguous?}>", required: true, constraints: "drops T-201's internal termId" }
      - { name: applyRedactionAction, type: "({itemId, pageNo: 1, rects: Rect[1..200]}) -> Result<{pageNo, width, height, redactionCount}>", required: true, constraints: "stub until T-305 (BR8.7)" }
      - { name: confirmPrivacyAction, type: "({itemId, confirmed: true, skipEditing?: true}) -> Result<{state}>", required: true, constraints: "stub until T-305" }
      - { name: "getForAuthorAction, removeEvidenceAction", type: "T-303's", required: true, constraints: "owned by T-303's evidence.ts; used here" }

  - id: ENT-009
    name: Message keys
    owner: this Unit (packages/i18n/messages/{en,bn}.json)
    description: "Added in both files in one commit; Bengali drafted here and flagged for the owner's review (FD-042)."
    attributes:
      - { name: "compose.stepName.care | story | outcome | identity | publish", type: copy, required: true, constraints: "en 'About the care', 'Your story', 'How it went', 'Name and documents', 'Check and publish'; bn 'চিকিৎসার তথ্য', 'আপনার কথা', 'কেমন গেল', 'নাম ও কাগজপত্র', 'দেখে নিয়ে প্রকাশ'" }
      - { name: compose.steps, type: copy, required: true, constraints: "en 'Steps', bn 'ধাপসমূহ'" }
      - { name: compose.doctorChoose, type: copy, required: true, constraints: "en 'Choose a doctor', bn 'একজন ডাক্তার বাছুন'" }
      - { name: "compose.exactDate, compose.exactDateNote", type: copy, required: true, constraints: "en 'Exact date — optional', 'Only you and moderators see the exact date. Readers see the month and year.'; bn 'সঠিক তারিখ — ঐচ্ছিক', 'সঠিক তারিখ শুধু আপনি ও মডারেটররা দেখেন। পাঠকেরা দেখেন মাস ও বছর।'" }
      - { name: "compose.tagFree, compose.tagAdd, compose.tagsMax", type: copy, required: true, constraints: "en 'Add your own words', 'Add', 'You can add up to 20 tags.'; bn 'নিজের ভাষায় যোগ করুন', 'যোগ করুন', 'সর্বোচ্চ ২০টি ট্যাগ দেওয়া যায়।'" }
      - { name: compose.previewEmpty, type: copy, required: true, constraints: "prototype literal: en 'Your words will appear here.', bn 'আপনার লেখা এখানে দেখা যাবে।'" }
      - { name: "compose.draftNotSaved, compose.draftMissing", type: copy, required: true, constraints: "en 'Not saved yet — we will try again', 'That draft is no longer available. You can start a new one here.'; bn 'এখনো সংরক্ষিত হয়নি — আবার চেষ্টা করা হবে', 'সেই খসড়াটি আর নেই। এখানে নতুন করে শুরু করতে পারেন।'" }
      - { name: "compose.uploading, compose.evidenceItem, compose.evidenceStillProcessing, compose.checkAgain, compose.evidenceUnconfirmed", type: copy, required: true, constraints: "en 'Uploading', 'Document {n}', 'Still processing. It stays private until it finishes, and your words can be published now.', 'Check again', 'These documents stay private: {names}'; bn 'আপলোড হচ্ছে', 'কাগজ {n}', 'এখনো প্রক্রিয়া চলছে। শেষ না হওয়া পর্যন্ত এটি গোপন থাকবে; আপনার লেখা এখনই প্রকাশ করা যায়।', 'আবার দেখুন', 'এই কাগজগুলো গোপন থাকবে: {names}'" }
      - { name: compose.evidenceFailedNote, type: copy, required: true, constraints: "F27; en 'Your words can still be published. Only this file is held back.', bn 'আপনার লেখা এখনো প্রকাশ করা যায়। শুধু এই ফাইলটি আটকে আছে।'" }
      - { name: "compose.redactOpen, compose.redactKeyboard, compose.redactApplied, compose.redactAlt", type: copy, required: true, constraints: "en 'Cover private details', 'Arrow keys move the box, Alt and arrows change its size, Enter marks the area.', 'Areas covered.', 'Processed copy of your document'; bn 'ব্যক্তিগত তথ্য ঢাকুন', 'তীরচিহ্ন বোতামে বাক্স সরান, Alt সহ তীরচিহ্নে আকার বদলান, Enter চাপলে অংশটি চিহ্নিত হবে।', 'অংশগুলো ঢাকা হয়েছে।', 'আপনার কাগজের প্রক্রিয়াকৃত কপি'" }
      - { name: "compose.redactUndo, compose.redactClear, compose.redactApply, compose.redactApplyNote", type: copy, required: true, constraints: "Q14; en 'Undo last', 'Clear all', 'Cover these areas', 'Covered areas cannot be uncovered. To start again, replace the file.'; bn 'শেষটি বাতিল', 'সব মুছুন', 'এই অংশগুলো ঢাকুন', 'ঢাকা অংশ আর খোলা যায় না। নতুন করে শুরু করতে ফাইলটি বদলান।'" }
      - { name: "compose.confirmItem, compose.skipEditing", type: copy, required: true, constraints: "BR8.8, BR8.9 (T-305 asks for a per-item control); en 'I checked this copy. Nothing private is left on it.', 'Skip privacy editing: nothing on this copy needs covering.'; bn 'আমি এই কপিটি দেখেছি। এতে কোনো ব্যক্তিগত তথ্য নেই।', 'গোপনীয়তা সম্পাদনা বাদ দিন: এই কপিতে ঢাকার মতো কিছু নেই।'" }
      - { name: "compose.target, compose.target.doctor, compose.target.facility, compose.branch, compose.criteria, compose.facilityStoryHint", type: copy, required: true, constraints: "en 'What are you writing about?', 'A doctor', 'A hospital, clinic or lab visit', 'Which place?', 'How was each part of the visit? — Optional', 'At least a few sentences about the visit.'; bn 'আপনি কী নিয়ে লিখছেন?', 'একজন ডাক্তার', 'হাসপাতাল, ক্লিনিক বা ল্যাবে যাওয়া', 'কোন জায়গা?', 'ভিজিটের প্রতিটি অংশ কেমন ছিল? — ঐচ্ছিক', 'ভিজিট নিয়ে অন্তত কয়েকটি বাক্য।'" }
      - { name: compose.publishedLink, type: copy, required: true, constraints: "en 'Read your experience', bn 'আপনার অভিজ্ঞতা পড়ুন'" }
      - { name: "compose.announce.step, mode, tagAdded, tagRemoved, fileState", type: copy, required: true, constraints: "en 'Step {n} of {total}: {name}', 'Mode: {mode}', 'Tag added: {tag}', 'Tag removed: {tag}', '{file}: {state}'; bn 'ধাপ {n} / {total}: {name}', 'ধরন: {mode}', 'ট্যাগ যোগ হয়েছে: {tag}', 'ট্যাগ সরানো হয়েছে: {tag}', '{file}: {state}'" }
      - { name: "changed: compose.identity.anonNote", type: copy, required: true, constraints: "T-301 FD entry (b) text, both languages" }
      - { name: "changed: compose.redact", type: copy, required: true, constraints: "Q9: en 'Hide private details before you publish', bn 'প্রকাশের আগে ব্যক্তিগত তথ্য ঢাকুন'" }
      - { name: "used, owned elsewhere", type: copy, required: false, constraints: "errors.review.* (T-301, periodInvalid included), T-303's state and fail keys, errors.evidence.* (exist), compose.safetyEmergFix {ambulance} (T-105), byline.formerMember (T-104), auth.gate.* (T-102), compose.add* (T-204)" }
```

## Mapping `ComposerState` → `DraftPayload` (T-301)

| State | Payload | Note |
|---|---|---|
| `target`, `mode`, `doctorPublicId`, `doctorSubmissionPublicId`, `branchPublicId`, `relationship`, `periodText`, `exactDate`, `story`, `sections`, `sentiment`, `outcome`, `claims`, `criteria`, `identity`, `evidenceItemIds`, `ignoredChecks`, `confirmations` | same names | |
| `tags` | `[{group, termPublicId} \| {group, freeText}]` | `label` and `provisional` not saved |
| `notSure` | `notSure` | top level only (F24) |
| `draftId`, `pendingDoctorName`, `ui` | not saved | |
| — | `title` | not offered; T-301 derives it (its Question 2) |

## What the Unit does not hold

- No review, persona, alias or account data: the byline comes from the preview VM.
- No server-side file name, storage key, original or preview bytes beyond the `<img>` the browser loads from T-305's owner-only route.
- Nothing in browser storage (BR4.4).
- No condition key or normalisation: matching is on the server (Q3, Q6).
- No later-care entry (Q13).

## Relationships at a glance

`ComposerVM` seeds one `ComposerState`. The state holds `TagChip`s and evidence item ids, derives `SafetyFinding`s (with the server's duplicate flag) and is saved as T-301's `DraftPayload`. T-301 projects the saved draft as `PreviewVM` (or the facility preview), which the aside renders. Each evidence id is polled into an `EvidenceChipVM`; a `preview_ready` chip accepts one batch of `RedactionRect`s.
