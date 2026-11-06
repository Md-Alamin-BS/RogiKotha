// Directory rows to view models in the reader's locale (U46 BR2.2, BR2.5, BR2.9-BR2.11, BR3.8,
// BR3.11). A missing value is left out of the view model, never `0` or `""`.
import {
  stableHue,
  toIso,
  type ChamberVM,
  type DoctorCardVM,
  type DoctorFactKey,
  type DoctorFactVM,
  type DoctorProfileVM,
  type FacilityCardVM,
  type FacilityRefVM,
  type Locale,
  type ProvenanceVM,
} from '@rogikotha/contracts';
import { branchNames, omitEmptyFields, registrationNotVerified, textIn } from '@rogikotha/domain';

import type {
  BranchRecord,
  DoctorRecord,
  DoctorWithChambersRecord,
  FieldProvenanceRecord,
} from '../../ports';
import type { BranchExperienceSummary, DoctorExperience, DoctorExperienceSummary } from './ports';

/** A populated field without a provenance entry reads Community submitted (BR2.11). */
export function provenanceOf(
  fields: FieldProvenanceRecord,
  field: string | undefined,
  fallbackDate: Date,
): ProvenanceVM {
  const entry = field === undefined ? undefined : fields[field];
  const stored = entry ? new Date(entry.updatedAt) : undefined;
  // An entry with an unreadable date keeps its source and takes the profile's date.
  const date = stored && !Number.isNaN(stored.getTime()) ? stored : fallbackDate;
  return { source: entry?.source ?? 'community', updatedAt: toIso(date) };
}

function setIf<T, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
  if (value !== undefined) target[key] = value;
}

/** The field names a fact's provenance may be stored under, seed names first. */
const FACT_FIELDS: Record<DoctorFactKey, readonly string[]> = {
  bmdc: ['bmdc', 'bmdc_number'],
  specialty: ['specialty', 'specialty_id'],
  qualifications: ['qualifications', 'qualifications_en', 'qualifications_bn'],
  languages: ['languages', 'languages_en', 'languages_bn'],
  fee: ['fee', 'fee_display_en', 'fee_display_bn'],
};

export function doctorFacts(doctor: DoctorRecord, locale: Locale): DoctorFactVM[] {
  const fallback = doctor.updatedAt ?? doctor.createdAt;
  const shown = omitEmptyFields<DoctorFactKey>(
    [
      // Profile information only: a stored BMDC number never makes the registration verified.
      { key: 'bmdc', value: doctor.bmdcNumber, provenanceFields: FACT_FIELDS.bmdc },
      {
        key: 'specialty',
        value: textIn(locale, doctor.specialtyEn, doctor.specialtyBn),
        provenanceFields: FACT_FIELDS.specialty,
      },
      {
        key: 'qualifications',
        value: textIn(locale, doctor.qualificationsEn, doctor.qualificationsBn),
        provenanceFields: FACT_FIELDS.qualifications,
      },
      {
        key: 'languages',
        value: textIn(locale, doctor.languagesEn, doctor.languagesBn),
        provenanceFields: FACT_FIELDS.languages,
      },
      {
        key: 'fee',
        value: textIn(locale, doctor.feeDisplayEn, doctor.feeDisplayBn),
        provenanceFields: FACT_FIELDS.fee,
      },
    ],
    doctor.fieldProvenance,
  );
  return shown.map((fact) => ({
    key: fact.key,
    value: fact.value,
    provenance: provenanceOf(doctor.fieldProvenance, fact.provenanceField, fallback),
  }));
}

