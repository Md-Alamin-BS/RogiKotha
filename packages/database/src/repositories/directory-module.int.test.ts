import { doctorNameKey, newId, newPublicId } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { doctorChambers, doctors, facilityBranches, profileSubmissions } from '../schema/directory';
import { testDb } from '../test-setup';
import { appTxOf } from '../unit-of-work';
import { PgDirectoryModuleRepository } from './directory-module';
import {
  buildAccount,
  buildBranch,
  buildChamber,
  buildDoctor,
  buildFacility,
  buildSubmission,
  buildTerm,
  uniqueSuffix,
} from './directory-test-support';

const repo = new PgDirectoryModuleRepository();
const tx = appTxOf(testDb);
const ALL = { page: 1, pageSize: 10_000, locale: 'en' as const };

describe('PgDirectoryModuleRepository doctor reads', () => {
  it('finds a visible doctor with its specialty names and chambers in chamber order', async () => {
    const specialty = await buildTerm(testDb, {
      kind: 'specialty',
      nameEn: 'Endocrinology',
      nameBn: 'এন্ডোক্রাইনোলজি',
    });
    const doctor = await buildDoctor(testDb, { specialtyId: specialty.id });
    const facility = await buildFacility(testDb);
    const visible = await buildBranch(testDb, facility.id);
    const hidden = await buildBranch(testDb, facility.id, { state: 'hidden' });
    await buildChamber(testDb, doctor.id, hidden.id, 1, 'Second chamber');
    await buildChamber(testDb, doctor.id, visible.id, 0, 'First chamber');
    await buildChamber(testDb, doctor.id, null, 2, 'Third chamber');

    const found = await repo.findDoctorByPublicId(tx, doctor.publicId);

    expect(found?.specialtyEn).toBe('Endocrinology');
    expect(found?.specialtyBn).toBe('এন্ডোক্রাইনোলজি');
    expect(found?.chambers.map((c) => [c.nameEn, c.branchPublicId])).toEqual([
      ['First chamber', visible.publicId],
      ['Second chamber', null],
      ['Third chamber', null],
    ]);
    expect(found?.claimed).toBe(false);
  });

  it('finds no hidden, merged or unknown doctor', async () => {
    const target = await buildDoctor(testDb);
    const hidden = await buildDoctor(testDb, { state: 'hidden' });
    const merged = await buildDoctor(testDb, { mergedIntoId: target.id });

    expect(await repo.findDoctorByPublicId(tx, hidden.publicId)).toBeNull();
    expect(await repo.findDoctorByPublicId(tx, merged.publicId)).toBeNull();
    expect(await repo.findDoctorByPublicId(tx, newPublicId())).toBeNull();
  });

  it('lists visible doctors by name in the locale with a total, leaving hidden and merged out', async () => {
    const run = uniqueSuffix();
    const b = await buildDoctor(testDb, { nameEn: `Dr. ${run} Bravo`, nameBn: `ডা. ${run} ক` });
    const a = await buildDoctor(testDb, { nameEn: `Dr. ${run} Alpha`, nameBn: `ডা. ${run} খ` });
    const hidden = await buildDoctor(testDb, { state: 'hidden', nameEn: `Dr. ${run} Hidden` });
    const merged = await buildDoctor(testDb, { mergedIntoId: a.id, nameEn: `Dr. ${run} Merged` });

    const en = await repo.listDoctors(tx, ALL);
    const bn = await repo.listDoctors(tx, { ...ALL, locale: 'bn' });
    const mine = (rows: { id: string }[]) =>
      rows.map((r) => r.id).filter((id) => [a.id, b.id, hidden.id, merged.id].includes(id));

    expect(mine(en.rows)).toEqual([a.id, b.id]);
    expect(mine(bn.rows)).toEqual([b.id, a.id]);
    expect(en.total).toBe(en.rows.length);
  });

  it('pages the doctor list without changing the total', async () => {
    await buildDoctor(testDb);
    await buildDoctor(testDb);
    const first = await repo.listDoctors(tx, { page: 1, pageSize: 1, locale: 'en' });
    const second = await repo.listDoctors(tx, { page: 2, pageSize: 1, locale: 'en' });

    expect(first.rows).toHaveLength(1);
    expect(second.rows).toHaveLength(1);
    expect(second.rows[0]!.id).not.toBe(first.rows[0]!.id);
    expect(second.total).toBe(first.total);
  });

  it('marks a doctor created by a pending doctor submission, and no other (BR2.13)', async () => {
    const account = await buildAccount(testDb);
    const pending = await buildDoctor(testDb);
    await buildSubmission(testDb, pending.id, account.accountId);
    const approved = await buildDoctor(testDb);
    await buildSubmission(testDb, approved.id, account.accountId, { status: 'approved' });
    const rejected = await buildDoctor(testDb);
    await buildSubmission(testDb, rejected.id, account.accountId, { status: 'rejected' });
    const facilityKind = await buildDoctor(testDb);
    await buildSubmission(testDb, facilityKind.id, account.accountId, { kind: 'facility' });
    const plain = await buildDoctor(testDb);

    const listed = new Map(
      (await repo.listDoctors(tx, ALL)).rows.map((r) => [r.id, r.memberAddedNotConfirmed]),
    );

    expect(listed.get(pending.id)).toBe(true);
    for (const d of [approved, rejected, facilityKind, plain]) expect(listed.get(d.id)).toBe(false);
    expect((await repo.findDoctorByPublicId(tx, pending.publicId))?.memberAddedNotConfirmed).toBe(
      true,
    );
    expect((await repo.findDoctorByPublicId(tx, plain.publicId))?.memberAddedNotConfirmed).toBe(
      false,
    );
  });
});

