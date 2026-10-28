# Business rules — U4 `cr-011-queue-dedup-reset-and-quiet-env`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U4), `unit-of-work-story-map.md` (US1.1), `requirements.md` (NFR9, NFR10, NFR11), `components.md` (Notification), `contract-summary.md` (common rules, C11, C15, ownership rules), CR-011, FD-038, FD-043, FD-065, FD-076, ISS-143, ISS-144, ISS-185, ISS-201, ISS-202, ISS-203, ISS-244, `01-conventions.md` §11, `02-data-model.md` §5 and §16, and pg-boss 12.31.0 as installed. The workflows and state transitions that apply these rules are in `functional-spec.md`.

Groups 3 and 7 and rules BR2.1, BR2.3 and BR3.8 follow the answers to Questions 1–5 in `functional-design-questions.md`, recorded on the owner's standing instruction and awaiting the owner's confirmation in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. `functional-spec.md` § 13 lists what changes if the owner reverses an answer.

```yaml
rules:
  - id: BR1.1
    statement: "One relay tick is one database transaction: it claims events, enqueues their jobs and marks them, and either all of it commits or none of it does."
    category: constraint
    applies_to: "RelayBatch, outbox.relay"
    trigger: "Every relay tick (every 2 s, never overlapping)"
    logic: "IF a tick runs THEN it opens one transaction on one connection, does the claim, every job insert and every outbox update in it, and commits once at the end"
    violation: "A job that exists for an event whose processed_at rolled back, or an event marked processed whose jobs rolled back, is the ISS-201 or ISS-144 defect"
    source: "FD-038, ISS-201, ISS-144, ISS-185, components.md Notification, C15"
  - id: BR1.2
    statement: "The claim locks up to 50 unprocessed events, oldest first, skipping rows another transaction holds, and does not set processed_at."
    category: constraint
    applies_to: "OutboxEvent, the outbox repository claim"
    trigger: "Start of the relay transaction"
    logic: "IF events have processed_at null THEN the relay selects up to RelayBatch.limit of them ordered by created_at with a row lock that skips locked rows; processed_at stays null until BR1.4 or BR1.6 or BR1.7"
    violation: "A claim that marks rows processed before their jobs exist makes delivery at-most-once (ISS-144)"
    source: "ISS-144, ISS-185, 02-data-model.md §5"
  - id: BR1.3
    statement: "Every job of an event is enqueued on the relay transaction's own connection, inside the transaction."
    category: constraint
    applies_to: "PlannedJob, Job, PgBossQueue transaction-bound enqueue"
    trigger: "Each planned job of a claimed event"
    logic: "IF the relay enqueues a job THEN it passes pg-boss send the relay transaction as its database executor (send(..., { db })), so the job row commits or rolls back with the event"
    violation: "A send through pg-boss's own pool commits independently and reopens the duplicate window"
    source: "FD-038 (send(..., { db })), pg-boss 12.31.0 ConnectionOptions.db"
  - id: BR1.4
    statement: "An event is marked processed only in the transaction that enqueued all of its jobs."
    category: constraint
    applies_to: "OutboxEvent.processed_at"
    trigger: "Every planned job of the event was enqueued or confirmed de-duplicated"
    logic: "IF every PlannedJob of the event succeeded THEN processed_at is set to now in the same transaction and the outcome is relayed (or audit_only for an empty route)"
    violation: "processed_at set while a job of the event is missing loses that job"
    source: "FD-038, ISS-144"
  - id: BR1.5
    statement: "Each event is handled inside its own savepoint; a failure undoes only that event's job inserts and records its attempt in the same transaction."
    category: constraint
    applies_to: "OutboxEvent.attempts, RelayBatch"
    trigger: "An enqueue for the event fails (an error, or BR3.6's unconfirmed null)"
    logic: "IF any job of an event fails THEN roll back to the event's savepoint, increment attempts, leave processed_at null, report result retry with the error code, and continue with the next event"
    violation: "Without the savepoint one failed insert aborts the whole transaction and every other event of the batch; without the rollback the event's first job stays and is enqueued again on the retry"
    source: "ISS-201 (fan-out partial failure), ISS-144 (markFailed), T-009 step 7"
  - id: BR1.6
    statement: "An event whose attempts reach 5 after a failure is dead: it is marked processed with no job and logged as outbox.dead."
    category: policy
    applies_to: "OutboxEvent, RelayBatch.max_attempts"
    trigger: "BR1.5 increments attempts to RelayBatch.max_attempts"
    logic: "IF attempts after the failure >= max_attempts THEN set processed_at in the same transaction, keep no job of the event, report result dead"
    violation: "Retrying forever blocks nothing but never ends; dropping the event without a log hides it"
    source: "T-009 step 7, ISS-144 (no cap)"
  - id: BR1.7
    statement: "An event with no route is unmapped: it is marked processed with no job and logged as outbox.unmapped; an event whose route is empty is audit-only: processed with no job and no log."
    category: policy
    applies_to: "OutboxEvent, RelayRoute"
    trigger: "A claimed event's name has no RELAY entry, or an entry with no job"
    logic: "IF no route THEN processed, result unmapped (warn); IF an empty route THEN processed, result audit_only (no log)"
    violation: "An unmapped event retried forever, or a silently dropped typo, hides a routing error (ISS-145)"
    source: "T-009 (RELAY), ISS-145, C15 (jobs: [])"
  - id: BR1.8
    statement: "A failure of the batch itself (claim, connection, timeout, commit) rolls the whole tick back; no event changes and the next tick retries."
    category: constraint
    applies_to: "RelayBatch"
    trigger: "An error outside an event's savepoint, or a failed commit"
    logic: "IF the batch fails THEN roll back, report no outcome, let the poller log job.failed for outbox.relay, and run the next tick normally"
    violation: "Logging events as relayed after a failed commit, or partially applying a batch, breaks BR1.1"
    source: "FD-038, 01-conventions.md §11 (errors surfaced), construction.md (no silent failure)"
  - id: BR1.9
    statement: "The relay transaction is short: a 5 s statement timeout, a 10 s idle-in-transaction timeout, every routed queue ensured before it opens, and no I/O inside it other than its own SQL."
    category: constraint
    applies_to: "RelayBatch, PgBossQueue.ensureQueue"
    trigger: "Each tick, before and during the transaction"
    logic: "IF a tick starts THEN first ensure every routed queue not currently ensured (outside the transaction), then open the transaction with both timeouts set for it only"
    violation: "A long or stalled relay transaction holds row and index locks that make db:reset fail its lock_timeout and holds a pool connection (ISS-185)"
    source: "ISS-185, CR-007 lock_timeout, ASSUMPTION(CR-011) timeout values"
  - id: BR1.10
    statement: "Two relays running at once (two ticks or two worker processes) never claim the same event, and the relay keeps no claim state in process memory."
    category: constraint
    applies_to: "OutboxEvent, RelayBatch"
    trigger: "Concurrent relay transactions"
    logic: "IF two relay transactions run THEN the row lock with skip-locked gives them disjoint events; the database alone records which events are done"
    violation: "Claim state in memory breaks the stateless worker of NFR9 and a second instance"
    source: "NFR9, AC1.1.4, 02-data-model.md §5"
  - id: BR1.11
    statement: "Relay outcome logs (outbox.unmapped, outbox.relay_failed, outbox.dead, outbox.job_deduplicated) are written only after the batch committed."
    category: policy
    applies_to: "EventOutcome, the worker logger"
    trigger: "The relay transaction committed"
    logic: "IF the commit succeeded THEN log each EventOutcome that needs a line; IF it failed THEN log none of them"
    violation: "A log line that reports a change that rolled back misleads anyone reading the log"
    source: "01-conventions.md §11, NFR10"
  - id: BR1.12
    statement: "At worker start every queue a relay route names is ensured before the first tick; if that fails the worker does not start."
    category: constraint
    applies_to: "Worker startup, RelayRoute, QueueDeclaration"
    trigger: "Worker process start"
    logic: "IF the worker starts THEN ensure each distinct job name in RELAY; IF any ensure fails (including BR3.5) THEN exit 1 with the reason"
    violation: "A relay that first creates queues inside its transaction mixes pg-boss's own connection into the tick; a worker that runs with a wrong policy breaks BR3.2 silently"
    source: "BR1.9, BR3.5, 01-conventions.md §11 (fail closed)"
  - id: BR2.1
    statement: "A relayed job's key is <job>:<eventId> unless its route names another key."
    category: calculation
    applies_to: "JobKey, RelayRoute.key_rule"
    trigger: "Planning a job for an event"
    logic: "IF the route has no key rule THEN key = job name + ':' + event id; ELSE the route's rule (for example repetition:<reviewId>, added by U32)"
    violation: "A key that differs between two relays of the same event defeats BR3.2; a key with content breaks C15's privacy rule"
    source: "C15 (singletonKey <job>:<eventId> unless stated), C11, Question 4"
  - id: BR2.2
    statement: "Every job the relay enqueues carries a key."
    category: validation
    applies_to: "PlannedJob"
    trigger: "Planning a job for an event"
    logic: "IF the relay plans a job THEN it has a non-empty key; a plan without one is a programmer error"
    violation: "A key-less relayed job would collapse with every other key-less job of its queue (BR3.3)"
    source: "C15, BR3.3, CR-011 acceptance check 4"
  - id: BR2.3
    statement: "A relayed job's data is the envelope {eventId, name, payload}, with the outbox payload passed through unchanged."
    category: constraint
    applies_to: "JobEnvelope"
    trigger: "Planning a job for an event"
    logic: "IF the relay plans a job THEN data = {eventId: event.id, name: event.name, payload: event.payload}"
    violation: "Handlers written against C15 would not find eventId or name"
    source: "C15 (job payload envelope), C11, Question 4"
  - id: BR2.4
    statement: "Relay and queue logs carry only the event name, event id, job name, attempts, counts and a fixed error code; never the payload or the job data."
    category: policy
    applies_to: "Worker logger, PgBossQueue logger"
    trigger: "Any relay or queue log line"
    logic: "IF a line is logged THEN its fields come from the allowlist above; the new lines added by this Unit use an error code, not free text"
    violation: "Payload or free text in a log can carry data that is not allowed there (ISS-206)"
    source: "01-conventions.md §11, NFR10, AC1.1.5, ISS-206"
  - id: BR2.5
    statement: "This Unit changes no relay route; each Unit edits only the routes for the jobs it builds."
    category: policy
    applies_to: "RelayRoute"
    trigger: "Code Generation of this Unit"
    logic: "IF a route differs from C15 THEN it is left for its owner (U8 account routes, U25 evidence.stateChanged, U32 moderation.openRepetitionCase, U34 notification routes, U39 dataRequest routing)"
    violation: "Changing another Unit's route breaks C15's ownership rule"
    source: "C15 ownership rules, task-file amendments"
  - id: BR3.1
    statement: "One declaration in packages/database/src/queue/ states each job's queue policy and send defaults; every C15 job is listed, every entry is exclusive today, and any other name falls back to exclusive."
    category: policy
    applies_to: "QueueDeclaration, PgBossQueue.ensureQueue, PgBossQueue.enqueue"
    trigger: "A queue is created or a job is sent, by the worker or by the web process"
    logic: "IF a queue is ensured THEN it is created with the declared policy (or the default); the same table serves every process"
    violation: "A queue whose policy depends on which process created it first gives two behaviours for one job"
    source: "Question 1, C15, components.md (singletonKey idempotency)"
  - id: BR3.2
    statement: "Under exclusive, a queue holds at most one queued, retrying or active job per key; a second send with that key inserts nothing and is reported as de-duplicated, not as an error."
    category: constraint
    applies_to: "Job, Queue (exclusive)"
    trigger: "A send whose key matches a job in created, retry or active"
    logic: "IF a job with the same queue and key is in created, retry or active THEN the send inserts nothing and returns null, which BR3.6 confirms as de-duplicated"
    violation: "Two in-flight jobs with one key is the ISS-201 defect"
    source: "ISS-201, CR-011 acceptance check 1, pg-boss job_i6"
  - id: BR3.3
    statement: "A send without a key counts as the empty key: an exclusive queue holds at most one in-flight key-less job. Producers that need concurrent jobs give each a distinct key; key-less sends are for pg-boss cron schedules only."
    category: constraint
    applies_to: "Queue (exclusive), retention.expire schedule"
    trigger: "A key-less send"
    logic: "IF a send has no key THEN it is de-duplicated against the queue's in-flight key-less job; IF a cron occurrence arrives while the previous run is in flight THEN pg-boss drops it"
    violation: "A producer that needs several concurrent jobs but sends without keys silently loses all but one"
    source: "pg-boss COALESCE(singleton_key, ''), pg-boss timekeeper (cron sends without key), CR-011 acceptance check 4"
  - id: BR3.4
    statement: "A job that coalesces by an entity key must use stately; standard is used only by a recorded decision of the job's owner."
    category: policy
    applies_to: "QueueDeclaration"
    trigger: "A Unit changes its job's key from per-event to per-entity, or wants several in-flight jobs per key"
    logic: "IF a job's key names an entity (for example search.refresh by doctor) THEN its declaration entry becomes stately, so a change during an active run still queues one more job; the owner records the change in its Functional Design"
    violation: "Under exclusive an entity-keyed refresh requested while one runs is dropped and the index goes stale"
    source: "Question 1, C12 (search.refresh), pg-boss stately"
  - id: BR3.5
    statement: "When an application queue already exists with a policy other than its declaration, ensuring it fails closed with one message naming the queue, the expected and the actual policy, and pnpm db:reset as the fix."
    category: validation
    applies_to: "Queue, QueueDeclaration, PgBossQueue.ensureQueue"
    trigger: "ensureQueue on a queue that exists"
    logic: "IF the stored policy != the declared policy THEN raise a configuration error and do not mark the queue ensured; internal __pgboss__ queues are never checked"
    violation: "A queue that silently keeps standard makes BR3.2 false for that queue"
    source: "Question 3, pg-boss createQueue ON CONFLICT DO NOTHING, pg-boss updateQueue (policy cannot change)"
  - id: BR3.6
    statement: "A null send result counts as de-duplicated only after a job with the same queue and key in created, retry or active is confirmed on the same transaction; otherwise it is the failure job_not_enqueued, and the queue is forgotten as ensured."
    category: validation
    applies_to: "PgBossQueue.enqueue, RelayBatch"
    trigger: "pg-boss send returns null"
    logic: "IF send returns null AND an in-flight job with that queue and key exists THEN result deduplicated; ELSE result job_not_enqueued (BR1.5 for the relay) and the queue's ensured mark is cleared so the next tick re-creates it"
    violation: "pg-boss returns null also when the queue row is missing (its insert joins pgboss.queue and ends ON CONFLICT DO NOTHING); treating that as success marks events processed with no job"
    source: "pg-boss insertJobs, ISS-202 (a reset while a worker runs), construction.md (no silent failure)"
  - id: BR3.7
    statement: "Handlers stay idempotent: the policy bounds in-flight duplicates only, and a job with the same key can run again after the first one completed or failed."
    category: policy
    applies_to: "Every job handler (built by later Units)"
    trigger: "A job runs"
    logic: "IF a job runs THEN running it twice with the same data leaves the same result as once"
    violation: "A non-idempotent handler duplicates mail, notices or cases on a redelivery or a manual replay"
    source: "FD-038, 03-routes-and-contracts.md §5, AC10.1.2"
  - id: BR3.8
    statement: "A job retries 5 times with exponential backoff by default and evidence.process 3 times; a caller's explicit value still wins."
    category: policy
    applies_to: "QueueDeclaration, PgBossQueue.enqueue"
    trigger: "A job is sent without an explicit retry setting"
    logic: "IF the caller gives no retryLimit THEN use the job's declaration entry (5, or 3 for evidence.process)"
    violation: "A relayed job sent with the old 3 retries contradicts FD-076"
    source: "FD-076, C15 common rules, Question 5"
  - id: BR3.9
    statement: "Any producer can enqueue on its own transaction through PgBossQueue, using a small executor shape that keeps pg-boss types inside packages/database."
    category: constraint
    applies_to: "PgBossQueue.enqueue"
    trigger: "A producer passes its transaction (the relay now; the web tier's queueEmail later)"
    logic: "IF enqueue receives an executor THEN the insert and the BR3.6 confirmation run on it; ELSE on pg-boss's own pool"
    violation: "A web-tier enqueue outside its command transaction can leave a job for a rolled-back change"
    source: "C2 queueEmail (same transaction), FD-038, 01-conventions.md §2"
  - id: BR4.1
    statement: "runReset drops the pgboss and public schemas in one transaction, each with IF EXISTS, so after a failure both are as they were and after success both are gone."
    category: constraint
    applies_to: "ResetRun"
    trigger: "pnpm db:reset, pnpm demo:reset, the integration-test global setup, the ISS-202 probe"
    logic: "IF a reset runs THEN BEGIN; DROP SCHEMA IF EXISTS pgboss CASCADE; DROP SCHEMA IF EXISTS public CASCADE; COMMIT"
    violation: "Dropping pgboss alone leaves 0006_pgboss_grants.sql recorded as applied in public, so the reinstalled schema gets no rk_worker grants; dropping public alone keeps old jobs (ISS-202)"
    source: "ISS-202, CR-011 step 2, migrate.ts (bookkeeping in public)"
  - id: BR4.2
    statement: "The reset's drop keeps CR-007's limits: lock_timeout 10 s for every session opened from the reset URL and statement_timeout 60 s on the drop."
    category: constraint
    applies_to: "ResetRun"
    trigger: "The drop transaction"
    logic: "IF the drop waits longer than the limits THEN it fails and rolls back"
    violation: "A drop that waits forever is the ISS-143 hang"
    source: "CR-007, FD-043, ISS-143"
  - id: BR4.3
    statement: "A blocked drop names every backend holding a lock on either schema or on a relation in it, works when pgboss does not exist, and keeps CR-007's message tail."
    category: validation
    applies_to: "ResetRun"
    trigger: "The drop fails with lock_timeout or statement_timeout"
    logic: "IF the drop times out THEN look up granted locks on the public and pgboss namespaces and their relations (by name, so a missing pgboss matches nothing) and fail with 'lock_timeout 10s; blocked by backend pid <n> (role <r>, ...)'"
    violation: "A blocker on pgboss reported as 'could not be identified', or a lookup that errors when pgboss is absent, hides the cause"
    source: "CR-007 (reset-guard.int.test.ts message), ISS-244"
  - id: BR4.4
    statement: "After the drop, the reset recreates public and its extensions, clears a stray drizzle schema and migrates from empty: pg-boss installed as rk_app first, then every SQL migration, 0006_pgboss_grants.sql included."
    category: constraint
    applies_to: "ResetRun, migrate"
    trigger: "The drop committed"
    logic: "IF the drop committed THEN CREATE SCHEMA public; extensions; DROP SCHEMA IF EXISTS drizzle; runMigrate (installPgBoss, then migrations)"
    violation: "A reset that leaves rk_worker without USAGE and DML on pgboss stops the worker"
    source: "migrate.ts, 0006_pgboss_grants.sql, 02-data-model.md §16 note 2, AC1.1.2"
  - id: BR4.5
    statement: "The reset still refuses APP_MODE=production, and the stale-backend sweep still runs only on databases named *_test or *_test_b."
    category: authorization
    applies_to: "ResetRun"
    trigger: "Any reset"
    logic: "IF APP_MODE=production THEN refuse; IF terminate_stale_backends AND the name is not a test name THEN refuse before connecting"
    violation: "A reset or sweep on a non-test database destroys data"
    source: "CR-007, AD-14, team.md Deployment (demo safety)"
  - id: BR4.6
    statement: "A worker that was running when its database was reset must be restarted; until then BR3.6 turns its sends to vanished queues into recorded failures, not lost events."
    category: policy
    applies_to: "Worker, ResetRun"
    trigger: "pnpm db:reset or demo:reset while a worker runs"
    logic: "IF a reset happened under a running worker THEN the operator restarts the worker; meanwhile an unconfirmed send is a failed attempt and the queue is re-ensured on the next tick"
    violation: "A stale worker that marks events processed with no job loses notifications and mail"
    source: "BR3.6, team.md Deployment (rollback rebuilds with db:reset)"
  - id: BR4.7
    statement: "rk_worker gains no privilege: after a reset it holds exactly the pgboss grants of 0006_pgboss_grants.sql again, and every queue and job operation of this Unit uses only USAGE and DML."
    category: authorization
    applies_to: "rk_worker, pgboss schema"
    trigger: "Reset, queue creation, transaction-bound send, the BR3.6 confirmation"
    logic: "IF the worker creates a queue or sends a job THEN it uses INSERT and SELECT on pgboss tables (non-partitioned queues), never CREATE"
    violation: "Any DDL by rk_worker or a new grant breaks 02-data-model.md §16 and needs an FD entry"
    source: "CR-011 hard-rule checklist, 02-data-model.md §16, FD-092"
  - id: BR5.1
    statement: "Both env loaders load the repository-root .env with quiet set, so dotenv writes nothing to stdout."
    category: constraint
    applies_to: "EnvLoad (apps/worker/src/env.ts, packages/database/src/env.ts)"
    trigger: "Module load"
    logic: "IF an env module loads THEN it calls dotenv config with the resolved path and quiet true"
    violation: "The dotenv banner as the first stdout line breaks the JSON log stream (ISS-203)"
    source: "ISS-203, CR-011 step 3, 01-conventions.md §11"
  - id: BR5.2
    statement: "The worker's first stdout line is a JSON log line."
    category: validation
    applies_to: "Worker process"
    trigger: "Worker start without watch mode"
    logic: "IF the worker starts THEN the first line on stdout parses as a JSON object (worker.started or an error line)"
    violation: "A line-oriented log reader (T-504's heartbeat consumer) has to skip a non-JSON line"
    source: "CR-011 acceptance check 3, NFR10, AC1.1.5"
  - id: BR5.3
    statement: "The env load is otherwise unchanged: same path, variables already in the environment win, a missing .env is not fatal, and validation still decides."
    category: constraint
    applies_to: "EnvLoad"
    trigger: "Module load"
    logic: "IF .env is missing or a variable is already set THEN behave as on main; the worker's zod validation and the DATABASE_URL_WORKER refusal are unchanged"
    violation: "Changing load order or override breaks the T-009 acceptance rows (worker refuses without DATABASE_URL_WORKER)"
    source: "T-009 env.ts, 01-conventions.md §2 (worker role only)"
  - id: BR6.1
    statement: "The two validator probes for ISS-201 and ISS-202 become plain it tests with their bodies unchanged."
    category: validation
    applies_to: "packages/database/src/queue/pg-boss-queue.validator.int.test.ts"
    trigger: "Code Generation"
    logic: "IF the fixes land THEN delete the two .fails markers; keep every assertion, and update the header comment so it no longer calls them open probes"
    violation: "A weakened probe body hides a defect the validator recorded"
    source: "CR-011 step 4, acceptance checks 1 and 2, the probe file's header"
  - id: BR6.2
    statement: "The relay transaction, the queue policy and the reset are proven against the real database as rk_worker, in the database test project; the worker's decisions are proven with fakes."
    category: validation
    applies_to: "packages/database/src/queue/*.int.test.ts, outbox.int.test.ts, reset-guard.int.test.ts, env.int.test.ts, apps/worker/src/**/*.test.ts"
    trigger: "Code Generation"
    logic: "IF the Unit is built THEN the integration tests T1-T16 and the worker unit tests W1-W6 of functional-spec.md § 11 exist and each can fail"
    violation: "A design rule without a test that can fail is not proven"
    source: "team.md Testing Posture, construction.md Testing Standards"
  - id: BR6.3
    statement: "One new smoke assertion proves the de-duplication on the real database: the same key sent twice gives one job."
    category: validation
    applies_to: "packages/database/src/queue/pg-boss-queue.smoke.test.ts"
    trigger: "Code Generation"
    logic: "IF pnpm smoke runs THEN the assertion runs against DATABASE_URL_TEST as rk_worker"
    violation: "No smoke assertion for what the Unit delivered breaks the cumulative smoke rule"
    source: "CR-011 step 5, team.md Testing Posture (cumulative smoke)"
  - id: BR6.4
    statement: "Assertions that change because the behaviour changes on purpose are rewritten with the reason recorded; none is removed or skipped."
    category: policy
    applies_to: "outbox.int.test.ts, apps/worker/src/handlers/outbox-relay.test.ts, apps/worker/src/worker.smoke.test.ts"
    trigger: "Code Generation"
    logic: "IF an assertion encodes at-most-once claim, the old key form or the bare payload THEN it is rewritten to the new rule and the reason is written in the Build and Test record"
    violation: "A silently dropped assertion breaks the team's no-removal rule"
    source: "team.md Testing Posture, ISS-144"
  - id: BR6.5
    statement: "pnpm check, pnpm smoke and pnpm test:int are green on the Bolt branch and on main after the merge."
    category: validation
    applies_to: "The Unit"
    trigger: "Code Generation end, Build and Test, merge"
    logic: "IF the Unit is done THEN all three exit 0 with the compose PostgreSQL running"
    violation: "A red check blocks Build and Test (S1)"
    source: "CR-011 acceptance check 5, AC1.1.1, NFR11, team.md Way of Working"
  - id: BR6.6
    statement: "The comments that promise de-duplication tell the truth: outbox-relay.ts no longer says 'never a duplicate job' without its reason, and EnqueueOptions.key names the policy that enforces it."
    category: constraint
    applies_to: "apps/worker/src/handlers/outbox-relay.ts, packages/database/src/queue/pg-boss-queue.ts"
    trigger: "Code Generation"
    logic: "IF the fix lands THEN each comment states the mechanism (one transaction, FD-038; exclusive policy) in one line"
    violation: "A false comment is how ISS-201 survived T-009's unit test"
    source: "CR-011 step 1, ISS-201, code-comments rule"
  - id: BR7.1
    statement: "The Unit's owned paths include packages/database/src/repositories/outbox.ts and packages/database/src/outbox.int.test.ts, plus the tests of its own sources that sit outside queue/ (one added case in reset-guard.int.test.ts for reset.ts, a new env.int.test.ts for env.ts); the extension is recorded as an ISS row."
    category: policy
    applies_to: "U4 owned paths"
    trigger: "Code Generation"
    logic: "IF the relay is built THEN only these four files are added to CR-011's owned paths; nothing else outside them changes"
    violation: "Changing other files outside the owned paths needs its own decision"
    source: "Question 2, unit-of-work.md U4 (ISS-144, ISS-185), ISS-190 precedent"
  - id: BR7.2
    statement: "Before Code Generation relies on pg-boss or dotenv behaviour, the dependency check is redone and a dated entry appended, because both entries are older than 3 days."
    category: policy
    applies_to: "docs/status/dependency-check-log.md"
    trigger: "Start of Code Generation"
    logic: "IF the latest entry for pg-boss (2026-09-14) or dotenv (2026-09-13) is older than 3 days THEN check the current stable release and its known issues for send({ db }), the exclusive policy and quiet, and append an entry; the pinned version is not changed"
    violation: "Skipping the check breaks the project's Mandated dependency rule"
    source: "project.md Mandated (dependency check), CR-011 Read first"
```

