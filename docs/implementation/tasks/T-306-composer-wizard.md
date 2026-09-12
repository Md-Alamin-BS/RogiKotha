# T-306 — Composer wizard port (`/write`)

| Field | Value |
|---|---|
| Story | STORY-REV-001, STORY-REV-002, STORY-EVID-001/002 (author side), STORY-IDENT-001, STORY-SRCH-003 (tags / Not sure) |
| Phase / Lane | 3 / B |
| Class → model | M2 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 6–8 h agent; validation 2 h |
| Depends on | T-301 (drafts, publish, preview), T-303 (upload route, `getForAuthor`, `remove`), T-102 (gates), T-204 (AddDoctorPanel + `directory.submitProfile`), T-201 (doctor list, taxonomy resolve) |
| Parallel-safe with | T-302, T-304, T-305 (use fakes/`TODO` for `applyRedaction`/`confirmPrivacy` until merged; the canvas posts to the server action names fixed in `03` §4), T-307 |

## Scope change 2026-09-12 — images only (CR-001 / FD-036)


Evidence attach accepts only `.jpg/.jpeg/.png` (`<input accept="image/jpeg,image/png">`, and the
same check before upload). The redaction canvas works on the item's single processed image. Any
mention of PDF or multi-page documents below is Phase 2 (`07-phase-2-document-evidence.md`).

## Goal

Port `renderCompose` + `renderPreview` + `buildRedactDoc` + `safetyChecks` + `evFileHtml` into the
`Composer` client component tree at `/{locale}/write`, wired to real commands: server-side encrypted
drafts with debounced autosave, real uploads with live pipeline states by polling, a redaction canvas
that draws on the real preview PNG, per-item privacy confirmation, preview that is the exact public
projection, and publish. The visual result must match the prototype pixel-for-pixel in both locales
and themes.

## Read first

1. `docs/implementation/01-conventions.md` §6, §7, §8, §10 (component tests), §14
2. `docs/implementation/03-routes-and-contracts.md` §1 (`/write?draft=&doctor=`), §4 "review" (`saveDraft`, `getDraft`, `preview`, `publish`), "evidence" (`intake` via `/api/evidence/upload`, `getForAuthor`, `remove`, `applyRedaction`, `confirmPrivacy`), "taxonomy" (`resolve`, `createProvisional`), "directory" (`submitProfile`)
3. `docs/design/auth-screens-spec.md` §3.7 (gates on `/write`)
4. Prototype — read fully, in this order: `app.js` 1314–1330 (`TAG_GROUPS`), 1331–1351 (`safetyChecks`), 1352–1545 (`renderCompose`), 1512–1545 (`evFileHtml`, `advanceFile`), 1546–1572 (`renderPreview`), 1574–1608 (`buildRedactDoc`), click handlers 2669–2731 (`data-mode`, `data-sent`, `data-out`, `data-ident`, `data-claim`, `data-tag`, `data-rel`, `data-ignore`, `#add-doctor`, `#ad-submit`, `#add-file`, `data-rmfile`, `data-refile`, `#publish`, `#save-draft`), change/input handlers 2766–2790 (`#f-doctor`, `data-story`); `styles.css` blocks for `.c-modes`, `.c-mode`, `.c-grid`, `.c-side`, `.preview-card`, `.tag-groups`, `.tag-group`, `.opt-row`, `.opt`, `.redact`, `.redact-canvas`, `.doc-line`, `.mask`, `.ev-upload`, `.ev-file`, `.ev-bar`, `.safety`, `.safety-item`, `.check-list`, `.check`, `.saved-flag`
5. `rogikotha-data.js` strings: every `compose.*` (74 keys), `rel.*`, `claim.*`, `ev.*`, `write.*`, `sentiment.*`, `outcome.*`, `label.notProvided`, `label.reviewerLabel`, `disclaimer.long`

## Owned paths

