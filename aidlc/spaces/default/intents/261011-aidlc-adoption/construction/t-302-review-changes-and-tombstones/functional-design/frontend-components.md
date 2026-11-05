# Frontend components — U22 `t-302-review-changes-and-tombstones` (release 1)

The edit route and the history slot. Markup follows the composer's existing classes (`panel`, `field`, `lbl`, `note`, `btn-row`) on the FD-091 tokens; plain CSS, no new library. A new class carries `/* added: U22 reason */`. Every string is an i18n key in en and bn (BR5.3).

## 1. Hierarchy

```text
experiences/[id]/edit/page.tsx (async server, noindex)               BR5.1
└── ViewShell view="compose" title=compose.edit.title
    ├── p.lede compose.edit.intro
    └── EditForm vm                                         (client)  BR1.3, BR2, BR5.4
        ├── input[hidden] publicId, expectedVersion
        ├── FormErrorSummary (U47-kept)                               conflict → compose.edit.reload link
        ├── field: doctor (read-only, label.notProvided when null)
        ├── TextField title (optional; empty = derived title)
        ├── quick:    TextField story (multiline, compose.storyHint)
        ├── detailed: TextField symptoms | diagnosis | treatment | after (multiline, each optional)
        ├── OptionGroup sentiment (clearable)  · OptionGroup outcome (clearable)
        ├── fieldset claims: three checkboxes claim.* + each seeded label as a checked, removable box
        │   └── p.note compose.claimsNote
        ├── p.note compose.edit.versionNote · p.note compose.edit.correctionNote (the earlier wording stays readable under Show original)
        └── btn-row: Save (compose.edit.save, aria-busy) · Cancel link (experience.cancelEdit)

experiences/[id]/page.tsx (U47) ─ ReviewHistory reviewPublicId   (async server, slot)  BR4
    ├── nothing                                  (not_found or never edited)
    ├── p.edited  label.edited + month year      (time dateTime=ISO)
    ├── ul.corrections  li history.corrected {fields} {date}   oldest first
    │   └── details summary history.showOriginal (closed)        BR4.2
    │       └── OriginalText: h3 history.originalHeading · title · story | ol sections · sentiment/outcome/labels present in the snapshot (lang when it differs)
    ├── details (author only) summary history.yourVersions
    │   └── ol li history.version {n} · date · history.kind.*  (+ fields for corrected)   newest first
    └── p.note history.unavailable               (unexpected failure)
```

## 2. Components

| Component | Props | Behaviour | Rules |
|---|---|---|---|
| `EditPage` (`edit/page.tsx`) | route `{id}` | `stripSlug`; `requireAccount` with `returnTo`; `runCommand(getContainer().review.getOwnForEdit, {publicId})`; `not_found` → `notFound()`; metadata `noindex`, title `compose.edit.title`. Replaces the demo page and its `reviews.getOwnReviewForEdit` and `doctors.getDoctor` calls. | BR1.1, BR5.1 |
| `EditForm` (`compose/EditForm.tsx`, rewritten) | `{vm: EditReviewVM}` | `useActionState(correctReviewAction)`. Renders the story field for `quick` and the four sections for `detailed`, in prototype order with the composer's section headings. Keeps typed values after a refusal (`key={attempt}`). Sends `claims` as repeated values; a seeded label is sent exactly as received. | BR1.3, BR2.1–BR2.4, BR5.4 |
| `ReviewHistory` (`review-history/ReviewHistory.tsx`, internals replaced) | `{reviewPublicId}` (frozen) | `runCommand(getContainer().review.getHistory, {reviewPublicId})`; renders § 1; never throws; `try/catch` → `history.unavailable` with a logger call. | BR4.1–BR4.5 |
| `VersionList` (`review-history/VersionList.tsx`, new) | `{versions}` | Native `details`/`summary`, closed by default; dates via the locale formatter in Asia/Dhaka with locale digits; no text. | BR4.3 |
| `OriginalText` (`review-history/OriginalText.tsx`, new) | `{original: OriginalTextVM}` | Inside a closed `details` with `history.showOriginal`. Renders the earlier title, story or sections (section headings as on the page), and the sentiment, outcome and `label.reviewerLabel` claims the snapshot holds; a missing key is left out. | BR4.2 |
| `AuthorTools` / `ExperiencePage` (U47's) | unchanged | One-line change: `editHref` for every kind (remove `ASSUMPTION(U47)`). | BR5.2 |

## 3. Server action (`server/actions/review-edit.ts`, `'use server'`)

`correctReviewAction(prev, formData)`: reads `publicId`, `expectedVersion`, `title`, `story` or the four sections (the hidden `kind` from the VM picks which), `sentiment`, `outcome`, repeated `claims`; calls `runCommand(getContainer().review.correct, raw)`; maps the result per BR5.4. It holds no ownership logic and reads no persona; the command decides.

## 4. Validation in the form

Client-side checks only mirror the server: story length hint, at least one section. The server's `fieldErrors` (`messageKey`) are authoritative and shown by `FormErrorSummary` and each field's error slot. No field is required in the browser except what BR2 requires.

## 5. Accessibility and states

- Save is disabled with `aria-busy` while saving; the error summary takes focus on refusal (existing `FormErrorSummary` behaviour).
- The conflict message (`errors.review.editConflict`) links to the same edit route to reload the latest version; the limit message is `errors.review.correctionsLimit`.
- `time` elements carry the ISO date; the version list is a native disclosure, keyboard-operable.
- Bengali text has no capital-letter transform; numerals follow the active language.
- UI checks: `npx impeccable detect apps/web/src --no-advisory` and `pnpm contrast` pass.

## 6. Tests (en and bn)

`EditForm` quick and detailed, with field errors and the conflict message; `ReviewHistory` empty, edited only, with corrections and their Show original, title-only (no original), with the author's list, and the fallback; the edit page's `notFound` for a non-author (fake module).
