# Pending changes inventory — 2026-09-06

> Captures every file in the working tree that has **not** been committed,
> grouped by origin so each group can be committed separately.
>
> The Impeccable quick-triage commit (72b0195) is **already on `master`**
> and is not listed here.

## What is NOT committed right now

Run `git status --short` to confirm; this file documents what each line means.

### Group A — planning / docs modifications (pre-existing, NOT mine)

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

### Group B — concept archive moves and new archive READMEs (pre-existing)

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

### Group C — Concept 04b source code (pre-existing)

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

### Group D — Impeccable config + Claude Code agents (deferred by me)

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

### Group E — scripts/ and docs/.bak/ (pre-existing, purpose unknown)

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

### Group F — ui-design-prototype/index.html (pre-existing edit)

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

## Quick commit recipe

If you want to commit all of the above in three clean commits:

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

## See also

- Commit `72b0195` — Impeccable quick-triage trim (already on master)
- `docs/design/ai-slop-trim-log.md` — full trim narrative
- `docs/status/impeccable-detector-final.json` — empty array, current clean state