- `apps/web/src/app/[locale]/(patient)/write/page.tsx`, `loading.tsx`
- `apps/web/src/components/patient/composer/**`: `Composer.tsx` (client root), `ModeSwitch.tsx`, `DoctorField.tsx` (+ uses `AddDoctorPanel` from T-204), `RelationshipField.tsx`, `PeriodField.tsx`, `StoryFields.tsx`, `TagGroups.tsx`, `SentimentField.tsx`, `OutcomeField.tsx`, `ClaimsField.tsx`, `IdentityField.tsx`, `EvidenceField.tsx`, `EvidenceFileChip.tsx`, `RedactionCanvas.tsx`, `SafetyChecks.tsx`, `ConfirmList.tsx`, `ComposerPreview.tsx`, `useAutosave.ts`, `useEvidencePolling.ts`, `safety-checks.ts` (pure), `period.ts` (pure parse helpers re-exported from domain)
- `apps/web/src/server/actions/review.ts` (`saveDraft`, `getDraft`, `preview`, `publish`), `apps/web/src/server/actions/evidence.ts` (extend: `getForAuthor`, `remove`, `applyRedaction`, `confirmPrivacy`), `apps/web/src/server/actions/taxonomy.ts` (`resolve`, `createProvisional`)
- `apps/web/src/components/patient/composer/*.test.tsx`
- `apps/web/src/styles/patient.css` — only `/* added: T-306 … */` blocks if a new state needs one (expected: `.ev-file.pending-confirm`, `.redact-canvas img`)

## Not in scope

The public experience page (T-307), the viewer (T-308), provider submission command (T-204), any change to the review commands (T-301/T-302), the "edit" and "add follow-up" entry points from `/me` (T-409 links here with `?draft=` after calling a T-302 command to create an edit draft — not in this task).

## Steps

