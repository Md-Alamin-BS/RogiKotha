# Requirements — demo slice (`261030-demo-slice`)

## Intent analysis

The owner needs a site that visibly works for the demo, the same day (FD-099). A patient can join and sign in, look after their profile, write an experience about a doctor, attach documents to it, and see another user comment on it. These are the common flows that make the site look running and real. Everything else waits for the full release plan (intent `261011-aidlc-adoption`), which is paused.

Sources: the owner's request of 2026-10-30, the code knowledge base `aidlc/spaces/default/codekb/rogikotha/` (rescanned 2026-10-30), and the answers in `requirements-analysis-questions.md` (Q1–Q7).

## Functional requirements

### FR1 Account: register, sign in, sign out
- **FR1.1** Register with email, password (at least 10 characters), username (3–24 chars, `[a-z0-9_]`) and display name, confirming age and terms. The account is active at once and the user is signed in (Q1). Registering with an email that is already used shows a neutral message and creates nothing.
- **FR1.2** Sign in with email and password; a wrong email or password shows one neutral message. The 45 seeded patients sign in with their seeded password (Argon2id, Q7).
- **FR1.3** Sign out ends the session.
- **FR1.4** The masthead account control shows whether the user is signed in, and links to the profile or the sign-in page.

### FR2 Profile
- **FR2.1** `/me` shows the signed-in user's display name, username, preferred language, and their own experiences with links.
- **FR2.2** The user changes their display name. A change creates a new named persona, so content written before keeps the old name (Q4).
- **FR2.3** The user changes their preferred language; the site then opens in that language.

### FR3 Doctors
- **FR3.1** `/doctors` lists the seeded doctors in a neutral order (most accounts, then name), each showing "Registration not verified" and its count of published experiences.
- **FR3.2** `/doctors/[id]` shows the doctor's profile and the published experiences about them, most recent first, plus a "Write about this doctor" link.

### FR4 Write and edit an experience
- **FR4.1** `/write` (signed in only; signed-out users are sent to sign in) offers the quick-review form: doctor, relationship, month and year, title, body, optional sentiment and outcome, named or pseudonymous identity, and the attestation tick (Q5). Submitting publishes the experience and opens its page.
- **FR4.2** The author edits title, body, sentiment and outcome of their own experience. Each edit writes a `review_versions` row and the page shows "Edited". No one else can edit it.
- **FR4.3** Validation errors show next to the field, in the active language.

### FR5 Attach documents
- **FR5.1** On their own experience the author attaches JPEG or PNG images: at most 10 MB each, at most 5 per experience (Q2).
- **FR5.2** Each file is scanned with ClamAV right after upload. Clean files become `ready`. If the scan fails or ClamAV is unreachable, the file stays `quarantined`; it is never shown or counted, and the author sees "Scan pending" (fail closed, Q3).
- **FR5.3** The public experience page shows "Documents attached — not medically validated" with the number of ready files, and never the files or their names. The author sees their own file list.

### FR6 Comments
- **FR6.1** `/experiences/[id]` shows the experience, its comments (oldest first, with one reply level), and a comment form for signed-in users.
- **FR6.2** A signed-in user posts a comment or a reply (1–2000 characters). It appears with their persona name and date.
- **FR6.3** A commenter deletes their own comment. A deleted comment that has replies shows as a tombstone.

### FR7 Home
- **FR7.1** `/` shows the most recent published experiences with their doctor, and links to doctors and to writing.

## Non-functional requirements

- **NFR1 Bilingual.** Every user-facing string exists in `en.json` and `bn.json`; numerals follow the active language; no capital-letter transform in Bengali.
- **NFR2 Hard rules.** No star rating, score or number standing for quality. A missing value reads "Not provided". Every doctor shows "Registration not verified". The evidence wording is exactly "Documents attached — not medically validated". The demo marker, the disclaimer and the emergency guidance stay visible.
- **NFR3 Security.** Passwords are hashed with Argon2id. The session cookie is httpOnly, sameSite=lax and secure in production. Every write checks the signed-in user and ownership on the server. File type is checked by content (magic bytes), not by name. Originals are stored outside the public web root. Encrypted columns use AES-256-GCM with `APP_ENCRYPTION_KEY`. No email or password reaches logs or view models.
- **NFR4 Quality gate.** `pnpm check` (eleven steps, 80% line floor per package) and `pnpm smoke` stay green. Each requirement has at least one test at the narrowest level (express Minimal strategy).
- **NFR5 Look.** The pages use the FD-091 patient design and the prototype's markup and class names (`ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`) for these views.
- **NFR6 Synthetic data.** Only the seeded fictional records and demo accounts; nothing real.

## Constraints

- Brownfield: Next 16.3.4, React 19.3, PostgreSQL 18, Drizzle, Better Auth 1.7.x, the existing schema and seed. Plain CSS with no animation library (FD-032, FD-091).
- T-010's boundary rules: `apps/web/src/server/**` may import `database`, `contracts`, `application` and `i18n`; components never import `database`.
- Local demo only (`pnpm infra:up`, `pnpm demo`).

## Assumptions

- Email verification is skipped for the demo (Q1, FD-099). Accounts are active on registration.
- Only images are attached (Q2, FD-036).
- No redaction or published derivatives in the slice (Q3); the public sees only the note and the count.

## Out of scope

Email verification and password reset, sign-in rate limits and lockouts, the mail worker, session lists, drafts and the detailed wizard, the privacy preview and redaction, facility reviews, mentions, reactions, reports and moderation, notifications, search, saved items, the staff console, export and deletion, and the PWA (FD-099).

## Open questions

None. Q1–Q7 are decided, and the owner can change any of them in the review queue.
