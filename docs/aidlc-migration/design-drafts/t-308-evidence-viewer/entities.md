# Entities — U28 `t-308-evidence-viewer`

Source of truth for the data shapes this Unit reads and the state it holds. The Unit stores nothing on the server and adds no table, column, migration, route, command or query. Its entities are the evidence view models it receives from U25 T-305 through U27 T-307's experience page (named here with the fields the section and the viewer use; T-305's `functional-spec.md` § 7 is their definition), the viewer's client state, the pure inputs of its transform functions, the message keys it adds and removes, and the seed rows it adds for the storyboard (Question 11). Decision logic is in `rules.md`; workflows in `functional-spec.md`; component props in `frontend-components.md`.

Built from T-308 (with the FD-091 amendment and the CR-001/FD-036 block), `03-routes-and-contracts.md` §4 and §6, `packages/contracts/src/view-models/evidence.ts` and `packages/i18n/messages/{en,bn}.json` on the working tree (2026-10-29), the T-305 draft (refreshed 2026-10-29), `packages/test-support/src/{corpus/evidence.ts,seed/seed-evidence.ts}`, and the answers in `functional-design-questions.md` (Questions 1–15 answered A).

```yaml
entities:
  - id: ENT-001
    name: EvidenceGroupVM
    owner: Evidence (U25 T-305; contracts/src/view-models/evidence.ts)
    description: "One of the three treatment-path groups of a review's public evidence. T-305 always sends all three, in EVIDENCE_GROUPS order. Read only."
    attributes:
      - { name: group, type: "enum EvidenceGroup", required: true, constraints: "reviewed | later | outcome; heading key evidence.group.<group>" }
      - { name: labelKey, type: string, required: false, constraints: "T-305 adds 'evidence.group.<group>'; this Unit derives the key from group and ignores the field" }
      - { name: items, type: "list<EvidenceItemVM>", required: true, constraints: "may be empty; order = publish time, then public id (T-305 WF5 step 2); never re-sorted (BR2.4)" }

  - id: ENT-002
    name: EvidenceItemVM
    owner: Evidence (U25 T-305)
    description: "One published image of a group (FD-036: one image per item). Read only."
    attributes:
      - { name: publicId, type: string, required: true, constraints: "10-char Crockford base32; the only id rendered (data-view-evidence)" }
      - { name: label, type: string, required: false, constraints: "active-locale label (seed only); absent -> evidence.untitled {n} (Question 9)" }
      - { name: pageCount, type: integer, required: true, constraints: "1 in Phase 1; the row shows a count only when > 1 (Question 8)" }
      - { name: pages, type: "list<EvidencePageRefVM>", required: true, constraints: "exactly one in Phase 1; the viewer shows pages[0]" }
      - { name: thumbnailUrl, type: string, required: true, constraints: "artifact URL (BR1.2); the row's decorative thumbnail (Question 7)" }
      - { name: downloadUrl, type: string, required: true, constraints: "'/api/evidence/artifacts/<pageId>?download=1' (BR1.2, BR6.2)" }
    invariants:
      - "No storage key, filename, uploader, state, fail reason, hash or internal item id (T-305 BR5.3)"

  - id: ENT-003
    name: EvidencePageRefVM
    owner: Evidence (U25 T-305)
    description: "The processed page image of an item."
    attributes:
      - { name: pageNo, type: integer, required: true, constraints: "1 in Phase 1" }
      - { name: artifactUrl, type: string, required: true, constraints: "'/api/evidence/artifacts/<artifactId>' (contracts on main, 03 §4, T-305 § 7; T-305 WF5's 'url' is a slip, F9)" }
      - { name: width, type: integer, required: true, min: 1, constraints: "natural pixels; img width attribute and Fit input (BR4.2)" }
      - { name: height, type: integer, required: true, min: 1, constraints: "natural pixels" }

  - id: ENT-004
    name: ExperienceEvidenceSlice
    owner: Review (U21 T-301, filled by U25 T-305 BR5.10); rendered by U27 T-307's EvidenceSlot
    description: "The two fields of ExperiencePageVM this Unit reads."
    attributes:
      - { name: evidenceGroups, type: "list<EvidenceGroupVM>", required: true, constraints: "three groups once U25 is merged; [] before (T-301 BR)" }
      - { name: hasDocuments, type: boolean, required: true, constraints: "true when any group has an item; drives BR2.1 and BR2.2" }
    notes: "T-307's interim documentsCount path (its Question 3 A) is replaced by this Unit's EvidenceSection once the groups exist."

  - id: ENT-005
    name: ViewerState
    owner: U28 (client state in EvidenceViewerProvider and EvidenceViewer)
    description: "The viewer's state for one opening. Reset on every open (BR3.2); never persisted, never in the URL."
    attributes:
      - { name: open, type: "{group: EvidenceGroup, index: int} | null", required: true }
      - { name: index, type: integer, required: true, min: 0, constraints: "< items of the open group" }
      - { name: zoom, type: number, required: true, min: 0.5, max: 3, constraints: "2 decimals; factor of the base size (BR4.1)" }
      - { name: rotation, type: "enum 0|90|180|270", required: true }
      - { name: pan, type: "{x: number, y: number}", required: true, constraints: "CSS px; unclamped, as in the prototype; reset by 100 % and Fit" }
      - { name: pointers, type: "map<pointerId, {x, y}>", required: true, constraints: "at most two tracked (BR5.2)" }
      - { name: pinchStart, type: "{dist: number, zoom: number} | null", required: true }
      - { name: isFullscreen, type: boolean, required: true, constraints: "from fullscreenchange (BR6.1)" }
    transitions: "see functional-spec.md § 5.1"

  - id: ENT-006
    name: StageGeometry
    owner: U28 (pure input to viewer-transform.ts)
    description: "Measured once per Fit or wheel event; never stored."
    attributes:
      - { name: stageW, type: number, required: true, constraints: "stage clientWidth - 64 (padding)" }
      - { name: stageH, type: number, required: true, constraints: "stage clientHeight - 64" }
      - { name: imageW, type: integer, required: true, constraints: "EvidencePageRefVM.width" }
      - { name: imageH, type: integer, required: true, constraints: "EvidencePageRefVM.height" }
    derived:
      - "baseW = min(imageW, stageW); baseH = imageH * baseW / imageW"
      - "fit = round2(clamp(min(stageW / baseW, stageH / baseH), 0.5, 2))"

  - id: ENT-007
    name: ViewerAction
    owner: U28 (viewer-keys.ts)
    description: "What a key or control does. One closed list."
    values: [zoomOut, zoomIn, zoom100, fit, rotate, fullscreen, prev, next, first, last, panUp, panDown, panLeft, panRight]
    mapping: "- or _ zoomOut; + or = zoomIn; 1 zoom100; 0 fit; r rotate; f fullscreen; ArrowLeft/PageUp prev; ArrowRight/PageDown next; Home first; End last; ArrowUp/ArrowDown panUp/panDown; Shift+arrows pan (×4 step); Escape is the Sheet's"

  - id: ENT-008
    name: MessageKeysChanged
    owner: U28 (packages/i18n/messages/{en,bn}.json; Bengali flagged for the owner's review, FD-042)
    added:
      - { key: viewer.fullscreen, en: "Full screen", bn: "পূর্ণ পর্দা" }
      - { key: viewer.exitFullscreen, en: "Exit full screen", bn: "পূর্ণ পর্দা বন্ধ করুন" }
      - { key: viewer.pageLabel, en: "Page {n} of {total}", bn: "পাতা {n} / {total}" }
      - { key: viewer.rotationNow, en: "Rotation: {deg}°", bn: "ঘূর্ণন: {deg}°" }
      - { key: evidence.untitled, en: "Image {n}", bn: "ছবি {n}" }
    kept_verbatim: "viewer.title, notice, zoomOut, zoom100, zoomIn, fit, rotate, pagePrev, pageNext, pageOf, of, download, zoomLabel, rotateLabel; evidence.status, evidence.notice, evidence.group.*, experience.openEvidence, experience.evidenceOnly, filter.evidence, label.noDocuments"
    removed: "viewer.docHeadA, docHeadB, seal, rxClinic, rxDoctor, rxPatient, rxRedacted, rxDate, rxDiagnosis, rxMedicines, rxDose, rxDuration, rxAdvice, rxSig, labName, labTest, labResult, labRange, labUnit, labMethod, noteClinic, noteSubject, noteHistory, noteExam, notePlan (25 keys, the whole synthetic block)"
    notes: "Count on the working tree: 781 keys, 39 under viewer; after this Unit 781 + 5 - 25 = 761 (the build records the exact before/after count, since earlier Units add keys). The task's viewer.close (the Sheet uses a11y.close) and evidence.pages (Question 8) are not added."

  - id: ENT-009
    name: SeededSecondImage
    owner: test-support seed (recorded owned-path addition of U28, Question 11)
    description: "A second published image for each corpus item with pageCount 2, as its own item in the same review and group."
    rows:
      - { seedRef: e1-p2, review: r1, group: reviewed, label: "Prescription, March 2026" }
      - { seedRef: e4-p2, review: r6, group: later, label: "Echo report from the second hospital" }
      - { seedRef: e9-p2, review: r15, group: later, label: "Spirometry report from the second doctor" }
    effects: "items 12 -> 15, published 10 -> 13; documents on r1 2 -> 3, r6 2 -> 3, r15 1 -> 2; custody and artifacts written like the first item's; idempotent (second run inserts 0)"
```

