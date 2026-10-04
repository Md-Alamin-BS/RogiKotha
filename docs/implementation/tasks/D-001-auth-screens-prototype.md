# D-001 — Auth screens prototype pass (patient 04b + staff Chart Tray)

| Field | Value |
|---|---|
| Story | STORY-AUTH-001, STORY-AUTH-002 (prototype coverage → Partial) |
| Phase / Lane | 1 / B (design; runs before T-102 and T-103) |
| Class → model | M2 → Claude Sonnet 5 with the `impeccable` skill (alt GPT-5.6 Terra); validator: founder walkthrough in both locales and both themes |
| Effort setting | high |
| Estimate | 3–4 h agent; validation 1 h (founder review) |
| Depends on | — (spec only: `docs/design/auth-screens-spec.md`) |
| Parallel-safe with | T-001…T-010 (they never touch `ui-design-prototype/`), T-101 |

## Goal

Turn `docs/design/auth-screens-spec.md` into runnable HTML in the static prototype so the founder can review the sign-up, sign-in, verify, reset, security, staff sign-in, device-approval and password-recheck screens before T-102/T-103 port them to React. Nothing here is product code; it is the design record the port tasks copy from.

## Read first

1. `docs/design/auth-screens-spec.md` — all sections; §5 is the exact string table to add.
2. `docs/implementation/01-conventions.md` §7 (which classes exist and why nothing new is invented) and §14.
3. `ui-design-prototype/README.md` (hash routes, how to run, the detector).
4. `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/index.html` — whole file (7 KB): masthead `.controls`, `#demo-panel`, the `<section class="view">` list, the overlay sheet, the colophon.
5. `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` — **154 KB; read only these**: `state` (lines 1–48), `VIEWS` (≈112), `ROUTES`/`LEGACY_SLUG` (≈120–181), `route()` and `titleForView()` (≈182–260), `renderCompose()` opening incl. the `signin-note` callout (≈1352–1385), `renderMine()` and `workspaceNav()` (≈1609–1745, ≈1843), `openSheet`/`closeSheet`/`trapFocus` (≈2412–2440), `openReport` (≈2469), `renderAll()` (≈2502), the `#demo-panel` click handler (≈2742–2760), `init` (≈2815–2830). Use `grep -n` to locate them; line numbers drift.
6. `ui-design-prototype/admin/index.html` (4 KB, whole file) and `admin/app.js`: `VIEWS` (≈103), `NAV_GROUPS` (≈129), `route()` (≈229), `renderAll()` (≈251), `caseDetail()` reveal buttons (≈329–413, for where the recheck sheet is triggered), `setRole`/`ROLE_ORDER` (≈525–553), `init` (≈812).
7. `ui-design-prototype/shared/rogikotha-data.js` — `STRINGS` table layout only (`grep -n "'demo.title'"` to find the block; keys are alphabetical by namespace insertion, not sorted).
8. `docs/planning/09-coverage-matrix.md` — proof citation convention at the top; rows STORY-AUTH-001/002.
9. `tools/README.md` — `npm run check`, `proof-check --fix`, `i18n-audit`.

## Owned paths

- `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/index.html`
- `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js`
- `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/styles.css` (append-only, `/* added: D-001 … */` comments)
- `ui-design-prototype/admin/index.html`, `ui-design-prototype/admin/app.js`, `ui-design-prototype/admin/styles.css` (append-only)
- `ui-design-prototype/shared/rogikotha-data.js` (STRINGS additions only)
- `ui-design-prototype/README.md` (route table rows)
- `docs/planning/09-coverage-matrix.md` (rows STORY-AUTH-001, STORY-AUTH-002 only)

## Not in scope

- Any real authentication, storage, or network. The prototype stays static; "sign in" flips a `state.session` object and nothing else.
- New CSS classes beyond a `.field-error` rule and a `.ctl.account` initials variant if the existing `.ctl` cannot show two letters; do not restyle anything.
- Removing the admin role switcher from the *prototype* (T-103 removes it in the product; the prototype keeps it so the founder can still walk the roles).
- Email templates as HTML — they are listed in §5 only as strings.

## Steps

