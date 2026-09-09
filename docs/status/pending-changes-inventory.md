# Pending changes inventory — 2026-09-06

> Captures every file in the working tree that has **not** been committed,
> grouped by origin so each group can be committed separately.
>
> The Impeccable quick-triage commit (72b0195) is **already on `main`**
> and is not listed here.

**Status as of 2026-09-08: groups A–F are all committed.** Every group below
closed against a real commit, named under each one. The groups are kept as the
record of what each commit contained and why it was split that way — not as a
list of outstanding work. The tree has since moved on; the current uncommitted
set is at [Working tree — 2026-09-08](#working-tree--2026-09-08).

## What was not committed on 2026-09-06

Run `git status --short` to confirm; this file documents what each line means.

### Group A — planning / docs modifications (pre-existing, NOT mine) — closed

These were already modified before this session started. They are
unrelated to the Impeccable trim work. Likely from the FD-027 / archive
walkthrough.

```
 M docs/RogiKotha_BRD_v1.0.docx
 M docs/RogiKotha_PRD_v1.0.docx
 M docs/design/design-comparison.md
 M docs/design/third-party-component-register.md
 M docs/planning/09-frontend-prototype-plan.md
 M docs/planning/ux/.memlog.md
 M docs/planning/ux/DESIGN.md
 M docs/planning/ux/EXPERIENCE.md
 M docs/planning/ux/wireframes/concept-a.md
 M docs/status/decision-log.md
```

Suggested commit message:

```
Record FD-026/FD-027 selection and archive early concept directions

Five-direction Gate 4 walkthrough selected Concept 04b (Quiet Clinic
minimal pass) as the implementation direction per FD-027, superseding
FD-026 (Concept 04 warm variant). 04c Editorial and 04d Modern SaaS
siblings explored during the side-by-side are now archived under
ui-design-prototype/.archive/, alongside the earlier 03 Clinical Ledger
and 04 Care Warm directions.

This commit captures the planning artifacts that record the decision:
BRD, PRD, design-comparison, third-party-component-register, the
frontend-prototype-plan, the planning/ux DESIGN and EXPERIENCE
contracts, the wireframe for Concept A, the memlog, and the decision
log entries FD-026/FD-027.
```

**Closed by `d249ab2` — "Record FD-026/FD-027 selection in planning artifacts".**

### Group B — concept archive moves and new archive READMEs (pre-existing) — closed

```
R  docs/planning/02-conflicts-assumptions-questions.md
   -> docs/planning/.archive/02-conflicts-assumptions-questions.md
R  docs/planning/04-architecture-options.md
   -> docs/planning/.archive/04-architecture-options.md
R  docs/planning/ux/wireframes/concept-b.md
   -> docs/planning/ux/wireframes/.archive/concept-b.md
R  docs/planning/ux/wireframes/concept-c.md
   -> docs/planning/ux/wireframes/.archive/concept-c.md
 D ui-design-prototype/.archive/concept-03-clinical-ledger/app.js
 D ui-design-prototype/.archive/concept-03-clinical-ledger/index.html
 D ui-design-prototype/.archive/concept-03-clinical-ledger/styles.css
 D ui-design-prototype/.archive/concept-04-care-warm/app.js
 D ui-design-prototype/.archive/concept-04-care-warm/index.html
 D ui-design-prototype/.archive/concept-04-care-warm/styles.css
?? docs/planning/.archive/README.md
?? docs/planning/ux/wireframes/.archive/README.md
?? ui-design-prototype/.archive/concept-04c-quiet-clinic-editorial/
?? ui-design-prototype/.archive/concept-04d-quiet-clinic-saas/
?? ui-design-prototype/.archive/type-2.css
```

These are the FD-028 archive moves: the two early concept-03/concept-04
directions are deleted from `.archive/` (they were never used) and the
two 04c/04d siblings from the side-by-side are added there instead. The
planning wireframes for Concept B and Concept C are also moved into
their own `.archive/` subdirectories.

Suggested commit message:

```
Archive superseded concept directions and wireframes (FD-028)

Per FD-028 (2026-09-06), the side-by-side concept siblings 04c
Editorial and 04d Modern SaaS, kept only for the founder walkthrough,
move to ui-design-prototype/.archive/ alongside the surviving 03
Luminous Editorial / 04 Quiet Clinic warm / 04b Quiet Clinic minimal
trio. The early concept-03 Clinical Ledger and concept-04 Care Warm
directions, never used past planning, are deleted from .archive/.

The corresponding planning wireframes move to .archive/ subdirectories
under docs/planning/ux/wireframes/, and each .archive/ folder gets a
README explaining what it contains and why it's archived.
```

**Closed by `6807eeb` — "Archive superseded concept directions and wireframes
(FD-028)".** The "surviving 03 / 04 / 04b trio" in that message was true on
2026-09-06 and is history, not current state: 03 Luminous Editorial and 04
Quiet Clinic (warm) were themselves moved into `ui-design-prototype/.archive/`
on 2026-09-08, leaving 04b as the only direction under `concepts/`.

### Group C — Concept 04b source code (pre-existing) — closed

```
?? ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/
```

The full Concept 04b source tree (index.html, styles.css, app.js).
This is the chosen implementation direction per FD-027. It was already
in the working tree when this session started — I did not generate it.

Suggested commit message:

```
Add Concept 04b Quiet Clinic (minimal pass) — chosen Gate 4 direction

Source prototype for FD-027. Paper base, teal-gray accent, hairline
rules, no atmospheric veil, no panel shadow, no decorative linework.
Headings in the system rounded sans; weight and tracking carry the
posture rather than a contrasting typeface.

The trim pass on 2026-09-06 (commit 72b0195) verified the detector
exits clean against this prototype and the gallery index that surfaces
it.
```

**Closed by `7be0994` — "Add Concept 04b (Quiet Clinic minimal pass) and
surface it on the gallery"**, together with Group F.

### Group D — Impeccable config + Claude Code agents (deferred by me) — closed

```
?? .claude/agents/
?? .claude/skills/impeccable/
```

These were created by `npx impeccable install --project --providers=claude`.
I left them out of commit 72b0195 because they include the Windows
engine binary (`impeccable.exe`), which is ~50 MB and may not belong
in the repo — Impeccable re-installs itself with `npx impeccable
install` on any new clone.

Suggested commit message:

```
Add Claude Code agents installed by Impeccable (skill assets only)

The skill manifests (.claude/skills/impeccable/SKILL.md, the four
agent definitions under .claude/agents/, and the reference data files)
are required for /impeccable <cmd> to work in Claude Code chat. The
Windows engine binary (bin/windows-x64/impeccable.exe, ~50 MB) is
**not** committed — it is re-installed by `npx impeccable install` on
fresh clones.

If you want to commit the engine too, add it explicitly:

  git add -f .claude/skills/impeccable/scripts/bin/

Otherwise this commit captures only the skill metadata.
```

To commit just the metadata:

```bash
git add .claude/skills/impeccable/SKILL.md .claude/skills/impeccable/reference/ .claude/skills/impeccable/scripts/impeccable.cmd .claude/skills/impeccable/scripts/live-*.js .claude/skills/impeccable/scripts/modern-screenshot.umd.js .claude/skills/impeccable/scripts/command-metadata.json .claude/skills/impeccable/scripts/VERSION .claude/skills/impeccable/scripts/data/ .claude/agents/

# DO NOT add .claude/skills/impeccable/scripts/bin/ — engine binary.
```

**Closed by `84c16b2` — "Add Impeccable skill and Claude Code agents (full
install, with engine)".** The metadata-only plan above was not the one taken:
`.claude/skills/impeccable/scripts/bin/windows-x64/impeccable.exe` is tracked.
If the binary is ever to come out, that is a separate history-rewriting
decision, not a `git rm`.

