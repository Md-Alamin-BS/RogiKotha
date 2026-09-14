# T-103 — Staff access: roles, capabilities, console guard, staff sign-in, device approval, step-up

| Field | Value |
|---|---|
| Story | STORY-AUTH-002 (administrative device approval), STORY-ADMIN-001 (capability matrix, password recheck) |
| Phase / Lane | 1 / A |
| Class → model | M3 → Claude Opus 5 (alt GPT-5.6 Sol); validator: GPT-5.6 Sol + human approval (T-106) |
| Effort setting | xhigh |
| Estimate | 5–7 h agent; validation 2 h |
| Depends on | T-101, T-008 (admin layout + `admin.css`), D-001 reviewed |
| Parallel-safe with | T-102 (lane B; only shared file is `packages/i18n/messages/*` — append, do not reorder), T-104 (disjoint modules; both add audit rows), T-201 |

## Goal

Staff sign in with the same accounts, distinguished by `account_profiles.staff_role`. The console is guarded by a layout that requires a staff role and an approved device; unknown devices need an emailed approval link plus a password recheck. Capabilities resolve from role + config. A password-recheck ("step-up") mechanism produces a 5-minute signed cookie that `Actor.stepUp` reflects, used by sensitive commands from T-104 onward. The prototype's role switcher is not ported; a read-only role chip replaces it.

## Read first

1. `docs/implementation/01-conventions.md` §5 (Actor, `requires.stepUp`, `capability`), §7–§9 (admin layout scoping, noindex), §11.
2. `docs/implementation/02-data-model.md` §2 (`staff_devices`, `staff_device_approvals`), §11 (`config_versions.values.capabilities`), §12 (`staff_notifications`, `email_deliveries` category `device_approval`).
3. `docs/implementation/03-routes-and-contracts.md` §1 staff rows, §2 `Capability` list and the role→capability comment, §4 "account" `staff.*` and `account.stepUp`, §5 `account.securityEvent`.
4. `docs/design/auth-screens-spec.md` §4 (all) and §5 `staff.*`, `email.staff.deviceApproval.*`.
5. D-001 prototype: `ui-design-prototype/admin/app.js` `renderSignin`, `renderApprove`, `renderSecurity`, `openStepUp` and `admin/index.html` changes (grep `STORY-AUTH`).
6. T-101's `apps/web/src/server/auth.ts` (`getActor`, capability stub), `packages/application/src/authorization/capabilities.ts`.
7. `docs/planning/01-requirement-baseline.md` "Administrative new-device login requires email approval and strong-password verification."

## Owned paths

- `packages/contracts/src/actor.ts` (capability table comment; `Actor.stepUp`)
- `packages/application/src/authorization/capabilities.ts` (`resolveCapabilities(staffRole, config)`), `authorization/step-up.ts`
- `packages/application/src/modules/account/commands/staff-*.ts`, `commands/step-up.ts`, `queries/staff-devices.ts`, `authorization.ts` (extend)
- `packages/database/src/repositories/staff.ts`
- `apps/web/src/server/auth.ts` (device cookie check inside `getActor()`/a `getStaffActor()`; step-up cookie parsing)
- `apps/web/src/server/actions/staff.ts`, `apps/web/src/server/actions/step-up.ts`
- `apps/web/src/app/[locale]/admin/layout.tsx` (guard), `admin/sign-in/page.tsx`, `admin/approve-device/page.tsx`, `admin/security/page.tsx`
- `apps/web/src/components/admin/auth/**` (`StaffSignInForm`, `ApproveDevicePending`, `ApproveDeviceRecheck`, `StaffSecurity`, `RoleChip`, `StaffAccountMenu`)
- `apps/web/src/components/shared/StepUpSheet.tsx` + `useStepUp()` (styled by whichever stylesheet is loaded; uses only classes both stylesheets define: `.overlay`, `.sheet`, `.field`, `.btn`, `.note`)
- `apps/web/src/components/admin/Masthead.tsx` (remove `#role` switcher, add `RoleChip` + `StaffAccountMenu`)
- `apps/web/src/components/patient/auth/SecuritySettings.tsx` — one-line swap of the inline password prompt for `useStepUp()` (coordinate: if T-102 is still open, leave a follow-up instead)
- `apps/worker/src/handlers/mail-send.ts` (category `device_approval` allowed — should already be generic)
- `packages/i18n/messages/{en,bn}.json` (`staff.*`, `email.staff.*`)
- tests alongside

