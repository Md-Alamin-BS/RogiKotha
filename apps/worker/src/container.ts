// Composition root (task step 5). Wires the worker's own adapters —
// database connection, outbox reader, job queue, logger, clock, and for
// `mail.send` the mail-key crypto, the SMTP transport and the email catalog
// (T-101 § 10.6). No auth, identity, or data-request modules are imported
// here, ever.
// boundary: worker composition — see 01-conventions §2 (AD-6: "the worker
// has no application session, identity-reveal, public-delete, or general
// database credentials"). `container.test.ts` greps this package's source
// for the auth library and the two forbidden commands, as a second net
// behind the boundary lint (T-010).
import {
  createClamdScanner,
  createCrypto,
  createFsEvidenceReader,
  createSmtpMailTransport,
} from '@rogikotha/adapters';
import type { Crypto, EmailCatalog, MailTransport } from '@rogikotha/application';
import {
  createProcessEvidence,
  createSweepEvidence,
  sendEmailDelivery,
} from '@rogikotha/application/worker';
import type {
  EvidenceProcessorDeps,
  ProcessEvidenceInput,
  ProcessEvidenceResult,
  SweepEvidenceResult,
} from '@rogikotha/application/worker';
import {
  PgBossQueue,
  PgEmailDeliveryRepository,
  PgEvidenceRepository,
  PgOutbox,
  PgOutboxRelayStore,
  PgUnitOfWork,
  closeDb,
  createDb,
} from '@rogikotha/database';
import type { Db, RelayStore } from '@rogikotha/database';

import { buildEmailCatalog } from './email-catalog.js';
import type { WorkerEnv } from './env.js';
import type { MailSendJob } from './handlers/mail-send.js';
import { JsonLogger, type Logger } from './logger.js';

/** No demo-clock adapter exists yet (`packages/adapters/src/clock/` is a
 * future task — see 00-master-plan.md §4's layout). ASSUMPTION(T-009): a
 * plain system clock, swapped for the real demo-clock-aware adapter when
 * one exists. `mail.send` stamps `sent_at` with it. */
export interface Clock {
  now(): Date;
}

class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** Thrown so pg-boss retries a `mail.send` job; its message carries the code and count only. */
export class MailRetry extends Error {
  constructor(
    readonly errorCode: string,
    readonly attempts: number,
  ) {
    super(`mail.send retry: ${errorCode} after ${attempts} attempts`);
    this.name = 'MailRetry';
  }
}

export interface WorkerContainer {
  db: Db;
  outbox: PgOutbox;
  relayStore: RelayStore;
  queue: PgBossQueue;
  logger: Logger;
  clock: Clock;
  /** Built from `MAIL_RECIPIENT_KEY` only and without a MAC secret (FD-095, review point 6). */
  mailCrypto: Crypto;
  mailTransport: MailTransport;
  emailCatalog: EmailCatalog;
  /** One `mail.send` job through the application use case; throws to ask pg-boss for a retry. */
  sendEmail(job: MailSendJob): Promise<void>;
  /** What the processor is built from: the file reader and the scanner, no writer, no filename seal. */
  evidenceDeps: EvidenceProcessorDeps;
  /** One `evidence.process` attempt; throws to ask pg-boss for a retry. */
  processEvidence(input: ProcessEvidenceInput): Promise<ProcessEvidenceResult>;
  /** One `evidence.sweep` run. */
  sweepEvidence(): Promise<SweepEvidenceResult>;
  close(): Promise<void>;
}

export function buildContainer(env: WorkerEnv): WorkerContainer {
  const logger = new JsonLogger();
  const { db, pool } = createDb(env.DATABASE_URL_WORKER);
  const outbox = new PgOutbox();
  // `migrate`/`createSchema`/`reindex` all default to `false` — `rk_worker`
  // owns no DDL rights on the `pgboss` schema; `packages/database/src/migrate.ts`
  // installs and migrates it as `rk_app` before the worker ever starts.
  const queue = new PgBossQueue(env.DATABASE_URL_WORKER, logger);
  const relayStore = new PgOutboxRelayStore(pool, queue, outbox);
  const clock = new SystemClock();

  const mailCrypto = createCrypto({ encryptionKey: env.MAIL_RECIPIENT_KEY });
  const mailTransport = createSmtpMailTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    from: env.MAIL_FROM,
  });
  const emailCatalog = buildEmailCatalog();
  const mailDeps = {
    unitOfWork: new PgUnitOfWork(db),
    deliveries: new PgEmailDeliveryRepository(),
    mailCrypto,
    transport: mailTransport,
    catalog: emailCatalog,
    clock,
    logger,
  };

  const evidenceDeps: EvidenceProcessorDeps = {
    unitOfWork: mailDeps.unitOfWork,
    evidenceRepository: new PgEvidenceRepository(),
    files: createFsEvidenceReader(env.STORAGE_ROOT),
    scanner: createClamdScanner({ host: env.CLAMD_HOST, port: env.CLAMD_PORT }),
    outbox,
    clock,
    logger,
    // The worker's `hash` is SHA-256 and needs no MAC key.
    hasher: mailCrypto,
  };
  const processEvidence = createProcessEvidence(evidenceDeps);
  const sweepEvidence = createSweepEvidence(evidenceDeps);

  return {
    db,
    outbox,
    relayStore,
    queue,
    logger,
    clock,
    mailCrypto,
    mailTransport,
    emailCatalog,
    evidenceDeps,
    processEvidence,
    sweepEvidence,
    sendEmail: async (job) => {
      const outcome = await sendEmailDelivery(job, mailDeps);
      if (outcome.status === 'retry') throw new MailRetry(outcome.errorCode, outcome.attempts);
    },
    async close() {
      await queue.stop();
      await closeDb(pool);
    },
  };
}