### Group E — scripts/ and docs/.bak/ (pre-existing, purpose known now) — closed

```
?? scripts/
?? docs/.bak/
```

These were untracked when the session started. I did not touch them.
Review what's inside before committing.

```bash
ls scripts/
ls docs/.bak/
```

**Closed by `488e98d` — "Add FD-027 update script and the FD-026 docx backups
it created".** That is what was inside: the FD-027 documentation-update script
and the DOCX backups it wrote before editing.

### Group F — ui-design-prototype/index.html (pre-existing edit) — closed

```
 M ui-design-prototype/index.html
```

The gallery index was updated from "two UI directions" to "three UI
directions" (adding the 04b card and explanation) — this matches the
FD-027 selection. I did not make this edit; it was already in the
working tree when I started.

Suggested commit message (combine with Group C):

```
Add 04b card to the runnable gallery

Three directions now surface from the gallery: 03 Luminous Editorial,
04 Quiet Clinic (warm), and 04b Quiet Clinic (minimal pass — chosen).
The page copy explains FD-026 / FD-027 / FD-028 so a visitor can read
the rationale without opening the docs/.
```

**Closed by `7be0994`**, with Group C. The "three directions now surface from
the gallery" line describes the gallery as it stood on 2026-09-06. It has since
narrowed twice: `1dc17be` added the staff-console card and the hash-routes
index, and the 2026-09-08 archive moves (FD-029) removed the 03 and 04 cards. The live
gallery now shows one patient direction — 04b — and the staff console.

