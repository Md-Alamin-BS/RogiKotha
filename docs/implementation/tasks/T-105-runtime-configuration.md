# T-105 — Runtime configuration module: versioned bounded settings, apply, rollback, history

| Field | Value |
|---|---|
| Story | STORY-ADMIN-001 (versioned runtime configuration and capabilities) |
| Phase / Lane | 1 / A |
| Class → model | M3 → Claude Opus 5 (alt GPT-5.6 Sol); validator: GPT-5.6 Sol + human approval (T-106) |
| Effort setting | xhigh |
| Estimate | 3–4 h agent; validation 1.5 h |
| Depends on | T-103 (`capability: config.write`, `stepUp`), T-004 (`config_versions`, `config_changes`) |
| Parallel-safe with | T-102, T-104, T-201, T-207 |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-063 / FD-072** — T-105 registers the FD-058 sign-in settings as runtime settings, with the owner's defaults: the delay doubles from 1 s after the 3rd failed sign-in within 15 minutes, capped at 30 s; 10 failures within 15 minutes count as severe. T-101 already reads them through the `ConfigProvider` port with the same values as defaults. Contract Design names the keys and their ranges. Changes Owned paths, steps 1, 2 and 6, the acceptance checks and the tests.
- **FD-058 keys already in the schema (review R-14)** — T-101 adds the FD-058 setting keys to `packages/contracts/src/config-values.ts` with the FD-063 defaults, and wires a defaults-only `ConfigProvider` in `apps/web/src/server/container.ts`. T-105 takes over those keys (it sets their final ranges, keeps them out of the denylist, and seeds them in version 1) and replaces the defaults-only provider with the database-backed one. The owned path `packages/contracts/src/schemas/config.ts` named earlier does not exist; the real file is `packages/contracts/src/config-values.ts`. Changes: Owned paths, step 1, step 6 and the tests.
- **FD-068** — Retention periods are not configuration values. `retention_policies` (owned by `retention`, FD-064) is the only source of the original, audit and notification retention periods. The `retention` block in `ConfigValues` becomes a read-only mirror or is dropped, as Contract Design decides. Changes Not in scope, step 1, the threat notes and the acceptance checks.

## Goal

Implement AD-10: runtime configuration is versioned, bounded data. Super Admin proposes a change, sees the diff, confirms with a password recheck, and a new version applies within its declared scope. Every value has a range; unknown keys are rejected as invariant violations; rollback creates a new version. Every module reads config through the `ConfigProvider` port.

## Read first

1. `docs/implementation/01-conventions.md` §3, §5 (`requires.stepUp`, `capability`), §13–§14.
2. `docs/implementation/02-data-model.md` §11 (tables + the `values` shape with defaults) and §0 `report_reason`.
3. `docs/implementation/03-routes-and-contracts.md` §3 `ConfigProvider`, §4 "administration" (all five entries with the exact ranges), §5 `config.applied`.
4. `docs/status/decision-log.md` FD-016, FD-018, FD-020; `ARCHITECTURE-SPINE.md` AD-10.
5. Prototype: `ui-design-prototype/admin/app.js` `renderConfig()`/`loadConfig()`/`saveConfig()` (≈553–640) and `shared/rogikotha-data.js` `moderation.thresholds`, `moderation.permissions`, `config` (`limitedDataThreshold`, `emergency`) — the seed values for version 1.
6. T-103's `resolveCapabilities` (consumes `values.capabilities`).

## Owned paths

