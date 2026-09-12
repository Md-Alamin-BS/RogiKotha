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
