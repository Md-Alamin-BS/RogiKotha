# T-308 — Processed-document viewer and evidence sections port

| Field | Value |
|---|---|
| Story | STORY-EVID-002 (public viewer), FR-EVD-001–004, STORY-EVID-001 (state chips, author side reuse) |
| Phase / Lane | 3 / B |
| Class → model | M2 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 3–4 h agent; validation 1.5 h |
| Depends on | T-305 (`evidence.getPublic`, artifact routes), T-307 (`EvidenceSlot`, `Sheet` usage) |
| Parallel-safe with | T-309, T-302, T-401 |

## Scope change 2026-09-12 — images only (CR-001 / FD-036)


This block overrides the PDF/`derivativePdfUrl` mentions below. Every item is a single processed
image. The viewer's page prev/next moves **between the items of the same evidence group** (so a
two-photo prescription still reads "1 of 2"); the download control downloads the current item's
processed image (`downloadUrl`). Keep zoom, fit, pan, rotate, fullscreen, keyboard keys and the focus
trap exactly as specified. Estimate reduced to 3–4 h.

## Goal

Replace the prototype's synthetic page generator with a client-side viewer over the real page PNGs:
the same dialog chrome, focus trap, zoom (−/+/100 %/fit), pan (pointer capture), page prev/next,
rotate, fullscreen, wheel-zoom with Ctrl/Meta, the keyboard shortcuts, and "Download processed
copy" pointing at the derivative-PDF artifact route. Fill `EvidenceSlot` on the experience page with
the three groups, the "Documents attached — not medically validated" callout and the
`experience.evidenceOnly` note. Both locales through `viewer.*` keys.

## Read first

1. `docs/implementation/01-conventions.md` §6, §7, §8 (Sheet, `useAnnounce`), §14
2. `docs/implementation/03-routes-and-contracts.md` §1 (`/api/evidence/artifacts/{artifactId}`), §4 "evidence" `getPublic` → VM shape, §6 `EvidenceGroupVM`, `ViewerDocVM`
3. `docs/scope-of-work.md` §5 "Public viewer supports zoom, pan, fullscreen, page navigation, rotation, and processed-PDF download."
4. Prototype, read fully: `app.js` 949–980 (`evidenceSection`), 1965–2034 (`VIEWER_STRINGS`, `VT`, `viewer` state — only the first 16 keys `title … rotateLabel` are product strings; `docHeadA … notePlan` were synthetic page copy and are **not** ported), 2035–2151 (`buildViewerPages`, `viewerPageHtml` — **not ported**; replaced by `<img>` pages), 2152–2183 (`openEvidenceViewer`, `closeEvidenceViewer`), 2184–2216 (`renderViewerBody` — port the chrome exactly), 2217–2272 (`applyViewerTransform`, `viewerZoom`, `viewerFit`, `viewerRotate`, `viewerPage`), 2273–2339 (`bindViewer`, pan handlers, `viewerWheel`), 2340–2397 (`viewerDownload` — replaced by a link), 2412–2432 (`trapFocus`), click handler 2661 (`data-view-evidence`); `styles.css` blocks `.viewer-shell`, `.viewer-meta`, `.viewer-stage`, `.viewer-stage.dragging`, `.viewer-pages`, `.viewer-page-wrap`, `.viewer-page`, `.viewer-controls`, `.vctrl`, `.vsep`, `.vpager`, `.vdownload`, `.spacer`, `.ev-group`, `.ev-item`, `.ev-item.failed`, `.doc-icon`, `.ev-groups`, and every `html[data-lang="bn"] .viewer-*` rule
5. `docs/planning/09-coverage-matrix.md` row STORY-EVID-002 (what was proven: zoom 100 %/Fit, pan, page prev/next, rotate, download, page-of-N)
6. Keyboard shortcuts implied by the `title` attributes: `−`/`+` zoom, `R` rotate, `←`/`→` page; add `Esc` close, `F` fullscreen (document in the toolbar titles the same way)

## Owned paths

