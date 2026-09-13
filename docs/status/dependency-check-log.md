# Dependency check log

Tracks when an agent last verified that this project's libraries,
frameworks, and other dependencies are on a current **stable** release
(see [AGENTS.md](../../AGENTS.md) — "Check dependency versions before
implementing something new").

Rules:

- Before starting a new/first-time integration or a big feature, check the
  most recent entry below that covers the relevant dependency/dependencies.
- If it's less than 3 days old, skip re-checking.
- Otherwise, check now and append a new entry above the previous ones
  (newest first), following the format below.

## Entry format

```
### YYYY-MM-DD

- Scope: <what was being implemented that triggered this check>
- Checked: <dependency/framework names and versions considered>
- Findings: <current stable version vs. latest version, and whether latest
  is safe to use or has known issues; link sources if useful>
- Decision: <version(s) actually used, and why>
```

## Entries

### 2026-09-13 (T-007)

- Scope: T-007 (`packages/test-support` — first use of `@node-rs/argon2` and `sharp` in this codebase's actual dependency graph, and `tsx` for this package's own scripts; `@cantoo/pdf-lib` from the task's original step 1 is **not** installed, see Decision).
- Checked: `@node-rs/argon2` (task pins `^2.2.0`); `sharp` (task pins `^0.35.4`); `tsx` (task pins `^4`, already vetted 2026-09-13 for T-004 at `4.23.13`, 3 days old at this check).
- Findings: `@node-rs/argon2` latest on npm is `2.2.0` (published 2 days before this check) — same version the 2026-09-10 entry already vetted (m=64 MiB/t=3/p=1 params unaffected). `sharp` latest is `0.35.4` (published 17 days before this check) — same version the 2026-09-10 entry already vetted, no newer patch. `tsx@4.23.13` unchanged from the T-004 check. No advisories found against any of the three.
- Decision: used `@node-rs/argon2@^2.2.0`, `sharp@^0.35.4`, `tsx@^4` (devDependency) exactly as pinned. Did **not** install `@cantoo/pdf-lib`: the task's own "Scope change 2026-09-12 — images only (CR-001 / FD-036)" block, which overrides the steps below it, says seeded evidence derivatives are PNG pages/thumbnails only ("Do not generate PDFs"), and `03-routes-and-contracts.md` §3 says `PdfRasteriser`/`PdfAssembler` are "**Phase 2** … not created in Phase 1". Installing a PDF-assembly library for code that must not run in Phase 1 would be dead weight; logged as an `ISS-` deviation from step 1's literal (pre-scope-change) instruction.

### 2026-09-13 (T-004)

- Scope: T-004 (`packages/database` — Drizzle ORM/drizzle-kit/`pg`/`dotenv` first use in this codebase, plus `tsx` added to run `migrate.ts`/`reset.ts` directly).
- Checked: `drizzle-orm` (task pins `0.45.2` exact); `drizzle-kit` (task pins `0.31.10` exact); `pg` (task pins `^8.23.0`); `dotenv` (task pins `^17`); `tsx` (not named by the task — added because Node 24's native `.ts` support does not remap `./x.js` relative-import specifiers to `./x.ts` files the way `tsc`'s `moduleResolution: bundler` does, so `node src/migrate.ts` fails on this repo's `.js`-suffixed relative imports; `tsx` is the standard fix).
- Findings: `drizzle-orm@0.45.2`/`drizzle-kit@0.31.10` are still the current versions on the pre-1.0 line (last published ~5 months before this check per npm; no newer 0.4x patch and no 1.0 stable release yet — the 1.0 RC train the master plan says to avoid still has not shipped stable). `pg@8.23.0` resolved exactly. `dotenv` latest is `17.4.2` (same 17.x line the task's `^17` pin targets); `pnpm add dotenv@^17` resolved `17.4.2`. `tsx` latest is `4.23.13` (14 days old at check time), the actively maintained esbuild-based TS runner with no reported regressions relevant to a plain `node <file>.ts` replacement use case.
- Decision: used `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10` (exact pins, confirmed via `pnpm ls`), `pg@^8.23.0` (resolved `8.23.0`), `dotenv@^17.4.2` exactly as the task specifies. Added `tsx@4.23.13` as a new devDependency of `packages/database` — a tooling addition the task text did not anticipate, logged as `ISS-088` (S4).

### 2026-09-13 (T-008)

- Scope: T-008 (`apps/web` shell — first use of `next`, `react`, `react-dom`, `next-intl`'s runtime
  APIs inside a real Next.js app, `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`, `jsdom`, `@vitejs/plugin-react` in this repo).
- Checked: `next` (task pins exact `16.3.4`); `react`/`react-dom` (exact `19.3.0`); `next-intl`
  (`^4.14.2`, already vetted 2026-09-13 for `packages/i18n`); Next 16's `middleware.ts` → `proxy.ts`
  rename and `experimental.typedRoutes` stability; `@testing-library/react` `^16.3.3`;
  `@testing-library/jest-dom` `^6`; `@testing-library/user-event` `^14`; `jsdom` `^30`;
  `@vitejs/plugin-react` `^5`.
- Findings: `next@16.3.4` (2026-08-31) is still the current patch on the 16.x line — no newer 16.3.x
  tag exists (confirms the 2026-09-10 entry, now 3 days old). `proxy.ts` is confirmed as the Next 16
  rename of `middleware.ts`; next-intl's `createMiddleware(routing)` from `next-intl/middleware` is
  unchanged, only the file name/export moved — matches the task's own instruction. `typedRoutes`
  graduated out of `experimental` as of Next 15.5 and stays stable in 16.3 — the task's own
  conditional ("if stable … else omit") resolves to using the top-level `typedRoutes: true`, not
  `experimental.typedRoutes`. next-intl's docs now mention `next/root-params` (Next 16.3+) as an
  alternative to `setRequestLocale`; the task file explicitly specifies `setRequestLocale`, which task
  files win per `01-conventions.md` — used as specified, `root-params` noted as a future follow-up.
  No advisories found against any of the pinned testing-library/jsdom/vitejs-plugin-react versions.
- Decision: used the task's exact pins (`next@16.3.4`, `react@19.3.0`, `react-dom@19.3.0`,
  `next-intl@^4.14.2`) and current-stable testing deps as listed above; `next.config.ts` uses
  top-level `typedRoutes: true`; `proxy.ts` uses `next-intl/middleware`'s `createMiddleware`.

### 2026-09-13 (T-003)

- Scope: T-003 (`packages/contracts` — first use of `zod` and `uuid` in this codebase).
- Checked: `zod` (task pins `^4.5.4`); `uuid` (task pins `^13`).
- Findings: `zod` latest is `4.6.2`/`4.6.0` line (6 days old at check time), still the 4.x stable series the 2026-09-10 entry already vetted; no regressions reported for `z.object`/`z.enum`/`.min`/`.max`/`.strict()`, the only APIs this task uses; `pnpm add zod@^4.5.4` resolved to `4.6.2`, inside the pinned range. `uuid`: v13.0.2 (2026-05) is now the "legacy-13" line — v14.0.0 is current. v14's only breaking change is a Node >= 20 floor (this repo runs Node 24, so it would be compatible) plus a `v7()` bug fix ("aligned the default seq formula in v7Bytes with updateV7State") and a TypeScript moduleResolution/exports fix; no breaking change to `validate()`/`v7()`'s public signature or to published types otherwise. `pnpm add uuid@^13` resolved to `13.0.2`, matching the task's literal pin; ships its own types (`dist/index.d.ts`), so `@types/uuid` was skipped per the task's own conditional.
- Decision: used `zod@^4.5.4` (resolved `4.6.2`) and `uuid@^13` (resolved `13.0.2`) exactly as the task file pins — deviating from a task's pinned major version is outside this task's authority (`04-handoff-and-validation.md` "Only stop entirely for … needing a different library/version than pinned" reserves that call to the human). Flagged `uuid@14` as a follow-up worth a deliberate upgrade decision later, since its `v7()` fix is directly relevant to `ids.ts`'s only use of the package (see `ISS-075`).

### 2026-09-13

- Scope: T-002 (local infra compose: postgres, mailpit, clamav) and T-006 (`packages/i18n`, next-intl).
- Checked: `postgres:18` image tag (floats to patch); `axllent/mailpit` release tags; `clamav/clamav:1.5.4`; `next-intl` npm version.
- Findings: `postgres:18` currently resolves to 18.6 (17 days old), no newer 18.x patch — untagged `18` major tag stays correct per the master plan. `clamav/clamav:1.5.4` (2026-08, blog post "ClamAV 1.5.4 and 1.4.6 security patch versions published") is still the current 1.5.x patch and fixes 8 CVEs (CVE-2026-20337/20338/20339/20345/20346/20347/20348, CVE-2025-8088) plus a clamd STATS thread-safety fix — no newer 1.5.x tag exists, pin unchanged. `axllent/mailpit` has moved past the master plan's "current stable, check before pinning" placeholder to `v1.31.1` (2026-09-05, DNS-rebinding mitigation + SSRF hardening) — this is the tag T-002 pins. `next-intl` is unchanged at `4.14.2` (still current, matches the master plan pin).
- Decision: `infra/compose/docker-compose.yml` pins `postgres:18`, `clamav/clamav:1.5.4` (unchanged) and `axllent/mailpit:v1.31.1` (updated from the plan's placeholder). `packages/i18n` keeps `next-intl@^4.14.2` (unchanged).

### 2026-09-10

- Scope: Demo implementation plan (`docs/implementation/`) — first production-style workspace: Next.js app, PostgreSQL, Better Auth, pg-boss worker, evidence pipeline, tests and lint.
- Checked: Node.js 24.x LTS (24.21 latest patch; local 24.19); Next.js 16.3.4; React 19.3.0; TypeScript 7.0.2 vs 6.x; pnpm 12.3.4 vs 11.20; PostgreSQL 18.6; Drizzle ORM 0.45.2 + drizzle-kit 0.31.10 (1.0.0-rc.4 exists); pg 8.23.0; postgres.js 3.4.9; pg-boss 12.30.0; Better Auth 1.7.3; @node-rs/argon2 2.2.0; next-intl 4.14.2; Zod 4.5.4; React Hook Form 7.87 (8 beta); sharp 0.35.4; pdfjs-dist 6.3.289; pdf-lib 1.17.1 (2021, abandoned) vs @cantoo/pdf-lib; file-type 22.0.2 (ESM-only); ClamAV 1.5.4; Mailpit ~1.28; MinIO CE (archived 2026-04); Garage 2.3.0; Vitest 5.0.0 (2026-09-03) vs 4.1.x; @testing-library/react 16.3.3; Playwright 1.63.0; axe-core 4.13.0; jsdom 30.0.1; ESLint 10.10.0; typescript-eslint; eslint-plugin-boundaries 7.2.0; dependency-cruiser 18.2.0; Prettier 3.9.6; Tailwind 4.3.3; Radix/shadcn (shadcn default primitive switched to Base UI in July 2026).
- Findings: TypeScript 7 (Go rewrite) has no stable programmatic API yet and breaks typescript-eslint/ts-morph — stay on TS 6.x until 7.1. pnpm 12 is a two-week-old Rust rewrite — stay on 11.x. Vitest 5 shipped one week ago with 33 breaking changes and a Node ≥ 22.12 floor — stay on 4.1.x. Better Auth 1.7 is now the stable line and carries the fixes for CVE-2026-67336 (1.6.11), CVE-2026-67327 (1.6.22) and CVE-2026-80192 (1.6.27/1.7.x); community reports of peer-dependency friction with Next 16.0.x and `getServerSession` vs `"use cache"` — verify on 16.3.4 in T-101 with the `pg` adapter as fallback. React ≥ 19.2.1 required (React2Shell CVE-2025-55182). pdf-lib is unmaintained — use `@cantoo/pdf-lib`. MinIO CE is dead — Garage stays the deferred candidate; the demo uses a filesystem adapter. ClamAV 1.5.4 fixes CVE-2026-20337/20338/20345/20339 — pin the tag, not `latest`. Drizzle stays pre-1.0 — pin exact versions, do not adopt the 1.0 RC mid-build. Tailwind/shadcn/Radix are not adopted (FD-032), so their churn is moot.
- Decision: pins as recorded in `docs/implementation/00-master-plan.md` §3. Re-verify exact patches at each task's first `pnpm add` if this entry is older than 3 days.

### 2026-08-30

- Scope: Gate 2 architecture and dependency-selection baseline for the first RogiKotha implementation.
- Checked: Node.js 24.20.0 LTS; Next.js 16.3.3; React 19.2.7; TypeScript 6.0.3; PostgreSQL 18.6; Better Auth 1.6.22; Drizzle ORM 0.45.2; pg-boss 12.26.0; Garage 2.3.0; ClamAV 1.5.4; LibreOffice 26.2.5; PDF.js 6.1.200; Tailwind CSS 4.3.1; shadcn 4.11 line; Lucide 1.27.0; Vitest 4.1.10; Playwright 1.62.1; axe-core 4.11.4; MSW 2.15.0.
- Findings: Selected maintained stable/LTS releases rather than Node 26 Current, Better Auth 1.7 prereleases, PostgreSQL 19 beta, LibreOffice 26.8's new feature branch, or Vitest 5 beta. Next.js remains patch-sensitive; Better Auth has recent security fixes; PostgreSQL 18.6 includes security fixes and GIN follow-up notes; document tools remain hostile-input boundaries rather than trusted libraries. Full official-source metadata and licences are in `docs/planning/03-research-report.md` and its digests.
- Decision: Use these as the authoring baseline, not an immutable future lockfile. Recheck exact stable patches, advisories, peer compatibility, licences, and container digests immediately before the first dependency installation because no application lockfile exists yet.
