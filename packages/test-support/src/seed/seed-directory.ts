// seed-directory: taxonomy terms (conditions from the corpus + specialties
// derived from the doctor roster) + aliases (`conditions.aliases`, lang
// guessed by `port-corpus.mjs`); organisations, branches, doctors with
// `field_provenance`, chambers (`branch_id` resolved by `chamberBranch`,
// else null); the corpus's pending profile submissions, claims and field
// changes.
//
// ASSUMPTION(T-007): the prototype never says *who* submitted, claimed or
// proposed any of them — every "submitted/claimed/proposed by" column is a
// required FK. Narrower, reversible choice: attribute all of them to
// `shirin_88` (the storyboard's one ordinary, already-verified
// contributor), logged as an `ISS-` row rather than inventing a persona
// with no basis in the corpus.
//
// The `taxonomy_terms.suggested` column the task's addendum asks for
// ("add the boolean column in T-005 if missing") does not exist and is
// outside this task's owned `packages/database/src/schema/` — logged as
// an `ISS-` row; `taxonomy.listSuggested` (T-201) has no data source until
// that column lands.
import type { Provenance } from '@rogikotha/contracts';
import { newId, newPublicId } from '@rogikotha/contracts';
import {
  doctorChambers,
  doctors,
  facilities,
  facilityBranches,
  profileClaims,
  profileFieldChanges,
  profileSubmissions,
  taxonomyAliases,
  taxonomyTerms,
  type Db,
} from '@rogikotha/database';
import { eq } from 'drizzle-orm';

import { ALIASES, BRANCHES, CONDITIONS, DOCTORS, FACILITY_ORGS, PROVIDER_CLAIMS, PROVIDER_FIELD_CHANGES, PROVIDER_SUBMISSIONS } from '../corpus/index.js';
import type { SeedContext } from './seed.js';

const GENERIC_SUBMITTER_USERNAME = 'shirin_88';

function keyify(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/\s+/g, '');
}

/**
 * The branch a chamber name points at: the branch name, the branch label, or
 * the prototype's composite "<name> — <label>" (U+2014 with spaces), checked
 * in that order so every pre-FD-089 link resolves as before (CR-012, BR3.2).
 */
function chamberBranch(chamberName: string): (typeof BRANCHES)[number] | undefined {
  const byName = BRANCHES.find((b) => b.name.en === chamberName || (b.branchLabel?.en as string | undefined) === chamberName);
  if (byName) return byName;
  return BRANCHES.find((b) => b.branchLabel !== null && `${b.name.en} — ${b.branchLabel.en}` === chamberName);
}

function nowProvenance(source: Provenance): { source: Provenance; updatedAt: string } {
  return { source, updatedAt: new Date().toISOString() };
}