- `apps/web/src/components/patient/evidence/**`: `EvidenceSection.tsx` (server: groups, callout, notes — fills T-307's `EvidenceSlot`), `EvidenceItem.tsx`, `EvidenceViewer.tsx` (client: dialog + stage + controls), `useViewerTransform.ts`, `useFocusTrap.ts` (shared candidate — put in `components/shared/` if T-008/T-307 did not create one; check first), `viewer-keys.ts`, tests
- `packages/i18n/messages/{en,bn}.json` — `viewer.title|notice|zoomOut|zoom100|zoomIn|fit|rotate|pagePrev|pageNext|pageOf|of|download|zoomLabel|rotateLabel|fullscreen|exitFullscreen|close|pageLabel` (port the 16 from `VIEWER_STRINGS` verbatim; add `fullscreen`, `exitFullscreen`, `close`, `pageLabel` ("Page {n} of {total}") in both languages), `evidence.pages` ("{count} pages" — replaces the inline `pages/পাতা` literal)
- `apps/web/src/styles/patient.css` — `/* added: T-308 */` for `.viewer-page img { display:block; max-width:none }` and a `:fullscreen .viewer-shell` rule if needed

## Not in scope

Author-side preview/redaction canvas (T-306), the artifact route handlers (T-305), staff evidence view (T-407), image lazy-loading strategy beyond `loading="lazy"` on non-current pages.

## Steps

1. **`EvidenceSection`** (server, receives `EvidenceGroupVM[]` from the page's VM): if no groups → `h2.section-head filter.evidence` + `p.note label.noDocuments` (prototype 951–954); else `h2` + `.callout warn` `<b>evidence.status</b> evidence.notice` + `.ev-groups` → per group `div.ev-group` `h4 evidence.group.{reviewed|later|outcome}` → `EvidenceItem` rows (`.doc-icon`, `.lbl` `<b>label</b>` + `evidence.pages {count}`, `btn small ghost` `experience.openEvidence` with `data-view-evidence={publicId}`) → `p.note experience.evidenceOnly`. Failed items are not in the public VM (T-305 decision) — no `.ev-item.failed` branch on the public page; keep the class for the author-side chip reuse in T-306 (already there).
2. **`EvidenceViewer`** (client): opened by the `experience.openEvidence` button (a client wrapper `EvidenceOpenButton` holds `open` state per item and renders the viewer in the shared `Sheet` overlay — `role="dialog" aria-modal aria-labelledby="viewer-title"`); chrome ported 1:1 from `renderViewerBody`: `.viewer-shell` → `h3#viewer-title.sr-only viewer.title` → `.viewer-meta` (`.file` label, `.notice` `viewer.notice`) → `.viewer-stage[tabindex=0][role=region][aria-label=viewer.zoomLabel]` → `.viewer-pages` containing one `.viewer-page-wrap[hidden]` per page, each with `<img class="viewer-page" src={page.url} width height alt="{viewer.pageLabel}" loading={current ? 'eager' : 'lazy'} draggable=false>` → `.viewer-controls[role=toolbar]`: `#viewer-zoom-out` (−), `#viewer-zoom-100`, `#viewer-zoom-in` (+), `#viewer-fit` (⤢ Fit), sep, `#viewer-rotate` (⟳), sep, `#viewer-prev` (‹), `.vpager` `<b id=viewer-page-now>` of `<b id=viewer-page-total>`, `#viewer-next` (›), `#viewer-fullscreen` (new; `viewer.fullscreen`), `.spacer`, `.vpager[aria-live=polite]` zoom %, `<a class="vdownload" href={derivativePdfUrl} download>` `viewer.download`. Numerals through the formatter (the prototype used `bn()`).
3. **`useViewerTransform`**: state `{page, zoom 0.5–3, rotation 0|90|180|270, pan{x,y}, panning}`; `transform = translate(pan) rotate(rotation) scale(zoom)` on `.viewer-pages`; `fit()` computes from the stage `clientWidth/Height − 64` and the **current image's natural size** (prototype used `offsetWidth`), clamps 0.5–2, resets rotation/pan (prototype behaviour — keep); `zoom(delta)` rounds to 2 dp; `page(delta)` clamps and resets nothing else; on open: `page 0, zoom 1, rotation 0, pan 0`, then `fit()` once the first image has loaded (prototype opened at 1 — **improve to fit on open**? No: keep `zoom 1` on open to match the prototype; `Fit` is a button. Note it).
4. **Pointer/keys**: pointerdown (left button or touch/pen; ignore `.viewer-controls`), `setPointerCapture`, `.dragging` class, move/up/cancel/leave ported; wheel zoom only with `ctrlKey||metaKey` + `preventDefault` (`{passive:false}`); keys on the dialog: `-`/`_` zoom out, `+`/`=` zoom in, `0` 100 %, `f` fit? (conflicts with fullscreen → use `F` for fullscreen and `0` for 100 %, `Shift+F`? Keep it simple: `f` = fit as the title says `Fit`, `Enter` on the fullscreen button; document titles: `⤢ Fit (F)`, `Fullscreen (Shift+F)`), `r` rotate, `←`/`→` page, `Esc` close (restores focus to the opening button), `Home`/`End` first/last page.
5. **Fullscreen**: `stageRef.current.closest('.viewer-shell').requestFullscreen()` when supported; toggle label `viewer.exitFullscreen`; hidden when unsupported (iOS Safari) — the page still works.
6. **Focus trap**: port `trapFocus` into `useFocusTrap(containerRef, active)`; initial focus on `#viewer-zoom-out`; announce `viewer.pageLabel` on page change and zoom % on zoom via `useAnnounce`.
7. **Download**: plain anchor to `derivativePdfUrl` (T-305 route sends `Content-Disposition: attachment`); no canvas rendering; no `data:` URLs.
8. **Reduced motion**: no transitions are added; the transform applies instantly (the prototype had none either); nothing to gate.
9. Tests (jsdom; mock `requestFullscreen`; images via `Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth')`): open/close + focus restore; zoom clamps; fit math; rotate cycles; page nav clamps and toggles `hidden`; keys; wheel without ctrl does nothing; pan updates transform; download href equals VM url; group order; empty state; both locales.
10. `npx impeccable detect apps/web/src/components/patient/evidence --no-advisory`; `pnpm check`; hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Chrome parity | manual vs prototype `#experiences/r1` → open evidence, light/dark, en/bn, 360 px | same controls in the same order; toolbar wraps on 360 px as the prototype does |
| Transform | `pnpm --filter @rk/web test useViewerTransform` | `zoom(+0.1)` ×30 → 3; `zoom(−0.1)` ×30 → 0.5; `fit` with stage 800×600 and image 1200×1600 → `min(736/1200, 536/1600)` = 0.34 → clamped 0.5; rotate 4× → 0 |
| Pages | `… test EvidenceViewer` | 2-page doc: next → page 2 visible, page 1 `hidden`; next again stays 2; `viewer.pageLabel` announced |
| Keys | same | `r` rotates, `ArrowRight` pages, `Escape` closes and focus returns to the trigger |
| Wheel | same | wheel without ctrl → no zoom change; with ctrl → ±0.1 and `preventDefault` called |
| Download | same | anchor `href === vm.derivativePdfUrl`, has `download` attribute |
| Callout copy | `… test EvidenceSection` | text contains `evidence.notice` (en: "…not medically validated"); no string containing "verified" or "approved" |
| Empty | same | no groups → `label.noDocuments` |
| Numerals | bn test | page counter shows `১ / ২` (or `১ of ২` per key) |
| i18n | `pnpm i18n:check` | all `viewer.*` keys in both files |
| Detector | `npx impeccable detect …` | 0 findings |
| Tree | `pnpm check` | green |

## Tests to write

`useViewerTransform.test.ts`, `EvidenceViewer.test.tsx`, `EvidenceSection.test.tsx`, `useFocusTrap.test.tsx` — en + bn.

## Threat notes

Not M3. UI assertions: the viewer only ever requests `/api/evidence/artifacts/*` URLs from the VM (test greps rendered `src`/`href` attributes for `quarantine|private|original` → none); no `data:` or `blob:` URLs constructed.

## Hard-rule checklist

- [ ] "Documents attached — not medically validated" callout present; no "verified"/"approved".
- [ ] Only public derivative URLs rendered; no original access path in the patient UI.
- [ ] Keyboard-operable dialog with focus trap and restore; non-canvas `<img>` pages with alt text; download link as fallback.
- [ ] Both locales via `viewer.*`; numerals follow language.
- [ ] No animation added; reduced motion unaffected.
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