1. **Strings.** In `shared/rogikotha-data.js`, after the `user2.*` block at the end of `STRINGS`, add every key from `auth-screens-spec.md` §5 (`auth.*`, `errors.auth.*`, `staff.*`, `email.*`) as `'key': { en: '…', bn: '…' }` — verbatim, both languages. Run `node tools/i18n-audit.mjs` after step 4 to confirm every key is referenced and none is missing.
2. **Patient state and routes** (`app.js`). Add to `state`: `session: null` (or `{ username: 'shirin_88', display: {…}, verified: true, staff: false }` when signed in), `authError: null`. Add `'register', 'signin', 'verify', 'reset', 'security'` to `VIEWS`. Add to `ROUTES`: `register: { view: 'register' }`, `'sign-in': { view: 'signin' }`, `'verify-email': { view: 'verify' }`, `'reset-password': { view: 'reset' }`, and make `me` accept a sub-segment: `me: { view: 'mine', detail: 'security', id: 'meSection' }` so `#me/security` routes to `security` (in `route()`, when `def.detail === 'security'` set `v = 'security'`). Add `titleForView` cases returning `T('auth.register.title')`, `T('auth.signIn.title')`, `T('auth.verify.title')`, `T('auth.reset.title')`, `T('auth.security.title')`. Call the five new render functions from `route()` and `renderAll()`.
3. **Patient views** (`index.html`). Add `<section class="view" id="view-register" hidden>` … `view-signin`, `view-verify`, `view-reset`, `view-security` after `#view-about`. In `.controls`, insert the account entry **before** `#lang`: `<button type="button" id="account" class="ctl" data-i18n="auth.signIn" data-i18n-attr="title"><span></span></button>` (the `<span>` gets the person glyph SVG or initials from JS). In `#demo-panel`, add a third `.opt-row` with two `.opt` buttons `data-session="out"` / `data-session="in"` (labels `auth.signOut` / `auth.signIn`, `aria-pressed`) above the reset button.
4. **Patient render functions** (`app.js`). Write `renderRegister()`, `renderSignin()`, `renderVerify()`, `renderReset()`, `renderSecurity()` following §2 (a-head + one `.panel` max-width 560) and §3.1–§3.6 field by field: `.field > label + input`, `.sub` hints, `.req` markers, a `.callout warn` error summary whose links target `#f-<name>`, `<p class="field-error" id="err-<name>">` under invalid fields with `aria-describedby`/`aria-invalid`, a `.link-btn` Show toggle with `aria-pressed` on each password field, interface-language `.opt-row` with `role="radiogroup"`. Validation is client-only and mirrors §3.1's table; a valid register submit sets `state.session = {…, verified:false}` and `go('verify-email')`; `#verify-email?token=1` (use `state.verifyToken` set by a "simulate link" `.link-btn`, dev-only) sets `verified:true` and `go('me')` with the `auth.verify.done` callout rendered at the top of `renderMine()` once. Sign-in with any email + password ≥ 10 sets a verified session; wrong length shows `errors.auth.invalidCredentials`. Reset request shows `auth.reset.sent`; `#reset-password?token=1` shows the set form; success calls `state.session = null`, `go('sign-in')`, shows `auth.reset.done`. `renderSecurity()` renders the four `.sub` sections of §3.6 with a `.kv` sessions table (two fictional rows, one `auth.security.thisDevice` badge) and the sign-out-everywhere inline password prompt. Add `auth.security.nav` as a fifth link in `workspaceNav()` → `#me/security`.
5. **Masthead account entry** (`app.js`). Add `renderAccountEntry()` called from `renderAll()`, `setLang()` and after any `state.session` change: signed out → person glyph (`<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>`), click → `go('sign-in')`; signed in → `initials(display)` on `--accent-soft`, with a `--warn-ink` dot when `!verified`; click → open the existing `.overlay > .sheet` (reuse `openSheet`) titled with the display name, listing the §1 menu items as `.link-btn`s (`auth.verifyPending` first when unverified; `nav.admin` last when `staff`); **Sign out** sets `state.session = null` and re-renders. At ≥ 760 px the same list may render in a small absolutely-positioned `.panel` like `#demo-panel`; the sheet is acceptable at every width if simpler.
6. **Gates** (`app.js`). In `renderCompose()`, replace the `state.role === 'reader'` condition with `!state.session`: body `auth.gate.writeBody` + two `.btn small` (`auth.signIn` → `#sign-in`, `auth.gate.register` → `#register`) and **do not render** `.c-modes`/`.c-grid` when signed out. When `state.session && !state.session.verified`, render the §3.2 pending panel as a `.callout warn` above the form and set `disabled` + `title=T('auth.gate.verifyToPublish')` on the Publish button. Add `openAuthGate()` that opens the sheet with `auth.gate.title`/`auth.gate.body` + the two buttons; call it from the click handlers of `[data-react]`, `#comment-post`, the bookmark button, `openReport()` and the `profile.claimThis` handler when `!state.session` (find each handler with `grep -n "data-react\|openReport\|claimThis\|bookmark" app.js`). When unverified, show `auth.gate.verifyToAct` in the same sheet instead. Keep `state.role` and the role chips untouched otherwise.
7. **Staff console** (`admin/index.html`, `admin/app.js`). Add `'signin', 'approve', 'security'` to `VIEWS` and sections `#view-signin`, `#view-approve`, `#view-security` (not in `NAV_GROUPS`; they are not navigation). Routes `#sign-in`, `#approve-device`, `#security` in `route()`; when `v` is one of them hide `#topnav`/`#tabbar`/`#crumbs`. `renderSignin()`: one raised `.panel` max-width 480, kicker `staff.signIn.kicker`, H1 `staff.signIn.title`, Email + Password (Show), `.btn primary` `staff.signIn.submit`, `.note` `staff.signIn.note` linking to `../index.html`. Submit: a fictional non-staff email (`reader@demo`) shows `staff.notStaff`; anything else → if `state.deviceTrusted` go `#queue`, else go `#approve-device`. `renderApprove()`: pending state (H1 `staff.device.title`, body, `.kv` device label + time, dev-only "simulate link" `.link-btn` that sets `state.approveToken = 1`); token state asks for the password (`staff.device.recheck`, Show, `.btn primary` `staff.device.trust`) → `state.deviceTrusted = true`, go `#queue`. `renderSecurity()`: `staff.device.trusted` `.kv` table (two rows, `staff.device.thisDevice`, `.btn small ghost` `staff.device.revoke` → sets `deviceTrusted=false`), sessions table, password section. Add a `#security` link to the role chip: make the `#role` control open a small sheet listing `staff.security.title` and `auth.signOut` **in addition to** the existing role cycling (keep cycling on the chip itself; put the links in a sheet opened by a new `.ctl` `#account` next to it) — simplest: new `.ctl` `#staff-account` with initials.
8. **Password recheck sheet** (both apps). Add `openStepUp(onConfirm)` in both `app.js` files: opens the overlay sheet with `staff.stepUp.title`, `.note` `staff.stepUp.body`, one password `.field` with Show, `.btn primary` `staff.stepUp.confirm`; on submit with length ≥ 10 sets `state.stepUpUntil = Date.now() + 5*60*1000`, closes, and calls `onConfirm()`; if `state.stepUpUntil > Date.now()` the sheet is skipped. In `admin/app.js` wrap the `[data-reveal]` handler and the `#cfg-*` `change` handlers in `renderConfig()` with `openStepUp`. In 04b wrap `#user-data-delete` and the sign-out-everywhere button. Add a line `step_up=true` to the audit preview in `caseDetail()` when `state.stepUpUntil` is set.
9. **Markers.** Put `// STORY-AUTH-001: <what>` on the first line of `renderRegister`, `renderSignin`, `renderVerify`, `renderAccountEntry`, `openAuthGate`; `// STORY-AUTH-002:` on `renderReset`, `renderSecurity`, admin `renderApprove`, admin `renderSecurity`, `openStepUp`. `<!-- STORY-AUTH-001: … -->` on the new `<section>`s in `index.html`.
10. **Docs.** Add the new routes to the route table in `ui-design-prototype/README.md` (`#register`, `#sign-in`, `#verify-email`, `#reset-password`, `#me/security`, admin `#sign-in`, `#approve-device`, `#security`). In `09-coverage-matrix.md` set STORY-AUTH-001 and STORY-AUTH-002 to **Partial** with proofs in the `path:line anchor` form citing the markers, and a note "static simulation; real flow in T-101/T-102/T-103". Run `node tools/proof-check.mjs --fix`.
11. **Checks.** `npm run check` (all seven tools) and `npx impeccable detect ui-design-prototype/ --no-advisory` must be clean; `npm run smoke` must still pass (extend `tools/smoke.mjs` only if it fails because a gated control now opens the auth sheet — then add the signed-in session setup at the top of the affected journey; note the change in the hand-off).
12. Serve (`npm start`) and walk every screen in EN and BN, light and dark, at 360 px and 1280 px; list anything that overflowed or mis-rendered in the hand-off with the fix applied.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| All strings present in both languages | `node tools/i18n-audit.mjs` | `Missing (referenced, undefined): none`; no `auth.*`/`staff.*` key with only one language |
| Repo checks | `npm run check` | exit 0 |
| Detector | `npx impeccable detect ui-design-prototype/ --no-advisory` | zero findings |
| Routes resolve | open `#register`, `#sign-in`, `#verify-email`, `#reset-password`, `#me/security`, admin `#sign-in`, `#approve-device`, `#security` | each renders its view; page title matches the H1 |
| Gate signed out | `#write` with `state.session === null` | callout with two buttons; no form rendered; Write CTA still visible in masthead |
| Gate unverified | register → `#write` | pending banner; Publish disabled with title `auth.gate.verifyToPublish` |
| Reaction gate | signed out, click a like button on `#experiences/r1` | sheet `auth.gate.title` opens; no reaction recorded |
| Anti-enumeration | register twice with the same email | identical pending screen both times |
| Staff device flow | admin `#sign-in` → any staff email → `#approve-device` → simulate link → password → `#queue`; sign out → sign in again | second time goes straight to `#queue`; after revoke on `#security` the approval is required again |
| Step-up | admin: click `[data-reveal]` as Super Admin | recheck sheet first; after confirm the reveal proceeds; within 5 min no second prompt |
| Coverage rows | `node tools/proof-check.mjs` | exit 0; AUTH-001/002 rows Partial with anchors |
| Keyboard | Tab through register form | every control reachable; Show toggle announces pressed state; error summary receives focus after a failed submit |