## Quick commit recipe

This recipe was executed; the commits it produced are named against each group
above. It is kept as the record of how the 2026-09-06 tree was split, not as
work to do.

```bash
# 1. The planning/decision docs (Group A)
git add docs/RogiKotha_BRD_v1.0.docx docs/RogiKotha_PRD_v1.0.docx \
        docs/design/design-comparison.md docs/design/third-party-component-register.md \
        docs/planning/09-frontend-prototype-plan.md \
        docs/planning/ux/.memlog.md docs/planning/ux/DESIGN.md docs/planning/ux/EXPERIENCE.md \
        docs/planning/ux/wireframes/concept-a.md docs/status/decision-log.md
git commit -m "Record FD-026/FD-027 selection in planning artifacts"

# 2. The archive moves (Group B)
git add docs/planning/.archive/ docs/planning/ux/wireframes/.archive/ \
        ui-design-prototype/.archive/concept-04c-quiet-clinic-editorial/ \
        ui-design-prototype/.archive/concept-04d-quiet-clinic-saas/ \
        ui-design-prototype/.archive/type-2.css
git rm ui-design-prototype/.archive/concept-03-clinical-ledger/app.js \
       ui-design-prototype/.archive/concept-03-clinical-ledger/index.html \
       ui-design-prototype/.archive/concept-03-clinical-ledger/styles.css \
       ui-design-prototype/.archive/concept-04-care-warm/app.js \
       ui-design-prototype/.archive/concept-04-care-warm/index.html \
       ui-design-prototype/.archive/concept-04-care-warm/styles.css
git add -A docs/planning docs/planning/ux/wireframes ui-design-prototype/.archive
git commit -m "Archive superseded concept directions and wireframes (FD-028)"

# 3. The 04b concept and the gallery update (Groups C + F)
git add ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/ \
        ui-design-prototype/index.html
git commit -m "Add Concept 04b (minimal pass) and surface it on the gallery"

# 4. Optional — Impeccable skill assets only (Group D), no engine binary
git add .claude/skills/impeccable/SKILL.md \
        .claude/skills/impeccable/reference/ \
        .claude/skills/impeccable/scripts/impeccable.cmd \
        .claude/skills/impeccable/scripts/live-*.js \
        .claude/skills/impeccable/scripts/modern-screenshot.umd.js \
        .claude/skills/impeccable/scripts/command-metadata.json \
        .claude/skills/impeccable/scripts/VERSION \
        .claude/skills/impeccable/scripts/data/ \
        .claude/agents/
git commit -m "Add Claude Code agents installed by Impeccable (metadata only)"
```

## Working tree — 2026-09-08

Everything below is uncommitted. Same rule as before: grouped by origin so each
group can go in on its own.

### Group G — Concepts 03 and 04 archived

```
R  ui-design-prototype/concepts/concept-03-luminous-editorial/
   -> ui-design-prototype/.archive/concept-03-luminous-editorial/
R  ui-design-prototype/concepts/concept-04-quiet-clinic/
   -> ui-design-prototype/.archive/concept-04-quiet-clinic/
 M ui-design-prototype/index.html
```

`concepts/` now holds `concept-04b-quiet-clinic-minimal/` alone. The gallery
drops the 03 and 04 cards and describes what is left: one patient direction and
the staff console. Six patient directions — 01, 02, 03, 04, 04c, 04d — plus 05
are now all in `.archive/`. No live file links to an archived directory.

