# Domain Design — architecture decisions

These records cover the choices made at this stage. The system's architecture was decided earlier and is not re-decided here: ports-and-adapters modular monolith (ADR-0001), Next.js/TypeScript/PostgreSQL (ADR-0002), Better Auth behind application policy (ADR-0003), PostgreSQL search first (ADR-0004), quarantine-first evidence (ADR-0005), storage port (ADR-0006), pg-boss jobs (ADR-0007), persona separated from private identity (ADR-0008), versioned configuration and retention (ADR-0009), demo and production compositions (ADR-0010), equal Bengali and English (ADR-0011), independent validation (ADR-0012), and deletion orchestrated across owning modules (ADR-0013), all in `docs/architecture/decisions/`. Each ADR below says which of those it builds on.

Sources: `requirements.md` (Requirements Analysis), `stories.md` (User Stories), the reverse-engineered `architecture.md` and `component-inventory.md` in `aidlc/spaces/default/codekb/rogikotha/`, the team practices in `team-practices.md`, and `docs/status/decision-log.md` (FD-001..FD-066).

## ADR-001: The thirteen domain modules are the components

- **Context:** AI-DLC needs a component catalogue in which every entity has exactly one owner. The repo already fixes thirteen module names (`01-conventions.md` §2), and the spine requires one owning module per persisted entity (`ARCHITECTURE-SPINE.md`, AD-1). The code on `main` is organised by layer (`apps/web`, `apps/worker`, `packages/{contracts,domain,application,database,adapters,i18n,test-support}`) under the trimmed monorepo of FD-033.
- **Decision:** The components are Account, Identity, Directory, Taxonomy, Review, Evidence, Community, Moderation, Notification, Search, Administration, Retention and DataRequests. They are not the packages: the apps and the adapter and database packages are where components run or plug in, and Units Generation decides how they are grouped for delivery (owner, Q1 of this stage).
- **Consequences:**
  - Each module's rules live in `packages/domain`, its use cases in `packages/application`, and its tables in `packages/database`, so one component spans several packages by design.
  - Boundaries follow the business rather than the folders, which keeps per-component tests and ownership clear.
  - A reader has to map component to package. The catalogue's Rationale table does that.
- **Security:** module boundaries are the unit for authorization checks and import-boundary lint (T-010, `eslint-plugin-boundaries`), so private data stays inside its owning module.
- **Alternatives rejected:**
  - Fewer components, folding Retention into Evidence and DataRequests into Account. Holds and deletion cover reviews and comments as well as evidence, so the merged components would own unrelated rules.
  - Packages as components. These are layers, not business building blocks, and every package would own entities of many concerns.

## ADR-002: Retention owns the retention records

- **Context:** `02-data-model.md` §7 lists `retention_policies`, `legal_holds` and `retention_bulk_actions` under Evidence. The contracts expose them as `retention.*` commands, and legal holds also apply to reviews and comments (FR86, FD-021).
- **Decision:** The Retention component owns all three entities (FD-064). Evidence, Review and Community ask Retention whether a hold blocks an expiry or deletion, and Retention's expiry job calls the owning module's command to remove an original or expire audit rows.
- **Consequences:**
  - One place decides retention and holds, with the versioned-policy rules of ADR-0009 and FD-020.
  - The tables themselves don't change; only the ownership note in `02-data-model.md` §7 is out of date, and Units Generation records that as a documentation follow-up.
- **Security:** bulk retention actions stay super_admin only (FD-051), and holds pause deletion for one record only (FD-021).
- **Alternatives rejected:** Evidence as owner, as the data model section places them. That would leave review and comment holds owned by the evidence module.

## ADR-003: Administration owns the audit log; Notification owns the outbox

- **Context:** Every module writes `audit_events` and `outbox_events`. The data model lists audit under Moderation (§9) and the outbox under Notification (§12). The audit log is append-only (migration `0003_append_only.sql`), and the outbox row is written in the same transaction as the change and relayed to pg-boss by the worker (ADR-0007, T-009).
- **Decision:** Administration owns AuditEvent (AD-10). Every module appends through one audit port, and the moderation case timeline is a stream within it (`stream = case:MOD-…`). Notification owns OutboxEvent, as the data model has it (FD-065). Neither owner lets other modules write the table directly; they call the port.
- **Consequences:**
  - One append-only audit trail with a shared format, readable per stream.
  - The outbox stays next to the jobs that consume it.
  - Every component depends on these two ports, so the catalogue shows a wide fan-in on Administration and Notification. That is intentional.
- **Security:** the audit port allowlists fields, so no medical text or document content reaches the log (PRD §9.3). Audit rows are append-only.
- **Alternatives rejected:**
  - Placement as in the data model, with audit in Moderation. That would make every module depend on Moderation.
  - A separate "Platform" component. It would be a component with no business rules of its own.

## ADR-004: Components talk through in-process commands and outbox events

- **Context:**
  - The modular monolith runs in one web process plus one worker (ADR-0001, ADR-0007).
  - Some interactions need an answer now: a hold check before deletion, or the identity projection for a page.
  - Others are reactions: refreshing search after a publish, a notification after a decision, an export after a data request.
