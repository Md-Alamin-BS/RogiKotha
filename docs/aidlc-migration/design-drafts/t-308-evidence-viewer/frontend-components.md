# Frontend components — U28 `t-308-evidence-viewer`

Component-level design for `functional-spec.md` (workflows WF0–WF7) and `rules.md` (BR1.1–BR9.3). It follows the recommended option A of every question in `functional-design-questions.md`, each decided by the agent under the owner's no-questions instruction of 2026-10-29. Upstream: U25 T-305's evidence view models, U27 T-307's `EvidenceSlot`, U45 T-011's tokens, `Reveal`, `data-press`, sheet entry and static set, T-008's `Sheet` and `useAnnounce`.

The snippets are interface-level sketches, not code to copy. Class names are the prototype's where T-011 kept them; new classes are marked "new".

## 1. Hierarchy

```text
experiences/[publicId]/page.tsx (U27)
└── ExperiencePage (U27) > ExperienceBody … > EvidenceSlot (U27 file, filled here)
    └── EvidenceSection {groups, hasDocuments}                       server
        ├── h2.section-head  filter.evidence
        ├── [no documents] p.note  label.noDocuments                  BR2.1
        └── [documents]
            ├── div.callout.warn[data-static=notice]  <b>evidence.status</b> evidence.notice   BR2.2, BR2.6
            ├── EvidenceViewerProvider {groups}                       client (context + one viewer)
            │   ├── Reveal as="ol" className="ev-groups ev-timeline"   T-011
            │   │   └── li.ev-group × 3  (EvidenceGroup)              server
            │   │       ├── h3  evidence.group.<g>
            │   │       ├── [empty] p.note  label.noDocuments        BR2.3
            │   │       └── EvidenceItem × n                          server
            │   │           ├── span.doc-icon > img.doc-thumb (new)  decorative thumbnail
            │   │           ├── span.lbl > b#ev-<publicId>          label | evidence.untitled {n}
            │   │           └── EvidenceOpenButton                    client; button.btn.small.ghost
            │   └── [open] createPortal(EvidenceViewer, document.body)
            │       └── Sheet title=viewer.title                     shared
            │           └── div.viewer-shell                         chrome (BR3.4)
            └── p.note.ev-note (new)  experience.evidenceOnly
```

## 2. Files

| Path | Kind | New |
|---|---|---|
| `apps/web/src/components/patient/evidence/EvidenceSection.tsx` | server | yes |
| `…/evidence/EvidenceGroup.tsx` | server | yes |
| `…/evidence/EvidenceItem.tsx` | server | yes |
| `…/evidence/EvidenceViewerProvider.tsx` | client (`'use client'`) | yes |
| `…/evidence/EvidenceOpenButton.tsx` | client | yes |
| `…/evidence/EvidenceViewer.tsx` | client | yes |
| `…/evidence/viewer-transform.ts` | pure | yes |
| `…/evidence/viewer-keys.ts` | pure | yes |
| `…/evidence/viewer-pointer.ts` | pure | yes |
| `…/evidence/artifact-url.ts` | pure | yes |
| `…/evidence/evidence-test-support.ts` | test builders (coverage-excluded) | yes |
| `…/evidence/*.test.ts(x)`, `evidence-viewer.smoke.test.tsx` | tests | yes |
| `apps/web/src/components/patient/experience/EvidenceSlot.tsx` | U27's file | recorded edit |
| `apps/web/src/styles/patient.css` | T-308 section | appended |
| `packages/i18n/messages/{en,bn}.json`, `src/keys.ts`, `scripts/port-from-prototype.mjs` | i18n | edited |
| `packages/test-support/src/seed/seed-evidence.ts`, `seed.int.test.ts` | seed | recorded edit (Q11) |

