# Functional Design — questions (U28 `t-308-evidence-viewer`)

Draft written ahead of the stage on 2026-10-29 while another Unit builds. The lead finalises it when the workflow reaches this Unit's Functional Design; then it moves to `<record>/construction/t-308-evidence-viewer/functional-design/`.

Every question is answered A, decided by the agent under the owner's no-questions instruction of 2026-10-29. Each is added to `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` when this draft is finalised. `functional-spec.md` § 13 lists what changes under each other option. No answer changes a hard rule, a data boundary or a founder decision, so this Unit appends no FD entry (`functional-spec.md` § 16).

Context:
- Unit U28 (kind `ui`, size M, not high risk) delivers T-308 (`docs/implementation/tasks/T-308-evidence-viewer.md`, with its FD-091 amendment and the CR-001/FD-036 images-only block) for US7.2 and US7.1 (`unit-of-work-story-map.md`). Bolt 29. It depends on U25 T-305, U27 T-307, U3 T-010 and U45 T-011 (`unit-of-work-dependency.md`); U42 T-503 depends on it.
- Inputs read: `unit-of-work.md` (U28), `unit-of-work-dependency.md`, `requirements.md` (FR53–FR59, FR63–FR65, FR68, FR95, NFR2, NFR4, NFR6, NFR7, NFR13), `stories.md` (AC7.1.1–AC7.1.6, AC7.2.1–AC7.2.6), `contract-summary.md` (C8, C14), `docs/status/decision-log.md` (FD-023, FD-024, FD-032, FD-036, FD-042, FD-091, FD-093, FD-094), `01-conventions.md` §2, §6–§10, §14, `03-routes-and-contracts.md` §1, §4, §6, `05-demo-storyboard.md` (step 6), `09-coverage-matrix.md` (STORY-EVID-002), open `ISSUES.md` rows (ISS-056, ISS-083), `OWNER-REVIEW-QUEUE.md`.
- Upstream drafts read (none of these Units is built): `t-305-privacy-preview-redaction-publish` (`evidence.getPublic`, the section view model, the artifact route; refreshed 2026-10-29), `t-307-experience-page-and-index` (questions only: `EvidenceSlot`, its Question 3 interim count, Question 11 static notice), `t-011-patient-design-and-motion-system` (tokens, `--target`, `Reveal`, `data-press`, sheet entry, static set, `check:motion`), `t-304-worker-evidence-pipeline` (F13 seed keys), `t-306-composer-wizard` (author-side chips), `t-202-doctor-index-and-profile` (format model).
- Code read on the working tree (branch `bolt/t-011-patient-design-and-motion-system`, 2026-10-29): `components/shared/Sheet.tsx` (focus trap, Escape, focus return), `lib/announce.ts` (`useAnnounce`), `components/patient/motion/Reveal.tsx`, `styles/patient.css` (the ported `.ev-*` and `.viewer-*` rules, `--target`, `--space-*`), `styles/motion.css` (sheet entry, `[data-press]`), `packages/contracts/src/view-models/evidence.ts`, `packages/i18n/src/format.ts`, `messages/{en,bn}.json` (781 keys; all 41 prototype `viewer.*` keys already present), `packages/test-support/src/corpus/evidence.ts` and `seed/seed-evidence.ts` (12 items, one image each), `packages/database/src/repositories/{evidence,not-implemented.test}.ts`, `eslint.boundaries.mjs`.
- Prototype read: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` `evidenceSection` (line 1046), `VIEWER_STRINGS` (2386), `openEvidenceViewer` to `trapFocus` (2566–2850), click handler (3097). The task's line numbers predate FD-089.

## What the code and data show that the task file does not

1. **The images-only viewer pages through the items of a group.** The CR-001 block says so; step 2's `derivativePdfUrl` and per-item `pages` loop are leftovers. Every item has exactly one image (`pageCount: 1`).
2. **The seed cannot show "1 of 2".** `seed-evidence.ts` creates one image per item, and no seeded review has two published items in one group. Storyboard step 6 asks to "move between the two prescription photos" on r1 (Question 11).
3. **`Fit` cannot fit on a phone.** Task step 3 computes fit from the image's natural size and clamps to 0.5. The seed pages are 1240 × 1754; on a 360 px screen the stage's content box is about 260 px wide, so `Fit` gives 0.5 and the page is 620 px wide (Question 2).
4. **Rotation sends the page off the stage.** The ported `.viewer-pages` has `transform-origin: top left`; a 90° turn moves the page to negative x, which scrolling cannot reach (Question 3).
5. **Pan has no keyboard path.** AC7.2.6 asks that every action works by keyboard; the prototype pans by pointer only (Question 3, Question 4).
6. **`touch-action: none` blocks pinch.** The stage disables the browser's pinch zoom and offers nothing instead (Question 5).
7. **Two dialogs.** The prototype puts `.viewer-shell[role=dialog][aria-modal]` inside the sheet, which is already the dialog. `Sheet.tsx` gives the title, focus trap, Escape and focus return, so the task's `useFocusTrap.ts` and the inner `role=dialog` are not needed (Question 1).
8. **`.viewer-page` styles a synthetic A4 page.** Its rules (720 px width, `aspect-ratio: 1 / 1.41`, 56 px padding) would pad and distort an `<img class="viewer-page">`; step 2 and the owned-path CSS line disagree on where the class goes.
9. **The keys are already ported.** T-006 ported all 39 `VIEWER_STRINGS`, including the 25 synthetic page lines (`docHeadA` … `notePlan`, `seal`) the task says not to port (Question 12).
10. **The prototype hides empty groups.** AC7.2.4 asks that empty sections show "No documents" (Question 6).
11. **Uploaded items have no label.** T-305 fills `label` from `label_en`/`label_bn`, which only the seed sets (Question 9).
12. **The page count is always 1.** "1 pages" on every row would be noise (Question 8).
13. **The section heads skip a level** (`h2` then `h4`), and every item's button reads the same "View processed copy".
14. **The viewer controls are 33 px tall.** T-011's 44 px target list does not include `.vctrl` or `.vdownload`.
15. **NFR2's verification column names T-308 for the pipeline chips.** The public page holds only published items; the chips are the author's, in T-306 and T-409 (Question 14).
16. **T-305's draft names the page URL twice**: `url` in WF5 and `artifactUrl` in § 7; the contracts on `main` and `03-routes-and-contracts.md` §4 say `artifactUrl`.

## Settled before this stage

- The look is T-011's, with page rules only in T-308's own appended section of `patient.css`, marked `/* added: T-308 reason */`, on T-011 tokens (FD-091 amendment, `project.md` Code Style 2026-10-27). No motion rule outside `motion.css`; pressables carry `data-press` (T-011 BR4.7, BR6.11).
- The public view model is U25 T-305's: three groups always present, public ids only, artifact URLs only, `downloadUrl` with `?download=1`. This Unit adds no query, command, route, table or migration.
- Images only (FD-036): the viewer's page buttons move between the images of one group; the download returns the current image.
- The owner's answers apply where they touch this page: counts only (no percentages), no public anonymity caveat.
- T-010's boundaries, 80% line floor (untested files counted), `format:check`, `check:identity` and CI before merge apply (FD-093). FD-094 lets independent Units build in parallel; T-308 waits for T-305 and T-307.

## Settled in this design without a question

Each is explained in `functional-spec.md` § 12.
- One `Sheet` per evidence section, opened by any item's button; the sheet is titled `viewer.title`; the inner `.viewer-shell` has no `role`; the task's `useFocusTrap.ts` is not created.
- The image uses a new class `viewer-img`; the synthetic `.viewer-page` rules are not reused.
- Group headings are `h3`; each open button is described by its item's label (`aria-describedby`).
- `.vctrl` and `.vdownload` get 44 px minimum size in T-308's CSS section.
- The zoom readout keeps the prototype's `aria-live="polite"`; the image change is announced through `useAnnounce`; nothing else is announced.
- Single-key shortcuts work only while focus is inside the viewer (WCAG 2.1.4) and ignore Ctrl, Meta and Alt, so browser zoom keys stay the browser's.
- The current and the next image load eagerly; the rest load lazily.
- The URL guard renders only `/api/evidence/artifacts/…` URLs.
- `ViewerDocVM` is not used; the viewer reads `EvidenceGroupVM` directly.

## Question 1

**How does the viewer sit in the page's dialog model?** The prototype reuses the one overlay and puts a second `role=dialog` inside it; the task asks for a `Sheet` per item and its own focus-trap hook.

A. **One shared `Sheet` per evidence section, rendered through a portal to `document.body` while open, titled `viewer.title`; the `.viewer-shell` inside has no role; the Sheet's own focus trap, Escape and focus return are used; after the Sheet focuses its close button, the viewer moves focus to "Zoom out" (prototype)** (recommended). One dialog, one heading, one trap; no change to `Sheet.tsx`; the portal keeps the fixed overlay out of the transformed reveal list and the article's stacking contexts; images load only when the viewer opens.
B. **The task's literal markup**: a Sheet per item with the inner `role=dialog`. Two nested modal dialogs, screen readers announce both, and one Sheet per item mounts N overlays.
C. **A native `<dialog>` element of its own.** A second dialog implementation beside `Sheet.tsx`, against `01-conventions.md` §8 ("implemented once").
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 2

**What do zoom 100 % and Fit mean for a real image?** The task measures zoom against the image's natural pixels with a 0.5 floor, so Fit cannot fit a seed page on a phone (fact 3).

A. **Zoom scales a base size: the image drawn at its natural size, but never wider than the stage's content box (as the prototype's page had `max-width: 100%`). 100 % is that base size. Fit is `min(stageW / baseW, stageH / baseH)`, clamped to 0.5–2 and rounded to 2 decimals, and resets rotation and pan, as in the prototype. Sizes come from the view model's `width` and `height`, so Fit needs no image load** (recommended). Fit works at 360 px; a small image can be enlarged up to 2×; the arithmetic is a pure, testable function; the task's acceptance row becomes: stage 800 × 600, image 1200 × 1600 → base 736 × 981 → `min(1, 536 / 981)` = 0.55.
B. **The task's natural-size model.** Fit is stuck at 0.5 on phones and most laptops for the seed pages; "Fit" does not fit.
C. **Natural size with a 0.1 floor.** Fit works, but 100 % shows a 1240 px page on a 360 px phone and the zoom range becomes very wide.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 3

**How does the reader reach every part of a zoomed or rotated image?** Rotation about the top-left corner leaves the stage (fact 4) and pan has no keyboard path (fact 5).

A. **The stage clips (`overflow: hidden`) and is a camera: the image turns and scales about its centre, pan moves it by translate, the mouse wheel and trackpad pan it (without Ctrl or Meta), and the arrow keys pan it by 48 px (Shift: 192 px); 100 % and Fit reset pan** (recommended). Every part of the image is reachable by pointer, wheel, touch and keyboard; no scroll and transform fight each other. The task's "wheel without Ctrl does nothing" becomes "wheel without Ctrl does not zoom", which the acceptance row tests.
B. **Keep the prototype's scrolling stage and top-left origin.** A rotated image is partly unreachable; keyboard users cannot pan; AC7.2.6 fails for pan.
C. **Scrolling stage with a centre origin.** The part of a scaled image left of or above the stage cannot be scrolled to.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 4

**Which keys does the viewer use?** The prototype's titles imply `−`, `+`, `R`, `←` and `→`; the task adds `Esc` and fullscreen and then wavers between `F` for Fit and for fullscreen.

A. **`-` or `_` zoom out; `+` or `=` zoom in; `1` 100 %; `0` Fit; `R` rotate; `F` fullscreen; `←`/`→` and `PageUp`/`PageDown` previous and next image; `Home`/`End` first and last; `↑`/`↓` and Shift + any arrow pan; `Esc` closes (the Sheet's). Keys with Ctrl, Meta or Alt are ignored. Each button's title shows its key in brackets, as the prototype did** (recommended). One meaning per key, no mode switch; browser zoom (Ctrl + `+`) keeps working; single keys act only while focus is in the viewer, which satisfies WCAG 2.1.4.
B. **Task step 4 as written** (`0` 100 %, `f` Fit, Shift+F fullscreen). Two keys for one letter, and no pan key.
C. **Only the prototype's five keys.** No keyboard pan, Fit or fullscreen; AC7.2.6 fails.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 5

**What happens on a two-finger pinch?** The stage sets `touch-action: none`, which stops the browser's pinch zoom inside it (fact 6); on a phone, pinching is the expected way to enlarge a photo.

A. **The viewer tracks up to two pointers: with two down, zoom follows the change in their distance (clamped 0.5–3, 2 decimals) and the image does not pan; one pointer pans as before** (recommended). Matches what phone users expect; no library; the logic is a pure function of two pointer positions, tested in jsdom with synthetic pointer events; the zoom buttons stay the accessible path.
B. **No pinch; buttons only.** Phone readers lose the gesture the stage itself disabled.
C. **Let the browser pinch (`touch-action: pan-x pan-y pinch-zoom`).** The whole page zooms, the toolbar leaves the screen, and the viewer's zoom readout is wrong.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 6

**What does a review with documents show for a group that has none?** The prototype leaves an empty group out; AC7.2.4 says "empty sections show 'No documents' rather than 0" (fact 10).

A. **When the review has documents, all three groups render in their fixed order; an empty one shows its heading and "No documents". When it has none at all, the section shows its heading and one "No documents", as in the prototype** (recommended). Meets AC7.2.4 and the hard rule; a reader sees at a glance which part of the treatment has no document; T-305 already sends three groups.
B. **Hide empty groups (the prototype).** AC7.2.4's per-section clause fails.
C. **Always three groups, even with no documents at all.** Three "No documents" lines on most reviews.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 7

**What does each document row show beside its label?** The prototype draws a striped `.doc-icon`; T-305 sends each item's processed `thumbnailUrl`.

A. **The processed thumbnail in the icon's place (40 × 56 px, `object-fit: cover`, `alt=""`, `loading="lazy"`, rounded, on a T-011 surface), with the striped icon kept as the fallback while it loads** (recommended). Readers recognise a prescription or a lab report before opening it, which the owner's "user-friendly, rich" priority asks for. The thumbnail is the same public processed copy the viewer shows, served with `noindex`; it is decorative, so screen readers hear the label once; lazy loading keeps the experience page's LCP target.
B. **The prototype's striped icon.** Every row looks the same; nothing tells documents apart but the label.
C. **A large thumbnail grid instead of rows.** Heavier page, and a second layout for the same data.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 8

**Does a row keep the prototype's "{n} pages" line?** Every Phase 1 item is one image (fact 12).

A. **Show the count only when `pageCount` is above 1; in Phase 1 it never is, so no row shows it, and the task's new `evidence.pages` key is not added (Phase 2 adds it with multi-page documents)** (recommended). No "1 pages" noise, no dead key, and the row keeps its layout; the group's own pager shows how many images it holds.
B. **Add `evidence.pages` and always show "1 page".** Repeats the same fact on every row.
C. **Show the group's image count on the group heading.** A number per heading the prototype does not have.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 9

**What is shown for an uploaded image that has no label?** Only the seed sets labels (fact 11).

A. **"Image {n}" / "ছবি {n}", where n is the item's position in its group, through one new key `evidence.untitled`; the Bengali is flagged for the owner's review (FD-042)** (recommended). Every row and the viewer's file line have a name; nothing is invented about the content; numerals follow the language.
B. **Leave the label empty.** An empty bold line and a button described by nothing.
C. **Use the group's name.** Two items in one group would read the same.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 10

**Does the viewer offer FR59's side-by-side comparison on large screens?** FR59 says larger screens "may" offer it; FD-036 narrows it to images.

A. **Not in this Unit: one sequential viewer at every width, with an S4 row for a later comparison view** (recommended). FR59's "may" is met by the sequential viewer it names for small screens; the chronological order is kept (groups in treatment order, items by publish time); no new layout or keys in release 1.
B. **Build a two-pane comparison of one image from each of two groups at ≥ 1024 px.** A second viewer mode, new keys and tests, and focus handling for two stages.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 11

**How does the phase-gate walk show moving between two images (storyboard step 6)?** No seeded group has two images (fact 2).

A. **The seed gives each corpus item with `pageCount: 2` (e1 on r1, e4 on r6, e9 on r15) a second published image as its own item in the same group, with the same label; this Unit makes the change in `seed-evidence.ts` and the seed test as a recorded owned-path addition. Seeded items become 15 (13 published); r1's, r6's and r15's document counts rise by one** (recommended). Step 6 works on r1 exactly as written ("move between the two prescription photos"), and the pager, Home/End and the lazy loading are exercised on the seed. The storyboard's "12 evidence items" line and CR-012's DC13 count are updated in the same commit.
B. **Change storyboard step 6 to "1 of 1" and show two images only after step 13's upload.** No seed change, but the seeded demo never shows paging, and step 13 must put both photos in one group.
C. **A two-image item.** Against FD-036 (one image per item) and T-305's `pageCount: 1`.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 12

**What happens to the prototype's synthetic page leftovers?** 25 `viewer.*` keys hold fictional document text (clinic names, "PROCESSED · QUARANTINE PASSED"), and `patient.css` still styles the synthetic page (`.viewer-page`, `.doc-head`, `.seal`, `.row`, `.table`, `.sig`) (facts 8, 9).

A. **This Unit removes the 25 keys from both dictionaries, excludes them in `port-from-prototype.mjs` so a re-port does not bring them back, and regenerates `keys.ts`; it asks U45 T-011 to delete the synthetic-page CSS (fallback: an S4 row, since T-308's CSS section is append-only)** (recommended). No dead string that could later be rendered as if it were a document; a smaller dictionary; the 14 product keys stay verbatim (the task says 16; the prototype has 14).
B. **Leave them.** Harmless today, but a later agent may render "QUARANTINE PASSED", which reads as a validation claim.
C. **Remove the keys and the CSS rules here.** Edits T-011's lines in `patient.css`, against the append-only rule.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 13

**How is the "chronological treatment-comparison timeline" (FR59, AC7.2.4) shown?** The prototype stacks the groups in a grid.

A. **The groups become an ordered list, `ol.ev-groups` (reviewed → later → outcome, items by publish time), drawn as a vertical timeline: a thin rail and one dot per group, static, on T-011 tokens; the list enters with T-011's `Reveal` (first six items, off under reduced motion); the "not medically validated" callout stays outside it and never moves** (recommended). The order is in the markup for screen readers ("list, 3 items") and visible to sighted readers; no new motion; the callout keeps AC2.4.4's spirit.
B. **The prototype's plain grid.** The order exists but is not visible as a timeline.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 14

**Does this Unit show the pipeline state chips for a delayed item (NFR2's verification column, AC7.1.5)?** The public page holds only published items.

A. **No: the public experience page never shows an item that is not published; the author's chips stay in T-306's composer (and U38 T-409's list for items confirmed after publish). The NFR2 row's mention of T-308 is recorded as a correction (S3 row); AC7.1.5 is N/A here** (recommended). Nothing private reaches an indexable, shared page; no account-specific data on a public route.
B. **Show the signed-in author their pending items on the experience page.** Needs an owner query per request on a public page and ties the viewer's account to an anonymous review on screen.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 15

**What does the open control do without JavaScript?** The prototype's control is a button.

A. **Keep the prototype's `button.btn.small.ghost` with `aria-haspopup="dialog"`; without JavaScript it does nothing, as every other sheet in the app** (recommended). Same markup and behaviour as the prototype and the other sheets; the page's text and the callout are fully server-rendered.
B. **An `<a href>` to the processed image that the script intercepts.** Works without script, but a link that opens a dialog confuses assistive technology, and a middle-click opens a raw image without the "not medically validated" notice.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)