This narrows FD-028's gallery again. It has no founder decision of its own yet;
`docs/planning/09-coverage-matrix.md` flags the consequence against
STORY-PROT-002 — the live gallery no longer shows three side-by-side
directions, which the story asks for, though all of them remain inspectable.

Suggested commit message:

```
Archive patient directions 03 and 04; gallery shows only what is live

04b is the confirmed patient direction and the staff console now has its
own surface system, so the warm-vs-minimal comparison the gallery was
carrying no longer earns its place on the live page. 03 Luminous
Editorial and 04 Quiet Clinic (warm) move to
ui-design-prototype/.archive/ alongside 01, 02, 04c, 04d and 05, and the
gallery index drops their cards.

The directions stay inspectable in .archive/. STORY-PROT-002 asks for
three side-by-side concepts; that is now a product call, recorded in
09-coverage-matrix.md rather than silently reworded.
```

### Group H — staff console rebuilt on Chart Tray

```
 M ui-design-prototype/admin/index.html
 M ui-design-prototype/admin/styles.css
 M ui-design-prototype/admin/app.js
?? ui-design-prototype/.archive/admin-shell-studies/
```

Three shell studies — A *Chart Tray*, B *Ink Ledger*, C *Signal Ward* — were
built and compared; A was chosen and ported. All three are kept in
`.archive/admin-shell-studies/` with the comparison page that set them
side by side.

What the port changes: four planes where elevation encodes agency, lanes as
trays, a grouped and counted top nav with a breadcrumb and `aria-current` in
place of five unlabelled pills, a bottom tab bar under 760px, badge and button
separated by fill band and height and radius, and a docked **Record decision**
button — the console had ten option buttons, a textarea and no submit.

Verified by a jsdom harness (33/33 behaviour checks) and by a contrast pass
over `admin/styles.css` that clears every text pair and surface step in both
themes. **Not verified visually.** No screenshots were taken and the sub-760px
tab bar has not been seen rendering.

### Group I — repo checks

```
?? package.json
?? .gitignore
?? tools/contrast.mjs
?? tools/proof-check.mjs
?? tools/serve.mjs
?? tools/smoke.mjs
 M tools/README.md
```

Zero-dependency Node scripts plus `npm run check` to run them in order. jsdom
is the only dependency and only `smoke.mjs` needs it; it skips cleanly when
absent. These read Concept 04b — the console harness and the console contrast
pass are not yet among them.

### Group J — docs brought in line

```
 M docs/design/rogikotha-dev-spec.md
 M docs/planning/01-requirement-baseline.md
 M docs/planning/06-requirement-traceability-matrix.md
 M docs/planning/08-product-backlog.md
 M docs/planning/09-coverage-matrix.md
 M docs/planning/09-frontend-prototype-plan.md
 M docs/planning/ux/DESIGN.md
 M docs/planning/ux/EXPERIENCE.md
 M docs/status/current-status.md
 M docs/status/pending-changes-inventory.md
```

Status and path claims updated against groups G–I. `09-coverage-matrix.md`
carries the `file:line anchor` proof citations that `node tools/proof-check.mjs`
verifies, so run that after any edit that shifts lines in a cited file.

### Group K — shared i18n rename

```
 M ui-design-prototype/shared/rogikotha-data.js
 M ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js
 M ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/index.html
 M ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/styles.css
 M ui-design-prototype/.archive/concept-01-bioluminescent-depth/app.js
 M ui-design-prototype/.archive/concept-02-editorial-futurism/app.js
 M ui-design-prototype/.archive/concept-04c-quiet-clinic-editorial/app.js
 M ui-design-prototype/.archive/concept-04d-quiet-clinic-saas/app.js
```

The `account.*` i18n keys became `experience.*`. The archived concepts read the
same shared table, so they were renamed too — they stay runnable rather than
falling back to raw key names. `node tools/i18n-audit.mjs` should report no
referenced-but-undefined key for either the shared table or a local one.

## See also

- Commit `72b0195` — Impeccable quick-triage trim (already on master)
- `docs/design/ai-slop-trim-log.md` — full trim narrative
- `docs/status/impeccable-detector-final.json` — empty array, current clean state
