# Frontend components — U10 `t-103-staff-access-and-devices`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-103-staff-access-and-devices/functional-design/`.

Component-level design for `functional-spec.md` (workflows WF1–WF10) and `rules.md` (BR1.1–BR12.5). It follows answer A to all thirteen questions in `functional-design-questions.md`, which await the owner's confirmation. Upstream: `unit-of-work.md` U10, `stories.md` US3.2 (AC3.2.5) and US11.1 (AC11.1.2), `auth-screens-spec.md` §4 and §5, the D-001 prototype (`ui-design-prototype/admin/app.js` `renderSignin`, `renderApprove`, `renderSecurity`, `renderStaffAccount`, `openStepUp`, and `admin/index.html`). The staff console keeps the Chart Tray look and the verbatim port of the prototype's `admin.css` (FD-030, FD-091, `project.md` Code Style); no new class is expected, and any that proves necessary is added to `admin.css` with `/* added: T-103 reason */`.

**The owner approved these screens as they are in the prototype** (`ui-design-prototype/admin/`, staff console look) on 2026-10-29 (FD-053; R1, which first said the build waits for that approval). This file follows those screens; the approval is copied into this Unit's record before Code Generation (BR12.5). Copy added for states the prototype does not show (the device-mismatch error, the `{minutes}` digits, the account-menu label: `functional-spec.md` § 8) changes no layout.

Refreshed 2026-10-29 against T-010 as merged, the refreshed T-101 and T-102 drafts and U45 T-011's recorded design:
- Every component imports only `contracts`, `i18n`, `web-shared` (`@/lib/*`, `@/i18n/routing`) and server actions under `apps/web/src/server/actions/**`, and gets its data by props (FD-093 (1)).
- The shared form parts are U9's `components/patient/auth/{PasswordField,ErrorSummary,SessionsTable,ChangePasswordForm}.tsx`. U9 merges before this Unit.
- `StepUpSheet` uses U45's sheet entry motion and `data-press`, and adds no CSS and no motion rule.

The snippets below are interface-level sketches, not code to copy.

## 1. Hierarchy

```text
app/[locale]/admin/layout.tsx                 imports globals.css, admin.css; metadata noindex
│                                             SkipLink, DemoMarker, main#main > div.wrap, LiveRegion (from [locale])
├── (public)/layout.tsx                       AuthMasthead: brand, .staff-badge, ThemeControls (no nav, tabs, crumbs)
│   ├── sign-in/page.tsx                      StaffSignInForm                     (renderSignin)
│   └── approve-device/page.tsx               ApproveDevicePending | ApproveDeviceRecheck   (renderApprove)
├── (account)/layout.tsx                      guard (WF9); AuthMasthead + StaffAccountMenu
│   └── security/page.tsx                     StaffSecurity                       (renderSecurity)
└── (console)/layout.tsx                      guard (WF9); Masthead (ConsoleNav, RoleChip, StaffAccountMenu, ThemeControls),
    │                                         progress, Crumbs, TabBar, Colophon  (unchanged chrome)
    └── page.tsx, queue/**, evidence, providers, config, notifications   (moved, unchanged)

components/admin/auth/
├── StaffSignInForm.tsx        'use client' (useActionState, action staffSignIn) — works without JS
├── ApproveDevicePending.tsx   server (props from the page: label, firstSeen, devInboxUrl?)
├── ApproveDeviceRecheck.tsx   'use client' (useActionState, action approveDevice) — works without JS
├── StaffSecurity.tsx          server (props: devices, sessions), with RevokeDeviceButton (client, action revokeDevice) and U9's parts
├── RoleChip.tsx               server (prop: role, from the layout's Actor)
└── StaffAccountMenu.tsx       'use client' (opens Sheet; U8's signOut action)
components/shared/StepUpSheet.tsx   'use client': StepUpSheet + useStepUp() (action stepUp)
components/patient/auth/{PasswordField,ErrorSummary,SessionsTable,ChangePasswordForm}.tsx   (U9's, reused unchanged)
```

