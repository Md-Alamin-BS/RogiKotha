# Frontend components — U26 `t-306-composer-wizard`

Component-level design for `functional-spec.md` (WF1–WF13) and `rules.md` (BR1.1–BR13.6), on the recommended option of every question (Q1–Q14, decided by the agent under the owner's no-questions instruction of 2026-10-29). Upstream: T-011's tokens, classes, press list, `PublishTick`, `RouteTransition` (already in the patient layout) and static groups; T-102's `WriteGateCallout`, `PendingVerificationBanner`, `useAuthGate()`; T-204's `AddDoctorPanel`; T-008's `ViewShell` and CR-004's `useAnnounce()`; T-101's `getActor()` and container.

The snippets are interface sketches, not code to copy. Class names are the prototype's where `patient.css` already carries them (`.c-modes`, `.c-mode`, `.c-grid`, `.c-side`, `.preview-card`, `.tag-groups`, `.opt-row`, `.opt`, `.redact`, `.redact-canvas`, `.mask`, `.ev-upload`, `.ev-file`, `.ev-bar`, `.safety`, `.safety-item`, `.check-list`, `.check`, `.saved-flag`); nothing here restyles a T-011 class.

## 1. Hierarchy

```text
(patient)/layout.tsx                         T-008/T-011/T-102: DemoMarker, Masthead, main > RouteTransition > AuthGateProvider
└── write/page.tsx                           server; WF1
    └── ViewShell view="compose"
        ├── header.a-head                    kicker nav.compose · h1.display compose.title · p.lede compose.intro
        ├── [signed out] WriteGateCallout    (T-102) — nothing else
        ├── [unconfirmed] PendingVerificationBanner (T-102, no address)
        └── Composer (client) {vm: ComposerVM}
            ├── [draftMissing] div.callout   compose.draftMissing
            ├── [errorSummary] ErrorSummary  div.callout.warn > p errors.review.minFields + ul > a ×n
            ├── StepRail                     nav[aria-label=compose.steps] > ol.c-steps > li > button ×5 (aria-current)
            ├── div.c-grid
            │   ├── form.panel.c-form (novalidate, onSubmit prevented)
            │   │   └── StepPanel {n, dir}   section[data-step-dir] > h2[tabindex=-1] compose.stepName.<key>
            │   │       ├── 1 care:     TargetSwitch? · ModeSwitch · DoctorField (+AddDoctorPanel) | BranchField · RelationshipField · PeriodField
            │   │       ├── 2 story:    StoryFields · TagGroups (doctor) | CriteriaField (facility) · SafetyChecks
            │   │       ├── 3 outcome:  SentimentField · OutcomeField · ClaimsField          (skipped for facility)
            │   │       ├── 4 identity: IdentityField · EvidenceField > EvidenceFileChip ×n > RedactionCanvas?   (no documents for facility)
            │   │       └── 5 publish:  SafetyChecks · ComposerPreview (inline below 60rem) · ConfirmList · PublishBar | PublishedState
            │   │       └── StepNav      Back · "Step {n} of 5" · Next
            │   └── aside.c-side
            │       ├── details.preview-details (open on step 5 or from 60rem) > summary compose.preview > ComposerPreview
            │       └── section.panel[data-static=disclaimer] disclaimer.long
            └── SavedFlag                    #saved-flag (role status via useAnnounce only on change to saved/failed)
```

Only one `StepPanel` is mounted at a time. From 60rem the aside is sticky beside the form and the preview is always open; below it the aside follows the form.

## 2. Files

| Path | Change | In owned paths |
|---|---|---|
| `app/[locale]/(patient)/write/page.tsx`, `loading.tsx` | Replace the placeholder and T-102's hunk (WF1); `loading.tsx` renders the head and a `.panel` skeleton without motion | yes |
| `components/patient/composer/Composer.tsx` | Client root: reducer, step, autosave, publish | yes |
| `components/patient/composer/{StepRail,StepPanel,StepNav,ErrorSummary,SavedFlag}.tsx` | New, client | yes (under `composer/**`) |
| `components/patient/composer/{TargetSwitch,ModeSwitch,DoctorField,BranchField,RelationshipField,PeriodField,StoryFields,TagGroups,CriteriaField,SentimentField,OutcomeField,ClaimsField,IdentityField}.tsx` | New, client | yes |
| `components/patient/composer/{EvidenceField,EvidenceFileChip,RedactionCanvas}.tsx` | New, client, props-driven (BR8.10) | yes |
| `components/patient/composer/{SafetyChecks,ConfirmList,PublishBar,PublishedState,ComposerPreview}.tsx` | New | yes |
| `components/patient/composer/{reducer,types,steps}.ts`, `useAutosave.ts`, `useEvidencePolling.ts` | New | yes |
| `components/patient/composer/{safety-checks,evidence-stage,redaction-geometry}.ts` | New, pure | yes |
| `components/patient/composer/period.ts` | Not created (F1) | listed, dropped |
| `components/patient/composer/composer-test-support.ts` | Builders (`aComposerVM()`, `aDraft()`, `aPreviewVM()`, `anEvidenceItem()`); test category, excluded from coverage; never imports `@rogikotha/test-support` | yes (test file) |
| `components/patient/composer/*.test.ts(x)`, `composer.smoke.test.tsx` | New | yes |
| `server/actions/review.ts` | `saveDraftAction`, `previewAction`, `repeatHintAction`, `publishAction`, `facilityPublishAction` (getDraft is read by the page through the container) | yes |
| `server/actions/taxonomy.ts` | `resolveTagAction` only (F4) | yes |
| `server/actions/evidence.ts` | Two stubs `applyRedactionAction`, `confirmPrivacyAction` (BR8.7); T-303's actions untouched | yes (extend) |
| `server/container.ts` (+ test) | Review module wiring and the interim `EvidenceForPublish` (functional-spec § 12) | **no**: recorded (T-301 F21) |
| `lib/graphemes.ts` (+ test) | `truncateGraphemes` | **no**: recorded |
| `app/pages.test.tsx` | `/write` row, mocks of `@/server/container` and `@/server/auth` | **no**: recorded |
| `packages/i18n/messages/{en,bn}.json` | ENT-009 | yes (copy) |
| `styles/patient.css` | Append the T-306 section (§ 7) | yes (FD-091 amendment) |
| `docs/status/decision-log.md` | § 17 entries | **no**: recorded (project.md Mandated) |

## 3. Page component — `write/page.tsx` (server)

```ts
export default async function WritePage({ params, searchParams }) {
  const { locale } = await params;
  const actor = await getActor();
  if (actor.kind === 'anonymous') return <ViewShell view="compose"><Head /><WriteGateCallout /></ViewShell>;
  const vm = await loadComposerVM(actor, locale, await searchParams); // Promise.all over the container calls of WF1 step 3
  return (
    <ViewShell view="compose">
      <Head />
      {!actor.emailVerified && <PendingVerificationBanner own />}
      <Composer vm={vm} />
    </ViewShell>
  );
}
```

`loadComposerVM` lives in the page file (server-only); it never puts an email, account id or persona id into `vm` (BR10.9). `generateMetadata` → `documentTitle('compose')`.

## 4. Server actions

| Action | Input schema (contracts) | Container call | Notes |
|---|---|---|---|
| `saveDraftAction` | `SaveDraftInput` | `review.saveDraft` | returns `{draftId, expiresAt}` |
| `previewAction` | `{draftId}` | `review.preview` | doctor or facility VM |
| `repeatHintAction` | `{draftId}` | `review.repeatHint` | boolean only |
| `publishAction`, `facilityPublishAction` | `PublishReviewInput` | `review.publish`, `facilityReview.publish` | `fieldErrors` passed through |
| `resolveTagAction` | `{text ≤ 80, kind}` | `taxonomy.resolve` | strips `termId` |
| `applyRedactionAction`, `confirmPrivacyAction` | T-305's `ApplyRedactionInput`, `ConfirmPrivacyInput` (local zod until T-305 adds them) | none: `err('evidence.not_previewable')` | `TODO(<ISS id>): U25 T-305 wires the command` |

All follow BR13.1. `'use server'` files export async functions only.

## 5. Components

| Component | Kind | Props | Renders and behaviour | Rules |
|---|---|---|---|---|
| `Composer` | client | `vm` | `useReducer(reducer, init(vm))`; owns step, `useAutosave`, `useEvidencePolling`, publish; provides `dispatch` to children by props (no context, so chip and canvas stay reusable) | BR1.4, BR4.x |
| `StepRail` | client | `step, steps, target, onGo` | five `button.c-step` with a number dot and the name (`sr-only` below 48rem); a static `.c-steps-track` whose fill is `--step / 5`; current `aria-current="step"`; skipped facility step shown as `disabled` with `aria-disabled` | BR2.2, BR2.3, BR12.5 |
| `StepPanel` | client | `n, dir, children` | `section[data-step-dir={dir}]` keyed by `n`, `h2[tabindex=-1]` focused in a layout effect after a change (not on first render) | BR2.3, BR2.5 |
| `StepNav` | client | `step, onBack, onNext` | `.btn.ghost` Back, `p.note` "{n} / 5" (`compose.step`, `compose.of`, active-language digits), `.btn` Next | BR2.2 |
| `ErrorSummary` | client | `errors, onJump` | `div.callout.warn` > `p` + `ul` of `a[href=#field-id]`; click → step + focus | BR10.4 |
| `SavedFlag` | client | `status` | `#saved-flag` `.on` for 1.8 s; text `compose.draftSaved` or `compose.draftNotSaved`; no motion | BR4.2, BR4.3 |
| `TargetSwitch`, `ModeSwitch` | client | `value, onChange` | `.c-modes` > two `.c-mode` `aria-pressed` buttons with `b` + `span` hint (prototype) | BR11.1, BR3.1 |
| `DoctorField` | client | `doctors, value, pending, onChange, onSubmitted` | `label` + `select#f-doctor` (first option `compose.doctorChoose`), `p.note compose.doctorMissingNote`; mounts T-204's `AddDoctorPanel`; pending → `p.note` name + `compose.addPending` | BR3.2 |
| `BranchField` | client | `branches, value` | `select#f-branch` with `compose.branch` | BR11.2 |
| `RelationshipField`, `SentimentField`, `OutcomeField`, `ClaimsField`, `IdentityField` | client | `value, onChange` | `fieldset` > `legend` + `.opt-row` of `.opt` `aria-pressed` (`.pos/.mix/.neg` for sentiment); claims add `p.note compose.claimsNote`; identity adds `p.limited compose.identity.anonNote` when anonymous | BR3.3, BR3.4, BR3.7, BR3.8 |
| `PeriodField` | client | `periodText, exactDate, invalid, onBlur` | `input#f-period` (`compose.period`, note `compose.periodNote`), error `errors.review.periodInvalid` after blur; `input#f-exact[type=date]` with `compose.exactDate` and `compose.exactDateNote` | BR3.5, BR3.6 |
| `StoryFields` | client | `mode, target, story, sections` | quick: `textarea#f-story` (`compose.story`, hint `compose.storyHint`, `maxLength` 10 000); detailed: four textareas `#f-0..3` (`compose.symptoms|diagnosis|treatment|after`, 5 000 each); facility: hint `compose.facilityStoryHint` | BR3.1 |
| `TagGroups` | client | `suggestions, tags, notSure` | `.tag-groups` > four `fieldset.tag-group` (legend `compose.tagGroup.<g>`, `.opt` chips, `input` + `.btn.small` Add) + the Not sure chip; `p.note compose.tagsRequired`; selected free-text chips carry `title=condition.provisional` and a dashed keyline | BR5.x |
| `CriteriaField` | client | `criteria` | `fieldset` `compose.criteria` > nine rows `crit.<key>` each an `.opt-row` of `crit.good|mixed|poor`; `crit.reportTrustNote` under report trust | BR11.4 |
| `SafetyChecks` | client | `findings, onIgnore, onFix` | `div.safety[data-static=emergency]` > `.safety-item.warn|danger|ok` with `.mark`, `b` title, fix text, `compose.fixNow` (focus the field) and `compose.ignore`; heading `compose.safety`, note `compose.safetyNote` | BR6.x, BR12.3 |
| `EvidenceField` | client | `verified, items, group, onUpload, onRemove` | `fieldset` `compose.evidence` (`compose.evidenceOptional`); group `.opt-row`; `.btn.ghost#add-file` (or `auth.gate.verifyToAct`); hidden `input[type=file]`; `div.ev-upload` of chips; `p.note compose.evidenceStillProcessing` + Check again when stopped | BR7.x |
| `EvidenceFileChip` | client | `item, onRemove, onReplace, onApplied, onConfirmed` | `.ev-file[.done|.bad|.pending-confirm]` > `b` name, `span.state`, fail lines, `.ev-bar > i[style=--w]`, `.link-btn` Replace and Remove; `preview_ready`: Cover private details toggle, `label.check` skip and confirm checkboxes | BR7.7–BR7.11, BR8.1, BR8.8–BR8.10 |
| `RedactionCanvas` | client | `item, onApplied` | `.redact` > `h3 compose.redact`, `p compose.redactBody`, `.redact-canvas` (`role=application`, focusable) > `img` + `.mask` spans + keyboard box; `.redact-actions`: Undo last, Clear all, Cover these areas; `p.note compose.redactApplyNote` | BR8.2–BR8.6 |
| `ComposerPreview` | client | `vm, step` | `section.panel.preview-card` > `.k compose.preview`, byline, doctor line, flags, `h3` title, excerpt, `.reviewer-label` claims, tags; empty note before the first save | BR9.x |
| `ConfirmList` | client | `confirmations` | `fieldset.check-list` legend `compose.confirmTitle` > four `label.check` (`compose.confirm1..3`, `compose.age`) | BR3.9 |
| `PublishBar` | client | `enabled, reason, onPublish, onSaveExit` | `.btn#publish` (`compose.publish`, `aria-describedby` reason), `.btn.ghost#save-draft` (`compose.saveExit`), `compose.evidenceUnconfirmed` line | BR10.1, BR4.5, BR8.11 |
| `PublishedState` | client | `publicId, unconfirmed` | `div.callout.published-state` > `PublishTick` children `compose.publishedNote`, `Link.btn` `compose.publishedLink` (focused), unconfirmed list | BR10.3 |

## 6. Interaction by state — the patient look within FD-091

The composer is the product's most demanding screen, so its feel comes from clarity and immediate, quiet feedback rather than decoration. Everything below uses T-011 tokens and hooks only.

| Moment | What the author sees | Reduced motion | Rule |
|---|---|---|---|
| Step change | The incoming panel slides 24 px from the reading direction with a fade (T-011 step slide); the rail's current dot fills with `--accent` and its track fill moves to the new fraction without transition; focus lands on the step heading | instant swap | BR2.5, BR12.2 |
| Choice pressed | `.opt` / `.c-mode` press feedback (T-011 press list); pressed state by `--accent-soft` fill and `--accent` keyline with a check glyph (state is never colour alone) | no press scale | BR12.2, BR12.6 |
| Typing | Safety findings appear and disappear in place, no movement; the field never loses its caret | same | BR6.6 |
| Autosave | `#saved-flag` text changes; nothing moves | same | BR4.2 |
| Upload progress | Chip bar width set by `--w` stage fraction, no transition; state text changes; announced once | same | BR7.7, BR7.10 |
| Drawing a mask | `.mask` boxes in `--redact-ink` follow the pointer; the keyboard box has a dashed `--accent` outline | same | BR8.4 |
| Publish ok | `PublishTick` draws once beside the plain text; the link takes focus | static tick | BR10.3 |
| Publish refused | `ErrorSummary` appears above the rail, focus moves to the first field | same | BR10.4 |

Surfaces: the form is a `.panel` on `--card-bg`; the aside uses `--aside-bg`; the preview card uses `--glass` with `--keyline`, which reads as a "live mirror" of the public page; the step rail sits on `--rail`. Dark theme follows T-011's token values; nothing is set per theme here.

## 7. T-306's section of `patient.css`

Appended once, each rule marked `/* added: T-306 <reason> */`, spacing by T-011's `--space-*` tokens, colours by tokens only, no `transition`, `animation` or hover transform (BR12.1, BR12.2).

| Selector | Purpose |
|---|---|
| `.c-steps`, `.c-step`, `.c-step[aria-current="step"]`, `.c-step .dot`, `.c-steps-track`, `.c-steps-track i` | The step rail: five 44 px targets in one row at 360 px, names shown from 48rem, static track fill by `--step` |
| `.c-form`, `.c-step-panel`, `.c-step-nav` | Panel padding, step heading spacing, the Back/Next row |
| `.c-side { position: sticky }` from 60rem; `.preview-details` | Sticky aside on wide screens; the `details` wrapper below 60rem |
| `.tag.provisional` | Dashed keyline for free-text chips |
| `.ev-file.pending-confirm` | Expected by the task: `--warn-line` keyline while confirmation is pending |
| `.redact-canvas img`, `.redact-canvas .kbd-box`, `.redact-actions` | Image fills the canvas width with its aspect ratio; keyboard box outline; action row |
| `.crit-row` | Criterion label and its `.opt-row` side by side from 48rem, stacked below |
| `.published-state` | Spacing for the tick, text and link |

`:lang(bn)` sizes come from T-011; no `text-transform` anywhere in this section.

## 8. Tests (test-after, `team.md` Testing Posture)

Component tests render in `en` and `bn`, mock only the action modules and `fetch`, and use the builders of `composer-test-support.ts`.

| Level | File | Asserts | Rules |
|---|---|---|---|
| pure | `safety-checks.test.ts` | English and Bengali phone numbers, Bengali digits, each emergency word, the configured number in both scripts, ignore list, duplicate flag, every section scanned | BR6.1–BR6.4 |
| pure | `evidence-stage.test.ts`, `redaction-geometry.test.ts`, `lib/graphemes.test.ts` | every state's stage; scale, clamp, tiny mask dropped, 50 × 20 → 150 × 60; conjunct-safe cut | BR7.7, BR8.3, BR9.4 |
| pure | `reducer.test.ts` | toggles, mode keeps text, target switch keeps shared fields, doctor vs submission, mapping to `DraftPayload` | BR3.x, BR11.3 |
| component | `Composer.test.tsx` | signed-in render; unconfirmed: Publish disabled with reason, no `#add-file`; step navigation sets `data-step-dir`, focuses the `h2`, announces; `?step=` restore; no Web Storage call | BR1.2, BR2.x, BR4.4 |
| component | `useAutosave.test.tsx` (fake timers) | one save 1.5 s after edits; serialised saves; one create; flag `.on` for 1.8 s; retries; stale preview dropped; Save and finish later navigates | BR4.x |
| component | `TagGroups.test.tsx` | suggestion toggle; resolved → canonical chip; unresolved → provisional chip; 20 cap; announcements | BR5.x |
| component | `EvidenceField.test.tsx` | pre-check refusals; upload body; polling 2 s then 10 s, paused when hidden, stopped at 15 min; chip text from `stateKey`; failed chip `ev.fail.malware` + `compose.evidenceFailedNote`; Replace = remove + picker | BR7.x |
| component | `RedactionCanvas.test.tsx` | pointer masks, Undo and Clear, one `applyRedactionAction` with all rects in page pixels; keyboard box + Enter; reload with `v`; skip checkbox required when `needsSkipAcknowledgement`, then `confirmPrivacyAction` with `skipEditing: true` | BR8.x |
| component | `ComposerPreview.test.tsx` | title, byline, claims under "Reviewer's label", "Not provided" flags; empty state; `details` open on step 5 | BR9.x |
| component | `PublishFlow.test.tsx` | disabled until four boxes; `min_fields` → summary, step 1, focus on the doctor select; `rate_limited` minutes in Bengali digits; success → one `PublishTick`, focused link, no redirect | BR10.x |
| component | `FacilityTarget.test.tsx` | hidden when off; criteria optional and clearable; step 3 skipped; facility publish action | BR11.x |
| server | `server/actions/*.test.ts` | parse refusal, Result passthrough, thrown error → `internal` with a correlation id and no text in the log; stubs refuse | BR13.1, BR8.7 |
| page | `pages.test.tsx` `/write` row; `write/page.test.tsx` | signed out: gate only, no form control; unknown `?doctor=` ignored; missing draft note; no email, account id or persona id in the HTML or props | BR1.x, BR10.9 |
| smoke | `composer.smoke.test.tsx` | the gate and a signed-in composer render in both languages | team.md |
| grep | in `Composer.test.tsx` | no `confetti|streak|badge-earn|points` in the composer files | acceptance (FD-091) |