## Tests to write

- Extend `tools/smoke.mjs` with: register with a 9-char password shows the summary and `#err-password`; register valid → `#view-verify` visible; simulate link → `#view-mine` shows `auth.verify.done`; signed-out reaction click opens the gate sheet; signed-in reaction click records; admin: sign-in → approve → trust → `body[data-view="queue"]`.
- No other automated tests (static prototype).

## Hard-rule checklist

- [x] Sign-in controls are never the accent fill in the patient chrome; the Write CTA stays the only one. Evidence: every patient auth submit uses `.btn ghost` — `app.js:2163` (register), `:2193` (sign-in), `:2236` (reset set), `:2244` (reset request); security's password-change submit is `.btn ghost small` (`app.js:2300`). `cta-write` (`index.html:52`) is untouched and remains the only plain `.btn`.
- [x] Errors carry text, not colour alone; summary + inline. Evidence: `authErrorSummary()` (`app.js:123`) renders a `.callout warn` list of `<a href="#f-<view>-<name>">` links to each field; `authField()`/`authPasswordField()` (`app.js:94`, `:109`) render `<p class="field-error" id="err-<view>-<name>">` with `aria-invalid`/`aria-describedby` on the input. Same pattern in `admin/app.js:76-100`.
- [x] No "account locked" wording; rate-limit copy only (`errors.auth.rateLimited`). Evidence: `grep -i locked shared/rogikotha-data.js` returns nothing; rate-limit copy exists in the strings table but is not wired to simulated behaviour in D-001 (ISS-032 — deferred to T-101, which has the real attempt counter).
- [x] Anti-enumeration: same screen for new and existing email. Evidence: `app.js:3359` comment + code — register never branches on whether the email exists, so the identical `#view-verify` pending panel renders every time; proven by `tools/smoke.mjs:99-113` ("register twice with the same email shows the identical pending screen").
- [x] Reading never requires sign-in: every public route still renders signed out. Evidence: `renderCompose()`'s signed-out branch (`app.js:1465`) renders a callout instead of the form, but every other route (`#discover`, `#doctors`, `#experiences/r1`, …) is untouched by this task and was proven still rendering signed-out in `tools/smoke.mjs` (all the pre-existing index/detail-page assertions ran with `state.session === null` before the register step, per the file's new ordering).
- [x] Both locales: every new string has `bn`; Bengali cap-drop and numerals behave (digits via `bn()`). Evidence: every key added to `shared/rogikotha-data.js` (lines 676-783) has both `en`/`bn`; `node tools/i18n-audit.mjs` reports `Missing (referenced, undefined): none`; browser walkthrough confirmed Bengali numerals on the security page ("কমপক্ষে ১০ অক্ষর") and full-Bengali auth copy.
- [x] Persistent disclaimer and demo marker unchanged. Evidence: `git diff -- index.html` touches only the masthead `.controls`, the demo-panel session toggle, and the new `<section>` list — the `<footer class="colophon">` block (disclaimer + demo banner) has zero diff.
- [x] No emoji as icon (person glyph is inline SVG). Evidence: `app.js:2338` and `admin/app.js:725` — the signed-out account glyph is an inline `<svg>` circle+path, no emoji character anywhere in the new code.
- [x] No attribution anywhere. Evidence: final commit's author/committer checked with `git log -1 --format='%an <%ae>%n%cn <%ce>%n%B'` before push (see report); no tool/model name or `Co-Authored-By` in any touched file.

