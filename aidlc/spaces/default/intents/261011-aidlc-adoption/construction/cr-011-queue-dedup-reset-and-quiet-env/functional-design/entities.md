# Entities — U4 `cr-011-queue-dedup-reset-and-quiet-env`

Source of truth for the data shape this Unit works on. The Unit adds no table and no column. Its entities are the outbox event as it is stored today, the relay's transient unit of work and the values it passes, the pg-boss queue and job records it writes, the queue declaration it introduces, the reset run and the environment load. Built from CR-011, FD-038, FD-065, FD-076, `contract-summary.md` (C11, C15), `components.md` (Notification), `02-data-model.md` §5 and §16, the code on `main` and pg-boss 12.31.0 as installed. Workflows and state transitions are in `functional-spec.md`; decision logic is in `rules.md`.

```yaml
entities:
  - name: OutboxEvent
    description: "One row of outbox_events (02-data-model.md §5). Written by a module in the same transaction as the change it announces (FD-065); read and marked only by the relay. Owned by the Notification component; the relay that consumes it is owned by U4."
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: name, type: string, required: true, constraints: "a past-tense event name; the relay routes known names and treats any other name as unmapped" }
      - { name: payload, type: json-object, required: true, constraints: "ids, enums, counts and booleans only (C15); never logged" }
      - { name: created_at, type: timestamp, required: true, constraints: "claim order: oldest first" }
      - { name: processed_at, type: timestamp, required: false, default: null, constraints: "null means unprocessed; set only in the relay transaction that also enqueued all of the event's jobs, or marked it unmapped or dead" }
      - { name: attempts, type: integer, required: true, default: 0, min: 0, constraints: "failed relay attempts; incremented in the relay transaction; the event is dead when it reaches RelayBatch.max_attempts" }
    constraints:
      - "No column is added or changed by this Unit; a dead event is processed_at set with attempts equal to the limit"
      - "An event is held by at most one relay transaction at a time (row lock, skip locked)"
    relationships:
      - { to: RelayRoute, cardinality: "many-to-one", direction: "OutboxEvent is routed by RelayRoute (by name); no route means unmapped" }
      - { to: Job, cardinality: "one-to-many", direction: "OutboxEvent produces Job (one per routed job name), in the transaction that marks it processed" }

  - name: RelayRoute
    description: "One entry of the worker composition root's event-to-jobs table (RELAY). Owned per job by the Unit that builds the job (C15); this Unit changes no entry."
    attributes:
      - { name: event_name, type: string, required: true, unique: true }
      - { name: job_names, type: list<JobName>, required: true, constraints: "may be empty: an audit-only event (config.applied, hold.changed, retention.policyChanged) is processed with no job and no log" }
      - { name: key_rule, type: string, required: false, default: "<job>:<eventId>", constraints: "a route may name another key, as C11 does for moderation.openRepetitionCase (repetition:<reviewId>); added by the owning Unit" }
    relationships:
      - { to: OutboxEvent, cardinality: "one-to-many", direction: "RelayRoute routes OutboxEvent" }

  - name: RelayBatch
    description: "The transient unit of work of one relay tick: one database transaction on one connection that claims events, enqueues their jobs and marks them. Exists only for the length of the transaction."
    attributes:
      - { name: limit, type: integer, required: true, default: 50, min: 1 }
      - { name: max_attempts, type: integer, required: true, default: 5, min: 1, constraints: "T-009 step 7" }
      - { name: statement_timeout_seconds, type: integer, required: true, default: 5, constraints: "ASSUMPTION(CR-011): bounds every statement of the relay transaction" }
      - { name: idle_in_transaction_timeout_seconds, type: integer, required: true, default: 10, constraints: "ASSUMPTION(CR-011): the server ends a relay transaction the process stopped driving, so its locks never block db:reset for long" }
      - { name: outcome, type: enum, required: true, allowed_values: [committed, rolled_back] }
    constraints:
      - "Every statement of the batch, the job inserts included, runs on the batch's own connection inside its transaction"
      - "No network call other than the batch's own SQL runs while the transaction is open"
      - "Each event is handled inside its own savepoint"
    relationships:
      - { to: OutboxEvent, cardinality: "one-to-many", direction: "RelayBatch claims OutboxEvent" }
      - { to: EventOutcome, cardinality: "one-to-many", direction: "RelayBatch reports EventOutcome after commit" }

  - name: EventPlan
    description: "Value object: what the worker decides for one claimed event, before anything is written. Produced by a pure function of the event and the routes."
    attributes:
      - { name: kind, type: enum, required: true, allowed_values: [jobs, unmapped] }
      - { name: jobs, type: list<PlannedJob>, required: false, constraints: "present when kind is jobs; may be empty for an audit-only route" }
    relationships:
      - { to: PlannedJob, cardinality: "one-to-many", direction: "EventPlan lists PlannedJob" }

  - name: PlannedJob
    description: "Value object: one job the relay will enqueue for one event."
    attributes:
      - { name: job_name, type: JobName, required: true }
      - { name: key, type: JobKey, required: true, constraints: "every relayed job carries a key" }
      - { name: data, type: JobEnvelope, required: true }

  - name: JobKey
    description: "Value object: the pg-boss singleton_key of a job. Opaque ids only."
    attributes:
      - { name: value, type: string, required: true, constraints: "default form <job>:<eventId> (C15); a route may name another form; never contains personal data or content" }

  - name: JobEnvelope
    description: "Value object: the job data the relay sends (C15). Its zod schema is U34's to add in packages/contracts."
    attributes:
      - { name: eventId, type: uuid, required: true, references: OutboxEvent.id }
      - { name: name, type: string, required: true, references: OutboxEvent.name }
      - { name: payload, type: json-object, required: true, constraints: "the outbox payload, passed through unchanged" }

  - name: EventOutcome
    description: "Value object: what happened to one event in a committed batch. The worker logs it after the commit."
    attributes:
      - { name: event_id, type: uuid, required: true }
      - { name: event_name, type: string, required: true }
      - { name: result, type: enum, required: true, allowed_values: [relayed, audit_only, unmapped, retry, dead] }
      - { name: jobs, type: "list<{job_name, status: enqueued | deduplicated}>", required: false }
      - { name: attempts, type: integer, required: true, min: 0 }
      - { name: error_code, type: enum, required: false, allowed_values: [job_not_enqueued, enqueue_error], constraints: "present for retry and dead" }

  - name: QueueDeclaration
    description: "New. One table in packages/database/src/queue/ that states, per job name, the queue policy and the per-job send defaults. Read by every process that creates a queue or sends a job (worker and web), so a queue gets the same policy whichever process creates it first."
    attributes:
      - { name: job_name, type: string, required: true, unique: true, constraints: "the C15 job names; any other name (test queues) falls back to the default entry" }
      - { name: policy, type: enum, required: true, allowed_values: [exclusive, stately, standard], default: exclusive, constraints: "stately only for a job that coalesces by entity key, standard only by a recorded decision of the job's owner" }
      - { name: retry_limit, type: integer, required: true, default: 5, constraints: "FD-076; evidence.process 3" }
      - { name: retry_backoff, type: boolean, required: true, default: true }
      - { name: retry_delay_seconds, type: integer, required: true, default: 10 }
      - { name: expire_in_seconds, type: integer, required: true, default: 300, constraints: "unchanged from main; evidence.process's 120 s bound is U24's" }
    constraints:
      - "Every C15 job is listed explicitly; today every entry is exclusive"

  - name: Queue
    description: "One row of pgboss.queue. Created by pg-boss createQueue from the QueueDeclaration; its policy cannot change after creation (pg-boss updateQueue refuses)."
    attributes:
      - { name: name, type: string, required: true, unique: true }
      - { name: policy, type: enum, required: true, allowed_values: [standard, short, singleton, stately, exclusive, key_strict_fifo] }
      - { name: partition, type: boolean, required: true, default: false, constraints: "false: jobs live in the common pgboss.job table, so creating a queue is DML only and rk_worker can do it" }
    constraints:
      - "An application queue whose policy differs from its QueueDeclaration entry is a configuration error (fail closed)"
      - "Internal pg-boss queues (__pgboss__*) are pg-boss's own and are not checked"
    relationships:
      - { to: QueueDeclaration, cardinality: "many-to-one", direction: "Queue is created from QueueDeclaration (by job name, or the default)" }
      - { to: Job, cardinality: "one-to-many", direction: "Queue holds Job" }

  - name: Job
    description: "One row of pgboss.job, written by pg-boss send (directly, or on a caller's transaction through the db option)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: name, type: string, required: true, references: Queue.name }
      - { name: data, type: json-object, required: true, constraints: "a JobEnvelope for relayed jobs" }
      - { name: singleton_key, type: string, required: false, constraints: "a JobKey; null only for pg-boss cron sends" }
      - { name: state, type: enum, required: true, allowed_values: [created, retry, active, completed, cancelled, failed] }
      - { name: policy, type: enum, required: true, constraints: "copied from the queue at insert" }
      - { name: retry_limit, type: integer, required: true }
      - { name: start_after, type: timestamp, required: true }
    constraints:
      - "Under exclusive: at most one job per (name, singleton_key) in created, retry or active; a null key counts as the empty key"
      - "A send that would break that constraint inserts nothing and returns null"
    relationships:
      - { to: Queue, cardinality: "many-to-one", direction: "Job belongs to Queue" }
      - { to: OutboxEvent, cardinality: "many-to-one", direction: "a relayed Job was produced by OutboxEvent (through JobEnvelope.eventId)" }

  - name: ResetRun
    description: "One run of runReset (pnpm db:reset, demo:reset, the integration-test global setup). Local and test databases only."
    attributes:
      - { name: database_url, type: string, required: true, constraints: "the rk_app-owned database; refused under APP_MODE=production" }
      - { name: dropped_schemas, type: list<identifier>, required: true, allowed_values: [pgboss, public], constraints: "both in one transaction, IF EXISTS each; drizzle is dropped separately as before" }
      - { name: lock_timeout_seconds, type: integer, required: true, default: 10, constraints: "CR-007" }
      - { name: drop_statement_timeout_seconds, type: integer, required: true, default: 60, constraints: "CR-007" }
      - { name: terminate_stale_backends, type: boolean, required: true, default: false, constraints: "true only from the test global setup, test databases only (CR-007)" }
      - { name: result, type: enum, required: true, allowed_values: [reset, refused, blocked] }
    constraints:
      - "blocked leaves both schemas exactly as they were"
      - "reset ends with migrate: pg-boss installed as rk_app, then every SQL migration from empty, 0006_pgboss_grants.sql included"

  - name: EnvLoad
    description: "The dotenv load at the top of apps/worker/src/env.ts and packages/database/src/env.ts."
    attributes:
      - { name: path, type: string, required: true, constraints: "the repository-root .env, resolved with path.resolve" }
      - { name: quiet, type: boolean, required: true, allowed_values: [true] }
    constraints:
      - "Writes nothing to stdout; variables already set in the environment are not overridden"
```

## Summary

- **Stored data, unchanged in shape:** `OutboxEvent` (`outbox_events`), `Queue` (`pgboss.queue`) and `Job` (`pgboss.job`). What changes is when `processed_at` is set (in the relay transaction, not at claim), which policy a queue is created with, and which key and data a relayed job carries.
- **New declaration:** `QueueDeclaration` states each job's policy (`exclusive` for every C15 job) and send defaults (5 retries, 3 for `evidence.process`) in one place shared by the worker and the web process.
- **Transient relay values:** `RelayBatch` (one transaction per tick, bounded), `EventPlan` and `PlannedJob` (the worker's pure decision), `JobKey` and `JobEnvelope` (the C15 forms), `EventOutcome` (what is logged after the commit).
- **Operations as entities:** `ResetRun` (drops `pgboss` and `public` together under CR-007's limits) and `EnvLoad` (quiet).
