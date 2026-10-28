# T-106 — Phase 1 validation: auth, staff access, identity, configuration (cross-vendor)

| Field | Value |
|---|---|
| Story | STORY-AUTH-001, STORY-AUTH-002, STORY-IDENT-001, STORY-ADMIN-001 (validation gate) |
| Phase / Lane | 1 / — (separate session, other vendor than the implementer of the majority of T-101–T-105) |
| Class → model | M4 → GPT-5.6 Sol if Opus 5 implemented (else Claude Opus 5); optional final read by Fable 5.1; **human approval required** |
| Effort setting | high (Sol) / xhigh (Opus) |
| Estimate | 3–4 h agent; human 1 h |
| Depends on | T-101, T-102, T-103, T-104, T-105 all merged into `main` |
| Parallel-safe with | T-201, T-202, T-203, T-207 (read-only task; adds tests only under `docs/validation/` and `apps/web/e2e/phase1/`) |

## Goal

Independently prove the Phase 1 security and privacy claims on the real stack (compose PostgreSQL + Mailpit), by running the negative matrix below, reading the actual diffs, and writing `docs/validation/PHASE-1.md` with a verdict. This is the AD-16 gate for the M3 work; nothing in Phase 3+ that touches identity or evidence starts before it is PASS or PASS WITH FOLLOW-UP with named owners.

## Read first

1. `docs/implementation/README.md` §4 (validator prompt and record format).
2. `docs/planning/10-validation-strategy.md` "Verdict contract" and "Authentication and identity".
3. `docs/planning/07-agent-model-assignment.md` risk-based requirements.
4. The five task files T-101…T-105 including their hand-off sections and threat notes; the five `docs/validation/T-10x.md` records (they exist per task; this task validates the phase as a whole).
5. `docs/implementation/01-conventions.md` §2, §5, §11, §14.
6. `docs/design/auth-screens-spec.md` §6.

## Owned paths

- `docs/validation/PHASE-1.md`
- `apps/web/e2e/phase1/*.spec.ts` (Playwright specs added by this task; kept, T-503 reuses)
- `packages/application/src/**/__validation__/*.test.ts` (adversarial unit tests you add; never edit existing tests)

## Not in scope

- Fixing code. Findings go in the record; the human routes them back to the owning task. UI polish, accessibility beyond the auth screens' keyboard checks (T-503).

## Steps

1. Check out `main` at the merge commit after T-105; run `pnpm infra:up`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm check`. Record versions (`node -v`, `pnpm -v`, better-auth, next) and the commit range.
2. Read the diff of every owned path of T-101–T-105 (`git log --oneline` for the task commits, then `git show`). Note every `// ASSUMPTION(` marker and check it against the spine docs.
3. Run the negative matrix (table below); for each row record command/steps, expected, observed, pass/fail, and evidence (test name, response capture, Mailpit message id, SQL count).
4. Write 5–10 adversarial tests the implementers did not write (candidates: username homoglyph `shırin_88`; email with plus-suffix reuse; `next` with backslash `/\evil.example`; step-up cookie replay after sign-out; device approval token used by a different staff account; anonymous alias appearing in `search_documents` body; `identity.reveal` reason with 9 chars; config apply with an extra nested key inside `emergency`; rollback to a non-existent version; `Accept-Language` injection into locale).
5. Grep the logs captured during the e2e run for emails, tokens, usernames of anonymous authors, `persona_links` ids.
6. Write `docs/validation/PHASE-1.md` with the README §4 structure plus a **Human approval** line: `Approved by: <name>, <date>` left blank for the founder to fill; the verdict is provisional until filled.

## Acceptance checks (the negative matrix)

| Check | Command / steps | Expected |
|---|---|---|
| Enumeration — response shape | register/reset/resend with new vs existing email | byte-identical bodies except correlation id; same status |
| Enumeration — timing | 20× each, median | difference < 15 % |
| Token replay | use a verification link twice; a reset link twice | second use `auth.token_invalid` |
| Token expiry | set `auth_verifications.expires_at` to the past in SQL, open link | `auth.token_expired` copy |
| Revoke-all | sign in from Chromium and Firefox, revoke from one | the other's next request is anonymous |
| Reset kills sessions | reset password while signed in elsewhere | other session dead |
| Cookie flags | read `Set-Cookie` for session, `rk_staff_device`, `rk_stepup` | `HttpOnly`; `SameSite=Lax` (strict for stepup); no `Secure` on http; `Secure` when `APP_URL` https in a config test |
| CSRF/origin | POST a server action with `Origin: https://evil.example` | rejected |
| Rate limits | sign-in 11/15 min, sign-up 6/h, reset 4/h, resend 4/h, staff sign-in 11/15 min | limit hit at the documented count; window resets |
| Suspended | set `status='suspended'`, use old cookie | anonymous; sign-in shows `errors.auth.accountSuspended` |
| Staff guard | normal user session on `/admin/queue` | redirect to staff sign-in; no console HTML in body |
| Unknown device | fresh browser as `mod_rashid` | no session before approval; Mailpit mail; wrong password ×3 invalidates |
| Device revoke | revoke current device on `/admin/security` | signed out; approval required again |
| Device cross-account | same browser, `admin_nadia` | approval required |
| Step-up | apply config without step-up → refused; with step-up ok; after 5 min refused; tampered cookie refused | as stated |
| Capability toggles | admin reveal with toggle off → refused + recorded; toggle on via config → allowed | two `identity_reveals` rows |
| Alias leakage — profile | `/authors/anon_author_r2` and the public profile of that account | r2 absent |
| Alias leakage — search | `search_documents` for r2 | no username/account fields |
| Alias leakage — DB | `SELECT` from public tables joined to `personas` | no path to `account_profiles` without `persona_links` |
| Alias leakage — worker | connect as `rk_worker`, select `persona_links` | permission denied |
| Alias leakage — logs | grep captured logs | no emails, tokens, anonymous usernames |
| Config invariants | unknown key, out-of-range, mandatory reason removal, admin apply | all refused with the documented codes |
| Audit completeness | count `audit_events` after the run | one row per state change exercised (list them) |
| Both locales | every auth screen under `/bn/` | Bengali copy and digits; no English fallback text |
| `pnpm check` | | exit 0 |

## Tests to write

- `apps/web/e2e/phase1/auth.spec.ts`, `staff.spec.ts`, `identity.spec.ts`, `config.spec.ts` covering the matrix rows that are browser-observable (cookies, redirects, both locales).
- Adversarial unit tests under `__validation__/` (step 4).

## Threat notes

Not applicable (this task consumes the threat notes of T-101–T-105 and reports which defences held).

## Hard-rule checklist

- [ ] Reporter/anonymous identity never observed in any public projection, log, export or URL during the run.
- [ ] Reveal purpose-bound and recorded on every attempt.
- [ ] Reading without an account unaffected.
- [ ] Both locales verified.
- [ ] The validation record names the validator model only in the "validator model id" line (evidence, not attribution); no attribution elsewhere.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
