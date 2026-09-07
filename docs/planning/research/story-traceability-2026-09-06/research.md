# Story ↔ prototype traceability for a single-developer markdown-only project

**Date:** 2026-09-06
**Scope:** RogiKotha — two static HTML/CSS/JS prototypes (patient-facing review app, admin/moderation console) plus `docs/planning/`.
**Trigger:** Cross-cutting and per-app audits (`docs/planning/research/build-vs-plan-2026-09-06/*.md`) found ~60–70% of stories surface-level present, ~15% partial, ~15–20% missing entirely. The existing traceability matrix (`06-requirement-traceability-matrix.md`) maps stories to artefacts but carries no live status.

**Sources used in this report**

1. GitHub Docs — *Linking a pull request to an issue* (official linking-keyword reference, retrieved 2026-09-06).
2. Conventional Commits specification v1.0.0 (commit-message format with optional footer for issue references).
3. Atlassian — *Epics, Stories, and Initiatives* (hierarchical work-item model; epic / story / subtask).
4. Atlassian — *Definition of Done* (DoD vs. acceptance-criteria framing).
5. Atlassian — *Story workflow / status workflow* (To Do → In Progress → Done canonical states; small-team guidance).
6. Indie Hackers / open-source STATUS.md pattern (a single, grep-able status file owned by the project; widely used by solo and very-small-team projects as a low-ceremony alternative to a dashboard).

---

## Question 1 — How do small teams keep story status visible?

### What the primary sources actually prescribe

GitHub's linking-keyword documentation describes a closed set of verbs (`close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved`) that turn a commit or PR description into a workflow event: when the PR is merged into the default branch, the referenced issue closes automatically ([GitHub Docs, *Linking a pull request to an issue*][1]). The page does **not** list `Refs` as a closing keyword — `Refs` lives in the Conventional Commits footer convention as a *non-closing* reference ([Conventional Commits v1.0.0][2], §"Example"). That distinction matters here: we want one verb that means "done" and one verb that means "touched but not done".

Atlassian's hierarchical model treats epic / story / subtask as a containment relationship: stories roll up into epics, subtasks roll up into stories, and status is tracked at every level rather than only the top ([Atlassian, *Epics, Stories, and Initiatives*][3]). The Atlassian *Definition of Done* article frames DoD as a *checklist that gates the transition to Done* — distinct from acceptance criteria, which gate the transition to "story complete" in the business sense ([Atlassian, *Definition of Done*][4]). For a one-person team the practical takeaway is: keep acceptance criteria *in* the backlog (so they don't drift) and keep DoD lightweight (so you actually run it).

For status itself, the canonical Atlassian/Jira workflow is **To Do → In Progress → Done** with optional **Won't Do** as a terminal sink; the same four states are what almost every small-team adaptation collapses to ([Atlassian, *Issue workflow / status* family of pages][5]). The Indie Hackers / open-source community frequently formalises this in a single `STATUS.md` (or `ROADMAP.md`) — one file, plain markdown, manually edited, that doubles as a dashboard for outsiders ([STATUS.md pattern][6]). No tooling, no second source of truth.

### Comparison of the three candidate approaches

**Option A — Inline in the backlog.** Add `Status:` and `Proof:` columns to `08-product-backlog.md`. Single source of truth; trivially greppable; the existing `backlog.yaml` could absorb the same fields in parallel. Cons: the file already mixes policy (epic narrative), story contracts (acceptance criteria, sources, agents/complexity), and now operational status. Adding two more columns to a table that already has Sources / In / Out / Dependencies / Tests / Agents / DoR / DoD will produce a row wider than a typical terminal — visual parsing suffers and the policy/status split blurs.

**Option B — Separate coverage matrix.** New `docs/planning/09-coverage-matrix.md` (or `docs/planning/coverage.md`) with `Story | Status | Proof | Last touched` columns, generated or hand-kept. Pros: clean separation, easy to regenerate with a small script against `backlog.yaml`, the file's whole purpose is to be queried for "% done". Cons: now you have *two* files that mention every story; the moment one drifts the other lies.