export function doctorCard(
  doctor: DoctorRecord,
  summary: DoctorExperienceSummary,
  locale: Locale,
): DoctorCardVM {
  const card: DoctorCardVM = {
    publicId: doctor.publicId,
    name: locale === 'bn' ? doctor.nameBn : doctor.nameEn,
    avatarHue: doctor.avatarHue ?? stableHue(doctor.publicId),
    topConditions: summary.topConditions,
    documentsCount: summary.documentCount,
    accountsTotal: summary.total,
    accountsLimitedData: summary.limitedData,
    sentiment: summary.sentiment,
    claimed: doctor.claimed,
    registrationNotVerified: registrationNotVerified(),
    memberAddedNotConfirmed: doctor.memberAddedNotConfirmed,
  };
  setIf(card, 'specialty', textIn(locale, doctor.specialtyEn, doctor.specialtyBn));
  setIf(card, 'area', textIn(locale, doctor.areaEn, doctor.areaBn));
  setIf(card, 'city', textIn(locale, doctor.cityEn, doctor.cityBn));
  return card;
}

export function facilityRef(branch: BranchRecord, locale: Locale): FacilityRefVM {
  const names = branchTitle(branch, locale);
  const ref: FacilityRefVM = {
    publicId: branch.publicId,
    name: names.title,
    type: branch.type,
    avatarHue: branch.avatarHue ?? stableHue(branch.publicId),
  };
  setIf(ref, 'branchName', names.branchName);
  return ref;
}

export function branchTitle(branch: BranchRecord, locale: Locale) {
  return branchNames({
    ownName: textIn(locale, branch.ownNameEn, branch.ownNameBn),
    name: locale === 'bn' ? branch.nameBn : branch.nameEn,
    facilityName: locale === 'bn' ? branch.facilityNameBn : branch.facilityNameEn,
  });
}

export function doctorProfile(
  doctor: DoctorWithChambersRecord,
  experience: DoctorExperience,
  branches: readonly BranchRecord[],
  locale: Locale,
): DoctorProfileVM {
  const card = doctorCard(
    doctor,
    {
      total: experience.total,
      limitedData: experience.limitedData,
      sentiment: experience.sentiment,
      documentCount: experience.documentCount,
      topConditions: experience.conditions.slice(0, 3),
    },
    locale,
  );
  const chambers = doctor.chambers.map((c): ChamberVM => {
    const chamber: ChamberVM = {
      name: locale === 'bn' ? c.nameBn : c.nameEn,
      provenance: { source: c.provenance, updatedAt: toIso(c.createdAt) },
    };
    setIf(chamber, 'hours', textIn(locale, c.hoursEn, c.hoursBn));
    if (c.branchPublicId !== null) chamber.branchPublicId = c.branchPublicId;
    return chamber;
  });
  const profile: DoctorProfileVM = {
    ...card,
    facts: doctorFacts(doctor, locale),
    chambers,
    conditions: experience.conditions,
    breakdown: experience.breakdown,
    facilities: branches.map((b) => facilityRef(b, locale)),
    accounts: experience.cards,
    scopedSentiment: experience.scopedSentiment,
    scopedOutcome: experience.scopedOutcome,
    scopedTotal: experience.scopedTotal,
    showing: experience.showing,
  };
  setIf(profile, 'about', textIn(locale, doctor.aboutEn, doctor.aboutBn));
  setIf(profile, 'selectedCondition', experience.selectedCondition);
  return profile;
}

export function facilityCard(
  branch: BranchRecord,
  summary: BranchExperienceSummary | undefined,
  feedbackVisible: boolean,
  locale: Locale,
): FacilityCardVM {
  const names = branchTitle(branch, locale);
  const card: FacilityCardVM = {
    publicId: branch.publicId,
    name: names.title,
    type: branch.type,
    city: locale === 'bn' ? branch.cityBn : branch.cityEn,
    avatarHue: branch.avatarHue ?? stableHue(branch.publicId),
    feedbackVisible,
    claimed: branch.claimed,
    notVerified: true,
  };
  setIf(card, 'branchName', names.branchName);
  setIf(card, 'parentName', names.parentName);
  setIf(card, 'area', textIn(locale, branch.areaEn, branch.areaBn));
  if (feedbackVisible && summary) {
    card.accountsTotal = summary.total;
    card.accountsLimitedData = summary.limitedData;
    card.overall = summary.overall;
  }
  return card;
}