describe('PgDirectoryModuleRepository branch reads', () => {
  it('reads a branch with its own name, label, hue and organisation (BR3.11)', async () => {
    const facility = await buildFacility(testDb, {
      nameEn: 'Synthetic Health Group',
      nameBn: 'কাল্পনিক স্বাস্থ্য গোষ্ঠী',
    });
    const labelled = await buildBranch(testDb, facility.id, {
      nameEn: 'Dhanmondi branch',
      nameBn: 'ধানমন্ডি শাখা',
      ownNameEn: 'Synthetic General Hospital',
      ownNameBn: 'কাল্পনিক জেনারেল হাসপাতাল',
      avatarHue: 205,
    });
    const single = await buildBranch(testDb, facility.id, {
      nameEn: 'Synthetic Health Group',
      nameBn: 'কাল্পনিক স্বাস্থ্য গোষ্ঠী',
      avatarHue: null,
    });

    const own = await repo.findBranchByPublicId(tx, labelled.publicId);
    const plain = await repo.findBranchByPublicId(tx, single.publicId);

    expect(own).toMatchObject({
      nameEn: 'Dhanmondi branch',
      ownNameEn: 'Synthetic General Hospital',
      ownNameBn: 'কাল্পনিক জেনারেল হাসপাতাল',
      avatarHue: 205,
      facilityNameEn: 'Synthetic Health Group',
      type: 'hospital',
      claimed: false,
    });
    expect(plain).toMatchObject({ ownNameEn: null, ownNameBn: null, avatarHue: null });
  });

  it('finds no branch that is hidden or whose organisation is hidden (BR1.2)', async () => {
    const hiddenOrg = await buildFacility(testDb, { state: 'hidden' });
    const underHidden = await buildBranch(testDb, hiddenOrg.id);
    const facility = await buildFacility(testDb);
    const hidden = await buildBranch(testDb, facility.id, { state: 'hidden' });

    expect(await repo.findBranchByPublicId(tx, underHidden.publicId)).toBeNull();
    expect(await repo.findBranchByPublicId(tx, hidden.publicId)).toBeNull();
    const listed = (await repo.listBranches(tx, ALL)).rows.map((r) => r.id);
    expect(listed).not.toContain(underHidden.id);
    expect(listed).not.toContain(hidden.id);
  });

  it('lists branches by title, then label, and the organisation’s visible branches', async () => {
    const run = uniqueSuffix();
    const facility = await buildFacility(testDb, {
      nameEn: `${run} Group`,
      nameBn: `${run} গোষ্ঠী`,
    });
    const z = await buildBranch(testDb, facility.id, { nameEn: 'Zeta branch', nameBn: 'জেটা' });
    const a = await buildBranch(testDb, facility.id, { nameEn: 'Alpha branch', nameBn: 'আলফা' });
    const hidden = await buildBranch(testDb, facility.id, { state: 'hidden' });

    const listed = (await repo.listBranches(tx, ALL)).rows
      .map((r) => r.id)
      .filter((id) => [a.id, z.id, hidden.id].includes(id));
    const ofFacility = (await repo.branchesOfFacility(tx, facility.id)).map((r) => r.id);

    expect(listed).toEqual([a.id, z.id]);
    expect(ofFacility).toEqual([a.id, z.id]);
  });

  it('links doctors and branches through chambers only, both ways', async () => {
    const run = uniqueSuffix();
    const facility = await buildFacility(testDb);
    const branch = await buildBranch(testDb, facility.id);
    const other = await buildBranch(testDb, facility.id, { nameEn: 'Other branch' });
    const second = await buildDoctor(testDb, { nameEn: `Dr. ${run} B` });
    const first = await buildDoctor(testDb, { nameEn: `Dr. ${run} A` });
    const merged = await buildDoctor(testDb, { mergedIntoId: first.id });
    await buildChamber(testDb, second.id, branch.id);
    await buildChamber(testDb, first.id, other.id, 0);
    await buildChamber(testDb, first.id, branch.id, 1);
    await buildChamber(testDb, first.id, branch.id, 2);
    await buildChamber(testDb, merged.id, branch.id);

    const atBranch = await repo.doctorsAtBranch(tx, branch.id, 'en');
    const ofDoctor = await repo.branchesForDoctor(tx, first.id);

    expect(atBranch.map((d) => d.id)).toEqual([first.id, second.id]);
    expect(ofDoctor.map((b) => b.id)).toEqual([other.id, branch.id]);
    expect(await repo.doctorsAtBranch(tx, 'not-a-uuid', 'en')).toEqual([]);
  });
});