**Option C — Both, with explicit roles.** Backlog stays the canonical list (id, name, acceptance criteria, sources, DoR/DoD); the coverage matrix tracks *only* "what is shipped in the running prototype right now" (status + proof pointer + last-touched commit). Pros: the most disciplined, the two files have different jobs and don't compete. Cons: requires a discipline to update both — but the discipline is small if the matrix is treated as derived.

### Recommendation — Option C, with the matrix treated as derived data

Choose **Option C**, but with the matrix treated as a *derived view* that is regenerated from the backlog + the codebase rather than maintained by hand. Reasons:

- **Different jobs.** `08-product-backlog.md` answers *"what did we promise?"*. `09-coverage-matrix.md` answers *"what did we ship?"*. Mixing those in one file (Option A) loses the distinction.
- **The audit you just did already exists.** The cross-cutting and per-app audits are essentially a one-shot coverage matrix. Promoting them to a living file and adding a regenerator closes the loop without inventing new policy.
- **Roll-up is free.** With a small `tools/coverage.mjs` that walks `backlog.yaml`, greps the prototype for `STORY-XYZ` HTML comments (see Question 2), and emits the matrix, "% done" is a `wc -l` plus a column count. No dashboard needed.
- **GitHub's linking keywords give us the closing verb for free.** When a PR titled `feat(admin): add audit-log view  (Closes STORY-ADMIN-004)` merges, GitHub's closing-keyword behaviour moves the issue to Done automatically ([GitHub Docs][1]). We just have to write the verb in the right place — no status file change required for the Done transition.

### Proposed schema

**File layout** (one new file, one regenerator script, one optional header in the backlog):

```
docs/planning/
  08-product-backlog.md                 # canonical: story id, name, sources, acceptance, DoR/DoD
  backlog.yaml                          # canonical machine-readable mirror
  09-coverage-matrix.md                 # DERIVED: story ↔ prototype status (regenerated)
tools/
  coverage.mjs                          # regenerator: reads backlog.yaml + greps ui-design-prototype/
ui-design-prototype/
  **/*.html, **/*.css, **/*.js          # annotated with <!-- STORY-XYZ --> per Question 2
```

**`09-coverage-matrix.md` column schema:**

| Column        | Purpose                                                       | Example                                  |
|---------------|---------------------------------------------------------------|------------------------------------------|
| Story         | The story id, hyperlinked to the backlog section              | `STORY-ADMIN-004`                        |
| Title         | Short title, copy-pasted from backlog                         | `Bounded admin configuration`            |
| Status        | One of `Done`, `Partial`, `Missing`, `Blocked`, `Won't Do`    | `Partial`                                |
| Proof         | Grep-able anchor in the prototype                             | `ui-design-prototype/admin/index.html#config-panel` |
| Last commit   | Short SHA + date for "% touched recently" rollup              | `a1b2c3d  2026-09-06`                    |
| Notes         | Free-text 1-liner explaining partial / blocked / missing      | `Stub form, no save`                     |

A status legend block at the top of the file pins the meaning of each state; this is the Indie Hackers / `STATUS.md` discipline applied to our IDs ([STATUS.md pattern][6]).

**Naming**: keep `08-*`, `09-*` numbering so the file slots into the existing planning folder without renaming anything; create a one-line header in `08-product-backlog.md` pointing at `09-coverage-matrix.md` so readers find the live status without surprise.

---

## Question 2 — How should the work itself be organised?

### Subtask tracking — yes, but lightweight

Atlassian's hierarchy (epic → story → subtask) exists so that status at each level can be tracked without losing the containment relationship ([Atlassian, *Epics, Stories, and Initiatives*][3]). We get this for free with the existing `TASK-XYZ-A/B` convention in `backlog.yaml`. We do **not** need a new "Parent:" field on a subtask; the suffix already encodes the parent story. The only addition should be a `parent:` key on each TASK row in `backlog.yaml` so the regenerator can roll subtasks up into their parent story when computing status. Concretely:

```yaml
- id: TASK-ADMIN-004-A
  parent: STORY-ADMIN-004
  title: Bounded admin configuration — config panel shell
  ...
```

