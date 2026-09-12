# T-407 — Staff evidence quarantine and providers views

| Field | Value |
|---|---|
| Story | STORY-EVID-003, STORY-DIR-002, STORY-ADMIN-002 |
| Phase / Lane | 4 / B |
| Class → model | M2 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 4–6 h agent; validation 1.5 h |
| Depends on | T-406 (shell, `PermissionCallout`, `Sheet`, stepUp sheet), T-309 (`retention.*`, `hold.*`, `evidence.readOriginal`, custody events), T-204 (`directory.decideSubmission/decideClaim/decideFieldChange`), T-305 (`evidence.remove`) |
| Parallel-safe with | T-408, T-409, T-410, T-502 |

## Goal

Port the console's evidence view (quarantine panels with the seven-stage pipeline, fail-closed and text-stays notes, gated original access) and add the real custody, retention and legal-hold controls the prototype only described; port the providers view (pending profiles with duplicate hints and approve/reject/merge, claims, protected field changes) wired to the directory decision commands.

## Read first

1. `docs/implementation/01-conventions.md` §7–§8
2. `docs/implementation/02-data-model.md` §7 (`evidence_items`, `evidence_custody_events`, `legal_holds`, `retention_policies`, `retention_bulk_actions`), §4 (`profile_submissions`, `profile_claims`, `profile_field_changes`, `profile_merges`, `profile_redirects`)
3. `docs/implementation/03-routes-and-contracts.md` §1 (`/admin/evidence`, `/admin/providers`, `/api/evidence/items/{id}/original`), §4 "evidence" (retention/hold/readOriginal entries), §4 "directory" (decide* entries)
4. `docs/status/decision-log.md` FD-004, FD-005, FD-020, FD-021
5. Prototype: `admin/app.js` 413–450 (`renderEvidence`: `steps = received, validated, scanned, converted, rasterised, redacted, published`; badges `failed`, `failClosed`, `waiting`, `published`; `.pipeline .pipe-step[data-s]`; `.restricted` gate box) and 451–525 (`renderProviders`: three panels — new profiles, claims, protected fields — with `.q-head`, `.kv`, `.audit` was/now block, `data-decide` buttons, `decisionNote`); handlers 815–818; fixtures `moderation.quarantine` (Q-882 published, Q-884 failed/encrypted, Q-887 fail-closed scanner unreachable, Q-891 waiting on author redaction) and `moderation.providers` (P-140 duplicate of d2, P-143 clean, C-58 claim, F-77 protected specialty change, F-78 unprotected hours change); `admin/styles.css` `.pipeline`, `.pipe-step`, `.q-head`, `.size`, `.kv`, `.audit`, `.mine-actions`, badge tiers `good|warn|danger|plain`
6. `docs/implementation/05-demo-storyboard.md` steps 22–23

## Owned paths

- `apps/web/src/app/[locale]/admin/evidence/page.tsx`, `admin/providers/page.tsx` (replace T-406 stubs)
- `apps/web/src/components/admin/EvidenceQuarantine.tsx`, `QuarantineItem.tsx`, `PipelineSteps.tsx`, `CustodyLog.tsx`, `HoldSheet.tsx`, `RetentionPanel.tsx`, `BulkRetentionSheet.tsx`, `Providers.tsx`, `PendingProfile.tsx`, `ClaimRow.tsx`, `FieldChangeRow.tsx`, `DecisionNote.tsx`
- `apps/web/src/server/actions/evidence-admin.ts` (`placeHold`, `releaseHold`, `setRetentionPolicy`, `previewBulkRetention`, `executeBulkRetention`, `readOriginal` (returns a one-time signed URL to the route handler), `removeFile`), `apps/web/src/server/actions/directory-admin.ts` (`decideSubmission`, `decideClaim`, `decideFieldChange`)
- `apps/web/src/components/admin/*.test.tsx` for the above
- `apps/web/src/styles/admin.css` — additions only, `/* added: T-407 */` (a hold badge tier may be needed; reuse `warn`)
- `packages/i18n/messages/{en,bn}.json` — new `admin.hold.*`, `admin.retention.*`, `admin.custody.*` keys (list them in hand-off)

## Not in scope

The pipeline itself (T-304/T-305), retention/hold commands (T-309), the directory commands (T-204), the patient-side claim sheet, config of retention defaults (T-408 renders the config; here only the policy summary + bulk action).

## Steps

### Evidence view

