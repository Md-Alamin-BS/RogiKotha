// The Evidence module (U48, C8 release 1, C17). The web container builds it with the file writer
// and the review seams; the worker builds the processor and the sweep with the reader.
import type {
  AdmitUploadInput,
  CheckUploadInput,
  GetForAuthorInput,
  IntakeCommandInput,
  OwnEvidenceList,
  RemoveEvidenceInput,
} from '@rogikotha/contracts';

import type { Command } from '../../command';
import type { PublicEvidenceCount } from '../../ports';
import { admitUploadCommand } from './commands/admit-upload';
import { checkUploadQuery, type CheckUploadOutput } from './commands/check-upload';
import { intakeEvidenceCommand, type IntakeOutput } from './commands/intake-evidence';
import { removeEvidenceCommand } from './commands/remove-evidence';
import {
  createProcessEvidence,
  type ProcessEvidenceInput,
  type ProcessEvidenceResult,
} from './jobs/process-evidence';
import { createSweepEvidence, type SweepEvidenceResult } from './jobs/sweep-evidence';
import type { EvidenceModuleDeps, EvidenceProcessorDeps, EvidenceSweepDeps } from './ports';
import { createPublicEvidenceCount } from './queries/count-public-evidence';
import { getForAuthorQuery } from './queries/get-for-author';

export interface EvidenceModule {
  admitUpload: Command<AdmitUploadInput, Record<string, never>>;
  checkUpload: Command<CheckUploadInput, CheckUploadOutput>;
  intake: Command<IntakeCommandInput, IntakeOutput>;
  getForAuthor: Command<GetForAuthorInput, OwnEvidenceList | null>;
  remove: Command<RemoveEvidenceInput, Record<string, never>>;
  /** C17: bound in the container in place of U46's interim count. */
  publicEvidenceCount: PublicEvidenceCount;
}

export function createEvidenceModule(deps: EvidenceModuleDeps): EvidenceModule {
  return {
    admitUpload: admitUploadCommand(deps),
    checkUpload: checkUploadQuery(deps),
    intake: intakeEvidenceCommand(deps),
    getForAuthor: getForAuthorQuery(deps),
    remove: removeEvidenceCommand(deps),
    publicEvidenceCount: createPublicEvidenceCount(deps),
  };
}

export interface EvidenceProcessor {
  /** Throws `ScannerUnavailable`, or any error before the last attempt, so pg-boss retries. */
  process(input: ProcessEvidenceInput): Promise<ProcessEvidenceResult>;
}

/** The worker's processor: the file reader and the scanner, no writer and no filename seal. */
export function createEvidenceProcessor(deps: EvidenceProcessorDeps): EvidenceProcessor {
  return { process: createProcessEvidence(deps) };
}

export interface EvidenceSweep {
  sweep(): Promise<SweepEvidenceResult>;
}

export function createEvidenceSweep(deps: EvidenceSweepDeps): EvidenceSweep {
  return { sweep: createSweepEvidence(deps) };
}

export type {
  CheckUploadOutput,
  IntakeOutput,
  ProcessEvidenceInput,
  ProcessEvidenceResult,
  SweepEvidenceResult,
};