- **Decision:**
  - A call that needs a result is a synchronous, in-process application command or query on the owning component (style `sync`).
  - A reaction is an outbox event written in the same transaction as the change and handled by a pg-boss job (style `event`).
  - No component reads or writes another component's tables.
- **Consequences:**
  - The dependency graph stays acyclic: where two modules interact both ways, one direction is an event.
  - Reactions survive a crash because the outbox is transactional, and the relay is being made transactional by CR-011 (FD-038).
  - Reactions are eventually consistent, for example search lags a publish by one job run.
- **Security:** jobs carry ids only in their payloads (the outbox stores ids, not content).
- **Alternatives rejected:**
  - All synchronous calls. That would make cycles and fragile chains, for example review → search → review.
  - An external message broker. It is unnecessary for one process plus one worker, and extra infrastructure for a local demo (FD-031).

## ADR-005: Identity is a separate component from Account

- **Context:** Public personas (named, pseudonymous, per-thread anonymous alias) must never link to the private account in any public projection, while staff reveal is a separately audited capability (ADR-0008, FD-015, FD-016, FD-022).
- **Decision:** Identity owns personas, the private persona-to-account links and the reveal log. Every other component refers to authors only by persona id, and Identity alone resolves projections.
- **Consequences:**
  - Alias isolation can be tested in one place: the adversarial fixtures of US3.3.
  - Every public read goes through Identity's projection.
- **Security:** reveal requires the audited capability (Super Admin; Admin or Moderator only when enabled), and the reveal log is append-only.
- **Alternatives rejected:** identity inside Account. That would put the private link and the public projection in the module that also handles sign-in, which widens who can reach the link.

## ADR-006: DataRequests orchestrates export and deletion through the owning components

- **Context:** Account export and orchestrated deletion are real in the demo (FD-035). Deletion must de-identify retained contributions, respect legal holds and leave each module's rules intact (ADR-0013, AD-17). A data request routes to export or delete by its kind (FD-052).
- **Decision:** DataRequests owns the request and its per-module plan. It calls each owning component's export or delete command, checks holds with Retention, and never touches another component's tables.
- **Consequences:**
  - Partial failures are visible per module, and a retry repeats only the modules that failed.
  - Each component must offer an export and a delete-or-de-identify command, which Units Generation includes in each unit's scope.
- **Security:** the export bundle contains only the requester's own data, and held records are never deleted.
- **Alternatives rejected:** direct table deletes from one module. That breaks ownership and the tombstone and de-identification rules of each module.

## ADR-007: Reactions on comments take Like and Dislike

- **Context:** The owner chose the PRD (FR77, FR-REA-001) over the data model's "comments accept `like` only" (FD-062).
- **Decision:** Community's Reaction entity applies the same Like/Dislike value set to reviews, facility reviews and comments, one current reaction per account and target.
- **Consequences:**
  - `02-data-model.md` §8, the reaction validation and the comment markup change. Contract Design updates the contract, and the Community unit updates the code and the prototype port.
  - Reactions still never weight summaries, ranking or moderation (FR78).
- **Security:** reactions on an anonymous thread are projected through Identity, so they never link to the profile (FD-015).
- **Alternatives rejected:** Like only on comments, as the design had it. The owner overruled this.

## ADR-008: Directory claims are staff-decided and protect degrees and specialty

- **Context:** The PRD's code-by-phone/email claim and the design's staff-decided claim disagreed, as did the protected-field lists (FD-060, FD-061).
- **Decision:**
  - Directory records a claim with its method and private evidence, and staff decide it (`directory.claimProfile` → `directory.decideClaim`). The code path is deferred.
  - After a claim, changes to name, BMDC number, degrees and specialty wait for Admin approval. Schedule, fee, booking contact, languages and chamber details publish immediately with history.
- **Consequences:** Contract Design widens the protected-field list. No SMS or code delivery is needed in the demo.
- **Security:** claim evidence is visible only to staff with the claim capability, and every decision is audited.
- **Alternatives rejected:**
  - The PRD's code step, which needs SMS and email codes the demo doesn't have.
  - Protecting only name and BMDC number, which leaves degrees and specialty open to self-edit.

## ADR-009: Beta metrics are aggregate counts from the product's own tables

- **Context:** FR103 asks for "Beta metrics" on the staff dashboard. No source defines them, and analytics is off (FD-019).
- **Decision:** Administration owns a read-only metrics view of aggregate counts: accounts, published reviews, open and closed reports, and evidence processed or failed. The counts come from the owning components' queries, with no per-user data and no analytics (FD-066).
- **Consequences:** no new infrastructure. The numbers are approximate at the moment of reading.
- **Security:** only aggregates are shown, and the view is gated by a staff capability.
- **Alternatives rejected:**
  - Deferring the metrics, which the owner declined.
  - Matomo analytics, which stays deferred (FD-019).

## Not a component: the demo clock

`demo_clock` (`02-data-model.md` §15) is demo-only migration support behind the `Clock` port, refused when `APP_MODE=production` (AD-14). It is a dependency of Retention's and Moderation's time-based rules in the demo, not a component of its own.