Not created: `useFocusTrap.ts` (the Sheet's trap), `useViewerTransform.ts` as a hook (the pure functions plus a reducer in `EvidenceViewer`; a hook adds no reuse).

## 3. Server components

### 3.1 `EvidenceSection`

```text
props: { groups: EvidenceGroupVM[]; hasDocuments: boolean }
const t = useTranslations(); const locale = useLocale();   // non-async server component, as About.tsx
const safe = groups.map(g => ({...g, items: g.items.filter(isPublicItem)}))      // BR1.2
const any = hasDocuments && safe.some(g => g.items.length > 0)
render:
  <section className="ev-section" aria-labelledby="ev-head">                    // new class, spacing only
    <h2 id="ev-head" className="section-head">{t('filter.evidence')}</h2>
    {!any && <p className="note">{t('label.noDocuments')}</p>}
    {any && <>
      <div className="callout warn" data-static="notice"><b>{t('evidence.status')}</b> {t('evidence.notice')}</div>
      <EvidenceViewerProvider groups={safe}>
        <Reveal as="ol" className="ev-groups ev-timeline">
          {EVIDENCE_GROUPS.map((g, gi) => <EvidenceGroup key={g} group={find(safe, g)} groupIndex={gi} />)}
        </Reveal>
      </EvidenceViewerProvider>
      <p className="note ev-note">{t('experience.evidenceOnly')}</p>
    </>}
  </section>
```

`isPublicItem(i)` = every `pages[].artifactUrl`, `thumbnailUrl` and `downloadUrl` passes `isArtifactUrl`. A group missing from the VM (U25 not merged) is treated as empty.

### 3.2 `EvidenceGroup`

`li.ev-group` > `h3` `evidence.group.<g>` > either `p.note label.noDocuments` or `div.ev-items` (new, spacing only) with one `EvidenceItem` per item, `index` = position in the group.

### 3.3 `EvidenceItem`

```text
<div className="ev-item">
  <span className="doc-icon" aria-hidden="true">
    <img className="doc-thumb" src={item.thumbnailUrl} alt="" width={40} height={56}
         loading="lazy" decoding="async" draggable={false} />
  </span>
  <span className="lbl"><b id={`ev-${item.publicId}`}>{item.label ?? t('evidence.untitled', {n: formatNumber(index + 1, locale)})}</b></span>
  <EvidenceOpenButton group={group} index={index} publicId={item.publicId} describedBy={`ev-${item.publicId}`} />
</div>
```

No page-count line while `pageCount` is 1 (Q8). No failed branch (BR1.4).

## 4. Client components

### 4.1 `EvidenceViewerProvider`

```text
'use client'
props: { groups: EvidenceGroupVM[]; children }
state: open: {group: EvidenceGroup; index: number} | null
context: { open(group, index) }
render: children + (open && mounted ? createPortal(
  <EvidenceViewer items={byGroup(open.group).items} startIndex={open.index}
                  groupLabelKey={`evidence.group.${open.group}`} onClose={() => setOpen(null)} />,
  document.body) : null)
```

`mounted` flips in an effect so the portal never renders on the server.

### 4.2 `EvidenceOpenButton`

```text
<button type="button" className="btn small ghost" aria-haspopup="dialog"
        aria-describedby={describedBy} data-view-evidence={publicId}
        onClick={() => ctx.open(group, index)}>{t('experience.openEvidence')}</button>
```

`.btn` is in T-011's press list; no `data-press` needed.

### 4.3 `EvidenceViewer`

```text
props: { items: EvidenceItemVM[]; startIndex: number; groupLabelKey: string; onClose(): void }
state (useReducer): { index, zoom: 1, rotation: 0, pan: {x: 0, y: 0} }
refs: shellRef, stageRef, pagesRef, zoomOutRef; pointer map; pinchStart
const fsSupported = typeof document !== 'undefined' && document.fullscreenEnabled

useEffect(() => zoomOutRef.current?.focus({preventScroll: true}), [])               // after Sheet's effect (BR3.2)
useLayoutEffect(() => { pagesRef.current.style.transform = toTransform(state) }, [state])   // BR4.5
useEffect(() => { stageRef.current.addEventListener('wheel', onWheel, {passive: false}); return remove }, [])
useEffect(() => { document.addEventListener('fullscreenchange', sync); return remove }, [])
announce on index change (not on first render) and on rotate                       // BR5.5

close = () => { if (document.fullscreenElement) void document.exitFullscreen(); onClose() }

<Sheet open title={t('viewer.title')} onClose={close}>
  <div className="viewer-shell" ref={shellRef} onKeyDown={onKey}>
    <div className="viewer-meta">
      <span className="file">{currentLabel}</span>
      <span className="notice">{t('viewer.notice')}</span>
    </div>
    <div className="viewer-stage" ref={stageRef} tabIndex={0} role="region" aria-label={t('viewer.zoomLabel')}
         onPointerDown={…} onPointerMove={…} onPointerUp={…} onPointerCancel={…} onLostPointerCapture={…}>
      <div className="viewer-pages" ref={pagesRef}>
        {items.map((it, i) => (
          <div className="viewer-page-wrap" key={it.publicId} hidden={i !== state.index}>
            <img className="viewer-img" src={it.pages[0].artifactUrl} width={it.pages[0].width} height={it.pages[0].height}
                 alt={t('viewer.pageLabel', {n: num(i + 1), total: num(items.length)})}
                 loading={i === state.index || i === state.index + 1 ? 'eager' : 'lazy'} decoding="async" draggable={false} />
          </div>))}
      </div>
    </div>
    <div className="viewer-controls" role="toolbar" aria-label={t('viewer.zoomLabel')}>
      <Ctl id="viewer-zoom-out" ref={zoomOutRef} label="viewer.zoomOut" keyHint="−">−</Ctl>
      <Ctl id="viewer-zoom-100" label="viewer.zoom100" keyHint="1">{t('viewer.zoom100')}</Ctl>
      <Ctl id="viewer-zoom-in" label="viewer.zoomIn" keyHint="+">+</Ctl>
      <Ctl id="viewer-fit" label="viewer.fit" keyHint="0">⤢ {t('viewer.fit')}</Ctl>
      <span className="vsep" aria-hidden="true" />
      <Ctl id="viewer-rotate" label="viewer.rotate" keyHint="R">⟳ {t('viewer.rotate')}</Ctl>
      <span className="vsep" aria-hidden="true" />
      <Ctl id="viewer-prev" label="viewer.pagePrev" keyHint="←" disabled-at-start>‹</Ctl>
      <span className="vpager"><b>{num(index + 1)}</b> {t('viewer.of')} <b>{num(items.length)}</b></span>
      <Ctl id="viewer-next" label="viewer.pageNext" keyHint="→">›</Ctl>
      {fsSupported && <Ctl id="viewer-fullscreen" label={isFull ? 'viewer.exitFullscreen' : 'viewer.fullscreen'} keyHint="F" aria-pressed={isFull}>⛶</Ctl>}
      <span className="spacer" />
      <span className="vpager" aria-live="polite"><b>{num(Math.round(zoom * 100))}%</b></span>
      <a className="vdownload" data-press="" href={current.downloadUrl} download>{t('viewer.download')}</a>
    </div>
  </div>
</Sheet>
```

`Ctl` renders `button.vctrl[type=button][data-press]` with `aria-label={t(label)}` and `title={`${t(label)} (${keyHint})`}`. Previous and next stay enabled at the ends (prototype; clamping makes them no-ops) so focus is never lost by a control turning disabled. `num` = `formatNumber(n, locale)`.

Handlers:
- `onKey(e)`: `action = keyToAction(e.key, {shift, ctrl, meta, alt, composing: e.nativeEvent.isComposing})`; skip Enter and Space on buttons; on an action, `preventDefault()` and dispatch. `Escape` is not handled here (the Sheet's document listener closes).
- `onPointerDown(e)`: ignore a non-left mouse button and targets inside `.viewer-controls`; add to the pointer map; first pointer → capture and `.dragging`; second → `pinchStart = {dist, zoom}`.
- `onPointerMove`: one pointer → pan; two → `pinchZoom`.
- `onPointerUp/Cancel/LostPointerCapture`: remove from the map; going from two to one restarts pan from the remaining pointer; zero → remove `.dragging`.
- `onWheel(e)` (native, non-passive): `preventDefault()`; Ctrl/Meta → `zoomBy(e.deltaY > 0 ? -0.1 : 0.1)`; else `panBy(-dx, -dy)` with `deltaMode === 1` × 16.
- Fit: `fitZoom({stageW: stage.clientWidth - 64, stageH: stage.clientHeight - 64, imageW, imageH})`.

## 5. Pure modules

```text
viewer-transform.ts
  round2(n) = Math.round(n * 100) / 100
  clamp(n, lo, hi)
  zoomBy(s, d)       -> {...s, zoom: round2(clamp(s.zoom + d, 0.5, 3))}
  baseSize(g)        -> {w: min(g.imageW, g.stageW), h: g.imageH * min(g.imageW, g.stageW) / g.imageW}
  fitZoom(g)         -> round2(clamp(min(g.stageW / base.w, g.stageH / base.h), 0.5, 2))
  fit(s, g)          -> {...s, zoom: fitZoom(g), rotation: 0, pan: {0, 0}}
  reset100(s)        -> {...s, zoom: 1, pan: {0, 0}}
  rotate(s)          -> {...s, rotation: (s.rotation + 90) % 360}
  goTo(s, i, count)  -> {...s, index: clamp(i, 0, count - 1)}
  panBy(s, dx, dy)   -> {...s, pan: {x: s.pan.x + dx, y: s.pan.y + dy}}
  toTransform(s)     -> `translate(${x}px, ${y}px) rotate(${r}deg) scale(${z})`
viewer-keys.ts
  keyToAction(key, mods) -> ViewerAction | null   (ENT-007; PAN_STEP = 48, SHIFT_PAN_STEP = 192)
viewer-pointer.ts
  distance(a, b); pinchZoom(start, a, b) -> start.dist < 8 ? null : round2(clamp(start.zoom * distance(a, b) / start.dist, 0.5, 3))
artifact-url.ts
  ARTIFACT_URL_RE = /^\/api\/evidence\/artifacts\/[A-Za-z0-9-]+(\?download=1)?$/
  isArtifactUrl(u: string) -> ARTIFACT_URL_RE.test(u)
```

## 6. Interaction by state

| State | Reader does | Sees / hears |
|---|---|---|
| Page, no documents | — | "Documents" heading, "No documents" |
| Page, documents | scrolls | static callout; timeline of three groups (reveal on client insertion, off under reduced motion); thumbnails; "No documents" in an empty group |
| Row | Tab to button | "View processed copy, Prescription, March 2026, button, has popup dialog" |
| Row | activates | sheet rises (or appears at once with reduced motion); focus on Zoom out |
| Viewer | `+` ×3 | readout 130 %, announced politely |
| Viewer | `0` | image fits the stage; rotation and pan reset |
| Viewer | drag / wheel / `↑` | image moves, instantly |
| Viewer | pinch (touch) | image scales between 50 % and 300 % |
| Viewer | `→` on "1 of 2" | image 2, file line and download follow; "Prescription, March 2026, page 2 of 2" announced |
| Viewer | `→` on "2 of 2" | nothing changes |
| Viewer | `R` | turns 90° about its centre; "Rotation: 90°" |
| Viewer | `F` (supported) | the viewer fills the screen; the button reads "Exit full screen" |
| Viewer | Download | the browser saves `rogikotha-processed-<id>.png` |
| Viewer | Escape | (fullscreen: leaves fullscreen first) closes; focus back on the row's button |
| bn | any | ১ / ২, ১৩০%, "ছবি ১" for an unlabeled item |

## 7. T-308's section of `patient.css`

Appended after T-011's last rule, each rule marked `/* added: T-308 reason */`, formatted by Prettier, using only T-011 tokens. No `transition`, `animation`, `@keyframes`, `view-transition-name` or hover transform (`check:motion`).

```css
/* added: T-308 section spacing on T-011 tokens (prototype inline margins) */
.ev-section .callout { margin-block: var(--space-3); }
.ev-section .ev-note { margin-top: var(--space-3); }

/* added: T-308 chronological timeline: a static rail and one dot per group (Q13) */
.ev-timeline { list-style: none; margin: var(--space-3) 0 0; padding-inline-start: var(--space-5); position: relative; }
.ev-timeline::before { content: ""; position: absolute; inset-block: var(--space-2); inset-inline-start: var(--space-2); width: 2px; background: var(--rail); border-radius: 1px; }
.ev-timeline > .ev-group { position: relative; }
.ev-timeline > .ev-group::before { content: ""; position: absolute; inset-inline-start: calc(-1 * var(--space-5) + var(--space-1)); top: 0.45em; width: 10px; height: 10px; border-radius: 50%; background: var(--surface); border: 2px solid var(--primary); }
.ev-items { display: grid; gap: var(--space-2); }

/* added: T-308 group heads are h3 (heading order); same look as T-011's .ev-group h4 */
.ev-group > h3 { font-family: var(--sans); font-size: var(--fs-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--ink-faint); margin: 0 0 var(--space-2); }
html:lang(bn) .ev-group > h3 { font-family: var(--bangla); letter-spacing: 0; text-transform: none; }

/* added: T-308 processed thumbnail in the document icon slot (Q7) */
.ev-item .doc-icon { width: 40px; height: 56px; overflow: hidden; }
.doc-thumb { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: var(--r-sm); background: var(--surface-2); }

/* added: T-308 real images instead of the synthetic page (F6) */
.viewer-img { display: block; max-width: 100%; height: auto; margin-inline: auto; box-shadow: var(--elev-1); border-radius: var(--r-sm); background: var(--surface); }

/* added: T-308 the stage is a camera: clip, turn and scale about the centre (Q3) */
.viewer-stage { overflow: hidden; }
.viewer-pages { transform-origin: center; }

/* added: T-308 44 px targets for the viewer controls (F14) */
.viewer-controls .vctrl, .viewer-controls .vdownload { min-height: var(--target); min-width: var(--target); }
.viewer-controls .vdownload { display: inline-flex; align-items: center; padding-inline: var(--space-4); }

/* added: T-308 fullscreen fills the screen */
.viewer-shell:fullscreen { max-height: none; min-height: 100%; padding: var(--space-4); background: var(--paper); }
.viewer-shell:fullscreen .viewer-stage { flex: 1; }
```

The `.vdownload` colours stay those of the ported rule as T-011 restyles it; this section adds sizes only. The two `.ev-group > h3` rules are dropped if T-011 widens its selector to `.ev-group :is(h3, h4)`. `contrast:patient` and `impeccable detect` run on the section.

## 8. Tests (test-after, `team.md` Testing Posture)

| File | Cases | Rules |
|---|---|---|
| `viewer-transform.test.ts` | zoom clamps and rounding; base size; Fit 800 × 600 / 1200 × 1600 → 0.55; 400 × 300 → 1.79; Fit resets rotation and pan; rotate ×4 → 0; `goTo` clamps; `reset100`; `toTransform` | BR4.1–BR4.5 |
| `viewer-keys.test.ts` | every key; modifiers and composition ignored; Shift pan step | BR5.4 |
| `viewer-pointer.test.ts` | pinch ratio, clamps, tiny start | BR5.2 |
| `artifact-url.test.ts` | accepted and refused URLs | BR1.2 |
| `EvidenceSection.test.tsx` (en, bn) | empty; three groups in order; empty group "No documents"; callout outside the reveal with `data-static`; no "verified"/"approved"; untitled label "Image 1" / "ছবি ১"; guard drops a bad item; attribute scan for `quarantine|private|original|data:|blob:` | BR1.2–BR2.6, BR7.3 |
| `EvidenceViewer.test.tsx` (en, bn) | open and focus; image navigation and `hidden`; Home/End; announcements; keys; wheel with and without Ctrl; drag pan; pinch; download link; fullscreen supported and not; close and focus return; bn numerals; server render of the section has no `style` attribute | BR3.1–BR6.3, BR7.2 |
| `evidence-viewer.smoke.test.tsx` | callout present; viewer opens on a two-image group and shows "1 of 2" | team.md smoke rule |

Every test name reads as a sentence; builders come from `evidence-test-support.ts`; no assertion on class internals beyond the prototype's ids and classes that the acceptance rows name.
