import { DEFAULT_CONFIG_VALUES } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import {
  aDistributionVM,
  aDoctorExperience,
  aDoctorSummary,
  anAccountActor,
  deepKeys,
  FAKE_TX,
  makeModuleWorld,
  readerIn,
} from './directory-test-support';

const LOCALES = ['en', 'bn'] as const;
const LOCALE_KEY = /(En|Bn|_en|_bn)$/;
const PRIVATE_KEY =
  /^(id|doctorId|accountId|personaId|email|bmdcNumber|claimedByAccountId|submittedByAccountId|seedRef)$/;

describe.each(LOCALES)('directory.getDoctor in %s', (locale) => {
  it('maps the doctor in the reader language with the port figures unchanged', async () => {
    const world = makeModuleWorld();
    const doctor = world.repos.directory.addDoctor({ bmdcNumber: 'A-123' });
    const branch = world.repos.directory.addBranch({
      ownNameEn: 'Synthetic General Hospital',
      ownNameBn: 'কাল্পনিক জেনারেল হাসপাতাল',
      nameEn: 'Mirpur branch',
      nameBn: 'মিরপুর শাখা',
    });
    world.repos.directory.linkChamber(doctor.id, branch.id);
    world.providerExperience.doctorExperience = aDoctorExperience({
      total: 7,
      documentCount: 2,
      sentiment: aDistributionVM(['positive', 'mixed', 'negative'], { positive: 5, mixed: 2 }),
    });

    const result = await world.directory.getDoctor.execute(
      { publicId: doctor.publicId },
      world.callAs(readerIn(locale)),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const vm = result.data;
    expect(vm.name).toBe(locale === 'bn' ? doctor.nameBn : doctor.nameEn);
    expect(vm.specialty).toBe(locale === 'bn' ? doctor.specialtyBn : doctor.specialtyEn);
    expect(vm.accountsTotal).toBe(7);
    expect(vm.documentsCount).toBe(2);
    expect(vm.sentiment.counts).toEqual({ positive: 5, mixed: 2, negative: 0 });
    expect(vm.registrationNotVerified).toBe(true);
    expect(vm.facilities[0]).toMatchObject({
      name: locale === 'bn' ? 'কাল্পনিক জেনারেল হাসপাতাল' : 'Synthetic General Hospital',
      branchName: locale === 'bn' ? 'মিরপুর শাখা' : 'Mirpur branch',
    });
    expect(vm.chambers[0]?.branchPublicId).toBe(branch.publicId);
  });

  it('carries no locale-suffixed, private or percentage key', async () => {
    const world = makeModuleWorld();
    const doctor = world.repos.directory.addDoctor({ bmdcNumber: 'A-123' });

    const result = await world.directory.getDoctor.execute(
      { publicId: doctor.publicId },
      world.callAs(readerIn(locale)),
    );

    const keys = deepKeys(result.ok ? result.data : null);
    expect(keys.filter((k) => LOCALE_KEY.test(k))).toEqual([]);
    expect(keys.filter((k) => PRIVATE_KEY.test(k))).toEqual([]);
    expect(keys.filter((k) => /percent|pct|average|score|rating/i.test(k))).toEqual([]);
  });
});

describe('directory.getDoctor', () => {
  it('omits empty facts and dates the rest by their provenance', async () => {
    const world = makeModuleWorld();
    const doctor = world.repos.directory.addDoctor({
      bmdcNumber: null,
      feeDisplayEn: '  ',
      qualificationsEn: 'MBBS',
      aboutEn: null,
      fieldProvenance: {
        qualifications: { source: 'provider', updatedAt: '2026-09-01T00:00:00.000Z' },
        languages: { source: 'admin', updatedAt: '2026-09-02T00:00:00.000Z', hidden: true },
      },
    });

    const result = await world.directory.getDoctor.execute(
      { publicId: doctor.publicId },
      world.callAs(readerIn('en')),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.facts.map((f) => f.key)).toEqual(['specialty', 'qualifications']);
    expect(result.data.facts[1]?.provenance).toEqual({
      source: 'provider',
      updatedAt: '2026-09-01T00:00:00.000Z',
    });
    expect(result.data.facts[0]?.provenance.source).toBe('community');
    expect(result.data).not.toHaveProperty('about');
  });

  it('answers not_found for a hidden, merged or unknown doctor', async () => {
    const world = makeModuleWorld();
    const hidden = world.repos.directory.addDoctor({ state: 'hidden' });
    const merged = world.repos.directory.addDoctor({ mergedIntoId: hidden.id });

    for (const publicId of [hidden.publicId, merged.publicId, 'zzzzzzzzzz']) {
      const result = await world.directory.getDoctor.execute(
        { publicId },
        world.callAs(readerIn('en')),
      );
      expect(!result.ok && result.error.code).toBe('not_found');
    }
  });

  it('passes the filters to the port and answers validation for an unknown outcome', async () => {
    const world = makeModuleWorld();
    const doctor = world.repos.directory.addDoctor();

    await world.directory.getDoctor.execute(
      { publicId: doctor.publicId, condition: 'a1b2c3d4e5', outcome: 'helped', docs: true },
      world.callAs(readerIn('en')),
    );
    const bad = await world.directory.getDoctor.execute(
      { publicId: doctor.publicId, outcome: 'great' },
      world.callAs(readerIn('en')),
    );

    expect(world.providerExperience.calls[0]).toMatchObject({
      method: 'forDoctor',
      request: { conditionPublicId: 'a1b2c3d4e5', outcome: 'helped', docs: true },
    });
    expect(!bad.ok && bad.error.code).toBe('validation');
  });

  it('marks a member-added doctor while its submission is pending', async () => {
    const world = makeModuleWorld();
    const doctor = world.repos.directory.addDoctor();
    world.repos.directory.submissions.push({
      doctorId: doctor.id,
      kind: 'doctor',
      status: 'pending',
      submittedByAccountId: 'acct',
      payload: {},
    });

    const result = await world.directory.getDoctor.execute(
      { publicId: doctor.publicId },
      world.callAs(readerIn('en')),
    );

    expect(result.ok && result.data.memberAddedNotConfirmed).toBe(true);
  });
});

describe.each(LOCALES)('directory.listDoctors in %s', (locale) => {
  it('lists visible doctors by name with one summary read', async () => {
    const world = makeModuleWorld();
    const b = world.repos.directory.addDoctor({ nameEn: 'Dr. B', nameBn: 'ডা. খ' });
    const a = world.repos.directory.addDoctor({ nameEn: 'Dr. A', nameBn: 'ডা. ক' });
    world.repos.directory.addDoctor({ state: 'draft' });
    world.providerExperience.doctorSummaries.set(a.id, aDoctorSummary({ total: 3 }));

    const result = await world.directory.listDoctors.execute({}, world.callAs(readerIn(locale)));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items.map((c) => c.publicId)).toEqual([a.publicId, b.publicId]);
    expect(result.data).toMatchObject({ total: 2, page: 1, pageSize: 100 });
    expect(result.data.items[0]?.accountsTotal).toBe(3);
    expect(world.providerExperience.calls.map((c) => c.method)).toEqual(['summariesForDoctors']);
  });
});

