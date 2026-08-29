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

### 2026-08-30

- Scope: Gate 2 architecture and dependency-selection baseline for the first RogiKotha implementation.
- Checked: Node.js 24.20.0 LTS; Next.js 16.3.3; React 19.2.7; TypeScript 6.0.3; PostgreSQL 18.6; Better Auth 1.6.22; Drizzle ORM 0.45.2; pg-boss 12.26.0; Garage 2.3.0; ClamAV 1.5.4; LibreOffice 26.2.5; PDF.js 6.1.200; Tailwind CSS 4.3.1; shadcn 4.11 line; Lucide 1.27.0; Vitest 4.1.10; Playwright 1.62.1; axe-core 4.11.4; MSW 2.15.0.
- Findings: Selected maintained stable/LTS releases rather than Node 26 Current, Better Auth 1.7 prereleases, PostgreSQL 19 beta, LibreOffice 26.8's new feature branch, or Vitest 5 beta. Next.js remains patch-sensitive; Better Auth has recent security fixes; PostgreSQL 18.6 includes security fixes and GIN follow-up notes; document tools remain hostile-input boundaries rather than trusted libraries. Full official-source metadata and licences are in `docs/planning/03-research-report.md` and its digests.
- Decision: Use these as the authoring baseline, not an immutable future lockfile. Recheck exact stable patches, advisories, peer compatibility, licences, and container digests immediately before the first dependency installation because no application lockfile exists yet.
