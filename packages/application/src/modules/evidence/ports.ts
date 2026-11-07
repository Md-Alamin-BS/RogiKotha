// What the Evidence module factories receive (U48 functional-spec § 2). The web module holds the
// file writer and never the reader (BR3.6); the worker's processor and sweep hold the reader, no
// filename seal and no review seams. The request-scoped ids, outbox and audit writer of a web
// command come from `CommandPorts` at call time, as in the Review module.
import type {
  Clock,
  EvidenceFileReader,
  EvidenceFileWriter,
  EvidenceRepository,
  Logger,
  Outbox,
  RateLimiter,
  ScannerPort,
  UnitOfWork,
} from '../../ports';
import type { ReviewSeams } from '../review';

/** Seals the cleaned file name before storage and opens it for its author only (BR2.6). */
export interface FilenameSeal {
  seal(name: string): Uint8Array;
  /** Null when the sealed bytes cannot be opened. */
  open(sealed: Uint8Array): string | null;
}

export type EvidenceReviewSeams = Pick<
  ReviewSeams,
  'reviewIdForPublicId' | 'isReviewAuthor' | 'isReviewPublished'
>;

export interface EvidenceModuleDeps {
  unitOfWork: UnitOfWork;
  evidenceRepository: EvidenceRepository;
  files: EvidenceFileWriter;
  filenameSeal: FilenameSeal;
  rateLimiter: RateLimiter;
  clock: Clock;
  logger: Logger;
  review: EvidenceReviewSeams;
}

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
}

export type EvidenceSweepDeps = Omit<EvidenceProcessorDeps, 'scanner'>;
