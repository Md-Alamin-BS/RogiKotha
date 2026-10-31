import { newId, newPublicId } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { doctorChambers, doctors, facilities, facilityBranches } from '../schema/directory';
import { personas } from '../schema/identity';
import { facilityReviews } from '../schema/review';
import { testDb } from '../test-setup';
import { getDoctor } from './doctors';
import { getFacility, listFacilities } from './facilities';

async function buildFacility(name: string, branches: string[]) {
  const [facility] = await testDb
    .insert(facilities)
    .values({
      publicId: newPublicId(),
      nameEn: name,
      nameBn: `${name} (bn)`,
      type: 'hospital',
      state: 'published',
    })
    .returning({ id: facilities.id });
  const rows = await testDb
    .insert(facilityBranches)
    .values(
      branches.map((branch) => ({
        publicId: newPublicId(),
        facilityId: facility!.id,
        nameEn: branch,
        nameBn: branch === name ? `${name} (bn)` : `${branch} (bn)`,
        cityEn: 'Dhaka',
        cityBn: 'ঢাকা',
        areaEn: null,
        areaBn: null,
        state: 'published' as const,
      })),
    )
    .returning({ id: facilityBranches.id, publicId: facilityBranches.publicId });
  return rows;
}

async function buildVisit(branchId: string, state: 'published' | 'hidden' = 'published') {
  const [persona] = await testDb
    .insert(personas)
    .values({
      kind: 'named',
      displayName: `Visitor ${newId().slice(-6)}`,
      username: `v_${newId().slice(-8)}`,
    })
    .returning({ id: personas.id });
  await testDb.insert(facilityReviews).values({
    publicId: newPublicId(),
    authorPersonaId: persona!.id,
    branchId,
    identityMode: 'named',
    periodYear: 2026,
    periodMonth: 2,
    body: 'The queue moved quickly and the staff explained the bill.',
    criteria: { staff: 'good', overall: 'mixed', waiting: null },
    state,
    publishedAt: state === 'published' ? new Date() : null,
  });
}

describe('listFacilities and getFacility', () => {
  it('lists every published branch with only its published visits counted', async () => {
    const suffix = newId().slice(-6);
    const [main] = await buildFacility(`AAA Synthetic Hospital ${suffix}`, [
      `AAA Synthetic Hospital ${suffix}`,
    ]);
    await buildVisit(main!.id);
    await buildVisit(main!.id, 'hidden');

    const rows = await listFacilities(testDb, 'en');
    const row = rows.find((r) => r.publicId === main!.publicId);
    expect(row).toMatchObject({
      branchName: null,
      visitCount: 1,
      type: 'hospital',
      city: 'Dhaka',
      area: null,
    });
  });

  it('opens one branch with its answered criteria, doctors there and sibling branches', async () => {
    const suffix = newId().slice(-6);
    const [uttara, dhanmondi] = await buildFacility(`Synthetic Group ${suffix}`, [
      'Uttara branch',
      'Dhanmondi branch',
    ]);
    await buildVisit(uttara!.id);
    const [doctor] = await testDb
      .insert(doctors)
      .values({
        publicId: newPublicId(),
        nameEn: `Dr. Chamber Doctor ${suffix}`,
        nameBn: `ডা. চেম্বার ${suffix}`,
        nameKey: `drchamber${suffix}`,
        state: 'published',
      })
      .returning({ id: doctors.id });
    await testDb.insert(doctorChambers).values({
      doctorId: doctor!.id,
      branchId: uttara!.id,
      nameEn: 'Uttara chamber',
      nameBn: 'উত্তরা চেম্বার',
      provenance: 'community',
    });

    const detail = await getFacility(testDb, uttara!.publicId, 'bn');

    expect(detail).toMatchObject({
      branchName: 'Uttara branch (bn)',
      visitCount: 1,
      address: null,
    });
    expect(detail?.visits[0]?.criteria).toEqual([
      { criterion: 'staff', value: 'good' },
      { criterion: 'overall', value: 'mixed' },
    ]);
    expect(detail?.doctors.map((d) => d.name)).toEqual([`ডা. চেম্বার ${suffix}`]);
    expect(detail?.siblings.map((s) => s.publicId)).toEqual([dhanmondi!.publicId]);

    // Facility visits never reach the doctor's own counts (PRODUCT.md hard rule).
    const doctorDetail = await getDoctor(testDb, doctor!.id, 'en');
    expect(doctorDetail?.publishedReviewCount).toBe(0);
  });

  it('answers a malformed or unknown public id with null, without querying by it', async () => {
    expect(await getFacility(testDb, "x' or 1=1 --", 'en')).toBeNull();
    expect(await getFacility(testDb, newPublicId(), 'en')).toBeNull();
  });
});
