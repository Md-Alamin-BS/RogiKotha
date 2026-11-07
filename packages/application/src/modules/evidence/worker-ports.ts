// What the worker's processor and sweep receive (U48 functional-spec § 2). Kept apart from
// `ports.ts` so the `@rogikotha/application/worker` import graph stays clear of the review module
// (BR8.6); `ports.ts` re-exports both types.
import type {
  Clock,
  Crypto,
  EvidenceFileReader,
  EvidenceRepository,
  Logger,
  Outbox,
  ScannerPort,
  UnitOfWork,
} from '../../ports';

// ASSUMPTION(U48): § 2 lists no outbox for the worker objects, but BR4.7 has every state change
// write its outbox row in the same transaction, and the worker has no `CommandPorts`.
export interface EvidenceProcessorDeps {
  unitOfWork: UnitOfWork;
  evidenceRepository: EvidenceRepository;
  files: EvidenceFileReader;
  scanner: ScannerPort;
  outbox: Outbox;
  clock: Clock;
  logger: Logger;
  // ASSUMPTION(U48): § 2 names no hasher, but BR4.3 re-checks the sha256 and `application` has no
  // crypto of its own; the worker passes its existing `mailCrypto`, whose `hash` is SHA-256.
  hasher: Pick<Crypto, 'hash'>;
}

export type EvidenceSweepDeps = Omit<EvidenceProcessorDeps, 'scanner' | 'hasher'>;