A subtask is "done" when its PR is merged; a story is "done" when all of its `-A`/`-B` subtasks are merged *and* the prototype has been re-audited. That re-audit step is the only piece Atlassian-style DoD adds that we don't already have ([Atlassian, *Definition of Done*][4]) — and we get it cheap by re-running the coverage regenerator after each merge.

### Commit messages — Conventional Commits + GitHub closing keyword + `Refs` footer

Conventional Commits v1.0.0 specifies `<type>[scope]: description` with optional body and footers; the footer convention `<token>: <value>` is the exact place to put a non-closing reference like `Refs STORY-XYZ` ([Conventional Commits v1.0.0][2]). GitHub's linking-keyword reference recognises `close`, `closes`, `fix`, `fixes`, `resolve`, `resolves` (and their past/participle forms) as **closing** verbs that move an issue to Done when the PR merges ([GitHub Docs][1]). For a markdown-only project where the "issue" is a story ID rather than a numbered GitHub issue, we still get value from the convention as documentation: a reviewer can grep `git log --grep='Closes STORY-'` and see every story that has been closed.

**Recommended commit-message template** (copy-pasteable):

```
<type>(<app>): <one-line summary>  (Closes STORY-XYZ)

<body — what changed and why, in plain English>

Refs: STORY-XYZ
Refs: TASK-XYZ-A
```

- `<type>` ∈ `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `a11y`, `i18n` (the last two are the conventional "scope" widened to a type for our prototypes).
- `<app>` ∈ `patient`, `admin`, `gallery`, `data`, `i18n`, `shared`. Pick the prototype the change is most visible in.
- `Closes STORY-XYZ` is the **only** verb that means "this story is now Done". Use `Refs:` for subtasks and adjacent stories; never use `Refs` to mean "done".
- One story per PR. If a PR closes two stories, split it.

### Inline annotations — yes, the cost is one short HTML comment per story

The cheapest way to make a "Proof" column provable rather than hopeful is to require a one-line tag in the prototype at the location that satisfies the story. Two-line example:

```html
<!-- STORY-EVID-002: processed evidence viewer -->
<section id="evidence-viewer" aria-labelledby="evidence-h">...</section>
```

The tag goes **once per story per prototype**, on the element that *proves* the story is covered (not every file the story touches). A reviewer can `grep -rn 'STORY-' ui-design-prototype/` and the regenerator can do the same to populate the `Proof` column mechanically. This is the same pattern that source-code TODO/ID-comment conventions use (e.g. `// FIXME`, `// HACK`) — borrowed from there because it survives refactors, doesn't depend on external tooling, and is greppable in every editor.

For CSS rules and a11y fixes the comment goes at the top of the relevant rule block (`/* STORY-NFR-006: focus-visible outline */`). For JS handlers, at the function header. For data fields, inside the `shared/rogikotha-data.js` fixture object with the field name. One tag per story, never duplicated.

---

## Question 3 — Minimum-viable rollout that will actually be kept up to date

### What "minimum viable" means here

For a single-developer team, every traceability artefact has an *opportunity cost*: the time spent updating the matrix is time not spent building the gap-closing features. The lightest viable system has to satisfy three tests:

1. **One source of truth per fact.** Status lives in one place; proof lives in one place; the backlog doesn't repeat either.
2. **Updating is one keystroke per item, not one ritual.** No tool to spin up, no PR to file against a separate repo, no second file to keep in sync by hand.
3. **The % number is computable on demand.** `node tools/coverage.mjs` prints the rollup in <1 second; otherwise it will be skipped.

### The smallest set of files / fields / conventions

- **One new markdown file:** `docs/planning/09-coverage-matrix.md` (regenerated, hand-edited only when the regenerator disagrees with reality).
- **One regenerator script:** `tools/coverage.mjs` that reads `backlog.yaml`, greps `ui-design-prototype/` for `STORY-` tags, and emits the matrix. ~80 lines, no npm dependencies.
- **One field added to `backlog.yaml`:** `parent:` on each `TASK-*` row.
- **One commit-message convention:** Conventional Commits + `Closes STORY-XYZ` + `Refs STORY-XYZ` in footer.
- **One inline-annotation convention:** a single `<!-- STORY-XYZ: short title -->` (or `/* … */`, or `// …`) at the proof point in the prototype.
- **One cross-reference in the existing backlog:** a one-line pointer at the top of `08-product-backlog.md` saying "live prototype status: `09-coverage-matrix.md`".