- `packages/contracts/src/config-values.ts` (`ConfigValues` zod with ranges + `.strict()` everywhere; the file already exists, and T-101 added the FD-058 keys to it, which this task takes over)
- `packages/domain/src/administration/config-policy.ts` (structural-key denylist, diff, tests)
- `packages/application/src/modules/administration/**` (`config-current.ts`, `config-history.ts`, `config-propose.ts`, `config-apply.ts`, `config-rollback.ts`, `authorization.ts`)
- `packages/application/src/ports/config-provider.ts` (extend if T-101 already created the interface, FD-072)
- `packages/database/src/repositories/config.ts` (+ `ConfigProvider` implementation with 5-second cache)
- `packages/database/src/migrations/*_config_seed.sql` or `packages/test-support/src/seed/config.ts` (version 1 from prototype values — choose seed script; migration only for the empty-table guard)
- `apps/web/src/server/actions/config.ts`
- `apps/web/src/server/container.ts` (replace T-101's defaults-only provider with the database-backed one)
- `packages/i18n/messages/{en,bn}.json` (`errors.config.*`)
- tests alongside

## Not in scope

- The config UI (T-408). Retention policy versions (`retention.setPolicy`, T-309): `retention_policies` is the only source of the original, audit and notification retention periods, and T-309 never reads a period from `ConfigValues` (FD-068). Whether `ConfigValues` keeps a read-only `retention` mirror or drops the block is decided in Contract Design (FD-068). Report-reason copy editing (only enable/disable of reasons is configurable).

## Steps

1. **Schema.** `ConfigValues` as 02 §11 with ranges from 03 §4: `thresholds.fiveAccountHide 2–50`, `criticalHours 1–168`, `standardDays 1–30`, `appealDays 1–30`; no editable retention periods — the `retention` block is either a read-only mirror of `retention_policies` that `config.propose`/`config.apply` refuse to change, or dropped, as Contract Design decides (FD-068); the FD-058 sign-in settings with defaults first-delay threshold 3 failures, window 15 min, first delay 1 s, cap 30 s, severe threshold 10 failures (key names and ranges named in Contract Design, FD-063, FD-072); `limitedDataThreshold 1–50`; `reportReasons` ⊆ enum, must include `privacy`, `threat`, `unsafeFile`, `dangerous`, `other` (cannot be disabled); `capabilities.{admin,moderator}.{revealIdentity,originalEvidence}` booleans; `featureVisibility` booleans; `emergency` strings (phone patterns `^[0-9-]{3,15}$`, `lastVerified` ISO date). `.strict()` on every object so unknown keys fail. Export `DEFAULT_CONFIG` = prototype values.
2. **Structural denylist.** `config-policy.ts`: any proposed key path matching `auth.*`, `security.*`, `identity.*`, `audit.*`, `database.*`, `evidence.allowlist`, `capabilities.super_admin.*` → `config.invariant` (belt and braces beyond `.strict()`); the FD-058 sign-in keys must stay editable, so if Contract Design places them under a denylisted prefix (`auth.*`, `security.*`), it also decides how the denylist admits exactly those keys (FD-072); `diff(before, after)` → `[{ path, before, after }]` on leaf values.
3. **Provider.** `ConfigProvider.current()` reads the highest `version` with `effective_from <= clock.now()`, caches 5 s (invalidate on apply in the same process; other processes wait ≤ 5 s — acceptable for the demo, note it). If the table is empty, return `DEFAULT_CONFIG` and log `config.defaults_in_use` once.
4. **Commands.** `config.current`, `config.history` (versions desc with their `config_changes` rows), `config.propose({ values })` → `{ diff, validation }` (no write), `config.apply({ values, reason, expectedVersion })` `requires { capability: 'config.write', stepUp: true }`: validate, denylist, `expectedVersion === current.version` else `conflict`; insert `config_versions` (version+1, `effective_from = now`), `config_changes` rows from the diff, audit `config` stream with `details: { version, changes: diff }` (values are bounded scalars, allowed), outbox `config.applied`; `config.rollback({ toVersion, reason })` copies that version's values into a new version with `rolled_back_from`. Reason ≥ 5 chars.
5. **Seed.** Version 1 with `DEFAULT_CONFIG` via the seed script (T-007 calls it; if T-007 already landed, add the call there and note it).
6. **Consumers.** Replace any hard-coded threshold reads in T-101/T-103 (`resolveCapabilities` already takes config); T-101's FD-058 defaults, already in `config-values.ts`, become the registered runtime settings, the defaults-only provider T-101 wired is replaced, and T-101 keeps reading them through `ConfigProvider` (FD-072). Provide `useConfig()`-style server helper `getConfig()` in `apps/web/src/server/config.ts`.
7. Tests, `pnpm check`, hand-off, commit `T-105: …`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Ranges | unit tests | each boundary accepted, each ±1 rejected with `config.out_of_range` |
| Unknown key | `config.propose({ ...valid, auth: { mfa: true } })` | `config.invariant` |
| Mandatory reasons | disable `privacy` | validation error |
| Apply without step-up | as super admin, no `rk_stepup` | `auth.step_up_required`; nothing written |
| Apply | with step-up, `fiveAccountHide 5→3` | version 2; one `config_changes` row `thresholds.fiveAccountHide 5→3`; audit + outbox rows; `current()` returns 3 within 5 s |
| Concurrency | two applies with `expectedVersion 1` | second → `conflict` |
| Rollback | `rollback(1)` | version 3 equals version 1 values, `rolled_back_from = 1` |
| Admin cannot apply | as `admin_nadia` | `forbidden` |
| Super admin caps fixed | set `capabilities.admin.revealIdentity = true` | admin gains it; super_admin unchanged; moderator unchanged |
| FD-063: sign-in setting defaults (AC3.1.5) | read `DEFAULT_CONFIG` and seeded version 1 | the FD-058 keys exist with first-delay threshold 3, window 15 min, first delay 1 s, cap 30 s, severe threshold 10 |
| FD-072: sign-in settings change without a deployment (AC11.1.1) | as super admin with step-up, apply the severe threshold 10→12, then run 12 failed sign-ins for `shirin.demo@example.test` | new version with one `config_changes` row and an audit row (actor, previous and new value); within 5 s the severe notice fires at the 12th failure, not the 10th |
| FD-072: sign-in settings are bounded | `config.propose` with each FD-058 key just outside the range Contract Design set | `config.out_of_range`; nothing written |
| FD-068: config never changes a retention period | `config.apply` with a changed original-retention value (under whichever shape Contract Design chose: mirror key or dropped key) | `config.invariant`; no new `config_versions` row; `retention_policies` unchanged |
| Checks | `pnpm check` | exit 0 |

## Tests to write

- `packages/contracts/src/config-values.test.ts` (extend): full range table, including the FD-058 sign-in keys and their defaults (FD-063); strict-mode rejection; mandatory reasons; no editable retention period (FD-068).
- `domain/administration/config-policy.test.ts`: denylist paths; diff correctness (nested, arrays).
- `application/modules/administration/*.test.ts` (fakes): all commands; audit `details` contains only paths and bounded scalars; conflict; rollback chain.
- `database/repositories/config.int.test.ts`: cache expiry (FakeClock not applicable — use a 5 s sleep-free approach by exposing `invalidate()`), `effective_from` in the future ignored until due.

## Threat notes

| # | Abuse case | Defence | Test |
|---|---|---|---|
| 1 | Config used to disable a security boundary | `.strict()` + denylist; only enumerated keys exist | unknown-key tests |
| 2 | Privilege escalation via `capabilities` | super_admin fixed in code; only two admin/mod toggles exist | caps test |
| 3 | Silent change | every apply needs reason + step-up + audit with diff | apply tests |
| 4 | Lost update between two admins | `expectedVersion` optimistic concurrency | conflict test |
| 5 | Threshold set to 1 to weaponise reports | `fiveAccountHide ≥ 2`; critical reasons cannot be removed | range tests |
| 6 | Rollback used to erase history | rollback is a new version; history append-only | rollback test |
| 7 | Retroactive retention change | retention periods are not config values: they live only in `retention_policies` and change through `retention.setPolicy` (T-309), prospectively; existing deadlines untouched (FD-068) | FD-068 rows + T-309 test reference |
| 8 | Brute-force settings relaxed to uselessness | the FD-058 keys are bounded (ranges from Contract Design), need `config.write` + step-up, and every change is audited (FD-072) | sign-in settings range and apply tests |

## Hard-rule checklist

- [ ] Limited-data threshold configurable but never a score.
- [ ] Emergency numbers editable, `lastVerified` required.
- [ ] Audit for every version; append-only.
- [ ] Both locales for `errors.config.*`.
- [ ] No attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