Imports allowed by T-010 for every file above: `@rogikotha/contracts`, `@rogikotha/i18n` (and `/format`), `@/lib/*`, `@/i18n/routing`, `components/**`, and `@/server/actions/{staff,step-up,account}`. Never `@/server/auth`, `@/server/container`, `@rogikotha/database`, `@rogikotha/adapters`, `better-auth`, `next/headers` or a Node built-in. Pages and layouts under `app/` read the Actor and the staff context through `@/server/auth` and pass plain props down.

## 2. Files

| Path | Change | In T-103's owned paths |
|---|---|---|
| `apps/web/src/app/[locale]/admin/layout.tsx` | Keep CSS, `noindex`, skip link, demo marker and `main`; move the console chrome out | yes |
| `apps/web/src/app/[locale]/admin/(public)/layout.tsx`, `(account)/layout.tsx`, `(console)/layout.tsx` | New | the task names "route groups outside the guarded segment"; the three layouts are listed in the plan (BR12.1) |
| `apps/web/src/app/[locale]/admin/(public)/sign-in/page.tsx`, `(public)/approve-device/page.tsx`, `(account)/security/page.tsx` | Replace the placeholders; move into the groups | yes |
| `apps/web/src/app/[locale]/admin/(console)/**` (`page.tsx`, `queue/page.tsx`, `queue/[code]/page.tsx`, `evidence`, `providers`, `config`, `notifications`) | Moved unchanged | **no**: listed for approval (BR12.1) |
| `apps/web/src/components/admin/auth/*.tsx` and tests | New | yes |
| `apps/web/src/components/admin/Masthead.tsx` | Add `RoleChip` and `StaffAccountMenu` in `.controls`, before `ThemeControls`; remove the `TODO(T-103)` | yes |
| `apps/web/src/components/shared/StepUpSheet.tsx` and test | New | yes |
| `apps/web/src/components/patient/auth/SecuritySettings.tsx` | No change with Q9 A (`confirm='inline'` stays); a one-line swap to `useStepUp()` only if Q9 changes | yes |
| `apps/web/src/components/patient/auth/{PasswordField,ErrorSummary,SessionsTable,ChangePasswordForm}.tsx` | Reused, unchanged (U9's) | not edited |
| `packages/i18n/messages/{en,bn}.json` | `errors.auth.deviceMismatch`, `staff.account.menu` (new); `staff.device.body` (`{minutes}`) | yes |

## 3. Components

### 3.1 `StaffSignInForm` (`/admin/sign-in`, spec §4.1)

```tsx
// props: { next?: string, locale } ; action: staffSignIn (server action)
<section className="panel" style={{ maxWidth: 480, margin: '40px auto' }}>   // inline style as the prototype
  <span className="kicker">{t('staff.signIn.kicker')}</span>
  <h1 className="display">{t('staff.signIn.title')}</h1>
  <ErrorSummary />                               // .callout.warn#auth-error-summary-signin tabindex=-1
  <form action={formAction} noValidate>
    <input type="hidden" name="next" value={next ?? ''} />
    <Field name="email" type="email" label="auth.email" autoComplete="username" />
    <PasswordField name="password" label="auth.password" autoComplete="current-password" />
    <button className="btn primary" type="submit" aria-busy={pending}>{t('staff.signIn.submit')}</button>
  </form>
  <p className="note">{t('staff.signIn.note')} <a href={`/${locale}`}>{t('brand.name')}</a></p>
</section>
```

| Result | Rendering |
|---|---|
| `auth.invalid_credentials` | summary + password field error `errors.auth.invalidCredentials` |
| `forbidden` (`staff.notStaff`) | summary + email field error `staff.notStaff` (prototype puts it on the email field) |
| `auth.account_suspended` | summary `errors.auth.accountSuspended` |
| `auth.rate_limited` | summary with the wait from `retryAfterSec` through the formatter (U9's rendering of the rate-limit copy) |
| `ok` | the action redirects (queue, `next`, or approve-device) |

Focus goes to the summary after a failed submit, to the `h1` after navigation (spec §2). Works without JavaScript (server action plus full re-render).

### 3.2 `ApproveDevicePending` (`/admin/approve-device`, no token, spec §4.2)

Server component; props `{label, firstSeen, devInboxUrl?}` from WF3. Renders `h1.display` `staff.device.title`, `<p>{t('staff.device.body', {minutes: formatNumber(30, locale)})}</p>`, a `.kv` with `auth.security.device` → label and `auth.security.firstSeen` → formatted time, and, only outside production, a `.btn.ghost.small` link to the Mailpit inbox labelled `auth.verify.devInbox` (ISS-021). No account name, no email, no resend.

### 3.3 `ApproveDeviceRecheck` (`/admin/approve-device?token=`, spec §4.2)

```tsx
<h1 className="display">{t('staff.device.recheck')}</h1>
<ErrorSummary />
<form action={formAction} noValidate>
  <input type="hidden" name="token" value={token} />
  <PasswordField name="password" label="auth.password" autoComplete="current-password" />
  <button className="btn primary" type="submit">{t('staff.device.trust')}</button>
</form>
```

The page sets `Referrer-Policy: no-referrer` (BR5.11) and renders the form without looking the token up first (the action decides; a GET never consumes or reveals anything). Errors: `errors.auth.tokenInvalid`, `errors.auth.tokenExpired`, `errors.auth.deviceMismatch`, `errors.auth.invalidCredentials`, `errors.auth.rateLimited`. After `auth.token_invalid`, `auth.token_expired` or `auth.device_mismatch` the form is replaced by the message and a `.btn.small` link to `/admin/sign-in` (no password field: retrying cannot help).

### 3.4 `StaffSecurity` (`/admin/security`, spec §4.3)

```tsx
<section className="panel" style={{ maxWidth: 640, margin: '40px auto' }}>
  <h1 className="display">{t('staff.security.title')}</h1>
  <div className="sub">
    <h4 className="sub-head">{t('staff.device.trusted')}</h4>
    <table className="kv"><thead><tr>
      <th>{t('auth.security.device')}</th><th>{t('auth.security.firstSeen')}</th><th>{t('auth.security.lastSeen')}</th><th />
    </tr></thead><tbody>
      {devices.map(d => <tr key={d.id}>
        <td>{d.label}{d.current && <> <span className="badge plain">{t('staff.device.thisDevice')}</span></>}</td>
        <td>{fmt(d.firstSeen)}</td><td>{fmt(d.lastSeen)}</td>
        <td><RevokeDeviceButton deviceId={d.id} /></td>   // .btn.small.ghost, staff.device.revoke
      </tr>)}
    </tbody></table>
  </div>
  <div className="sub"><h4 className="sub-head">{t('auth.security.sessions')}</h4>{/* U9 SessionsTable */}</div>
  <div className="sub"><h4 className="sub-head">{t('auth.security.password')}</h4>{/* U9 ChangePasswordForm */}</div>
</section>
```

`RevokeDeviceButton` is a small client form posting `revokeDevice`; on success for another device it shows `staff.device.revoked` through `useAnnounce()`; for the current device the action redirects to sign-in. Dates use the `packages/i18n` formatters (Bengali digits in `bn`). The badge class is the prototype's `badge('plain', …)` output; Code Generation copies its exact class list from `admin/app.js`.

### 3.5 `RoleChip` and `StaffAccountMenu` (masthead, spec §4)

- `RoleChip` (server): `<span className="ctl" title={t('staff.role.chipTitle', {role: t(roleKey)})}><span>{chip}</span></span>` with `chip` = `SA` / `AD` / `MO` and `roleKey` = `admin.role.sa` / `admin.role.admin` / `admin.role.mod`. Read-only: not a button, no `aria-pressed`, no handler (BR10.7).
- `RoleChip` gets `role` as a prop from the `(console)` layout, which reads the Actor through `@/server/auth`; the component imports nothing from `server/`.
- `StaffAccountMenu` (client): a `button.ctl` labelled `staff.account.menu` (visually the person glyph from the prototype's `renderStaffAccount`, inline SVG through `Icon`), opening `Sheet` titled `staff.account.menu` with a link to `/<locale>/admin/security` (`staff.security.title`) and a sign-out form (`.btn.ghost.small`, `auth.signOut`, posting U8's `signOut` server action from `@/server/actions/account`, which also deletes `rk_stepup`). It shows no name or email (the console has no "current user" line, and view models carry no email).

### 3.6 `StepUpSheet` and `useStepUp()` (spec §4.4)

```tsx
const { withStepUp, sheet } = useStepUp({ purpose: 'config.apply' });
// in a handler:
const result = await withStepUp(() => applyConfig(input));
// render: {sheet}
```

- `sheet` is `<Sheet open title={t('staff.stepUp.title')}>` containing `<p className="note">{t('staff.stepUp.body')}</p>`, one password `.field` with a Show toggle, the error line (`errors.auth.invalidCredentials`, `errors.auth.rateLimited`) and `<button className="btn primary">{t('staff.stepUp.confirm')}</button>`.
- `withStepUp(fn)`: run `fn`; if the result is `auth.step_up_required`, open the sheet and wait; on a successful `stepUp({password, purpose})` close it, clear the field and run `fn` once more; on close or Escape return the original error (BR7.8).
- Only `.overlay`, `.sheet`, `.field`, `.btn`, `.note` (both stylesheets define them), so the patient side (U39's account deletion) reuses it under `patient.css`. On the patient side the sheet gets U45's entry motion from `.sheet` and `.overlay` and its button carries `data-press`; under `admin.css` nothing moves. The component adds no CSS and no motion rule (U45 BR4.7), so `check:motion` and `contrast:patient` stay green.
- `StepUpSheet` imports the `stepUp` action from `@/server/actions/step-up` and `Sheet` from `components/shared/Sheet.tsx`; it never sees the signed cookie value (the action returns `{rechecked_at}` only).

## 4. States and accessibility

| Screen | States | Focus and announcements |
|---|---|---|
| Sign-in | idle, submitting (`aria-busy`, button disabled), error | summary focused on error; `h1` on arrival |
| Pending | one state | `h1` on arrival |
| Recheck | idle, submitting, wrong password (field error), dead token (message + link) | summary focused on error |
| Security | list, revoking, revoked (announced), empty list (cannot happen: the current device is approved) | `staff.device.revoked` through the live region |
| Step-up sheet | closed, open, submitting, error | focus to the close button on open (Sheet.tsx), back to the trigger on close; Escape closes |

Every input has a visible `label`, errors are linked with `aria-describedby` and `aria-invalid`, the Show toggle is a text button with `aria-pressed` (never an eye icon alone), and every screen completes by keyboard alone (spec §2, §6).

## 5. Copy used

All keys exist in both files except the three in `functional-spec.md` § 8. Screens: `staff.signIn.{kicker,title,submit,note}`, `staff.notStaff`, `staff.device.{title,body,recheck,trust,thisDevice,revoke,revoked,trusted}`, `staff.security.title`, `staff.stepUp.{title,body,confirm}`, `staff.role.chipTitle`, `staff.account.menu`, `admin.role.{sa,admin,mod}`, `auth.{email,password,showPassword,hidePassword,errorSummary,signOut}`, `auth.security.{device,firstSeen,lastSeen,sessions,password}`, `auth.verify.devInbox`, `errors.auth.{invalidCredentials,accountSuspended,rateLimited,tokenInvalid,tokenExpired,deviceMismatch,stepUpRequired}`.

## 6. Component tests (both locales)

- `StaffSignInForm`: renders in `en` and `bn`; each result in § 3.1 shows its message on the right field and focuses the summary; the primary button is the only `.btn.primary`.
- `ApproveDevicePending`: label and formatted time; `{minutes}` rendered as `30` in `en` and `৩০` in `bn`; no dev link when `APP_MODE=production`.
- `ApproveDeviceRecheck`: hidden token field; each error state; the dead-token states hide the password field.
- `StaffSecurity`: device rows with the this-device badge; revoke button per row; Bengali dates.
- `RoleChip`: the `title` for each of the three roles in both languages; no button role.
- `StepUpSheet`: `withStepUp` re-runs once after success, never after cancel, clears the field on close.
- All of them: rendered with props only (no server import), so the tests need no `next/headers` mock; the boundary lint covers the imports.