1. **Page** `write/page.tsx` (server): `getActor()`; if `anonymous` → render `.a-head` + the gate callout per auth spec §3.7 (`write.signinTitle` + `auth.gate.writeBody` + two buttons) and **nothing else**; if unverified → render the pending banner (auth spec §3.2) and the composer with Publish disabled (`auth.gate.verifyToPublish`); else load `ComposerVM` = doctors list (`directory.listDoctors` minimal), tag groups (seed the four groups from `TAG_GROUPS` via `taxonomy.listSuggested` — if T-201 has no such query, hardcode the group **keys** and resolve names via `taxonomy.listConditions` + a static suggestions list in `packages/test-support/corpus/tag-suggestions.ts`; note it in Questions), the draft (`?draft=` → `review.getDraft`; else a new empty draft object; `?doctor=` preselects), `limitedDataThreshold` is not needed here.
2. **Composer root** (`'use client'`): one `useReducer` state mirroring the prototype's `state.compose*` fields: `mode`, `doctorId`, `doctorSubmissionId`, `relationship`, `periodText`, `story` (quick) / `sections` (detailed), `tags: [{group, termPublicId?|freeText?|notSure}]`, `sentiment`, `outcome`, `claims`, `identity`, `evidenceItemIds`, `ignoredChecks`, `confirmations[4]`, `publishedPublicId`. Render order and classes **exactly** as `renderCompose`: `.a-head` (kicker `nav.compose`, `h1.display compose.title`, `.lede compose.intro`) → gate/banner → `.c-modes` (two `.c-mode` buttons `aria-pressed`) → `.c-grid` → `section.panel` with fields in this order: doctor (`select#f-doctor` + `#add-doctor` link + `#add-doctor-panel`), relationship (`.opt-row` × 4, `data-rel`), period (`#f-period` text input; **decision:** keep the free-text field the prototype has, prefilled with the current month in the active locale, parsed with `parsePeriod` from the domain on blur; invalid → inline error `errors.review.periodInvalid` — add the key), story fields (quick: one textarea `#f-story`; detailed: four textareas `#f-0..3` labelled `compose.symptoms|diagnosis|treatment|after`, first carries `data-story`), tags (`.tag-groups` with the four groups + the `notsure` chip), sentiment (`.opt.pos|mix|neg`), outcome, claims, identity (+ `.limited` anon note when `anon`), evidence (`.redact` block with the canvas, `.ev-upload` chips, `#add-file` button), safety (`.safety` list or the ok item), confirm list (4 checkboxes: `compose.confirm1..3`, `compose.age`) + `#publish` + `#save-draft` + `#saved-flag` + the published callout → `aside.c-side` with `.preview-card` and the `disclaimer.long` panel.
3. **Autosave** `useAutosave`: debounce 1.5 s after any state change → `saveDraft` action (creates the draft on first save; stores `draftId` in state and `history.replaceState` to `?draft=<id>`); show `#saved-flag.on` for 1.8 s (prototype timing); "Save and finish later" (`#save-draft`) saves immediately and navigates to `/me?tab=drafts`. Drafts are server-only — no `localStorage` (conventions §8).
4. **Tags** `TagGroups`: chips per group from the VM; selecting a chip stores `{group, termPublicId}`; a free-text input per group (`compose.tagGroup.*` + "add") calls `taxonomy.resolve` on blur — match → chip with the canonical name; no match → chip marked `provisional` (visually the same `.tag` with `title = condition.provisional`) and the `freeText` kept; the provisional term is created at publish time by `review.publish` (T-301 step 5), not here. `notsure` chip toggles `notSure` and is exclusive with nothing (prototype allows both).
5. **Safety checks** `safety-checks.ts`: pure port of `safetyChecks()` — PII regex `(\+?8801|01)[0-9\s-]{7,}`, emergency regex `(emergency|জরুরি|chest pain now|ambulance|অ্যাম্বুলেন্স|999)`, duplicate check now uses `myPublishedForDoctor` from the VM (`review.forDoctor` filtered by the actor's public personas — add `mine: boolean` to `ExperienceCardVM` in T-301's query or fetch `review.listMine` from T-409 later; until then compute from a `myPublished` array the page passes) — same three ids `pii|emerg|dup`, levels `warn|danger|warn`, `data-ignore` keeps the prototype's ignore behaviour. Re-render only the `.safety` block on input (prototype 2772–2790) — in React this is just state.
6. **Evidence** `EvidenceField`: hidden `<input type=file multiple accept=".jpg,.jpeg,.png,.pdf">` opened by `#add-file`; on change, POST `FormData` to `/api/evidence/upload` (`draftId`, `group` — a small `.opt-row` above the chips chooses the group `reviewed|later|outcome`, default `reviewed`; `idempotencyKey` per file via `crypto.randomUUID()`); append returned ids to `evidenceItemIds` (triggers autosave). `useEvidencePolling`: while any item is in `quarantined|validating|scanning|sanitising`, call `getForAuthor(ids)` every 2 s; stop when all are terminal. `EvidenceFileChip` = port of `evFileHtml`: `.ev-file[.done|.bad]`, name = `label` or `ev.state.*`, `.state` text from `stateKey`, fail note from `failKey` + `ev.failNote`, `.ev-bar` width = stage index / 6 (map product states onto the six prototype stages: `quarantined→0, validating→1, scanning→2, preview_ready(unconfirmed)→3 'redact', privacy_confirmed→4, published→5`), buttons `ev.replace` (= `remove` then open the file input) and `ev.remove`. Items in `preview_ready` show a **Confirm privacy** checkbox row (`compose.confirm2` wording) that calls `confirmPrivacy`; items pending confirmation are visually `.pending-confirm` (add the class with a `/* added */` comment).
7. **Redaction canvas** `RedactionCanvas`: replaces `buildRedactDoc`'s fake lines with the real preview PNG (`/api/evidence/items/<id>/preview/<page>`) inside `.redact-canvas` (keep the class; add `img` sizing rule); page selector when `pageCount > 1`; the pointer interaction is ported verbatim (pointerdown/move/up with capture, `.mask` spans); on pointerup convert the mask to **page pixel** coordinates (scale by `naturalWidth / clientWidth`) and call `applyRedaction`; on success reload the image (cache-bust `?v=<n>`); keyboard alternative: arrow keys move a 10 px cursor box, Enter commits (required by conventions §14 accessibility — announce via `useAnnounce`). Hidden when no item is in `preview_ready`.
8. **Preview** `ComposerPreview`: the prototype's `renderPreview` shows a *sketch*; in the product the `.preview-card` renders the **exact** public projection: call `preview` action (debounced with autosave) and render the returned `ExperiencePageVM` through T-307's `ExperienceBody` component in a compact wrapper (`.preview-card` keeps its `.k` label). Until T-307 merges, render title/byline/flags/excerpt/claims/tags from the VM (same fields as `renderPreview`), then switch — note in Follow-ups if T-307 is not yet merged at hand-off.
9. **Publish**: `#publish` enabled only when the four confirmations are checked and the actor is verified; calls `publish({draftId, identityMode, attestation: true})`; on `ok` → render the published callout (`compose.publishedNote`) with a link to `/experiences/<publicId>` and `router.push` after 1.5 s (respect motion-off: immediate); on `review.min_fields` → focus the first missing field and show the `.callout warn` summary (auth spec §2 pattern); on `rate_limited` → callout with minutes.
10. **Announcements**: mode change, tag add/remove, file state changes (`ev.state.*`), draft saved, published — through `useAnnounce`.
11. **Tests** (Testing Library, both locales): mode switch changes fields; tags incl. free text → provisional chip; safety checks appear/ignore; upload flow with mocked fetch → chips progress through states via mocked `getForAuthor` responses; redaction rectangle → `applyRedaction` called with pixel coords; publish disabled until confirmations; publish error focuses field; signed-out renders gate only; unverified disables publish.
12. `npx impeccable detect apps/web/src/components/patient/composer --no-advisory` clean; `pnpm check`; hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Visual parity | manual: `/en/write` and `/bn/write` vs prototype `#write`, light + dark, 360 px + 1280 px | same blocks in the same order; no new colours/fonts |
| Gate | component test | signed-out → only the callout with two buttons; no form controls |
| Autosave | component test with fake timers | edit → after 1.5 s `saveDraft` called once; `#saved-flag` gets `.on` |
| Upload + polling | component test | after upload, `getForAuthor` polled every 2 s until terminal; chip text follows `ev.state.*`; failed chip shows `ev.fail.encrypted` + `ev.failNote` |
| Redaction coords | component test | drawing 50×20 css px on a 400 px-wide preview of a 1200 px page → `applyRedaction` receives `{x,y,w:150,h:60}` |
| Publish gating | component test | Publish `disabled` until 4 checkboxes; unverified actor → disabled with `auth.gate.verifyToPublish` |
| Publish error | component test | `review.min_fields` → summary callout + focus on doctor select |
| Preview parity | e2e-lite (jsdom) | preview VM equals `review.preview` result (mock) — rendered title/byline/claims present |
| i18n | `pnpm i18n:check` | zero missing keys in either locale; `errors.review.periodInvalid` added in both |
| Detector | `npx impeccable detect …` | 0 findings |
| Tree | `pnpm check` | green |