## Hand-off (implementer fills in)

### What changed
Added the patient auth screens (`/register`, `/sign-in`, `/verify-email`, `/reset-password`,
`/me/security`) to Concept 04b, the masthead account entry (signed-out/unverified/verified states),
and gates on write/react/comment/bookmark/report/claim behind `state.session`. Added the staff
`#sign-in` / `#approve-device` / `#security` screens and the password-recheck (step-up) sheet to the
admin console, wired to `[data-reveal]` and the config-threshold changes. Added every `auth.*` /
`errors.auth.*` / `staff.*` / `email.*` string from spec §5, both languages. Extended
`tools/smoke.mjs` with a register→verify→gate walkthrough and a second JSDOM instance for the staff
sign-in→approve→trust flow. Everything is a static simulation: `state.session` (patient) and
`state.staffSignedIn`/`state.deviceTrusted` (staff) flip in memory only — no network, no real tokens.

### Not done and why
- Rate limiting (`errors.auth.rateLimited`) and account-suspended copy ship as strings but are not
  wired to any simulated counter — the task's own step list only asked for the generic
  invalid-credentials case on `/sign-in`. See ISS-032; real behaviour is T-101's.
- "Password must not equal email" (spec §3.1) is not separately enforced — only length is checked,
  since spec §5 has no distinct copy for that case (ISS-033).