describe.each(LOCALES)('directory.getFacility in %s', (locale) => {
  it('names the branch by BR3.11 and lists its doctors and siblings', async () => {
    const world = makeModuleWorld();
    const branch = world.repos.directory.addBranch({
      ownNameEn: 'Shefa General Hospital',
      ownNameBn: 'শেফা জেনারেল হাসপাতাল',
      nameEn: 'Dhanmondi branch',
      nameBn: 'ধানমন্ডি শাখা',
      facilityNameEn: 'Shefa Health Group',
      facilityNameBn: 'শেফা হেলথ গ্রুপ',
      addressEn: 'Road 4',
      addressBn: 'রোড ৪',
    });
    const sibling = world.repos.directory.addBranch({ facilityId: branch.facilityId });
    const doctor = world.repos.directory.addDoctor();
    world.repos.directory.linkChamber(doctor.id, branch.id);

    const result = await world.directory.getFacility.execute(
      { publicId: branch.publicId },
      world.callAs(readerIn(locale)),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe(
      locale === 'bn' ? 'শেফা জেনারেল হাসপাতাল' : 'Shefa General Hospital',
    );
    expect(result.data.parentName).toBe(locale === 'bn' ? 'শেফা হেলথ গ্রুপ' : 'Shefa Health Group');
    expect(result.data.notVerified).toBe(true);
    expect(result.data.address).toBe(locale === 'bn' ? 'রোড ৪' : 'Road 4');
    expect(result.data.siblings.map((s) => s.publicId)).toEqual([sibling.publicId]);
    expect(result.data.doctorsHere.map((d) => d.publicId)).toEqual([doctor.publicId]);
  });
});

describe('facility feedback turned off', () => {
  it('reads and projects no facility figures on the profile or the index', async () => {
    const world = makeModuleWorld();
    world.fakes.config.set({
      ...DEFAULT_CONFIG_VALUES,
      featureVisibility: { facilityAccounts: false, compareTray: true },
    });
    const branch = world.repos.directory.addBranch();

    const profile = await world.directory.getFacility.execute(
      { publicId: branch.publicId },
      world.callAs(readerIn('en')),
    );
    const index = await world.directory.listFacilities.execute({}, world.callAs(readerIn('en')));

    expect(world.providerExperience.readFacilityFeedback()).toBe(false);
    expect(profile.ok && profile.data.criteria).toEqual([]);
    expect(profile.ok && profile.data.accounts).toEqual([]);
    expect(profile.ok && profile.data).not.toHaveProperty('accountsTotal');
    expect(index.ok && index.data.items[0]).not.toHaveProperty('overall');
    expect(index.ok && index.data.items[0]?.feedbackVisible).toBe(false);
  });
});

describe('directory reference lists', () => {
  it('lists the doctors at a branch and the facilities of a doctor', async () => {
    const world = makeModuleWorld();
    const branch = world.repos.directory.addBranch();
    const hiddenBranch = world.repos.directory.addBranch({ state: 'hidden' });
    const doctor = world.repos.directory.addDoctor();
    world.repos.directory.linkChamber(doctor.id, branch.id);
    world.repos.directory.linkChamber(doctor.id, hiddenBranch.id);

    const doctors = await world.directory.doctorsAtBranch.execute(
      { branchPublicId: branch.publicId },
      world.callAs(readerIn('en')),
    );
    const facilities = await world.directory.facilitiesForDoctor.execute(
      { doctorPublicId: doctor.publicId },
      world.callAs(readerIn('en')),
    );
    const missing = await world.directory.doctorsAtBranch.execute(
      { branchPublicId: hiddenBranch.publicId },
      world.callAs(readerIn('en')),
    );

    expect(doctors.ok && doctors.data.map((d) => d.publicId)).toEqual([doctor.publicId]);
    expect(facilities.ok && facilities.data.map((f) => f.publicId)).toEqual([branch.publicId]);
    expect(!missing.ok && missing.error.code).toBe('not_found');
  });
});

describe('directory.addMemberDoctor', () => {
  const caller = { accountId: 'account-1', actor: 'persona:p-1' as const, correlationId: 'c-1' };

  it('refuses a two-letter name, an invisible character and an unknown specialty', async () => {
    const world = makeModuleWorld();
    for (const input of [
      { name: 'Dr. Ab' },
      { name: `Dr. Synthetic${String.fromCharCode(0x200b)}Rahman` },
      { name: 'Dr. Synthetic Rahman', specialtyId: '00000000-0000-7000-8000-00000000abcd' },
    ]) {
      const result = await world.directory.addMemberDoctor(FAKE_TX, input, caller);
      expect(!result.ok && result.error.code).toBe('validation');
    }
    expect(world.fakes.audit.events).toEqual([]);
  });

  it('creates a doctor with its chamber, pending submission, audit and doctor.changed', async () => {
    const world = makeModuleWorld();
    const specialtyId = world.fakes.ids.newId();
    world.repos.directory.specialties.add(specialtyId);

    const result = await world.directory.addMemberDoctor(
      FAKE_TX,
      {
        name: '  Dr.  Synthetic   Rahman ',
        specialtyId,
        practiceArea: 'Synthetic Clinic',
        bmdcNumber: 'A-777',
      },
      caller,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.reused).toBe(false);
    expect(JSON.stringify(result.data)).not.toContain('A-777');
    const created = world.repos.directory.doctors.get(result.data.doctorId);
    expect(created).toMatchObject({ nameEn: 'Dr. Synthetic Rahman', bmdcNumber: null });
    expect(created?.chambers[0]?.nameEn).toBe('Synthetic Clinic');
    expect(world.repos.directory.submissions[0]).toMatchObject({
      status: 'pending',
      submittedByAccountId: 'account-1',
      payload: { bmdc: 'A-777' },
    });
    expect(world.fakes.audit.events).toMatchObject([
      {
        action: 'memberAdded',
        actor: 'persona:p-1',
        details: { doctorId: result.data.doctorId, hasSpecialty: true, hasChamber: true },
      },
    ]);
    expect(world.fakes.outbox.events).toEqual([
      { name: 'doctor.changed', payload: { id: result.data.doctorId } },
    ]);
    expect(world.repos.directory.locks).toEqual(['doctor-name:syntheticrahman']);
  });

  it('reuses a doctor when the specialties agree or one is blank, and writes nothing', async () => {
    const world = makeModuleWorld();
    const specialtyId = world.fakes.ids.newId();
    world.repos.directory.specialties.add(specialtyId);
    const existing = world.repos.directory.addDoctor({
      nameEn: 'Dr. Synthetic Rahman',
      specialtyId: null,
    });

    const result = await world.directory.addMemberDoctor(
      FAKE_TX,
      { name: 'synthetic rahman', specialtyId },
      caller,
    );

    expect(result.ok && result.data).toEqual({ doctorId: existing.id, reused: true });
    expect(world.fakes.audit.events).toEqual([]);
    expect(world.fakes.outbox.events).toEqual([]);
  });

  it('creates a second doctor when both specialties are given and differ', async () => {
    const world = makeModuleWorld();
    const [mine, theirs] = [world.fakes.ids.newId(), world.fakes.ids.newId()];
    world.repos.directory.specialties.add(mine);
    world.repos.directory.addDoctor({ nameEn: 'Dr. Synthetic Rahman', specialtyId: theirs });

    const result = await world.directory.addMemberDoctor(
      FAKE_TX,
      { name: 'Dr. Synthetic Rahman', specialtyId: mine },
      caller,
    );

    expect(result.ok && result.data.reused).toBe(false);
  });
});

describe('an account reader', () => {
  it('reads the same public profile as a visitor', async () => {
    const world = makeModuleWorld();
    const doctor = world.repos.directory.addDoctor();
    const account = await world.addAccount();

    const result = await world.directory.getDoctor.execute(
      { publicId: doctor.publicId },
      world.callAs(anAccountActor(account)),
    );

    expect(result.ok && result.data.publicId).toBe(doctor.publicId);
  });
});