## Rules summary

| Group | Rules | In one line |
|---|---|---|
| Relay transaction | BR1.1–BR1.12 | One short transaction per tick claims without marking, enqueues on its own connection, marks per event inside a savepoint, caps attempts at 5, logs after commit, and starts only with every routed queue ensured. |
| Job identity and payload | BR2.1–BR2.5 | Key `<job>:<eventId>`, always present; data is the C15 envelope; logs carry ids and codes only; routes stay with their owners. |
| Queue policy | BR3.1–BR3.9 | One declaration, `exclusive` for every job: one in-flight job per key, a confirmed `null` is de-duplicated and an unconfirmed one is a failure, a wrong stored policy fails closed, handlers stay idempotent, 5 retries (3 for `evidence.process`), transaction-bound enqueue for any producer. |
| Reset | BR4.1–BR4.7 | `pgboss` and `public` dropped together under CR-007's limits and blocker report, then migrated from empty with the worker grants; production refusal and test-only sweep unchanged; no new privilege. |
| Environment | BR5.1–BR5.3 | `quiet: true` in both loaders; the worker's first stdout line is JSON; nothing else in the load changes. |
| Verification | BR6.1–BR6.6 | Probes flipped unchanged, real-database tests, one smoke assertion, recorded rewrites, all checks green, truthful comments. |
| Scope | BR7.1–BR7.2 | Four files added to the owned paths (the outbox repository and its test from Question 2, plus two tests of the Unit's own sources); the dependency check redone before Code Generation. |
