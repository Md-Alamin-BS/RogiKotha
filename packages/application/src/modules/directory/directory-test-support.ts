// The `test-support` fakes U46's application tests use, reached by path as `fakes-test-support.ts`
// does (test-support depends on application, so a package dependency back would be a cycle).
import type { Actor } from '@rogikotha/contracts';

import {
  anAccountActor,
  anAnonymousActor,
  makeCommandPorts,
} from '../../../../test-support/src/fakes/command-ports.js';
import {
  FakeConditionStats,
  FakeProviderExperience,
  FakePublicEvidenceCount,
} from '../../../../test-support/src/fakes/directory-ports.js';
import { makeDirectoryFakes } from '../../../../test-support/src/fakes/directory-repositories.js';
import { createReviewReadModule } from '../review';
import { createTaxonomyModule } from '../taxonomy';
import { createDirectoryModule } from '.';

export {
  aDistributionVM,
  aConditionFigures,
  aDoctorExperience,
  aDoctorSummary,
  aBranchSummary,
  FakeConditionStats,
  FakeProviderExperience,
  FakePublicEvidenceCount,
} from '../../../../test-support/src/fakes/directory-ports.js';
export {
  aBranchRecord,
  aChamberRecord,
  aDoctorRecord,
  aTermRecord,
  makeDirectoryFakes,
} from '../../../../test-support/src/fakes/directory-repositories.js';
export { anAccountActor, anAnonymousActor, makeCommandPorts };

/** Directory and Taxonomy on scripted port fakes, for the module tests. */
export function makeModuleWorld() {
  const world = makeCommandPorts();
  const repos = makeDirectoryFakes();
  world.fakes.unitOfWork.enlist(repos.directory);
  world.fakes.unitOfWork.enlist(repos.taxonomy);
  const providerExperience = new FakeProviderExperience();
  const conditionStats = new FakeConditionStats();
  const shared = {
    audit: world.fakes.audit,
    outbox: world.fakes.outbox,
    ids: world.fakes.ids,
  };
  const directory = createDirectoryModule({
    directory: repos.directory,
    providerExperience,
    clock: world.fakes.clock,
    ...shared,
  });
  const taxonomy = createTaxonomyModule({ taxonomy: repos.taxonomy, conditionStats, ...shared });
  return { ...world, repos, providerExperience, conditionStats, directory, taxonomy };
}

/** The read-side Review stub on the repository fakes, for the stub's own tests. */
export function makeReviewWorld() {
  const world = makeCommandPorts();
  const repos = makeDirectoryFakes();
  const evidence = new FakePublicEvidenceCount();
  const review = createReviewReadModule({
    reviews: repos.reviews,
    evidence,
    config: world.fakes.config,
  });
  return { ...world, repos, evidence, review };
}

export function readerIn(locale: 'en' | 'bn'): Actor {
  return anAnonymousActor({ locale });
}

/** Every key at any depth of a value, for the projection scans (BR2.9, BR2.10). */
export function deepKeys(value: unknown, into: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) deepKeys(item, into);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      into.push(key);
      deepKeys(item, into);
    }
  }
  return into;
}

export const FAKE_TX = {} as never;
