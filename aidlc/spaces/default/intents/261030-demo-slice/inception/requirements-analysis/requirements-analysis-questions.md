# Requirements Analysis — clarifying questions (demo slice)

The owner's standing instruction (2026-10-29) is "don't ask any questions to me, just approve what you think best and recommended". Each answer below is the recommended option, decided by the agent under that instruction and listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`.

## Question 1
New accounts start as `pending_verification`. How does a demo user become active?

A. Skip email verification in the demo slice: registration creates an active account and signs the user in (recommended; FD-099 leaves verification out)
B. Send a verification email through Mailpit and activate on the link
C. Activate accounts by hand from the seed
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 2
Which files can be attached to an experience?

A. JPEG and PNG images up to 10 MB each, at most 5 per experience, matching FD-036 and the database checks (recommended)
B. Also PDF, which needs a new FD entry and a schema change
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 3
How are attachments scanned, and what does the public see?

A. The web server scans each file with the compose ClamAV right after upload. A clean file becomes `ready`. If the scan fails or ClamAV cannot be reached, the file stays `quarantined` and never counts as attached (fail closed). The public sees only "Documents attached — not medically validated" with the count of ready files, never the files themselves; the author sees their own file list (recommended)
B. Run the full worker pipeline with redaction and published derivatives (T-304/T-305 scope)
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 4
What can a user change on their profile?

A. Display name and preferred language. A display-name change creates a new named persona, so old content keeps the old name (the persona rule in `schema/identity.ts`) (recommended)
B. Also username, avatar and bio
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 5
What does writing an experience ask for?

A. The quick-review form: doctor (a seeded doctor), relationship, month and year, title, body, optional sentiment and outcome, named or pseudonymous identity, and the attestation tick. It publishes at once, and the author can edit title, body, sentiment and outcome later; each edit writes a `review_versions` row (recommended)
B. The full detailed wizard with sections, claims, drafts and a privacy preview (T-306 scope)
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 6
Who can comment, and how?

A. Any signed-in user comments on a published experience, with one reply level as the schema enforces. Comments show the commenter's persona name and the date. The author can delete their own comment (recommended)
B. Also mentions, reactions and reports
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 7
How is the slice built against the architecture?

A. Server-side code in `apps/web/src/server/**` (server actions and queries) calls small repository functions in `packages/database`, inside T-010's boundary rules. Better Auth runs email and password with the same Argon2id parameters as the seed, so seeded users can sign in. A small AES-256-GCM helper encrypts the encrypted columns with `APP_ENCRYPTION_KEY` (recommended)
B. The full layered build (ports, commands, fakes) from T-101's design
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)
