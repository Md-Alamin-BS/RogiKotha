// The Evidence module (U48, C8 release 1, C17). The web container builds it with the file writer
// and the review seams; the worker's processor and sweep factories join it with their jobs.
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
import type { EvidenceModuleDeps } from './ports';
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

export type { CheckUploadOutput, IntakeOutput };