1. **Page**: `a-head` H1 `admin.tab.evidence`, `PermissionCallout`, policy panel (`admin.pipeline` sub-head; note composed of `admin.failClosedNote`, `admin.retention` with the live default days as `{days}` param, `admin.legalHoldNote`), then `RetentionPanel`, then one `QuarantineItem` per evidence item not in `published`-and-expired state, newest first (query `evidence.listForStaff {state?, page}` — add this read-only query to T-309's module if absent; note it as a follow-up if you must add it yourself, owned path `packages/application/src/modules/evidence/queries/list-for-staff.ts`).
2. **`QuarantineItem`**: `.q-head` with the **public id** (never the original filename — the prototype showed `IMG_2291.heic`; the product shows `item.publicId` and the detected type + size), badges: `ev.state.failed` (danger) when `failed`, `admin.failClosed` (warn) when the latest custody event is `scan_unavailable`, `ev.state.redact` (warn) when `preview_ready` without `privacy_confirmed`, `admin.pl.published` (good) when `published`, hold badge `admin.hold.active` (warn) when `hold_id`; `PipelineSteps` mapping custody events → the seven prototype steps: `received`→`received`, `validated`→`validated`/`validation_failed`(fail), `scanned`→`scan_clean`/`scan_detected`(fail)/`scan_unavailable`(hold), `converted`+`rasterised`→`sanitised` (both `ok` when present; `-` otherwise), `redacted`→`redaction_applied` or `privacy_confirmed` (`ok`), `wait` when `preview_ready` only, `published`→`published`; note line from the fail reason (`ev.fail.<reason>` keys — add) or the state; `admin.textStays` when failed/held; **retention row**: `admin.retention.expires {date}` from `retention_expires_at` (formatted in locale; the demo clock makes it move) or `admin.retention.held` when a hold is active; **actions** (`.mine-actions`): **Place hold** / **Release hold** (`holds.manage`) → `HoldSheet` (reason required, optional expiry) → action; **Remove file** (`content.act`, `removeFile`) with reason; **Custody log** toggle → `CustodyLog` (`<details>`; rows: relTime, event, actor opaque, allowlisted details); `.restricted` original gate: `admin.evidenceGated` + note; capability holders (`evidence.original`) get **Reveal (audited)** → stepUp → `readOriginal` action → opens the signed URL in a new tab (the route handler writes `original_accessed`); others see the box without a button.
3. **`RetentionPanel`** (Super Admin only; others see the summary line): current policy version, `originalDays`/`auditDays`, effective from; `admin.retention.prospectiveNote` ("Changing the default affects future records only."); **Bulk change existing** → `BulkRetentionSheet`: from/to days inputs → `previewBulkRetention` → shows `{count}` affected and sample public ids → reason → stepUp → `executeBulkRetention` → result or `retention.preview_drift` message with a re-preview button.

### Providers view

4. **Page**: H1 `admin.tab.providers`, `PermissionCallout`, three `.panel`s in the prototype's order. Data: `directory.listSubmissions {status: pending}`, `directory.listClaims {status: pending}`, `directory.listFieldChanges {status: pending}` (read-only queries; if T-204 did not add them, add under `packages/application/src/modules/directory/queries/` and note it). Moderators see everything read-only (no buttons, `admin.permission` note); admin+ act.
5. **`PendingProfile`**: `.q-head` name + id, `label.notVerified` warn badge always, `admin.possibleDup` (danger) when `duplicate_of_id` else `prov.community`; `.kv` specialty/bmdc/location/(duplicate of → name — bmdc); note; actions: **Merge** (when duplicate) or **Approve**, **Reject**, each opening a small reason field (the prototype had none; the command requires `reason` — a `.field` inline under the buttons, min 3 chars); `admin.mergeNote` when duplicate; after decision `DecisionNote` (`admin.done.approved|rejected|merged`).
6. **`ClaimRow`**: doctor/facility name, id, method, note (`admin.claims` note copy from the fixture is now the claim's own `evidence_note`? **No** — `evidence_note` is private claimant evidence; show `method` and the standard note `admin.claimNote` (add key with the fixture's sentence "Claiming is independent of BMDC verification…")), approve/reject with reason.
7. **`FieldChangeRow`**: field label (`profile.<field>` key), id, badge `admin.protectedFields` (warn) when protected else `prov.provider`, target name, `.audit` block `admin.wasNow` + old + new values (bilingual via `pick`), approve/reject for protected; unprotected rows show the applied note `✓ admin.protectedNote` as in the prototype.
8. **Merge effect visible**: after merging P-140 into d2, the page shows `DecisionNote` and a link to the surviving profile; the redirect itself is T-204's.
9. **Tests**: pipeline mapping (custody events → step states, all four fixture shapes), hold/release renders, gate button by capability, providers three panels with pending fixtures, decision notes, read-only for moderator; both locales.
10. `impeccable detect`, `pnpm contrast`, `pnpm check`; hand-off with the list of new i18n keys.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Fixture parity | component test with the four seeded items | Q-882 all ok + published badge; Q-884 validated=fail + failed badge + text-stays; Q-887 scanned=hold + fail-closed badge; Q-891 redacted=wait + waiting badge |
| Filename privacy | test | original filename string never in the DOM; public id shown |
| Hold | manual storyboard 22 | hold placed → badge + custody `hold_placed`; retention job skips it; release → `hold_released` |
| Bulk retention | manual as `sa_founder` | preview count → execute → custody rows; drift path shows re-preview |
| Original access | manual | moderator: no button; super_admin: stepUp → new tab serves bytes → custody `original_accessed` + audit |
| Providers | manual storyboard 23 | approve P-143, merge P-140 → old URL redirects, claim C-58 approved, F-77 decided |
| Read-only moderator | component test | no action buttons rendered |
| Design checks | `impeccable detect`, `pnpm contrast` | clean |

## Tests to write

Component tests listed in step 9; action tests for error mapping (`hold.active`, `retention.preview_drift`, `forbidden`, `auth.step_up_required`).

## Hard-rule checklist

- [ ] Original evidence never served without the capability + step-up + custody + audit; no original filename in any DOM.
- [ ] Scanner unavailable renders as held/fail-closed, never as "probably fine".
- [ ] "Registration not verified" on every pending/approved profile.
- [ ] Claims never grant control over accounts (copy present).
- [ ] Retention default changes are prospective; existing records only via previewed bulk action with reason.
- [ ] Both locales; no attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