## Note on the removed keys

The prototype's `VIEWER_STRINGS` has 39 entries: 14 product strings (`title`, `notice`, `zoomOut`, `zoom100`, `zoomIn`, `fit`, `rotate`, `pagePrev`, `pageNext`, `pageOf`, `of`, `download`, `zoomLabel`, `rotateLabel`; the task says "the first 16") and 25 synthetic page lines. The build removes exactly the synthetic block and keeps every product key, including `pageOf` and `rotateLabel`, which the new pager and announcements do not render: they are prototype product keys and removing them gains nothing.

## What the Unit does not hold

- No server state: the viewer's state lives in the browser for one opening.
- No new view-model field: `ViewerDocVM` is not used (the viewer reads the group); T-305 is asked to drop it rather than rename `itemId` (cross-Unit change).
- No URL state: an opened viewer is not linkable (the prototype's was not either).

## Relationships at a glance

```text
ExperiencePageVM (U21/U25) ──evidenceGroups──> EvidenceGroupVM[3] ──items──> EvidenceItemVM ──pages[0]──> EvidencePageRefVM
                                                     │                             │
                                                     └── EvidenceSection rows      └── ViewerState.index (position in the group)
StageGeometry + EvidencePageRefVM ──> fit / base size (viewer-transform.ts)
ViewerAction <── keys, buttons, wheel, pointers
```
