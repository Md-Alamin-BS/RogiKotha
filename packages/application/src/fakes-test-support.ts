// The `test-support` fakes this package's tests use (T-101 § 11, FD-040). Reached by path:
// `test-support` already depends on `application`, so a package dependency back would be a cycle.
// ASSUMPTION(T-101): a relative import is the narrower option; the boundary rules allow it for tests.
export {
  anAccountActor,
  anAnonymousActor,
  FAKE_APP_URL,
  FAKE_TERMS_VERSION,
  makeCommandPorts,
  type FakeAccount,
  type FakeCommandWorld,
} from '../../test-support/src/fakes/command-ports.js';
export { sessionHeaders, FAKE_SESSION_COOKIE } from '../../test-support/src/fakes/auth-gateway.js';
export { FakeCrypto } from '../../test-support/src/fakes/crypto.js';
export { FakeClock } from '../../test-support/src/fakes/clock.js';
export { CollectingLogger } from '../../test-support/src/fakes/logger.js';
export { RecordingMailTransport } from '../../test-support/src/fakes/mailer.js';
export { FastHasher } from '../../test-support/src/fakes/hasher.js';
export { InMemoryUnitOfWork } from '../../test-support/src/fakes/unit-of-work.js';
export { FakeEmailDeliveryRepository } from '../../test-support/src/fakes/email-delivery-repository.js';
export { aConfig } from '../../test-support/src/builders/config.js';
export {
  FakeIdentityRepository,
  FakeIdentityStore,
  FakePrivateIdentityRepository,
  makeIdentityPorts,
} from '../../test-support/src/fakes/identity.js';
export { aPersonaRecord } from '../../test-support/src/builders/persona.js';
