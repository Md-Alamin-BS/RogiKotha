// The web composition root (T-101 § 6.4, E9): the only file in apps/web that builds adapters. It
// is built on first use, never at module load, so `next build` needs no `.env` (BR7.2, F27), and
// it lives on `globalThis` so `next dev` reloads do not open a second pool.
import {
  MAIL_SEND_JOB,
  primeDummyCredential,
  type CommandPorts,
  type ConfigProvider,
  type Crypto,
  type IdGenerator,
} from '@rogikotha/application';
import { DEFAULT_CONFIG_VALUES, newId, newPublicId } from '@rogikotha/contracts';
import {
  createArgon2PasswordHasher,
  createCrypto,
  createMemoryRateLimiter,
} from '@rogikotha/adapters';
import {
  PgAccountRepository,
  PgAuditWriter,
  PgBossQueue,
  PgEmailDeliveryRepository,
  PgJobQueue,
  PgOutbox,
  PgUnitOfWork,
} from '@rogikotha/database';

import { createAfterResponse } from './after-response';
import { createAuthGateway } from './better-auth/gateway';
import { createAuthInstance, type AuthInstance } from './better-auth/instance';
import { getDb } from './db';
import { readWebEnv, type WebEnv } from './env';
import { createWebLogger } from './logger';

export interface WebContainer {
  env: WebEnv;
  ports: CommandPorts;
  /** For the `/api/auth` route and the session cookie names only; commands use the gateway. */
  auth: AuthInstance;
}

/** BR7.4: defaults only until T-105 gives the runtime settings. */
const defaultsOnlyConfig: ConfigProvider = {
  current: () => Promise.resolve(DEFAULT_CONFIG_VALUES),
};

const ids: IdGenerator = { newId, newPublicId };

function buildContainer(): WebContainer {
  const env = readWebEnv();
  const db = getDb();
  const logger = createWebLogger();
  const clock = { now: () => new Date() };
  const hasher = createArgon2PasswordHasher();
  // WF4 step 4: the dummy hash is made once at start, so no unknown-address sign-in pays for it.
  primeDummyCredential(hasher).catch(() => logger.error('auth.dummy_credential_failed'));
  const accounts = new PgAccountRepository();
  const unitOfWork = new PgUnitOfWork(db);

  const auth = createAuthInstance({
    db,
    secret: env.betterAuthSecret,
    appUrl: env.appUrl,
    hasher,
    logger,
    accountStatusOf: async (authUserId) =>
      (await unitOfWork.read((tx) => accounts.findProfileByAuthUserId(tx, authUserId)))?.status ??
      null,
  });

  // The web only sends jobs; the worker runs pg-boss maintenance and schedules.
  const jobQueue = new PgJobQueue(
    new PgBossQueue(
      env.databaseUrl,
      {
        error: (event: string) => logger.error(event),
        warn: (event: string) => logger.warn(event),
        info: (event: string) => logger.info(event),
      },
      { supervise: false, schedule: false },
    ),
  );
  // WF12 step 1: ensured at start; `defineCommand` ensures again before a mail-sending command.
  jobQueue
    .ensure(MAIL_SEND_JOB)
    .catch(() => logger.error('queue.ensure_failed', { purpose: MAIL_SEND_JOB }));

  const ports: CommandPorts = {
    unitOfWork,
    authGateway: createAuthGateway(auth, logger),
    hasher,
    rateLimiter: createMemoryRateLimiter(clock),
    config: defaultsOnlyConfig,
    crypto: createCrypto({ encryptionKey: env.encryptionKey, macSecret: env.betterAuthSecret }),
    // FD-095: the mail-only key encrypts recipients and nothing else; it has no MAC key.
    mailCrypto: createCrypto({ encryptionKey: env.mailRecipientKey }),
    clock,
    ids,
    sleeper: { sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) },
    jobQueue,
    outbox: new PgOutbox(),
    audit: new PgAuditWriter(),
    logger,
    afterResponse: createAfterResponse(logger),
    accounts,
    deliveries: new PgEmailDeliveryRepository(),
    app: { appUrl: env.appUrl, termsVersion: env.termsVersion },
  };

  return { env, ports, auth };
}

/**
 * The `Crypto` adapter on one key, for the demo's column encryption in `crypto.ts` (ISS-391),
 * which reads APP_ENCRYPTION_KEY per call. Only this file may build adapters.
 */
export function createColumnCrypto(encryptionKey: Uint8Array): Crypto {
  return createCrypto({ encryptionKey });
}

const globalForContainer = globalThis as typeof globalThis & { __rkWebContainer?: WebContainer };

export function getContainer(): WebContainer {
  globalForContainer.__rkWebContainer ??= buildContainer();
  return globalForContainer.__rkWebContainer;
}
