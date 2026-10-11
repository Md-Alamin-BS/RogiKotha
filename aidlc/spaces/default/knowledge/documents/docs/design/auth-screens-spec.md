# Auth screens — design and behaviour spec

**Status:** Spec for FD-034 (2026-09-10). Patient screens follow Concept 04b Quiet Clinic (minimal);
staff screens follow the Chart Tray console. A prototype pass (§0) turns this spec into HTML in
`ui-design-prototype/` before T-102 and T-103 port it.
**Sources:** FR-AUTH-001–009, FD-006, FD-013, `docs/planning/01-requirement-baseline.md` "Accounts
and identity", ADR-0003, `docs/planning/ux/DESIGN.md`, `ui-design-prototype/README.md`.
**Rules that bind every screen here:** public reading never needs an account; errors never rely on
colour alone; no time-pressure traps; anti-enumeration (the app never confirms whether an email is
registered); both locales equal; no emoji as icon; the write CTA stays the single accent-filled control
in the patient chrome, so sign-in controls are outline/ghost.

## 0. Prototype pass (design task, before implementation)

Add to `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`: views `register`, `signin`,
`verify`, `reset`, `security` with hash routes `#register`, `#sign-in`, `#verify-email`,
`#reset-password`, `#me/security`; a signed-in/out toggle in the demo panel that swaps the masthead
account entry (§1). Add to `ui-design-prototype/admin/`: `#sign-in`, `#approve-device`, `#security`
and the password-recheck sheet. Reuse existing classes (`.panel`, `.field`, `.callout`, `.btn`,
`.opt-row`, `.kv`, `.restricted`); add strings to `shared/rogikotha-data.js` under the `auth.*` and
`staff.*` namespaces exactly as listed in §5. Run `npm run check` and
`npx impeccable detect ui-design-prototype/ --no-advisory`. Reviewer (founder) walks all screens in
both languages and both themes; then T-102/T-103 port them.

## 1. Masthead account entry (patient)

Position: in `.controls`, left of the `অ` language control. It is a `.ctl` (36×36 circle) — never an
accent fill.

| State | Control | Menu (a `.sheet` on mobile, a small popover panel ≥ 760 px) |
|---|---|---|
| Signed out | `.ctl` with a person glyph (inline SVG circle + shoulders), `title = auth.signIn` | none — navigates to `/sign-in?next=<current>` |
| Signed in, unverified | `.ctl` shows initials (`initials()` from prototype) with a small dot (`--warn-ink`) | items: **Confirm your email** (`auth.verifyPending`), Me, Saved, Notifications, Security, Sign out |
| Signed in, verified | `.ctl` with initials on `--accent-soft` | Me, Saved, Notifications (with unread count in `.count`), Security, Sign out |
| Staff | same as verified plus **Staff console** (`nav.admin`) | |

The write CTA (`.cta-write`) remains visible for everyone; clicking it signed out lands on `/write`
which shows the callout in §3.7.

## 2. Shared form rules