export async function seedDirectory(db: Db, ctx: SeedContext): Promise<number> {
  let inserted = 0;

  // --- taxonomy: conditions -------------------------------------------------
  for (const c of CONDITIONS) {
    const [existing] = await db.select().from(taxonomyTerms).where(eq(taxonomyTerms.seedRef, c.seedRef)).limit(1);
    if (existing) {
      ctx.taxonomyTermIdBySeedRef.set(c.seedRef, existing.id);
      continue;
    }
    const [term] = await db
      .insert(taxonomyTerms)
      .values({
        id: newId(),
        publicId: newPublicId(),
        seedRef: c.seedRef,
        kind: 'condition',
        nameEn: c.name.en,
        nameBn: c.name.bn,
        nameKeyEn: keyify(c.name.en),
        nameKeyBn: keyify(c.name.bn),
        provisional: false,
        state: 'published',
      })
      .returning();
    ctx.taxonomyTermIdBySeedRef.set(c.seedRef, term!.id);
    inserted += 1;

    for (const alias of ALIASES.filter((a) => a.termSeedRef === c.seedRef)) {
      await db.insert(taxonomyAliases).values({
        id: newId(),
        termId: term!.id,
        alias: alias.alias,
        aliasKey: keyify(alias.alias),
        lang: alias.lang,
        provenance: 'community',
      });
      inserted += 1;
    }
  }

  // --- taxonomy: specialties (derived from the doctor roster) --------------
  const specialtyIdByName = new Map<string, string>();
  for (const d of DOCTORS) {
    const name = d.specialty.en;
    if (specialtyIdByName.has(name)) continue;
    const seedRef = `specialty-${keyify(name)}`;
    const [existing] = await db.select().from(taxonomyTerms).where(eq(taxonomyTerms.seedRef, seedRef)).limit(1);
    if (existing) {
      specialtyIdByName.set(name, existing.id);
      continue;
    }
    const [term] = await db
      .insert(taxonomyTerms)
      .values({
        id: newId(),
        publicId: newPublicId(),
        seedRef,
        kind: 'specialty',
        nameEn: d.specialty.en,
        nameBn: d.specialty.bn,
        nameKeyEn: keyify(d.specialty.en),
        nameKeyBn: keyify(d.specialty.bn),
        provisional: false,
        state: 'published',
      })
      .returning();
    specialtyIdByName.set(name, term!.id);
    inserted += 1;
  }

  // --- organisations + branches ---------------------------------------------
  for (const org of FACILITY_ORGS) {
    const [existing] = await db.select().from(facilities).where(eq(facilities.seedRef, org.seedRef)).limit(1);
    if (existing) {
      ctx.orgIdBySeedRef.set(org.seedRef, existing.id);
      continue;
    }
    // The facility's `type` is a branch-level attribute in this corpus;
    // organisations share their first branch's type for the parent row.
    const firstBranch = BRANCHES.find((b) => b.orgSeedRef === org.seedRef);
    const [row] = await db
      .insert(facilities)
      .values({
        id: newId(),
        publicId: newPublicId(),
        seedRef: org.seedRef,
        nameEn: org.name.en,
        nameBn: org.name.bn,
        type: firstBranch?.type ?? 'clinic',
        fieldProvenance: { name: nowProvenance('admin') },
        state: 'published',
      })
      .returning();
    ctx.orgIdBySeedRef.set(org.seedRef, row!.id);
    inserted += 1;
  }

  for (const branch of BRANCHES) {
    const [existing] = await db.select().from(facilityBranches).where(eq(facilityBranches.seedRef, branch.seedRef)).limit(1);
    if (existing) {
      ctx.branchIdBySeedRef.set(branch.seedRef, existing.id);
      continue;
    }
    const facilityId = ctx.orgIdBySeedRef.get(branch.orgSeedRef);
    if (!facilityId) throw new Error(`seed-directory: org ${branch.orgSeedRef} not seeded before branch ${branch.seedRef}`);
    const fieldProvenance: Record<string, { source: Provenance; updatedAt: string }> = {};
    for (const [field, source] of Object.entries(branch.fieldProvenance)) fieldProvenance[field] = nowProvenance(source);
    const [row] = await db
      .insert(facilityBranches)
      .values({
        id: newId(),
        publicId: newPublicId(),
        seedRef: branch.seedRef,
        facilityId,
        nameEn: branch.branchLabel?.en ?? branch.name.en,
        nameBn: branch.branchLabel?.bn ?? branch.name.bn,
        cityEn: branch.city.en,
        cityBn: branch.city.bn,
        areaEn: branch.area.en,
        areaBn: branch.area.bn,
        fieldProvenance,
        state: 'published',
        isPrimary: true,
      })
      .returning();
    ctx.branchIdBySeedRef.set(branch.seedRef, row!.id);
    inserted += 1;
  }

  // --- doctors + chambers -----------------------------------------------------
  for (const d of DOCTORS) {
    const [existing] = await db.select().from(doctors).where(eq(doctors.seedRef, d.seedRef)).limit(1);
    if (existing) {
      ctx.doctorIdBySeedRef.set(d.seedRef, existing.id);
      continue;
    }
    const fieldProvenance: Record<string, { source: Provenance; updatedAt: string }> = {};
    for (const [field, source] of Object.entries(d.fieldProvenance)) fieldProvenance[field] = nowProvenance(source);
    const [row] = await db
      .insert(doctors)
      .values({
        id: newId(),
        publicId: newPublicId(),
        seedRef: d.seedRef,
        nameEn: d.name.en,
        nameBn: d.name.bn,
        specialtyId: specialtyIdByName.get(d.specialty.en),
        qualificationsEn: d.qualifications.en,
        qualificationsBn: d.qualifications.bn,
        bmdcNumber: d.bmdc,
        gender: d.gender,
        languagesEn: d.languages.en,
        languagesBn: d.languages.bn,
        feeDisplayEn: d.fee.en,
        feeDisplayBn: d.fee.bn,
        cityEn: d.city.en,
        cityBn: d.city.bn,
        areaEn: d.area.en,
        areaBn: d.area.bn,
        fieldProvenance,
        avatarHue: d.avatarHue,
        // `claimed` has no specific claiming account anywhere in the
        // corpus (see the header ASSUMPTION); left unclaimed at the DB
        // level rather than inventing a claimant.
        claimedByAccountId: null,
        state: 'published',
        nameKey: keyify(d.name.en),
        bmdcKey: keyify(d.bmdc),
      })
      .returning();
    ctx.doctorIdBySeedRef.set(d.seedRef, row!.id);
    inserted += 1;

    let sortOrder = 0;
    for (const chamber of d.chambers) {
      const chamberName: string = chamber.name.en;
      const branch = chamberBranch(chamberName);
      await db.insert(doctorChambers).values({
        id: newId(),
        doctorId: row!.id,
        branchId: branch ? (ctx.branchIdBySeedRef.get(branch.seedRef) ?? null) : null,
        nameEn: chamber.name.en,
        nameBn: chamber.name.bn,
        hoursEn: chamber.hours.en,
        hoursBn: chamber.hours.bn,
        provenance: chamber.provenance,
        sortOrder,
      });
      sortOrder += 1;
      inserted += 1;
    }
  }

  // --- pending submissions / claim / field changes ---------------------------
  const submitterAccountId = ctx.accountIdByUsername.get(GENERIC_SUBMITTER_USERNAME);
  if (!submitterAccountId) throw new Error(`seed-directory: ${GENERIC_SUBMITTER_USERNAME} account must be seeded first`);

  // These three tables have no `seed_ref` column (their prototype ids —
  // `P-140`, `C-58`, `F-77` — exist only in the corpus, not the schema), so
  // idempotency is content-based: a matching `bmdc`/`(targetId, field)`
  // pending row already existing means this seed already ran.
  const existingSubmissions = await db.select().from(profileSubmissions);
  for (const s of PROVIDER_SUBMISSIONS) {
    const alreadyRow = existingSubmissions.find((row) => (row.payload as { bmdc?: string } | null)?.bmdc === s.bmdc);
    if (alreadyRow) {
      ctx.submissionIdBySeedRef.set(s.seedRef, alreadyRow.id);
      continue;
    }
    const [row] = await db
      .insert(profileSubmissions)
      .values({
        id: newId(),
        kind: 'doctor',
        payload: { name: s.name, specialty: s.specialty, city: s.city, bmdc: s.bmdc },
        submittedByAccountId: submitterAccountId,
        status: 'pending',
        duplicateOfId: s.duplicateOfDoctorSeedRef ? (ctx.doctorIdBySeedRef.get(s.duplicateOfDoctorSeedRef) ?? null) : null,
        reviewerNote: s.note.en,
      })
      .returning();
    ctx.submissionIdBySeedRef.set(s.seedRef, row!.id);
    inserted += 1;
  }

  const existingClaims = await db.select().from(profileClaims);
  for (const c of PROVIDER_CLAIMS) {
    const doctorId = ctx.doctorIdBySeedRef.get(c.doctorSeedRef);
    if (!doctorId) continue;
    const already = existingClaims.some((row) => row.targetId === doctorId && row.claimantAccountId === submitterAccountId);
    if (already) continue;
    await db.insert(profileClaims).values({
      id: newId(),
      targetKind: 'doctor',
      targetId: doctorId,
      claimantAccountId: submitterAccountId,
      method: c.method.en,
      evidenceNote: c.note.en,
      status: 'pending',
    });
    inserted += 1;
  }

  const existingFieldChanges = await db.select().from(profileFieldChanges);
  for (const f of PROVIDER_FIELD_CHANGES) {
    const doctorId = ctx.doctorIdBySeedRef.get(f.doctorSeedRef);
    if (!doctorId) continue;
    const already = existingFieldChanges.some((row) => row.targetId === doctorId && row.field === f.field.en);
    if (already) continue;
    await db.insert(profileFieldChanges).values({
      id: newId(),
      targetKind: 'doctor',
      targetId: doctorId,
      field: f.field.en,
      oldValue: f.from,
      newValue: f.to,
      proposedByAccountId: submitterAccountId,
      provenance: 'community',
      protected: f.protected,
      status: 'pending',
    });
    inserted += 1;
  }

  return inserted;
}
