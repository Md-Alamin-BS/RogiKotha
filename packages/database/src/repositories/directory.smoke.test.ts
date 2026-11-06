// Cumulative smoke (U46, BR8.2): the directory read path from the module queries down to the
// migrated test database. Rows from other files may exist, so each check looks up its own records.
import {
  createDirectoryModule,
  createReviewReadModule,
  type CommandCall,
  type CommandPorts,
} from '@rogikotha/application';
import { DEFAULT_CONFIG_VALUES, type Actor, type Locale } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { testDb } from '../test-setup';
import { PgUnitOfWork } from '../unit-of-work';
import { PgDirectoryModuleRepository } from './directory-module';
import {
  buildAccount,
  buildBranch,
  buildChamber,
  buildDoctor,
  buildFacility,
  buildFacilityReview,
  buildPersona,
  buildReview,
  buildSubmission,
} from './directory-test-support';
import { createInterimPublicEvidenceCount } from './public-evidence-count-interim';
import { PgReviewReadRepository } from './review-reads';

// The reads never write, mint ids or read the clock; a call into any of these fails the smoke.
const unused = new Proxy(
  {},
  {
    get: (_target, key) => () => {
      throw new Error(`directory smoke: a read called ${String(key)}`);
    },
  },
) as never;

const reviewReads = createReviewReadModule({
  reviews: new PgReviewReadRepository(),
  evidence: createInterimPublicEvidenceCount(testDb),
  config: { current: () => Promise.resolve(DEFAULT_CONFIG_VALUES) },
});
const directory = createDirectoryModule({
  directory: new PgDirectoryModuleRepository(),
  providerExperience: reviewReads.providerExperience,
  audit: unused,
  outbox: unused,
  ids: unused,
  clock: unused,
});

// Queries reach only the unit of work, and the logger when a read throws.
const ports = {
  unitOfWork: new PgUnitOfWork(testDb),
  logger: { error: () => undefined, warn: () => undefined, info: () => undefined },
} as unknown as CommandPorts;

function readerIn(locale: Locale): CommandCall {
  const actor: Actor = {
    kind: 'anonymous',
    capabilities: [],
    locale,
    correlationId: 'corr-directory-smoke',
  };
  return {
    actor,
    request: { headers: new Headers(), clientAddress: null, sessionId: null },
    ports,
  };
}

async function profileOf(publicId: string) {
  const result = await directory.getDoctor.execute({ publicId }, readerIn('en'));
  if (!result.ok) throw new Error(`directory.getDoctor: ${result.error.code}`);
  return result.data;
}

describe('directory smoke', () => {
  it('marks every doctor card "Registration not verified" in both languages', async () => {
    await buildDoctor(testDb);

    for (const locale of ['en', 'bn'] as const) {
      const page = await directory.listDoctors.execute({}, readerIn(locale));
      expect(page.ok).toBe(true);
      if (!page.ok) return;
      expect(page.data.items.length).toBeGreaterThan(0);
      expect(page.data.items.every((card) => card.registrationNotVerified === true)).toBe(true);
    }
  });

  it('marks a doctor with a pending submission as member-added, and only while it is pending', async () => {
    const account = await buildAccount(testDb);
    const pending = await buildDoctor(testDb);
    const approved = await buildDoctor(testDb);
    await buildSubmission(testDb, pending.id, account.accountId);
    await buildSubmission(testDb, approved.id, account.accountId, { status: 'approved' });

    expect((await profileOf(pending.publicId)).memberAddedNotConfirmed).toBe(true);
    expect((await profileOf(approved.publicId)).memberAddedNotConfirmed).toBe(false);
  });

  it('keeps facility feedback out of the doctor’s figures', async () => {
    const doctor = await buildDoctor(testDb);
    const persona = await buildPersona(testDb);
    const facility = await buildFacility(testDb);
    const branch = await buildBranch(testDb, facility.id);
    await buildChamber(testDb, doctor.id, branch.id);
    await buildReview(testDb, doctor.id, persona, { branchId: branch.id });
    const before = await profileOf(doctor.publicId);

    for (let i = 0; i < 6; i += 1) await buildFacilityReview(testDb, branch.id, persona);
    const after = await profileOf(doctor.publicId);

    expect(after.accountsTotal).toBe(before.accountsTotal);
    expect(after.sentiment).toEqual(before.sentiment);
    expect(after.documentsCount).toBe(before.documentsCount);
  });
});