## Tests to write

- `safety-checks.test.ts` (pure): Bengali and English triggers, ignore list, duplicate detection.
- `period.test.ts`: uses domain `parsePeriod`.
- `Composer.test.tsx`, `TagGroups.test.tsx`, `EvidenceField.test.tsx`, `RedactionCanvas.test.tsx`, `ComposerPreview.test.tsx`, `SafetyChecks.test.tsx` — each in `en` and `bn`.

## Threat notes

Not an M3 task; the security boundaries live in T-301/T-303/T-305. Two UI-level rules still tested: the composer never renders a signed-in user's email/account id in the DOM, and the file input `accept` list is not the only guard (server refuses `.docx` — covered by T-303).

## Hard-rule checklist

- [ ] "Reviewer's label" shown on claims in the preview.
- [ ] Sentiment/outcome optional; preview shows `label.notProvided`, never `0`.
- [ ] Identity choice explained; anonymous note present.
- [ ] Evidence optional; failed file never blocks publishing text.
- [ ] Privacy confirmation (FD-023) required per item before it can be linked.
- [ ] Persistent disclaimer panel in the aside; emergency safety check present.
- [ ] Both locales; numerals via formatter; no `text-transform` in Bengali.
- [ ] No localStorage; no inline styles beyond the prototype's.
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
