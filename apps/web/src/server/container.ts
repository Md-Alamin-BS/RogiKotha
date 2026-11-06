// The web composition root (T-101 § 6.4, E9): the only file in apps/web that builds adapters. It
// is built on first use, never at module load, so `next build` needs no `.env` (BR7.2, F27), and
// it lives on `globalThis` so `next dev` reloads do not open a second pool.
import {
  createDirectoryModule,
  createReviewReadModule,
  createTaxonomyModule,
  MAIL_SEND_JOB,
  createIdentityModule,
  primeDummyCredential,
  type IdentityModule,
  type CommandPorts,
  type ConfigProvider,
  type Crypto,
  type DirectoryModule,
  type IdGenerator,
  type ReviewReadModule,
  type TaxonomyModule,
} from '@rogikotha/application';
import { DEFAULT_CONFIG_VALUES, newId, newPublicId } from '@rogikotha/contracts';
import {
  createArgon2PasswordHasher,
  createCrypto,
  createMemoryRateLimiter,
} from '@rogikotha/adapters';
import {
  createInterimPublicEvidenceCount,
  PgAccountRepository,
  PgAuditWriter,
  PgBossQueue,
  PgEmailDeliveryRepository,
  PgIdentityRepository,
  PgJobQueue,
  PgOutbox,
  PgPrivateIdentityRepository,
  PgUnitOfWork,
  PgDirectoryModuleRepository,
  PgReviewReadRepository,
  PgTaxonomyModuleRepository,
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
  /** U46: the directory and taxonomy queries; the read-side Review stub behind their two ports. */
  directory: DirectoryModule;
  taxonomy: TaxonomyModule;
  reviewReads: ReviewReadModule;
  /**
   * C19. Actions may call `renameNamedCommand` only; `ownership` is for the review and community
   * factories that U47 and U49 build here (BR3.5, BR3.6).
   */
  identity: IdentityModule;
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

  // U46 (functional-spec § 6): the interim PublicEvidenceCount keeps today's public meaning until
  // U48 binds Evidence's implementation here.
  const reviewReads = createReviewReadModule({
    reviews: new PgReviewReadRepository(),
    evidence: createInterimPublicEvidenceCount(db),
    config: ports.config,
  });
  const directory = createDirectoryModule({
    directory: new PgDirectoryModuleRepository(),
    providerExperience: reviewReads.providerExperience,
    audit: ports.audit,
    outbox: ports.outbox,
    ids,
    clock,
  });
  const taxonomy = createTaxonomyModule({
    taxonomy: new PgTaxonomyModuleRepository(),
    conditionStats: reviewReads.conditionStats,
    audit: ports.audit,
    outbox: ports.outbox,
    ids,
  });

  // BR3.2: the private repository goes to the identity module and nowhere else; it is not a
  // `CommandPorts` field.
  const identity = createIdentityModule({
    identities: new PgIdentityRepository(),
    privateIdentities: new PgPrivateIdentityRepository().asPort(),
    crypto: ports.crypto,
    logger,
  });

  return { env, ports, auth, directory, taxonomy, reviewReads, identity };
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