- The `?token=` URL scheme described in the task file (`#verify-email?token=1`, etc.) was replaced
  with in-page "simulate" state flags (`state.verifyToken`/`resetToken`/`approveToken`) rather than
  adding query-string parsing to the router — functionally equivalent for the founder walkthrough
  (ISS-030).
- The 360px viewport could not be forced through the available browser-automation tool on this
  environment (`resize_window` did not change the DOM's effective viewport); verified by code review
  instead (ISS-037). Desktop width (1280px), Bengali, English, light and dark theme were all walked
  in the real browser.

### Questions for the human
None block this task. Two things worth the founder's eye on walkthrough:
1. After registering a new demo account, the masthead shows the new identity, but `/me`'s
   "Published"/"Drafts" content still shows the fixed `shirin_88` fixture (ISS-029) — pre-existing,
   `renderMine()` was never session-scoped. Cosmetically odd but not a hard-rule violation.
2. Terms/Privacy links on `/register` point at `#about` (ISS-028) since the prototype has no
   dedicated policy routes — confirm that's an acceptable stand-in for the walkthrough.

### Follow-ups
- T-101 (Better Auth adapter): implement real rate limiting, account suspension, and the
  password-not-equal-email check.
- T-102/T-103 (React port): see `docs/implementation/handoffs/D-001.md` for file:line pointers per
  screen and which behaviours are simulated vs. must become real.
- Pre-existing `impeccable` findings at `admin/styles.css:339` and
  `concepts/concept-04b-quiet-clinic-minimal/styles.css:1797` (thick-border anti-pattern, predates
  this task) are out of D-001's owned paths — flagged for whoever owns those files next (ISS-027).

### `pnpm check` output summary
(for this task: `npm run check` and the detector)
```
npm run check
  tokens.css is in sync (16 token blocks)
  coverage: STORY-AUTH-001 Partial, STORY-AUTH-002 Partial (was Missing/Missing)
  i18n-audit: Missing (referenced, undefined): none
  proof-check: 93 correct, 0 drifted, 16 unanchored (pre-existing, unrelated), 0 broken
  contrast: OK - every text pair clears AA and every 1.4.11 boundary clears 3:1, both modes
  bangla-metrics: OK
  smoke: 96/96 passed, Runtime errors: none
  exit code: 0

npx impeccable detect ui-design-prototype/ --no-advisory
  2 anti-patterns found — both pre-existing (git blame: commit 46fc261, 2026-09-10),
  outside D-001's owned paths, not introduced by this task (see ISS-027).
```

### Hard-rule evidence
See the checked boxes above — each cites `file:line` or the smoke test name.

**Run record:** Claude Code · claude-sonnet-5 · effort high · start commit 56ed036 · end commit a75d7f4