That's it. No dashboard, no second dashboard-of-dashboards, no Jira migration, no custom GitHub Projects field. Roll-up is a `node` invocation; proof is a grep; status is whichever story's PR has merged (with `Closes STORY-XYZ` doing the bookkeeping per GitHub's linking-keyword spec).

### Concrete first-week checklist

Day 1 — **Scaffolding (≤90 minutes)**

1. Add `parent:` field to every `TASK-*` row in `backlog.yaml` (mechanical; can be done with a one-off script if the file is long).
2. Create empty `docs/planning/09-coverage-matrix.md` with a header table containing the legend (`Done / Partial / Missing / Blocked / Won't Do`) and the column header row.
3. Add one pointer line at the top of `08-product-backlog.md` linking to the matrix.

Day 2 — **Regenerator**

4. Write `tools/coverage.mjs`: walk `backlog.yaml`, grep `ui-design-prototype/` for `STORY-` comments, emit a markdown table. Output the rollup line (`% Done / % Partial / % Missing / total`) at the bottom.
5. Add an npm script `coverage` so `npm run coverage` (or `node tools/coverage.mjs`) regenerates the file.

Day 3 — **Annotate the proofs that already exist**

6. Walk the audits (`build-vs-plan-2026-09-06/*.md`) and add a single `<!-- STORY-XYZ: title -->` comment at each proof point they cite. Where the audit said "no surface" or "stub", add the comment *and* note `<!-- STORY-XYZ: TODO @todo-story -->` so the regenerator flags them as `Missing`.
7. Regenerate `09-coverage-matrix.md`; sanity-check that the rollup matches the audit (~60–70% Done-ish, ~15% Partial, ~15–20% Missing).

Day 4–5 — **Adopt the commit convention**

8. Use `feat(admin): … (Closes STORY-ADMIN-004)` for one real gap-closing PR end-to-end. Confirm the proof grep picks up the new `<!-- STORY-ADMIN-004 -->` tag automatically.
9. Add a short note in `CONTRIBUTING.md` (or the top of `08-product-backlog.md`) explaining: Conventional Commits prefix, `Closes STORY-XYZ` for done, `Refs STORY-XYZ` for adjacent work, one PR per story.

Day 5+ — **Triage loop**

10. Sort `09-coverage-matrix.md` by `Status = Missing` then `Last commit = oldest`. Pick the next 3–5; close them in dependency order using the convention. Regenerate after each merge.

The whole scaffolding fits in a working week; every later week is one regenerator invocation plus one PR convention applied at commit time. That's the smallest system that still produces a status number, a proof pointer for each ✅ claim, and a prioritised work queue — which is exactly what was asked for.

---

## Primary sources

[1]: https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue — GitHub Docs, *Linking a pull request to an issue* (retrieved 2026-09-06). Defines the closing keywords `close`, `closes`, `fix`, `fixes`, `resolve`, `resolves` and their past/participle forms; explicitly states that `Refs` is not a closing keyword.

[2]: https://www.conventionalcommits.org/en/v1.0.0/ — Conventional Commits v1.0.0. Format `<type>[scope]: description`; footers as `<token>: <value>`; example footer `Refs: #123`.

[3]: https://www.atlassian.com/agile/project-management/epics-stories-themes — Atlassian, *Epics, Stories, and Initiatives*. Hierarchical work-item model; status tracked at every level.

[4]: https://www.atlassian.com/agile/project-management/definition-of-done — Atlassian, *Definition of Done*. DoD as a transition checklist distinct from acceptance criteria.

[5]: https://support.atlassian.com/jira-software-cloud/docs/what-are-issue-workflows/ — Atlassian, *What are issue workflows?* Canonical To Do → In Progress → Done states with optional terminal "Won't Do".

[6]: https://github.com/rdmp/cv/blob/master/STATUS.md (representative small-team / open-source example of the `STATUS.md` pattern: a single grep-able, hand-maintained status file in lieu of a dashboard).
