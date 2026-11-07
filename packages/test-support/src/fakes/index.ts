export * from './clock.js';
export * from './ids.js';
export * from './crypto.js';
export * from './hasher.js';
export * from './mailer.js';
export * from './storage.js';
export * from './scanner.js';
export * from './image-sanitiser.js';
export * from './job-queue.js';
export * from './outbox.js';
export * from './search-index.js';
export * from './rate-limiter.js';
export * from './logger.js';
export * from './config-provider.js';
export * from './audit-writer.js';
export * from './repositories.js';
export * from './auth-store.js';
export * from './auth-gateway.js';
export * from './email-delivery-repository.js';
export * from './unit-of-work.js';
export * from './command-ports.js';
export * from './directory-repositories.js';
export * from './directory-ports.js';
export { FakeIdentityStore, makeIdentityPorts, type FakePersonaLink } from './identity.js';
export * from './review-repository.js';

import { ListAuditWriter } from './audit-writer.js';
import { FakeClock } from './clock.js';
import { StaticConfigProvider } from './config-provider.js';
import { FakeCrypto } from './crypto.js';
import { FastHasher } from './hasher.js';
import { SequentialIds } from './ids.js';
import { PassthroughImageSanitiser } from './image-sanitiser.js';
import { MemoryJobQueue } from './job-queue.js';
import { CollectingLogger } from './logger.js';
import { RecordingMailTransport } from './mailer.js';
import { ListOutbox } from './outbox.js';
import { AlwaysAllowRateLimiter } from './rate-limiter.js';
import {
  FakeAccountRepository,
  FakeAuditRepository,
  FakeCommunityRepository,
  FakeConfigRepository,
  FakeDataRequestRepository,
  FakeDirectoryRepository,
  FakeEvidenceRepository,
  FakeIdentityRepository,
  FakeModerationRepository,
  FakeNotificationRepository,
  FakeRetentionRepository,
  FakeReviewRepository,
  FakeTaxonomyRepository,
} from './repositories.js';
import { ScriptedScanner } from './scanner.js';
import { NaiveSearchIndex } from './search-index.js';
import { MemoryStorage } from './storage.js';

/**
 * Wires one instance of every fake port together (task step 5: "Export
 * `makeFakePorts()` returning all of them wired together"). Application
 * command tests construct one of these per test and pass the pieces they
 * need to the command under test.
 */
export function makeFakePorts() {
  return {
    clock: new FakeClock(),
    ids: new SequentialIds(),
    crypto: new FakeCrypto(),
    hasher: new FastHasher(),
    mailTransport: new RecordingMailTransport(),
    storage: new MemoryStorage(),
    scanner: new ScriptedScanner(),
    imageSanitiser: new PassthroughImageSanitiser(),
    jobQueue: new MemoryJobQueue(),
    outbox: new ListOutbox(),
    searchIndex: new NaiveSearchIndex(),
    rateLimiter: new AlwaysAllowRateLimiter(),
    logger: new CollectingLogger(),
    configProvider: new StaticConfigProvider(),
    auditWriter: new ListAuditWriter(),
    repositories: {
      account: new FakeAccountRepository(),
      identity: new FakeIdentityRepository(),
      directory: new FakeDirectoryRepository(),
      taxonomy: new FakeTaxonomyRepository(),
      review: new FakeReviewRepository(),
      evidence: new FakeEvidenceRepository(),
      community: new FakeCommunityRepository(),
      moderation: new FakeModerationRepository(),
      notification: new FakeNotificationRepository(),
      config: new FakeConfigRepository(),
      retention: new FakeRetentionRepository(),
      dataRequests: new FakeDataRequestRepository(),
      audit: new FakeAuditRepository(),
    },
  };
}
export * from './community-repository.js';