describe('PgDirectoryModuleRepository member-added doctors (FD-100)', () => {
  it('finds visible doctors by either name key, oldest first, ignoring the title', async () => {
    const run = uniqueSuffix();
    const older = await buildDoctor(testDb, {
      nameEn: `Dr. Same ${run}`,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    const newer = await buildDoctor(testDb, {
      nameEn: `Prof. Dr. same ${run}`,
      createdAt: new Date('2026-02-01T00:00:00Z'),
    });
    const byBengali = await buildDoctor(testDb, { nameBn: `ডাঃ Same ${run}` });
    await buildDoctor(testDb, { nameEn: `Dr. Same ${run}`, state: 'hidden' });

    const found = await repo.findVisibleDoctorsByNameKey(tx, doctorNameKey(`Same ${run}`));

    expect(found.map((c) => c.id)).toEqual([older.id, newer.id, byBengali.id]);
  });

  it('answers whether a specialty is published', async () => {
    const published = await buildTerm(testDb, { kind: 'specialty' });
    const hidden = await buildTerm(testDb, { kind: 'specialty', state: 'hidden' });
    const condition = await buildTerm(testDb);

    expect(await repo.isPublishedSpecialty(tx, published.id)).toBe(true);
    expect(await repo.isPublishedSpecialty(tx, hidden.id)).toBe(false);
    expect(await repo.isPublishedSpecialty(tx, condition.id)).toBe(false);
    expect(await repo.isPublishedSpecialty(tx, 'nope')).toBe(false);
  });

  it('creates one doctor and one submission when two connections add one name at once', async () => {
    const account = await buildAccount(testDb);
    const name = `Dr. Race ${uniqueSuffix()}`;
    const key = doctorNameKey(name);
    const add = () =>
      testDb.transaction(async (t) => {
        const appTx = appTxOf(t);
        await repo.lockDoctorNameKey(appTx, key);
        if ((await repo.findVisibleDoctorsByNameKey(appTx, key)).length > 0) return;
        await repo.insertMemberDoctor(appTx, {
          id: newId(),
          publicId: newPublicId(),
          name,
          nameKey: key,
          specialtyId: null,
          practiceArea: 'Mirpur 10',
          bmdcNumber: 'A-12345',
          submittedByAccountId: account.accountId,
          now: new Date(),
        });
      });

    await Promise.all([add(), add()]);

    const created = await testDb.select().from(doctors).where(eq(doctors.nameEn, name));
    expect(created).toHaveLength(1);
    expect(created[0]!.bmdcNumber).toBeNull();
    expect(created[0]!.avatarHue).toBeNull();
    const submissions = await testDb
      .select()
      .from(profileSubmissions)
      .where(eq(profileSubmissions.createdDoctorId, created[0]!.id));
    expect(submissions).toHaveLength(1);
    expect(submissions[0]!.status).toBe('pending');
    expect((submissions[0]!.payload as { bmdc: string }).bmdc).toBe('A-12345');
    const chambers = await testDb
      .select()
      .from(doctorChambers)
      .where(eq(doctorChambers.doctorId, created[0]!.id));
    expect(chambers.map((c) => [c.nameEn, c.branchId, c.provenance])).toEqual([
      ['Mirpur 10', null, 'community'],
    ]);
    const shown = await repo.findDoctorByPublicId(tx, created[0]!.publicId);
    expect(shown?.memberAddedNotConfirmed).toBe(true);
    expect(shown?.fieldProvenance.name_en?.source).toBe('community');
  });
});

describe('facility branch checks (FD-108)', () => {
  it('refuses an own name in one language only and a hue outside 0 to 359', async () => {
    const facility = await buildFacility(testDb);
    const base = { publicId: newPublicId(), facilityId: facility.id, nameEn: 'x', nameBn: 'x' };
    const row = { ...base, cityEn: 'Dhaka', cityBn: 'ঢাকা', state: 'published' as const };

    await expect(
      testDb.insert(facilityBranches).values({ ...row, ownNameEn: 'Only English' }),
    ).rejects.toThrow();
    await expect(
      testDb.insert(facilityBranches).values({ ...row, publicId: newPublicId(), avatarHue: 360 }),
    ).rejects.toThrow();
    await expect(
      testDb.insert(facilityBranches).values({ ...row, publicId: newPublicId(), avatarHue: 359 }),
    ).resolves.toBeDefined();
  });
});