- Layout: `<section class="a-head">` kicker + `h1.display` + `.lede`, then one `.panel` at `max-width: 560px`, centred. Fields use `.field > label + input` with `.sub` for hints and a `.req` marker on required labels (exactly the composer's pattern).
- Errors: a `.callout warn` **summary** at the top of the panel listing every problem as links to the field, plus inline `<p class="field-error" id="err-<name>">` under the field, with `aria-describedby` and `aria-invalid="true"` on the input. Text, not colour, carries meaning (each starts with the field name).
- Password fields have a **Show** toggle button (`.link-btn`, `aria-pressed`) — never an eye icon alone. Minimum length 10; hint reads "At least 10 characters. A sentence you will remember works well." No strength meter.
- Buttons: primary `.btn` (outline style is the 04b default for forms; the accent fill is reserved for the write CTA), secondary `.link-btn`. Submitting sets `aria-busy` and disables double-submit.
- Every screen has `metadata.robots = noindex`, the persistent `disclaimer.short` in the colophon as everywhere else, and works without JavaScript (server action + full-page re-render).
- Focus goes to the summary callout after a failed submit, to the `h1` after navigation.

## 3. Patient screens (04b)

### 3.1 `/register` — Create an account

Kicker `auth.kicker` · H1 `auth.register.title` · lede `auth.register.lede`.

Fields, in order:

| Field | Type | Validation (client + server) | Hint |
|---|---|---|---|
| Email | `email`, required | valid format | — |
| Password | `password`, required, Show toggle | ≥ 10 chars; not equal to email | `auth.passwordHint` |
| Username | `text`, required, `autocapitalize=off` | 3–24, `[a-z0-9_]`, unique; shown as `@name` preview under the field | `auth.usernameHint` (permanent; appears on public accounts unless anonymous) |
| Display name | `text`, required | 1–60 chars | `auth.displayNameHint` (can change later) |
| Interface language | `.opt-row` with two `.opt` buttons (radio semantics `role=radiogroup`), default = current locale | — | — |
| Age confirmation | checkbox, required | must be checked | `auth.ageLabel` |
| Terms and privacy | checkbox, required, label contains links to `/terms` and `/privacy` | must be checked | `auth.termsLabel` |

Submit `auth.register.submit`. Below: "Already have an account? Sign in" (`auth.haveAccount`).

Result: **always** navigate to `/verify-email` (pending state) with the email echoed. If the email was
already registered, the same screen appears and the existing owner receives a security email
("Someone tried to create an account with your email"). Username conflict is a real error (usernames
are public, so enumeration is not a concern): `auth.username_taken`.

### 3.2 `/verify-email` — Confirm your email

Two states on one route.

**Pending** (no token): panel with `auth.verify.title`, body `auth.verify.body` with the email in `<b>`,
a `.callout` "Link expires in 24 hours" (`auth.verify.expires`), buttons: **Resend** (`.btn small`,
rate-limited: after a hit show `auth.rate_limited` with retry-after minutes), **Open my inbox** (dev
only: a link to `http://localhost:8025` shown when `APP_MODE != production`, labelled
`auth.verify.devInbox`). Signed-in-but-unverified users see this same panel as a banner on `/write`
and `/me`.

**Confirmed** (`?token=`): server verifies; success → the user is signed in and redirected to
`/me?welcome=1` where `/me` shows a `.callout` `auth.verify.done`. Expired/invalid → panel with
`auth.verify.expired` and the Resend button.

### 3.3 `/sign-in` — Sign in

Kicker `auth.kicker` · H1 `auth.signIn.title` · lede `auth.signIn.lede` ("Reading never needs an
account. Signing in lets you write, react and follow your own accounts.").

Fields: Email; Password (Show). Links under the panel: **Forgot your password?**
(`auth.forgot`), **Create an account** (`auth.noAccount`). Submit `auth.signIn.submit`.

Errors: one generic message for wrong email or password (`auth.invalid_credentials`: "That email and
password don't match anything we have."); after repeated failures the rate limiter returns
`auth.rate_limited` ("Too many attempts. Try again in {minutes} minutes.") — never "account locked".
Suspended/banned accounts get `auth.account_suspended` with the appeal route.

After sign-in: redirect to `next` if it is a same-origin path, else `/me`. Sessions last up to 30 days.

### 3.4 `/reset-password` — Reset your password

**Request** (no token): Email field; submit `auth.reset.submit`; result is always the neutral panel
`auth.reset.sent` ("If that email has an account, a reset link is on its way. It expires in 1 hour.").

**Set** (`?token=`): New password (Show) + Confirm new password; submit `auth.reset.setSubmit`.
Success → `auth.reset.done` callout on `/sign-in` ("Password changed. You have been signed out
everywhere; sign in again."). Expired → `auth.token_expired` with a link to request again.

### 3.5 Sign out

`POST /sign-out` server action from the account menu. Clears session + `rk_staff_device` is **kept**
(device trust is separate from session). Redirect to the current public page or `/`.

### 3.6 `/me/security` — Security

Part of the workspace (`workspaceNav()` gets a fifth link `auth.security.nav`). Sections, each a
`.sub` inside one `.panel`:

1. **Email** — shows the address and verified state; no change-email in Phase 1 (note `auth.security.emailNote`).
2. **Password** — Current password, New password (Show), Confirm; submit `auth.security.changePassword`. Success revokes all *other* sessions and shows `auth.security.passwordChanged`.
3. **Where you're signed in** — a `.kv` table: device label (browser family + OS from UA), first seen, last seen, `auth.security.thisDevice` badge for the current session. Button **Sign out everywhere** (`auth.security.signOutAll`, `.btn small`), which asks for the password inline (step-up), then revokes all sessions including this one and redirects to `/sign-in`.
4. **Your data** — links to the export/delete controls that already exist in `/me` (`user2.data`).

### 3.7 Gates on contribution actions

- `/write` signed out: keep the existing `.callout warn signin-note`, but its body becomes
  `auth.gate.writeBody` ("Sign in with a confirmed account to publish. You can read everything
  without one.") with two `.btn small` buttons: **Sign in** → `/sign-in?next=/write`, **Create an
  account** → `/register`. The form below is **not** rendered for signed-out visitors (production
  behaviour; there is no local-only draft).
- `/write` signed in but unverified: the §3.2 pending banner; the form renders but Publish is
  disabled with `auth.gate.verifyToPublish`; drafts save.
- Comment box, reactions, bookmark, report, claim: signed out → the control renders and on activation
  opens a small sheet `auth.gate.title` / `auth.gate.body` with the same two buttons (no redirect
  surprise). Unverified → `auth.gate.verifyToAct`.

## 4. Staff screens (Chart Tray)

All under `/admin/*`, `noindex`, own layout, `.staff-badge` in the masthead as today. There is **no
register link** anywhere in the console; staff accounts are created by a Super Admin (seeded for the
demo). The role switcher `#role` control in the masthead is replaced by a read-only role chip showing
the signed-in role (`SA` / `AD` / `MO`, `title = admin.role.<role>`).

### 4.1 `/admin/sign-in`

Page plane; one raised `.panel` at `max-width: 480px`; kicker `staff.signIn.kicker` ("Staff console"),
H1 `staff.signIn.title`. Fields: Email, Password (Show). Submit is the console's single solid accent
`.btn primary` (`staff.signIn.submit`) — in the console the primary fill *is* the form's commit
action, unlike the patient side. Below: `staff.signIn.note` in `.note` ("Staff only. If you are
looking for RogiKotha, go to the public site.") with a link to `/`.

Non-staff credentials: sign-in succeeds as a normal user? **No** — on this route a non-staff account
gets `staff.notStaff` ("This account has no staff role.") and is *not* signed in here. Wrong
credentials: same generic error and rate limit as §3.3.

### 4.2 New-device approval

After credentials pass, the server checks the `rk_staff_device` cookie against `staff_devices`.

- **Known, approved device** → session created → `/admin/queue`.
- **Unknown device** → no session yet. A `staff_devices` row + approval token are created and an
  email `email.staff.deviceApproval` is sent. Redirect to `/admin/approve-device` (pending):
  `.panel` with H1 `staff.device.title` ("Approve this device"), body `staff.device.body` ("We sent
  an approval link to your staff email. It expires in 30 minutes. Open it on this device."), a
  read-only `.kv` with device label + time, and the dev-only inbox link. No resend button (rate
  limits; the human can re-run sign-in).
- **Link opened** (`/admin/approve-device?token=`): the `.panel` asks for the **password again**
  (`staff.device.recheck`, "Confirm your password to trust this device"), Show toggle, primary
  **Trust this device** (`staff.device.trust`). Success → device `approved_at` set, session created,
  audit `account:<id>` action `staff_device_approved`, security notification to the account →
  `/admin/queue`. Wrong password three times → token invalidated (`auth.token_invalid`).

### 4.3 `/admin/security`

Reached from the role chip's menu. One page: **Trusted devices** (`.kv` table: label, first/last
seen, `staff.device.thisDevice`, a `.btn small ghost` **Revoke** per row → `staff.revokeDevice`),
**Sessions** (same as §3.6 item 3), **Password** (same as §3.6 item 2). Revoking the current device
signs out.

### 4.4 Password recheck sheet (step-up)

Used by: config apply/rollback, reporter reveal, original evidence access, retention bulk execute,
role changes, account deletion (patient side reuses the same component in 04b styling).

Behaviour: the action button opens `.overlay > .sheet` titled `staff.stepUp.title` ("Confirm your
password") with body `staff.stepUp.body` ("This action is logged. Enter your password to continue —
you won't be asked again for five minutes."), one Password field (Show), primary `staff.stepUp.confirm`.
On success the original action re-submits automatically. The audit row for the action carries
`step_up: true`.

## 5. Copy — every string, both languages

Namespace `auth.*` (patient) and `staff.*` (console), plus `email.*`. Bengali numerals are applied by
the formatter, not in the strings.

| Key | en | bn |
|---|---|---|
| `auth.kicker` | Your account | আপনার অ্যাকাউন্ট |
| `auth.signIn` | Sign in | সাইন ইন |
| `auth.signOut` | Sign out | সাইন আউট |
| `auth.register.title` | Create an account | অ্যাকাউন্ট খুলুন |
| `auth.register.lede` | You only need an account to write, react or comment. Reading is open to everyone. | লিখতে, প্রতিক্রিয়া জানাতে বা মন্তব্য করতেই কেবল অ্যাকাউন্ট লাগে। পড়া সবার জন্য উন্মুক্ত। |
| `auth.register.submit` | Create account | অ্যাকাউন্ট তৈরি করুন |
| `auth.email` | Email | ইমেইল |
| `auth.password` | Password | পাসওয়ার্ড |
| `auth.passwordHint` | At least 10 characters. A sentence you will remember works well. | কমপক্ষে ১০ অক্ষর। মনে রাখার মতো একটি বাক্য ভালো কাজ করে। |
| `auth.showPassword` | Show | দেখান |
| `auth.hidePassword` | Hide | লুকান |
| `auth.username` | Username | ইউজারনেম |
| `auth.usernameHint` | 3–24 letters, numbers or underscores. This is permanent and appears on your public accounts unless you choose to be anonymous. | ৩–২৪টি অক্ষর, সংখ্যা বা আন্ডারস্কোর। এটি স্থায়ী এবং বেনামী না হলে আপনার প্রকাশিত অভিজ্ঞতায় দেখা যাবে। |
| `auth.displayName` | Display name | প্রদর্শিত নাম |
| `auth.displayNameHint` | How your name appears. You can change it later. | আপনার নাম যেভাবে দেখা যাবে। পরে বদলাতে পারবেন। |
| `auth.language` | Interface language | ইন্টারফেসের ভাষা |
| `auth.ageLabel` | I confirm that I am 18 or older. | আমি নিশ্চিত করছি যে আমার বয়স ১৮ বা তার বেশি। |
| `auth.termsLabel` | I accept the {terms} and the {privacy}. | আমি {terms} ও {privacy} মেনে নিচ্ছি। |
| `auth.termsLink` | Terms | শর্তাবলি |
| `auth.privacyLink` | Privacy Policy | গোপনীয়তা নীতি |
| `auth.haveAccount` | Already have an account? Sign in | আগে থেকেই অ্যাকাউন্ট আছে? সাইন ইন করুন |
| `auth.noAccount` | New here? Create an account | নতুন? অ্যাকাউন্ট খুলুন |
| `auth.forgot` | Forgot your password? | পাসওয়ার্ড ভুলে গেছেন? |
| `auth.errorSummary` | Please check the following | নিচের বিষয়গুলো দেখে নিন |
| `auth.verify.title` | Confirm your email | আপনার ইমেইল নিশ্চিত করুন |
| `auth.verify.body` | We sent a confirmation link to {email}. Open it to finish creating your account. | আমরা {email}-এ একটি নিশ্চিতকরণ লিংক পাঠিয়েছি। অ্যাকাউন্ট তৈরি শেষ করতে সেটি খুলুন। |
| `auth.verify.expires` | The link expires in 24 hours. You can ask for a new one at any time. | লিংকটি ২৪ ঘণ্টায় মেয়াদোত্তীর্ণ হবে। যেকোনো সময় নতুন একটি চাইতে পারেন। |
| `auth.verify.resend` | Send a new link | নতুন লিংক পাঠান |
| `auth.verify.resent` | A new link is on its way. | নতুন লিংক পাঠানো হয়েছে। |
| `auth.verify.devInbox` | Open the local inbox (development only) | লোকাল ইনবক্স খুলুন (শুধু ডেভেলপমেন্ট) |
| `auth.verify.done` | Your email is confirmed. You can now write and take part. | আপনার ইমেইল নিশ্চিত হয়েছে। এখন লিখতে ও অংশ নিতে পারবেন। |
| `auth.verify.expired` | That link has expired or was already used. Ask for a new one below. | লিংকটির মেয়াদ শেষ বা আগেই ব্যবহার হয়েছে। নিচে নতুন একটি চান। |
| `auth.verifyPending` | Confirm your email | ইমেইল নিশ্চিত করুন |
| `auth.signIn.title` | Sign in | সাইন ইন |
| `auth.signIn.lede` | Reading never needs an account. Signing in lets you write, react and follow your own accounts. | পড়তে কখনো অ্যাকাউন্ট লাগে না। সাইন ইন করলে লিখতে, প্রতিক্রিয়া জানাতে ও নিজের লেখা অনুসরণ করতে পারবেন। |
| `auth.signIn.submit` | Sign in | সাইন ইন করুন |
| `auth.reset.title` | Reset your password | পাসওয়ার্ড রিসেট করুন |
| `auth.reset.lede` | Enter your email and we will send a link to choose a new password. | আপনার ইমেইল দিন, নতুন পাসওয়ার্ড বেছে নেওয়ার লিংক পাঠাব। |
| `auth.reset.submit` | Send reset link | রিসেট লিংক পাঠান |
| `auth.reset.sent` | If that email has an account, a reset link is on its way. It expires in 1 hour. | ওই ইমেইলে অ্যাকাউন্ট থাকলে রিসেট লিংক পাঠানো হচ্ছে। এটি ১ ঘণ্টায় মেয়াদোত্তীর্ণ হবে। |
| `auth.reset.newPassword` | New password | নতুন পাসওয়ার্ড |
| `auth.reset.confirmPassword` | Confirm new password | নতুন পাসওয়ার্ড আবার দিন |
| `auth.reset.setSubmit` | Change password | পাসওয়ার্ড বদলান |
| `auth.reset.done` | Password changed. You have been signed out everywhere; sign in again. | পাসওয়ার্ড বদলানো হয়েছে। সব জায়গা থেকে সাইন আউট করা হয়েছে; আবার সাইন ইন করুন। |
| `auth.reset.mismatch` | The two passwords do not match. | দুটি পাসওয়ার্ড মিলছে না। |
| `auth.security.nav` | Security | নিরাপত্তা |
| `auth.security.title` | Security | নিরাপত্তা |
| `auth.security.email` | Email | ইমেইল |
| `auth.security.emailNote` | Changing your email is not available yet. | ইমেইল বদলানো এখনো চালু হয়নি। |
| `auth.security.verified` | Confirmed | নিশ্চিত |
| `auth.security.unverified` | Not confirmed | নিশ্চিত হয়নি |
| `auth.security.password` | Password | পাসওয়ার্ড |
| `auth.security.currentPassword` | Current password | বর্তমান পাসওয়ার্ড |
| `auth.security.changePassword` | Change password | পাসওয়ার্ড বদলান |
| `auth.security.passwordChanged` | Password changed. Other devices have been signed out. | পাসওয়ার্ড বদলানো হয়েছে। অন্য ডিভাইসগুলো সাইন আউট করা হয়েছে। |
| `auth.security.sessions` | Where you're signed in | যেসব জায়গায় সাইন ইন আছেন |
| `auth.security.device` | Device | ডিভাইস |
| `auth.security.firstSeen` | First seen | প্রথম দেখা |
| `auth.security.lastSeen` | Last seen | শেষ দেখা |
| `auth.security.thisDevice` | This device | এই ডিভাইস |
| `auth.security.signOutAll` | Sign out everywhere | সব জায়গা থেকে সাইন আউট |
| `auth.security.signOutAllNote` | This signs out every device, including this one. | এতে এই ডিভাইসসহ সব ডিভাইস সাইন আউট হবে। |
| `auth.gate.title` | Sign in to take part | অংশ নিতে সাইন ইন করুন |
| `auth.gate.body` | Reactions, comments, bookmarks and reports need a confirmed account so they stay accountable. Reading does not. | প্রতিক্রিয়া, মন্তব্য, বুকমার্ক ও রিপোর্ট দায়বদ্ধ রাখতে নিশ্চিত অ্যাকাউন্ট লাগে। পড়তে লাগে না। |
| `auth.gate.writeBody` | Sign in with a confirmed account to publish. You can read everything without one. | প্রকাশ করতে নিশ্চিত অ্যাকাউন্ট দিয়ে সাইন ইন করুন। অ্যাকাউন্ট ছাড়াই সব পড়তে পারবেন। |
| `auth.gate.verifyToPublish` | Confirm your email to publish. Your draft is saved. | প্রকাশ করতে ইমেইল নিশ্চিত করুন। আপনার খসড়া সংরক্ষিত আছে। |
| `auth.gate.verifyToAct` | Confirm your email to do this. | এটি করতে ইমেইল নিশ্চিত করুন। |
| `auth.gate.register` | Create an account | অ্যাকাউন্ট খুলুন |
| `errors.auth.invalidCredentials` | That email and password don't match anything we have. | ওই ইমেইল ও পাসওয়ার্ড আমাদের কিছুর সঙ্গে মিলছে না। |
| `errors.auth.rateLimited` | Too many attempts. Try again in {minutes} minutes. | অনেকবার চেষ্টা হয়েছে। {minutes} মিনিট পর আবার চেষ্টা করুন। |
| `errors.auth.tokenInvalid` | That link is not valid. | লিংকটি বৈধ নয়। |
| `errors.auth.tokenExpired` | That link has expired. | লিংকটির মেয়াদ শেষ। |
| `errors.auth.passwordTooShort` | Password: use at least 10 characters. | পাসওয়ার্ড: কমপক্ষে ১০ অক্ষর দিন। |
| `errors.auth.usernameTaken` | Username: that one is taken. | ইউজারনেম: এটি আগেই নেওয়া হয়েছে। |
| `errors.auth.usernameInvalid` | Username: use 3–24 lowercase letters, numbers or underscores. | ইউজারনেম: ৩–২৪টি ছোট হাতের অক্ষর, সংখ্যা বা আন্ডারস্কোর দিন। |
| `errors.auth.ageRequired` | Age: you must confirm that you are 18 or older. | বয়স: আপনাকে নিশ্চিত করতে হবে যে আপনার বয়স ১৮ বা তার বেশি। |
| `errors.auth.termsRequired` | Terms: you must accept the Terms and the Privacy Policy. | শর্তাবলি: শর্তাবলি ও গোপনীয়তা নীতি মেনে নিতে হবে। |
| `errors.auth.emailUnverified` | Confirm your email first. | আগে ইমেইল নিশ্চিত করুন। |
| `errors.auth.accountSuspended` | This account is suspended. You can appeal from your workspace. | এই অ্যাকাউন্ট স্থগিত। আপনার ওয়ার্কস্পেস থেকে আপিল করতে পারেন। |
| `errors.auth.stepUpRequired` | Confirm your password to continue. | চালিয়ে যেতে পাসওয়ার্ড নিশ্চিত করুন। |
| `staff.signIn.kicker` | Staff console | স্টাফ কনসোল |
| `staff.signIn.title` | Sign in | সাইন ইন |
| `staff.signIn.submit` | Sign in | সাইন ইন করুন |
| `staff.signIn.note` | Staff only. Looking for RogiKotha? Go to the public site. | শুধু স্টাফের জন্য। রোগীকথা খুঁজছেন? পাবলিক সাইটে যান। |
| `staff.notStaff` | This account has no staff role. | এই অ্যাকাউন্টের কোনো স্টাফ ভূমিকা নেই। |
| `staff.device.title` | Approve this device | এই ডিভাইস অনুমোদন করুন |
| `staff.device.body` | We sent an approval link to your staff email. It expires in 30 minutes. Open it on this device. | আপনার স্টাফ ইমেইলে অনুমোদনের লিংক পাঠিয়েছি। এটি ৩০ মিনিটে মেয়াদোত্তীর্ণ হবে। এই ডিভাইসেই সেটি খুলুন। |
| `staff.device.recheck` | Confirm your password to trust this device | এই ডিভাইস বিশ্বাস করতে পাসওয়ার্ড নিশ্চিত করুন |
| `staff.device.trust` | Trust this device | এই ডিভাইস বিশ্বাস করুন |
| `staff.device.thisDevice` | This device | এই ডিভাইস |
| `staff.device.revoke` | Revoke | বাতিল করুন |
| `staff.device.revoked` | Device revoked. | ডিভাইস বাতিল করা হয়েছে। |
| `staff.device.trusted` | Trusted devices | বিশ্বস্ত ডিভাইস |
| `staff.security.title` | Security | নিরাপত্তা |
| `staff.stepUp.title` | Confirm your password | পাসওয়ার্ড নিশ্চিত করুন |
| `staff.stepUp.body` | This action is logged. Enter your password to continue — you won't be asked again for five minutes. | এই কাজটি লগ করা হয়। চালিয়ে যেতে পাসওয়ার্ড দিন — পাঁচ মিনিটের মধ্যে আবার জিজ্ঞাসা করা হবে না। |
| `staff.stepUp.confirm` | Continue | চালিয়ে যান |
| `staff.role.chipTitle` | Signed in as {role} | {role} হিসেবে সাইন ইন |
| `email.verify.subject` | Confirm your RogiKotha email | আপনার রোগীকথা ইমেইল নিশ্চিত করুন |
| `email.verify.body` | Open this link within 24 hours to confirm your email: {link} | ইমেইল নিশ্চিত করতে ২৪ ঘণ্টার মধ্যে এই লিংক খুলুন: {link} |
| `email.reset.subject` | Reset your RogiKotha password | আপনার রোগীকথা পাসওয়ার্ড রিসেট করুন |
| `email.reset.body` | Someone asked to reset the password for this email. If it was you, open this link within 1 hour: {link}. If not, you can ignore this message. | কেউ এই ইমেইলের পাসওয়ার্ড রিসেট করতে চেয়েছে। আপনি হলে ১ ঘণ্টার মধ্যে এই লিংক খুলুন: {link}। না হলে এই বার্তা উপেক্ষা করতে পারেন। |
| `email.existing.subject` | Someone tried to register with your email | কেউ আপনার ইমেইল দিয়ে নিবন্ধন করতে চেয়েছে |
| `email.existing.body` | An account with this email already exists. If that was you, sign in instead: {link}. If not, no action is needed. | এই ইমেইলে আগে থেকেই অ্যাকাউন্ট আছে। আপনি হলে সাইন ইন করুন: {link}। না হলে কিছু করার দরকার নেই। |
| `email.security.passwordChanged.subject` | Your RogiKotha password was changed | আপনার রোগীকথা পাসওয়ার্ড বদলানো হয়েছে |
| `email.security.passwordChanged.body` | Your password was changed and other devices were signed out. If this wasn't you, reset your password now: {link} | আপনার পাসওয়ার্ড বদলানো হয়েছে এবং অন্য ডিভাইসগুলো সাইন আউট করা হয়েছে। আপনি না হলে এখনই পাসওয়ার্ড রিসেট করুন: {link} |
| `email.staff.deviceApproval.subject` | Approve a new device for the staff console | স্টাফ কনসোলের জন্য নতুন ডিভাইস অনুমোদন করুন |
| `email.staff.deviceApproval.body` | A sign-in to the staff console was attempted from a device we haven't seen. If that was you, open this link on that device within 30 minutes: {link}. If not, tell the Super Admin. | অপরিচিত একটি ডিভাইস থেকে স্টাফ কনসোলে সাইন ইনের চেষ্টা হয়েছে। আপনি হলে ৩০ মিনিটের মধ্যে ওই ডিভাইসে এই লিংক খুলুন: {link}। না হলে সুপার অ্যাডমিনকে জানান। |

Emails are plain text, one link, no content from the platform (AD-13). The `{link}` is absolute
(`APP_URL`).

## 6. Acceptance for T-102 / T-103

- Register → Mailpit shows the mail → link confirms → `/me` welcome; repeating the registration with the same email shows the identical pending screen and Mailpit shows the "someone tried" mail.
- Sign-in with wrong password 6× → rate limited message with minutes; the 7th attempt with the right password is also refused until the window passes.
- Reset flow end to end; the old session is dead after reset.
- `/me/security` lists two sessions from two browsers; "Sign out everywhere" kills both.
- Staff: first console sign-in on a fresh browser → approval mail → link → password → console; second sign-in on the same browser → straight in; after revoking the device from `/admin/security` → approval required again.
- Every screen: keyboard-only completion, screen-reader summary announced, both locales, both themes, 360 px width, `impeccable detect` clean.
