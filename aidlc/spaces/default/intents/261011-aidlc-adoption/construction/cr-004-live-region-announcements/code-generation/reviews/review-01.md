## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-27T14:37:07Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | packages/i18n/messages/bn.json > a11y.announce.* (language, themeDark, themeLight, view) | The four new Bengali live-region strings are unreviewed drafts. "পাতা" for "View" is a proposed word. They ship in the dictionary now and a screen-reader user hears them. ISS-228 records this. | Keep ISS-228 open and review the wording with ISS-050 before the phase gate. No code change is needed unless the owner changes the copy. | New |
| R-02 | Minor | apps/web/src/components/shared/ThemeControls.tsx > language toggle onClick and decideArrival; docs/implementation/ISSUES.md ISS-229 | Under Question 1 = A the language click announces nothing. The arriving page announces it, so the task file's "Bengali: repeat both under /bn" acceptance row does not read literally. The owner has not yet confirmed this reading (ISS-229). A related edge: if setLang rejects, the stored note lingers for 30 s. Only a later arrival in the same locale on the same path would then speak "language" instead of the view. | Get the owner's Question 1 confirmation before merge, and record the acceptance row as expected against observed under the A reading. Optionally clear the note when setLang rejects. | New |
| R-03 | Minor | apps/web/src/components/patient/ViewShell.tsx (import of decideArrival) and ThemeControls.tsx (exports writeNote, decideArrival) | The language-note protocol lives in ThemeControls.tsx, a 'use client' component module. ViewShell imports it from there, and writeNote is exported mainly for tests. The patient component now depends on the shared control's internals. This works, and no import-boundary rule is broken, but a small helper module such as lib/language-note.ts would give the two sides one owner. | Optional: move the note helpers (key, lifetime, write, read, decide) into a lib module and import it from both components. This is not required for correctness. | New |
| R-04 | Minor | apps/web/src/components/patient/ViewShell.tsx > useEffect dependency list | The effect deliberately omits `announce` from its dependencies and relies on the hook's stable useCallback. The comment explains primitives vs `t` but not `announce`. The omission is correct today, and ESLint is clean. | Optionally add `announce` to the dependency array. It is stable, so behaviour does not change, and a future change to the hook is then covered. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| vitest (ThemeControls, ViewShell, live-region smoke) | PASS: 3 files, 37 tests | Both locales are covered, and the smoke assertion exists. |
| pnpm i18n:check | PASS: 781 keys, both locales | The four new keys exist in en and bn with matching placeholders, and keys.ts is in sync. |
| tsc --noEmit (apps/web) | PASS, no output | Narrowing ViewShell's `view` to ViewName is compatible with all callers. |
| eslint (changed components) | PASS, no output | No lint findings. |
| git diff main --stat | 10 files | Every code path is in source-manifest.json. The audit shard and the plan file are record bookkeeping. The motion toggle has no announcement, as the task's "Not in scope" section requires. |

Checklist results: authorization and audit rows are not applicable (client-only UI). The language note holds only a locale, a locale-less path and a timestamp in per-tab sessionStorage, so no private data is involved. No tool, model or agent identity was found in the added lines. No import-boundary violation was found.

### Summary

The implementation matches the manifest and the localized design (FD-042). Checks are green, and both locales have parity. The only open points are the owner's pending decisions (Bengali wording in ISS-228, and the Question 1 reading in ISS-229) plus small structural suggestions. None blocks.
