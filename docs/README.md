# RogiKotha documentation

This is the index of the documentation kept on `main` for release 1. Start with the
[root README](../README.md) for what was built, how to run it and the test results.

Working files that the AI-DLC records cite are preserved on branch
`archive/full-project-2026-11-09`, which holds the full history before the submission was
assembled: the task files under `docs/implementation/tasks/`, the hand-loop and handoff notes, the
AI-DLC migration notes under `docs/aidlc-migration/`, the validation working papers and the
earlier planning drafts. The team rules under `aidlc/spaces/default/memory/` change only through
the AI-DLC learnings gate.

## How it was built

| Document | What it is |
|---|---|
| [how-it-was-built.md](how-it-was-built.md) | The AWS AI-DLC lifecycle that was run, the ten release-1 Units, gates and test results, and where each record is |
| [`aidlc/spaces/default/intents/261011-aidlc-adoption/`](../aidlc/spaces/default/intents/261011-aidlc-adoption/) | The AI-DLC record: state, Inception and Construction artifacts, reviews, audit log |
| [`aidlc/spaces/default/memory/`](../aidlc/spaces/default/memory/) | The rules every agent followed: `org.md`, `team.md`, `project.md` and the phase files |

## Product

| Document | What it is |
|---|---|
| [PRODUCT.md](../PRODUCT.md) | Product truth: audience, voice, hard rules |
| [DEMO.md](../DEMO.md) | How to run the local demo, the demo accounts, what to do if something fails |
| [scope-of-work.md](scope-of-work.md) | One-page scope for stakeholders |
| [RogiKotha_PRD_v1.0.docx](RogiKotha_PRD_v1.0.docx) | Product Requirements Document, version 1.0 |
| [RogiKotha_BRD_v1.0.docx](RogiKotha_BRD_v1.0.docx) | Business Requirements Document, version 1.0 |
| [planning/source-extracts/](planning/source-extracts/) | Text extracts of the PRD and BRD |
| [planning/01-requirement-baseline.md](planning/01-requirement-baseline.md) | Requirement baseline with the PRD ids |
| [planning/06-requirement-traceability-matrix.md](planning/06-requirement-traceability-matrix.md) | Requirement traceability matrix from planning (Gate 2 baseline) |

## Design

| Document | What it is |
|---|---|
| [DESIGN.md](../DESIGN.md) | The design system: tokens, type, layout, components, motion |
| [planning/ux/DESIGN.md](planning/ux/DESIGN.md) | The patient-side visual contract from planning |
| [planning/ux/EXPERIENCE.md](planning/ux/EXPERIENCE.md) | The prototype experience contract |
| [design/auth-screens-spec.md](design/auth-screens-spec.md) | Design and behaviour spec of the patient auth screens (FD-034) |
| [design/design-comparison.md](design/design-comparison.md) | How the design direction was chosen (FD-027, FD-030) |
| [ui-design-prototype/README.md](../ui-design-prototype/README.md) | The static design prototype, the source for content, data and behaviour |

## Architecture and decisions

| Document | What it is |
|---|---|
| [architecture/decisions/0001-use-ports-and-adapters-modular-monolith.md](architecture/decisions/0001-use-ports-and-adapters-modular-monolith.md) | ADR 0001: ports-and-adapters modular monolith |
| [architecture/decisions/0002-use-nextjs-typescript-and-postgresql.md](architecture/decisions/0002-use-nextjs-typescript-and-postgresql.md) | ADR 0002: Next.js, TypeScript and PostgreSQL |
| [architecture/decisions/0003-use-better-auth-behind-application-policy.md](architecture/decisions/0003-use-better-auth-behind-application-policy.md) | ADR 0003: Better Auth behind application-owned policy |
| [architecture/decisions/0004-use-postgresql-search-first.md](architecture/decisions/0004-use-postgresql-search-first.md) | ADR 0004: PostgreSQL search first |
| [architecture/decisions/0005-use-quarantine-first-evidence-pipeline.md](architecture/decisions/0005-use-quarantine-first-evidence-pipeline.md) | ADR 0005: quarantine-first evidence pipeline |
| [architecture/decisions/0006-use-storage-port-and-conditionally-garage.md](architecture/decisions/0006-use-storage-port-and-conditionally-garage.md) | ADR 0006: storage port; Garage adopted only if needed |
| [architecture/decisions/0007-use-pg-boss-for-durable-jobs.md](architecture/decisions/0007-use-pg-boss-for-durable-jobs.md) | ADR 0007: PostgreSQL-backed durable jobs |
| [architecture/decisions/0008-separate-public-persona-from-private-identity.md](architecture/decisions/0008-separate-public-persona-from-private-identity.md) | ADR 0008: public persona separate from private identity |
| [architecture/decisions/0009-version-runtime-configuration-and-retention.md](architecture/decisions/0009-version-runtime-configuration-and-retention.md) | ADR 0009: versioned runtime configuration and retention |
| [architecture/decisions/0010-separate-demo-and-production-compositions.md](architecture/decisions/0010-separate-demo-and-production-compositions.md) | ADR 0010: demo and production compositions kept apart |
| [architecture/decisions/0011-treat-bengali-and-english-equally.md](architecture/decisions/0011-treat-bengali-and-english-equally.md) | ADR 0011: Bengali and English as equal languages |
| [architecture/decisions/0012-require-independent-validation.md](architecture/decisions/0012-require-independent-validation.md) | ADR 0012: independent validation |
| [architecture/decisions/0013-orchestrate-deletion-across-owning-modules.md](architecture/decisions/0013-orchestrate-deletion-across-owning-modules.md) | ADR 0013: deletion across owning modules |
| [status/decision-log.md](status/decision-log.md) | Founder decisions FD-001 to FD-123; binding for all work |

The as-built package layout is in the [root README](../README.md#architecture) and in the code.
Where an older document disagrees with the code on layout or stack, the code wins (`project.md`,
Corrections).

## Engineering reference

| Document | What it is |
|---|---|
| [implementation/01-conventions.md](implementation/01-conventions.md) | Coding conventions: package layout, import direction, i18n, testing levels, git |
| [implementation/02-data-model.md](implementation/02-data-model.md) | The data model: tables, columns, roles and grants |
| [implementation/03-routes-and-contracts.md](implementation/03-routes-and-contracts.md) | URL map, contracts, ports, command and query catalogue, outbox events and jobs |
| [implementation/05-demo-storyboard.md](implementation/05-demo-storyboard.md) | What the demo shows, step by step, with the seeded data |
| [status/dependency-check-log.md](status/dependency-check-log.md) | Dated checks of dependency versions |
| [infra/compose/README.md](../infra/compose/README.md) | The three local containers: ports, roles, ClamAV test signature, version pins |

## Quality and security

| Document | What it is |
|---|---|
| [validation/U50-walkthrough.md](validation/U50-walkthrough.md) | The release-1 walk-through record, including the manual checks (U50) |
| [security/local-demo-threat-notes.md](security/local-demo-threat-notes.md) | Threats, controls and tests of the local demo composition |
| [Build and Test summary](../aidlc/spaces/default/intents/261011-aidlc-adoption/construction/build-and-test/build-and-test-summary.md) | Every gate, target and verdict of the Build and Test stage |

## Where edits go

New research notes go to `docs/planning/research/` (created with the first note). New founder decisions are appended to
`status/decision-log.md` before the code changes. The AI-DLC record and the memory files are
written by the framework; do not hand-edit them.