## Not in scope

- Setting roles through a UI (seed sets them; `staff.setStaffRole` exists as a command for the seed and T-408's config route). Identity reveal itself (T-104). Config editing (T-105). Session listing UI beyond reusing T-102's table.

## Steps

1. **Capabilities.** In `contracts/actor.ts` document the table: `super_admin` → all eight; `admin` → `reports.read`, `content.act`, `providers.decide`, `holds.manage`, `retention.bulk`, plus `identity.reveal` / `evidence.original` iff `config.capabilities.admin.*`; `moderator` → `reports.read`, `content.act`, plus the two toggles iff `config.capabilities.moderator.*`; no role → `[]`. Implement `resolveCapabilities(role, config)` with a table test for all 3 roles × 4 toggle states. Replace T-101's stub.
2. **Device cookie.** `rk_staff_device`: 32 random bytes base64url, `httpOnly`, `sameSite lax`, `secure` per `APP_URL`, `maxAge 90 d`, path `/`. Store `sha256(secret)` in `staff_devices.device_hash`. A `getStaffContext(actor, headers)` helper returns `{ device: 'approved' | 'unknown' | 'pending' | 'revoked' }` by looking up the hash for the actor's account. Device trust is per account: the same cookie on another staff account is `unknown`.
3. **Console guard.** `app/[locale]/admin/layout.tsx`: if no actor or no `staffRole` → `redirect('/[locale]/admin/sign-in?next=')`; if device not approved → `redirect('/[locale]/admin/approve-device')`; else render the Chart Tray layout with `RoleChip` (`SA`/`AD`/`MO`, `title = staff.role.chipTitle {role}`) and `StaffAccountMenu` (Security, Sign out). `sign-in`, `approve-device` and `security` are route groups outside the guarded segment (`admin/(public)/sign-in` etc.) but still load `admin.css` and `noindex`.
4. **Staff sign-in action.** Validate credentials through Better Auth's sign-in API **without** persisting a session yet if possible; if the library always creates a session, immediately revoke it when the account has no `staff_role` (`staff.notStaff`) or when the device is unknown (then run step 5). Reuse the T-101 rate limiter (key `staff-signin`). Non-staff never get a session from this route.
5. **`staff.beginDeviceApproval`.** Create/refresh the `staff_devices` row (label from UA), mint a 32-byte token, store `sha256` in `staff_device_approvals` with `expires_at = now + 30 min`, send `email.staff.deviceApproval` with link `APP_URL/[locale]/admin/approve-device?token=…` (mail via the Mailer port → job). Audit `account:<id>` action `staff_device_requested`. Redirect to the pending screen (§4.2) which shows the device label + time and the dev inbox link.
6. **`staff.approveDevice`.** `{ token, password }`: look up the hash, refuse expired/used (`auth.token_expired` / `auth.token_invalid`), verify the password through the hasher (max 3 failures per token, then invalidate), set `approved_at`, create the session (Better Auth sign-in with the stored credentials is not possible — instead complete the pending sign-in by calling the library's session creation for that user; document the exact API used), audit `staff_device_approved`, `staff_notifications` kind `security` + user notification `security`, redirect `/admin/queue`.
7. **Devices UI.** `/admin/security`: trusted devices `.kv` (label, first/last seen, `staff.device.thisDevice`), `Revoke` → `staff.revokeDevice` (sets `revoked_at`; revoking the current device also signs out), sessions table and change-password reuse T-102's components inside the Chart Tray layout.
8. **Step-up.** `account.stepUp` `{ password }` → verify → set cookie `rk_stepup` = HMAC-signed `{accountId, until}` (5 min, `httpOnly`, `sameSite strict`); `getActor()` parses and sets `Actor.stepUp` only if the signature and account match and `until > now`. `requires.stepUp` in `defineCommand` returns `auth.step_up_required` otherwise. `StepUpSheet` + `useStepUp().withStepUp(fn)`: calls `fn`; on `auth.step_up_required` opens the sheet; on success re-runs `fn`. Audit `step_up` with `details: { purpose }`.
9. **Masthead.** Remove the `#role` switcher port entirely (T-008 may have left a placeholder); add `RoleChip` and `StaffAccountMenu`. Remove the `admin.role.current` cycling copy usage; keep the key (unused keys are allowed by the parity test only if both languages exist — mark `// unused: T-103` in a comment map if the tooling flags it).
10. Tests, `pnpm check`, detector on `apps/web/src/components/admin`, hand-off, commit `T-103: …`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Non-staff refused | sign in on `/admin/sign-in` with `shirin_88` | `staff.notStaff`; no `auth_sessions` row |
| Guard | GET `/en/admin/queue` signed out | 302 → `/en/admin/sign-in?next=/en/admin/queue` |
| Unknown device | sign in as `mod_rashid` in a fresh browser | pending screen; Mailpit has `email.staff.deviceApproval.subject`; no session cookie yet |
| Approve | open link, wrong password ×3 | token invalid; new sign-in needed. With right password → `/admin/queue`, `staff_devices.approved_at` set, audit + notifications rows |
| Known device | sign out, sign in again | straight to `/admin/queue` |
| Revoke | `/admin/security` → Revoke current | signed out; next sign-in requires approval |
| Cookie per account | same browser, sign in as `admin_nadia` | approval required again |
| Capabilities | unit table test | 12 combinations correct; `super_admin` always all |
| Step-up | call a test command with `requires.stepUp` without cookie | `auth.step_up_required`; after `account.stepUp`, allowed for 5 min, refused at 5:01 (FakeClock) |
| Cookie flags | inspect `rk_staff_device`, `rk_stepup` | `HttpOnly`, `SameSite`, `Secure` only on https, sizes < 4 KB |
| Checks | `pnpm check` | exit 0 |

## Tests to write

- `capabilities.test.ts` table; `step-up.test.ts` (signature tamper → no stepUp; expiry; wrong account).
- `staff-*.test.ts` with fakes: begin/approve/revoke, 3-strike token invalidation, non-staff refusal, notification + audit rows.
- `staff.int.test.ts`: full browser-less flow through the actions against compose PostgreSQL + Mailpit; device hash never equals the cookie value; revoked device refused.
- Component tests for the four screens in both locales; `RoleChip` titles.

## Threat notes

| # | Abuse case | Defence | Test |
|---|---|---|---|
| 1 | Stolen staff password used from attacker's device | unknown device → email approval + password recheck; no session before approval | unknown-device test |
| 2 | Approval link intercepted | 30-min expiry, single use, password required on the link, 3-strike invalidation | approve tests |
| 3 | Device cookie copied to another account | hash bound to account id; lookup by (account, hash) | cookie-per-account test |
| 4 | Step-up cookie forged or reused after expiry | HMAC with `BETTER_AUTH_SECRET`-derived key, `until`, account binding, `sameSite strict` | tamper/expiry tests |
| 5 | Non-staff obtains console session via `/api/auth` directly | guard checks `staff_role` on every request, not at sign-in only | guard test with a normal session cookie |
| 6 | Role escalation via config | `super_admin` capabilities fixed in code; config can only toggle the two admin/mod flags | capabilities test + T-105 invariant |
| 7 | Enumeration of staff emails via the staff route | same generic error as patient sign-in; `staff.notStaff` only after valid credentials | shape test |
| 8 | Revoked device keeps working | `revoked_at` checked on every guard pass | revoke test |

## Hard-rule checklist

- [ ] Reporter/original-evidence access is a capability, not a role default for admin/moderator (toggles default off).
- [ ] Every device/step-up event audited with allowlisted details.
- [ ] Console pages `noindex`; no patient chrome.
- [ ] Both locales for all `staff.*` strings; Bengali digits in the 30-minute copy come from the formatter.
- [ ] Single solid accent = the primary commit button on staff forms (Chart Tray rule).
- [ ] No attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
