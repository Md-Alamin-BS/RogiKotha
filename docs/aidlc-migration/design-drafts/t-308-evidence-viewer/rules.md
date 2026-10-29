# Business rules — U28 `t-308-evidence-viewer`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U28), `unit-of-work-story-map.md` (US7.2, US7.1), `requirements.md` (FR53–FR59, FR63–FR65, FR68, FR95, NFR2, NFR4, NFR6, NFR7, NFR13), `stories.md` (AC7.1.x, AC7.2.x, AC2.4.3, AC2.4.4), `contract-summary.md` (C8, C14), T-308 with its FD-091 amendment and the CR-001/FD-036 block, the hard rules in `project.md` and `PRODUCT.md`, `01-conventions.md` §2, §6–§10, §14, and the upstream drafts `t-305-privacy-preview-redaction-publish`, `t-307-experience-page-and-index` and `t-011-patient-design-and-motion-system`. The workflows that apply these rules are in `functional-spec.md`, the component contracts in `frontend-components.md`, the data shapes in `entities.md`.

Every rule that depends on an answer in `functional-design-questions.md` names the question in `source`. Questions 1–15 are answered A, decided by the agent under the owner's no-questions instruction of 2026-10-29. `functional-spec.md` § 13 lists what changes under each other option.

```yaml
rules:
  # 1. Data, boundaries and what may be rendered
  - id: BR1.1
    statement: "The evidence section renders only the view model it receives from the experience page (ExperiencePageVM.evidenceGroups and hasDocuments, filled by U25 T-305); it runs no query and imports no server module."
    category: constraint
    applies_to: "components/patient/evidence/**, EvidenceSlot (U27 T-307)"
    trigger: "Any data the section or the viewer shows"
    logic: "experience page (U27) -> ExperiencePageVM -> EvidenceSlot -> EvidenceSection {groups, hasDocuments}; components import only @rogikotha/contracts (types), @rogikotha/i18n, react, react-dom, next-intl and web-shared; IF a file imports server/, @rogikotha/application, database, adapters, test-support or node:* THEN pnpm lint fails"
    violation: "Boundary lint failure (eslint.boundaries.mjs, FD-093 (1)); reviewer rejects"
    source: "01-conventions.md §2 and §8, FD-093, T-305 WF5 and BR5.10, eslint.boundaries.mjs"
  - id: BR1.2
    statement: "Only public artifact URLs reach the DOM: every img src and download href must match /^\\/api\\/evidence\\/artifacts\\/[A-Za-z0-9-]+(\\?download=1)?$/; an item with any other URL is not rendered."
    category: constraint
    applies_to: "artifact-url.ts (isArtifactUrl), EvidenceSection, EvidenceViewer"
    trigger: "Mapping a group's items to rows and viewer images"
    logic: "items = group.items.filter(i => i.pages.every(p => isArtifactUrl(p.artifactUrl)) AND isArtifactUrl(i.thumbnailUrl) AND isArtifactUrl(i.downloadUrl)); no URL is built in the browser; no data: or blob: URL is ever created"
    violation: "An original, quarantine or private path in the patient UI (hard rule: original access is a separate audited permission); T-308 threat-note test fails"
    source: "PRODUCT.md hard rule (original evidence), FR65, AC7.2.6, T-308 threat notes, T-305 BR5.3 and BR5.6"
  - id: BR1.3
    statement: "No internal id, storage key, filename, uploader, state, fail reason or hash appears in markup, data attributes or announcements; items are addressed by their position and their public id only."
    category: constraint
    applies_to: "EvidenceSection, EvidenceItem, EvidenceOpenButton, EvidenceViewer"
    trigger: "Rendering any evidence field"
    logic: "rendered fields = {label or evidence.untitled, thumbnailUrl, pages[].artifactUrl/width/height, downloadUrl}; data-view-evidence carries publicId; IF any other EvidenceItemVM field appears THEN the allowlist test fails"
    violation: "Private data in a public projection (AC7.1.6, FD-016)"
    source: "T-305 BR5.3, AC7.1.6, team.md Way of Working step 4 (private data in view models)"
  - id: BR1.4
    statement: "Failed, unconfirmed and processing items are never shown on the public page; the author's pipeline chips belong to the composer and the personal workspace."
    category: constraint
    applies_to: "EvidenceSection"
    trigger: "A review whose items are not all published"
    logic: "the public VM holds only items in PUBLIC_EVIDENCE_STATES (T-305 BR5.1); the section has no failed branch; .ev-item.failed stays for U26 T-306's author view"
    violation: "A failed or private file visible to readers (AD-6, storyboard note)"
    source: "Question 14, T-305 BR5.1 and BR5.4, AC7.1.4, 05-demo-storyboard.md note on failed items"

  # 2. The evidence section on the experience page
  - id: BR2.1
    statement: "With no documents, the section shows its heading (filter.evidence) and one 'No documents' note; it never shows 0."
    category: calculation
    applies_to: "EvidenceSection"
    trigger: "hasDocuments is false, or every group's item list is empty after BR1.2"
    logic: "IF NOT hasDocuments OR sum(items) = 0 THEN render h2.section-head filter.evidence + p.note label.noDocuments AND nothing else"
    violation: "A count of 0 or an empty block (hard rule: render a missing value as 'No documents')"
    source: "project.md Mandated (No documents), Forbidden (0), prototype evidenceSection, AC7.2.4"
  - id: BR2.2
    statement: "With documents, the section shows the heading, the static 'Documents attached — not medically validated' callout, the three groups in fixed order as an ordered timeline, and the experience.evidenceOnly note."
    category: policy
    applies_to: "EvidenceSection"
    trigger: "hasDocuments is true"
    logic: "h2 filter.evidence -> div.callout.warn[data-static=notice] <b>evidence.status</b> evidence.notice -> Reveal as=ol .ev-groups (li per group in EVIDENCE_GROUPS order: reviewed, later, outcome) -> p.note experience.evidenceOnly"
    violation: "Missing hard-rule wording (AC7.2.5) or groups out of treatment order (AC7.2.4)"
    source: "Question 13, prototype evidenceSection, FR56, FR59, AC7.2.4, AC7.2.5, T-305 BR5.9"
  - id: BR2.3
    statement: "A group with no items shows its heading and 'No documents' when the review has documents in another group."
    category: calculation
    applies_to: "EvidenceGroup"
    trigger: "hasDocuments is true and group.items is empty"
    logic: "li.ev-group > h3 evidence.group.<g> + p.note label.noDocuments"
    violation: "AC7.2.4 per-section clause fails"
    source: "Question 6, AC7.2.4, project.md Mandated (No documents)"
  - id: BR2.4
    statement: "Items keep the order the view model gives (publish time, then public id); the section never re-sorts and has no sort control."
    category: constraint
    applies_to: "EvidenceGroup, EvidenceViewer pages"
    trigger: "Rendering a group's rows or the viewer's pages"
    logic: "rows = group.items in VM order; viewer pages = the same list in the same order"
    violation: "Chronology broken (FR59) or a non-neutral order (hard rule: neutral order)"
    source: "T-305 WF5 step 2, FR59, project.md Mandated (neutral order)"
  - id: BR2.5
    statement: "Each row shows the processed thumbnail (decorative), the item's label or 'Image {n}', and the open button described by that label; no page count while pageCount is 1."
    category: policy
    applies_to: "EvidenceItem"
    trigger: "Rendering an item row"
    logic: "div.ev-item > span.doc-icon (img.doc-thumb src=thumbnailUrl alt='' loading=lazy decoding=async width=40 height=56) + span.lbl > b#<rowId> (label ?? evidence.untitled {n}) [+ pageCount > 1 ? count line : nothing] + EvidenceOpenButton aria-describedby=<rowId>"
    violation: "Identical unlabeled buttons (WCAG 2.4.6) or 'Image' text read twice (thumbnail not decorative)"
    source: "Questions 7, 8, 9; prototype evidenceSection; FR95"
  - id: BR2.6
    statement: "The 'not medically validated' callout, the evidenceOnly note and the section heading are never inside a Reveal, never pressable and never animated by this Unit."
    category: constraint
    applies_to: "EvidenceSection"
    trigger: "Any motion on the page"
    logic: "Reveal wraps only ol.ev-groups; the callout carries data-static=notice (T-011 static set); no rule in T-308's CSS section names a transition or animation"
    violation: "check:motion fails, or the reviewer rejects (task step 11, AC2.4.4 spirit)"
    source: "T-308 step 11, AC2.4.4, T-011 BR7.4 and BR4.7, T-307 Question 11"

  # 3. The viewer's dialog
  - id: BR3.1
    statement: "One viewer per evidence section: any item's button opens the shared Sheet at that item's group and index; the Sheet is titled viewer.title and is the only dialog."
    category: policy
    applies_to: "EvidenceViewerProvider, EvidenceOpenButton, EvidenceViewer"
    trigger: "A reader activates experience.openEvidence"
    logic: "provider state {open: false} | {open: true, group: g, index: i}; open(g, i) mounts createPortal(Sheet(title=viewer.title, onClose=close) > .viewer-shell, document.body); .viewer-shell has no role and no inner heading"
    violation: "Nested modal dialogs or one overlay per item (Question 1 B)"
    source: "Question 1, 01-conventions.md §8 (sheets implemented once), Sheet.tsx"
  - id: BR3.2
    statement: "Opening resets the view (image i of group g, zoom 1, rotation 0, pan 0) and moves focus to 'Zoom out'; closing returns focus to the button that opened it."
    category: policy
    applies_to: "EvidenceViewer, Sheet"
    trigger: "Open and close"
    logic: "on mount: state = initialState(g, i); effect after the Sheet's own effect: zoomOutRef.focus({preventScroll: true}); close (button, Escape) -> unmount -> Sheet cleanup focuses the trigger"
    violation: "Lost focus (WCAG 2.4.3) or a stale view from the previous opening"
    source: "Prototype openEvidenceViewer, T-308 steps 3 and 6, Sheet.tsx focus return"
  - id: BR3.3
    statement: "Tab and Shift+Tab stay inside the viewer through the Sheet's trap; no second trap is written."
    category: constraint
    applies_to: "EvidenceViewer"
    trigger: "Keyboard focus movement"
    logic: "Sheet.tsx handles Tab on document while open; the task's useFocusTrap.ts is not created"
    violation: "Two traps fighting, or focus escaping the dialog"
    source: "Question 1, Sheet.tsx, prototype trapFocus"
  - id: BR3.4
    statement: "The viewer's chrome follows the prototype's order: file line and notice, stage, then the controls: zoom out, 100 %, zoom in, Fit, separator, rotate, separator, previous, 'n of N', next, fullscreen (when supported), spacer, zoom readout, download."
    category: policy
    applies_to: "EvidenceViewer"
    trigger: "Rendering the viewer"
    logic: ".viewer-meta (.file = current item's label; .notice = viewer.notice) -> .viewer-stage[tabindex=0][role=region][aria-label=viewer.zoomLabel] -> .viewer-controls[role=toolbar][aria-label=viewer.zoomLabel] in the listed order; the file line and download follow the current image"
    violation: "Chrome parity row fails (task acceptance)"
    source: "Prototype renderViewerBody, T-308 step 2 and acceptance 'Chrome parity'"

  # 4. Transform
  - id: BR4.1
    statement: "Zoom is a factor of the base size, from 0.5 to 3, rounded to 2 decimals; each step is 0.1."
    category: calculation
    applies_to: "viewer-transform.ts (zoomBy, setZoom)"
    trigger: "Zoom in or out by button, key, Ctrl/Meta+wheel or pinch"
    logic: "zoom = round2(clamp(zoom + delta, 0.5, 3)); base = natural size scaled down to fit the stage's content width (never up): baseW = min(w, stageW), baseH = h * baseW / w"
    violation: "Zoom outside the range, or float drift in the readout"
    source: "Question 2, prototype viewerZoom, T-308 acceptance 'Transform'"
  - id: BR4.2
    statement: "100 % sets zoom 1 and pan 0; Fit sets zoom to min(stageW / baseW, stageH / baseH) clamped to 0.5–2 and rounded, and resets rotation and pan."
    category: calculation
    applies_to: "viewer-transform.ts (fitZoom, reset100)"
    trigger: "The 100 % or Fit control, or keys 1 and 0"
    logic: "stageW, stageH = stage clientWidth/clientHeight minus 64 (the stage padding); w, h from EvidencePageRefVM; z = round2(clamp(min(stageW/baseW, stageH/baseH), 0.5, 2)); rotation = 0; pan = {0, 0}"
    violation: "Fit that does not fit at 360 px (fact 3)"
    source: "Question 2, prototype viewerFit, T-308 acceptance 'Transform' (amended: 800 x 600 stage, 1200 x 1600 image -> 0.55)"
  - id: BR4.3
    statement: "Rotate turns the image 90° clockwise; four turns return to 0."
    category: calculation
    applies_to: "viewer-transform.ts (rotate)"
    trigger: "Rotate control or key R"
    logic: "rotation = (rotation + 90) % 360"
    violation: "Rotation acceptance row fails"
    source: "Prototype viewerRotate, T-308 acceptance 'Transform'"
  - id: BR4.4
    statement: "Previous and next move between the images of the open group, clamped at both ends; Home and End go to the first and last; nothing else resets."
    category: calculation
    applies_to: "viewer-transform.ts (goTo)"
    trigger: "Previous, next, arrow keys, PageUp/PageDown, Home, End"
    logic: "index = clamp(target, 0, pages.length - 1); zoom, rotation and pan unchanged; only the current .viewer-page-wrap is visible, the others carry hidden"
    violation: "Page acceptance row fails (next on the last image must stay)"
    source: "Prototype viewerPage, CR-001 block (pages are the group's items), T-308 acceptance 'Pages'"
  - id: BR4.5
    statement: "The transform is translate(pan) rotate(rotation) scale(zoom) about the centre of .viewer-pages, applied through the element's CSSOM style from the client only, never as a server-rendered style attribute, and never transitioned."
    category: constraint
    applies_to: "EvidenceViewer, T-308 CSS section"
    trigger: "Any state change"
    logic: "useLayoutEffect: pagesRef.current.style.transform = toTransform(state); .viewer-pages gets transform-origin: center in T-308's section; .viewer-stage gets overflow: hidden; no transition on .viewer-pages"
    violation: "An inline style the T-502 CSP would block (T-011 BR9.2), or eased pan/zoom (task step 11)"
    source: "Question 3, T-011 BR9.2 and BR4.7, T-308 steps 8 and 11"

  # 5. Pointer, wheel, pinch and keys
  - id: BR5.1
    statement: "One pointer (left mouse button, touch or pen) on the stage pans with pointer capture; a press on the controls never pans."
    category: policy
    applies_to: "viewer-pointer.ts, EvidenceViewer"
    trigger: "pointerdown, pointermove, pointerup, pointercancel, lostpointercapture on .viewer-stage"
    logic: "IF pointerType = mouse AND button != 0 THEN ignore; IF target is inside .viewer-controls THEN ignore; on the first pointer: start = client - pan, setPointerCapture, stage.dragging; move: pan = client - start; up/cancel: release, remove dragging"
    violation: "Pan acceptance fails, or a toolbar click drags the image"
    source: "Prototype viewerPanStart/Move/End, T-308 step 4"
  - id: BR5.2
    statement: "With two pointers down, zoom follows the ratio of their distance to the distance at the second pointerdown; panning pauses until one pointer lifts."
    category: calculation
    applies_to: "viewer-pointer.ts (pinchZoom)"
    trigger: "A second pointer on the stage"
    logic: "z = round2(clamp(startZoom * dist(p1, p2) / startDist, 0.5, 3)); IF startDist < 8 px THEN ignore; when one pointer lifts, the other restarts a pan from its position"
    violation: "Phone readers cannot enlarge (Question 5 B)"
    source: "Question 5, NFR4"
  - id: BR5.3
    statement: "The wheel zooms by 0.1 only with Ctrl or Meta held; without them it pans the image by the wheel's deltas; both prevent the default (listener with passive: false)."
    category: policy
    applies_to: "EvidenceViewer (native wheel listener on .viewer-stage)"
    trigger: "wheel on the stage"
    logic: "preventDefault(); IF ctrlKey OR metaKey THEN zoomBy(deltaY > 0 ? -0.1 : 0.1) ELSE pan = pan - {deltaX, deltaY} (deltaMode 1 multiplies by 16)"
    violation: "Wheel acceptance row: without Ctrl the zoom must not change"
    source: "Question 3, prototype viewerWheel, T-308 acceptance 'Wheel'"
  - id: BR5.4
    statement: "Keys inside the viewer: - or _ zoom out; + or = zoom in; 1 100 %; 0 Fit; r rotate; f fullscreen; ArrowLeft/PageUp previous; ArrowRight/PageDown next; Home first; End last; ArrowUp/ArrowDown and Shift+any arrow pan 48 px (Shift: 192 px); Escape closes through the Sheet."
    category: policy
    applies_to: "viewer-keys.ts (keyToAction), EvidenceViewer onKeyDown on .viewer-shell"
    trigger: "keydown while focus is inside the viewer"
    logic: "IF ctrlKey OR metaKey OR altKey OR isComposing THEN no action; IF target is a button and key is Enter or Space THEN no action (native click); action = keyToAction(key, shiftKey); IF action THEN preventDefault and run it; letters match case-insensitively; titles show the key in brackets"
    violation: "Keys acceptance row fails, or a browser shortcut is captured (WCAG 2.1.4)"
    source: "Question 4, T-308 step 4 and Read-first 6, AC7.2.6"
  - id: BR5.5
    statement: "A page change announces '{label}, page {n} of {total}' through useAnnounce; the zoom readout keeps the prototype's aria-live; rotation announces 'Rotation: {deg}°'; nothing else is announced."
    category: policy
    applies_to: "EvidenceViewer"
    trigger: "goTo with a new index; rotate"
    logic: "announce(t('viewer.pageLabel', {n, total}) prefixed by the label); announce(t('viewer.rotationNow', {deg})); n, total, deg through formatNumber(locale)"
    violation: "Silent state change for screen-reader users, or a double announcement"
    source: "T-308 step 6, 01-conventions.md §8 (useAnnounce), CR-004"

  # 6. Fullscreen and download
  - id: BR6.1
    statement: "Fullscreen is offered only when document.fullscreenEnabled; it targets .viewer-shell, toggles its label, follows fullscreenchange, and is exited before the viewer closes."
    category: policy
    applies_to: "EvidenceViewer"
    trigger: "Fullscreen control or key f; close"
    logic: "IF NOT fullscreenEnabled THEN button not rendered; toggle: document.fullscreenElement ? exitFullscreen() : shell.requestFullscreen(); on fullscreenchange: isFull = (fullscreenElement = shell); on close IF isFull THEN exitFullscreen(); a rejected promise leaves the state unchanged"
    violation: "A dead control on iPhone Safari, or a viewer closed while the document stays fullscreen"
    source: "T-308 step 5, AC7.2.6"
  - id: BR6.2
    statement: "Download is a plain link to the current image's downloadUrl with the download attribute; the browser never builds a file."
    category: constraint
    applies_to: "EvidenceViewer"
    trigger: "Rendering the toolbar; changing image"
    logic: "a.vdownload[href=current.downloadUrl][download] viewer.download; the server sends Content-Disposition: attachment (T-305 BR5.7); no canvas, no data: or blob: URL"
    violation: "Download acceptance row fails, or a data: URL appears (threat notes)"
    source: "T-308 step 7 and CR-001 block (downloadUrl), FR65, AC7.2.6, T-305 BR5.7"
  - id: BR6.3
    statement: "The current and the next image load eagerly; every other image loads lazily; every image carries its width and height."
    category: policy
    applies_to: "EvidenceViewer"
    trigger: "Rendering the pages"
    logic: "img.viewer-img loading = (i = index OR i = index + 1) ? eager : lazy; decoding = async; draggable = false; alt = viewer.pageLabel {n, total}"
    violation: "A blank stage on next, or layout shift"
    source: "T-308 step 2 (loading), NFR13 (CLS)"

  # 7. Copy, languages and numerals
  - id: BR7.1
    statement: "Every string comes from a key in both dictionaries; the 14 prototype product viewer keys stay verbatim; this Unit adds viewer.fullscreen, viewer.exitFullscreen, viewer.pageLabel, viewer.rotationNow and evidence.untitled, and removes the 25 synthetic viewer keys."
    category: constraint
    applies_to: "packages/i18n/messages/{en,bn}.json, keys.ts, port-from-prototype.mjs"
    trigger: "Any user-facing text"
    logic: "IF a key lacks its bn entry THEN pnpm i18n:check fails; the removed keys are excluded in port-from-prototype.mjs; new Bengali strings are listed for the owner's review (FD-042)"
    violation: "A hard-coded string or a missing Bengali entry (project.md Forbidden and Mandated)"
    source: "Question 12, project.md (i18n rules), ADR 0011, FD-024, FD-042"
  - id: BR7.2
    statement: "Every number the viewer shows (n of N, zoom readout, item position, rotation) follows the active language through formatNumber; the 100 % button uses viewer.zoom100."
    category: calculation
    applies_to: "EvidenceViewer, EvidenceItem"
    trigger: "Rendering a number"
    logic: "pager = <b>{formatNumber(index+1)}</b> {viewer.of} <b>{formatNumber(total)}</b>; readout = formatNumber(round(zoom*100)) + '%'; bn renders ১ / ২ and ১০০%"
    violation: "Latin digits on /bn (project.md Mandated)"
    source: "project.md Mandated (numerals), 01-conventions.md §6, prototype bn(), T-308 acceptance 'Numerals'"
  - id: BR7.3
    statement: "No string, key, class or attribute in this Unit says 'verified' or 'approved' about evidence."
    category: constraint
    applies_to: "All owned files and new keys"
    trigger: "Review and the grep test"
    logic: "test renders the section and the viewer in en and asserts no /verified|approved/i in text or attributes; the Bengali 'যাচাই করা হয়নি' (not checked) is the ported negation"
    violation: "Hard rule: never describe evidence as verified or approved"
    source: "project.md Forbidden, FR56, AC7.2.5, T-308 acceptance 'Callout copy'"

  # 8. Look and motion
  - id: BR8.1
    statement: "Page styles live only in T-308's appended section of patient.css, marked /* added: T-308 reason */, on T-011 tokens and kept class names; no token, motion or shell rule is edited."
    category: constraint
    applies_to: "apps/web/src/styles/patient.css (T-308 section)"
    trigger: "Any style the Unit needs"
    logic: "allowed: .viewer-img, .viewer-pages origin, .viewer-stage overflow, .viewer-shell:fullscreen, 44 px .vctrl and .vdownload, .doc-thumb, the timeline rail on ol.ev-groups, .ev-group > h3; a needed token becomes an ISSUES.md row"
    violation: "Reviewer rejects an edit to tokens.css, motion.css or T-011's lines (FD-091 amendment)"
    source: "T-308 FD-091 amendment, project.md Code Style (2026-10-27), T-011 BR4.7"
  - id: BR8.2
    statement: "Motion comes only from T-011: the sheet entry, Reveal on ol.ev-groups and press feedback through data-press on the viewer's controls; pan, zoom, rotate and image changes are instant; reduced motion changes nothing in the viewer itself."
    category: constraint
    applies_to: "EvidenceSection, EvidenceViewer"
    trigger: "Any visual change"
    logic: ".vctrl and .vdownload carry data-press; .btn is in T-011's press list; no transition or animation declaration in T-308's section (check:motion); under reduced motion T-011 turns off the sheet rise, the reveal and the press scale"
    violation: "check:motion fails; AC2.4.3 journey fails"
    source: "T-308 steps 8 and 11, FD-091, NFR13, T-011 BR6.7, BR6.11, AC2.4.3"
  - id: BR8.3
    statement: "At 360 px the toolbar wraps, every control is at least 44 x 44 px, and nothing overflows the sheet horizontally in either language."
    category: constraint
    applies_to: "T-308 CSS section, EvidenceViewer"
    trigger: "Narrow screens and Bengali labels"
    logic: ".viewer-controls keeps flex-wrap: wrap; .vctrl, .vdownload min-height and min-width var(--target); the stage keeps a min-height of 320 px; the Sheet is 100% wide below 880 px"
    violation: "NFR4 overflow or a target-size failure (WCAG 2.5.8)"
    source: "NFR4, T-011 BR (44 px targets), T-308 acceptance 'Chrome parity' (360 px)"

  # 9. Tests and gates
  - id: BR9.1
    statement: "Tests are written after each layer and run in both en and bn: pure transform, keys and pointer functions; the viewer; the section; the URL guard; at least one smoke assertion."
    category: policy
    applies_to: "components/patient/evidence/*.test.ts(x), evidence-viewer.smoke.test.tsx"
    trigger: "Code Generation and Build and Test"
    logic: "jsdom; requestFullscreen and fullscreenEnabled mocked; stage sizes injected; builders in a local evidence-test-support.ts, never @rogikotha/test-support; apps/web stays at or above 80% lines with untested files counted"
    violation: "Coverage floor or smoke growth rule broken (team.md Testing Posture)"
    source: "team.md Testing Posture, T-010 vitest.workspace.ts, FD-093 (5), T-308 step 9"
  - id: BR9.2
    statement: "Before hand-off: impeccable detect with no findings, pnpm contrast and contrast:patient clean, check:motion, i18n:check, format:check, check:identity, the full pnpm check and pnpm smoke green, and CI green on the Bolt head."
    category: validation
    applies_to: "The Bolt"
    trigger: "Build and Test, merge"
    logic: "IF any gate step fails THEN no merge; every defect or assumption gets an ISS row naming U28 T-308"
    violation: "team.md Way of Working steps 2-6"
    source: "team.md Way of Working, project.md Mandated (validation steps, ISS rows), T-308 acceptance table"
  - id: BR9.3
    statement: "The seed holds a second published image in the same group for each corpus item with pageCount 2 (e1, e4, e9), so storyboard step 6 can page between two images."
    category: policy
    applies_to: "packages/test-support/src/seed/seed-evidence.ts and its test (recorded owned-path addition)"
    trigger: "Seeding evidence"
    logic: "FOR page in 2..pageCount: insert one more item in the same review and group, same label, seedRef '<ref>-p<page>', one page and one thumbnail, published like its first item; seeded items 12 -> 15, published 10 -> 13; second run inserts 0"
    violation: "Storyboard step 6 cannot be walked (S2, blocks the phase gate)"
    source: "Question 11, 05-demo-storyboard.md step 6, CR-001, team.md Way of Working step 7"
```

