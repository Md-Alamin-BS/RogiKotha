# Unit dependencies — RogiKotha demo build

Revision of 2026-11-04 for FD-105 (release 1: backlog R1 plus simple comments, 10 Units, built in parallel where they do not collide). Topology only: which Unit needs which. The order of work and the critical path are Delivery Planning's decisions.

The DAG lists only the 10 active Units. The 9 merged Units (U1–U7, U8 T-101, U45 T-011), the earlier merged work and the demo slice (FD-099..FD-101) are the baseline on `main`: every active Unit builds on them, so edges to them are not listed. The 13 Units merged into U46–U50 are represented by those Units, and the 18 deferred Units are not in the DAG at all; see `unit-of-work.md`.

Dependencies come from each source task file's "Depends on" row, with merged work removed, edges between tasks merged into the same Unit folded into it, and edges to deferred Units cut (each cut and how release 1 satisfies it is listed below). These structural rules add or keep edges:

- U47 reviews depends on U46 directory: the review core reads the directory and taxonomy queries, its composer calls U46's FD-100 member-added doctor command, and U46 owns the read-side Review stub (`ProviderExperience` and `ConditionStats` implementations and four review queries, FD-067) that U47 must add siblings to without rewriting.
- U47 depends on U11 identity (personas and the thread-scoped anonymous alias for bylines and the composer's persona choice) and on U9 auth screens (the gate the composer mounts for signed-out and unconfirmed writers).
- U22 review changes depends on U47: corrections and versions extend the review module U47 builds, behind U47's edit link and `<ReviewHistory>` slot.
- U48 evidence depends on U47: evidence attaches to the author's own review by `review_id`, and the intake checks authorship with U47's `isReviewAuthor`. This replaces T-306's edge to T-303 in the other direction: U47 mounts the evidence components already on `main` and a self-fetching `<EvidenceSection>` slot, and U48 replaces their internals afterwards.
- U49 comments depends on U47 (a comment needs a published review, answered by U47's `isReviewPublished`, and the experience page mounts the self-fetching `<CommentThread>` slot), U11 (comment authors appear through personas and the thread alias) and U9 (the gate for signed-out and unconfirmed commenters).
- U47 ships the seams that keep U22, U48 and U49 off its files: the three self-fetching slots on the experience page, the edit link to U22's route, and the `isReviewAuthor` and `isReviewPublished` queries. U46 declares the `PublicEvidenceCount` port, bound in `container.ts` to an interim implementation with today's behaviour; U48 implements it and swaps the binding. Details per Unit are in `unit-of-work.md`. With these seams no extra edge is needed at level 3.
- U20 discover depends on U46: the home reads U46's module queries and shared primitives.
- U41 security hardening depends on U48: it adds the origin check to U48's upload route and tests the upload limits against it.
- U50 release check depends on every other active Unit: it walks the release-1 storyboard over all of them.

Built from `components.md` (Domain Design: component dependencies), `requirements.md` and `stories.md`, the task files in `docs/implementation/tasks/`, and FD-094..FD-105.

## Dependency DAG

```yaml
units:
  - name: t-102-patient-auth-screens
    kind: ui
    depends_on: []
  - name: t-104-identity-module
    kind: library
    depends_on: []
  - name: u46-directory
    depends_on: []
  - name: t-207-discover-emergency-about
    kind: ui
    depends_on: [u46-directory]
  - name: u47-reviews
    depends_on: [u46-directory, t-104-identity-module, t-102-patient-auth-screens]
  - name: t-302-review-changes-and-tombstones
    depends_on: [u47-reviews]
  - name: u48-evidence
    depends_on: [u47-reviews]
  - name: u49-comments
    depends_on: [u47-reviews, t-104-identity-module, t-102-patient-auth-screens]
  - name: t-502-security-hardening
    kind: library
    depends_on: [u48-evidence]
  - name: u50-release-check
    kind: spec
    depends_on: [t-102-patient-auth-screens, t-104-identity-module, u46-directory, t-207-discover-emergency-about, u47-reviews, t-302-review-changes-and-tombstones, u48-evidence, u49-comments, t-502-security-hardening]
```

U22, U46, U47, U48 and U49 carry no `kind`: each has a domain module and its pages, so they keep the full Functional Design artifact set.

## Dependency table

| Unit | Size | High risk | Depends on |
|---|---|---|---|
| U9 T-102 | L | yes | — (baseline only) |
| U11 T-104 | M | yes | — (baseline only) |
| U46 directory | XL | — | — (baseline only) |
| U20 T-207 | M | — | U46 |
| U47 reviews | XL | — | U46, U11, U9 |
| U22 T-302 | M | — | U47 |
| U48 evidence | XL | yes | U47 |
| U49 comments | L | — | U47, U11, U9 |
| U41 T-502 | M | yes | U48 |
| U50 release check | XL | — | U9, U11, U46, U20, U47, U22, U48, U49, U41 |

## Dependencies cut by FD-105

Each edge below pointed at a Unit that is deferred to release 2 (or at a task merged into a later Unit). The edge is dropped, and release 1 satisfies the need as stated.

| Active Unit | Old edge (task file) | Deferred or moved Unit | How release 1 satisfies it |
|---|---|---|---|
| U11 T-104 | T-104 → T-103 (`capability`, `stepUp`) | U10 T-103 | Only the audited reveal needed them; the reveal is dropped from release 1 |
| U47 reviews | T-301 → T-105 (`limitedDataThreshold`) | U12 T-105 | A constant: `DEFAULT_CONFIG_VALUES.limitedDataThreshold` (5) through U8's defaults-only `ConfigProvider` |
| U47 reviews | T-306 → T-204 (add-doctor panel, `directory.submitProfile`) | U17 T-204 | FD-100's member-added doctor command moves into U46's Directory module; the composer calls it |
| U47 reviews | T-306 → T-303 (upload route, `getForAuthor`, `remove`) | U23 T-303, now U48 | Inverted: U47 mounts the evidence components already on `main` unchanged, and U48 (after U47) replaces their internals |
| U47 reviews | T-307 → T-302 (projection with follow-ups, edited, tombstone) | U22 T-302 | Inverted: the experience page is built on T-301's projection; U22 (after U47) adds the edited mark and versions; follow-ups and tombstones are dropped |
| U47 reviews | T-301/T-306/T-307 → T-201/T-202/T-203 | U14, U15, U16, now U46 | Kept as one edge to U46 |
| U22 T-302 | T-302 → T-405 (web-tier email queueing, FD-075) | U34 T-405 | Dropped: corrections send no email; the hide and restore emails belong to `review.setState`, which is deferred |
| U48 evidence | T-304's in-app notifications (FD-070) via T-405 | U34 T-405 | Dropped: the author sees each item's state and failure reason on their own evidence list |
| U48 evidence | T-304 → T-305 for sanitise and preview-ready | U25 T-305 | Dropped: the pipeline ends after a clean scan; public pages show only the note and the count |
| U49 comments | T-401 → T-302 (review state, `review.setState`) | U22 T-302 | Replaced by U47: a comment only needs the review to be published, which U47's review module answers; `setState` is not needed |
| U49 comments | T-401 → T-105 (rate limits) | U12 T-105 | A constant in the community module on T-101's in-memory `RateLimiter` |
| U49 comments | T-401 → T-405 (discussion email, FD-075) | U34 T-405 | Dropped: no discussion email in release 1 |
| U49 comments | T-402 → T-307 (ExperiencePage slot) | U27 T-307, now U47 | Kept as the edge to U47 |
| U20 T-207 | T-207 → T-206 (`SearchBox`) | U19 T-206 | Dropped: the home shows browse entry points instead of a search box |
| U20 T-207 | T-207 → T-202, T-203, T-201 | U15, U16, U14, now U46 | Kept as one edge to U46 |
| U41 T-502 | T-502 → T-103 | U10 T-103 | Dropped: the CSP and nonce cover the admin layout as it stands on `main` |
| U41 T-502 | T-502 → T-401, T-403 (comment and report rate limits) | U30 (now U49), U32 | Dropped: the per-command rate-limit table is deferred; U49 uses its own constant |
| U41 T-502 | T-502 → T-405, T-410 | U34, U39 | Dropped: those features are not in release 1 |
| U41 T-502 | T-502 → T-501 (CSP covers `sw.js` and the manifest) | U40 T-501 | Dropped: no service worker in release 1; the PWA's CSP comes back with T-501 |
| U41 T-502 | T-502 → T-303 (upload route) | U23 T-303, now U48 | Kept as the edge to U48 |
| U50 release check | T-503 → T-206, T-308, T-406, T-407, T-408, T-409, T-501 | U19, U28, U35, U36, U37, U38, U40 | Dropped: their pages and journeys are not in release 1; their storyboard steps are marked "release 2" in the walk-through record |
| U50 release check | T-504 → T-410, T-501, T-106 | U39, U40, U13 | Dropped; T-106's auth and identity checks run in U9's and U11's Build and Test |
| U50 release check | T-503 → CR-004 | U7 (merged) | Baseline; the live-region assertions run on the walked pages |
| U9 T-102 | T-102 → T-101, T-011, D-001 | merged | Baseline; the D-001 review approval (FD-053) is recorded in U9's record |

## Shared files and the collision rule

The project rule forbids building two Units in parallel when they depend on each other or touch the same files (FD-094, project.md Forbidden). For this DAG, "touch the same files" means overlapping owned paths: no two Units without a dependency path between them own the same file or directory, and each Unit's owned paths are listed in `unit-of-work.md`. Where two Units would have edited the same file, the DAG has an edge between them (U46 → U47 for the review repository and review module, U47 → U22 for the review module and projection, U47 → U48 for the evidence components, U48 → U41 for the upload route), or a seam removes the shared edit: U47 hands over `components/patient/comments/CommentThread.tsx` to U49, `components/patient/evidence/EvidenceSection.tsx` to U48 and `components/patient/review-history/` to U22 when it merges, and none of the three edits `experiences/[id]/page.tsx` or the review queries. Among U22, U48 and U49, only U22 edits the review module, its repository and its contracts.

A small set of shared registry files is touched by almost every Unit, always by appending its own block. They are not owned by any one Unit, and touching them does not make two Units collide. The swarm merges one Unit at a time, and each Unit rebases on `main` before its squash merge:

- `packages/i18n/messages/en.json` and `bn.json`: each Unit adds only its own keys, in both files in the same commit.
- `apps/web/src/server/container.ts`: each Unit adds only the wiring of its own module; U48 also swaps the `PublicEvidenceCount` binding from the interim implementation to its own.
- `apps/web/src/server/data.ts` and `packages/database/src/demo/index.ts`: each Unit removes only the binding or export line of the demo module it retires.
- `packages/contracts/src/view-models/demo.ts`: each Unit removes only the demo types its retired demo functions used; U50 removes any left without a user.
- `packages/test-support/src/seed/seed.ts` (the seed orchestrator) and `seed-content.ts` (reviews, versions and comments together): each Unit edits only the block that seeds its own module's tables (U47 reviews, U22 versions, U49 comments), and new seed data for a module may go into its own `seed-<module>.ts` called from `seed.ts`. `seed-directory.ts` is U46's and `seed-evidence.ts` is U48's.
- `apps/web/src/styles/patient.css`: additions only, in `/* added: <unit id> reason */` blocks.
- package barrels (`packages/*/src/index.ts`), `packages/test-support/src/fakes/index.ts`, `apps/worker/src/handlers/index.ts` and the worker registry: one export or registration line per module.
- `docs/implementation/ISSUES.md` and `docs/status/dependency-check-log.md`: new rows only.

Migrations are the exception that needs a rule: `packages/database/src/migrations/`, its drizzle `meta/_journal.json` and snapshots, and the migration count pinned in `migrations.int.test.ts` must stay sequential. A Unit that adds a migration (expected: U46, possibly U11, U47 and U48) writes it under a working name on its Bolt branch and takes the next free number when it rebases on `main` just before its merge, regenerating the snapshot and updating the pinned count. Because merges happen one at a time, two parallel Units never land the same number.

## Integration points

Units integrate inside one process per runtime, through the component boundaries of `components.md`:

- **Application commands and queries** (in-process, sync) between modules, through each module's ports (ADR-004, ADR-010): U47 calls U46's directory and taxonomy queries and the FD-100 command, U11's `identity.personaFor` and `publicProjection`; U48 calls U47's `isReviewAuthor(reviewId, actor)`; U49 calls U47's `isReviewPublished(reviewId)` and U11 for the comment author's persona; U20 calls U46's queries; U46 and U47 read the public evidence count only through the `PublicEvidenceCount` port (`countPublicEvidence(reviewId)`), which U48 implements.
- **UI composition**: U47's composer mounts U9's gate component and U48's evidence components; U47's experience page mounts three self-fetching slots that take only `reviewPublicId`: `<EvidenceSection>` (U48), `<CommentThread>` (U49) and `<ReviewHistory>` (U22), and links to U22's edit route. The slots load their own data, so the owning Unit changes their internals alone and never edits the page.
- **Outbox events and pg-boss jobs** (async) from the web tier to the worker (ADR-004, FD-038): U48's intake enqueues `evidence.process` in the same transaction as the item row; the worker validates and scans. No other release-1 Unit adds a job.
- **Shared contracts** in `packages/contracts` (schemas, error codes, view models) that UI parts consume from module parts. Contract Design pins them.
- **The shared database**, with each table written only by its owning module (ADR-001, AD-1).

## Parallel development opportunities

Construction runs stage-major with the swarm (FD-094), so Units with no dependency path between them and no overlapping owned paths can be built at the same time. The DAG's dependency levels are:

| Level | Units that can be built together | Why they are independent |
|---|---|---|
| 1 | U9 T-102, U11 T-104, U46 directory | each depends only on the baseline; auth screens, the identity module and the directory own disjoint paths |
| 2 | U20 T-207, U47 reviews | both need only level-1 Units; the home and the review pages own disjoint paths |
| 3 | U22 T-302, U48 evidence, U49 comments | each needs U47; they own disjoint paths because U47 ships the seams: the experience page mounts each one's self-fetching slot (`<ReviewHistory>`, `<EvidenceSection>`, `<CommentThread>`) and links to U22's edit route, U48 and U49 use U47's `isReviewAuthor` and `isReviewPublished` instead of adding review queries, and only U22 edits the review module |
| 4 | U41 T-502 | needs U48's upload route |
| 5 | U50 release check | needs every other Unit |

These are independent sets, not a schedule. U20 can also run alongside level 3, and U41 alongside the rest of level 3 once U48 has merged; which Units go first is Delivery Planning's decision.