## Rules summary

| ID | Category | Rule |
|---|---|---|
| BR1.1 | constraint | Section renders only the page's VM; no query, no server import |
| BR1.2 | constraint | Only `/api/evidence/artifacts/…` URLs reach the DOM |
| BR1.3 | constraint | No internal id, key, filename, uploader, state or hash rendered |
| BR1.4 | constraint | No failed, unconfirmed or processing item on the public page |
| BR2.1 | calculation | No documents → heading + one "No documents" |
| BR2.2 | policy | Heading, static callout, three groups as an ordered timeline, evidenceOnly note |
| BR2.3 | calculation | Empty group → heading + "No documents" |
| BR2.4 | constraint | VM order kept; no re-sort |
| BR2.5 | policy | Thumbnail, label or "Image {n}", described open button; no "1 page" |
| BR2.6 | constraint | Callout, note and heading never animated |
| BR3.1 | policy | One Sheet per section, the only dialog |
| BR3.2 | policy | Open resets the view and focuses Zoom out; close returns focus |
| BR3.3 | constraint | The Sheet's focus trap only |
| BR3.4 | policy | Prototype chrome order |
| BR4.1 | calculation | Zoom 0.5–3 of the base size, 2 decimals |
| BR4.2 | calculation | 100 % and Fit math |
| BR4.3 | calculation | Rotate by 90° |
| BR4.4 | calculation | Image navigation within the group, clamped |
| BR4.5 | constraint | Centre-origin transform through the CSSOM, never transitioned |
| BR5.1 | policy | One-pointer pan with capture |
| BR5.2 | calculation | Two-pointer pinch zoom |
| BR5.3 | policy | Wheel: Ctrl/Meta zooms, otherwise pans |
| BR5.4 | policy | Key map; modifiers ignored |
| BR5.5 | policy | Announcements: image change and rotation |
| BR6.1 | policy | Fullscreen when supported; exit before close |
| BR6.2 | constraint | Download is a link to `downloadUrl` |
| BR6.3 | policy | Current and next image eager, others lazy |
| BR7.1 | constraint | Keys in both languages; five added, 25 synthetic removed |
| BR7.2 | calculation | Numerals follow the language |
| BR7.3 | constraint | Never "verified" or "approved" |
| BR8.1 | constraint | Styles only in T-308's section on T-011 tokens |
| BR8.2 | constraint | Motion only from T-011; transforms instant |
| BR8.3 | constraint | 360 px: wrap, 44 px targets, no overflow |
| BR9.1 | policy | Test-after in en and bn; smoke; 80% floor |
| BR9.2 | validation | Full gate before hand-off |
| BR9.3 | policy | Seed adds the second image for e1, e4, e9 |
