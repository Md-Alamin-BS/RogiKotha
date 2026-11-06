// The read-side Review stub's `ConditionStats` (C6 as amended by U46, FD-067). Every figure counts
// distinct eligible reviews about the term by the one rule of BR1.7, applied in SQL by the review
// repository; this file only groups those rows (BR3.3, BR3.4, BR3.6).
import {
  OUTCOMES,
  SENTIMENTS,
  stableHue,
  type ConditionDoctorVM,
  type ConditionMentionVM,
  type ConditionPlaceVM,
  type FacilityRefVM,
  type Locale,
} from '@rogikotha/contracts';
import { branchNames, distribution, isLimitedData } from '@rogikotha/domain';

import type { MentionRecord, TermReviewRecord } from '../../ports';
import type { ConditionStats } from '../taxonomy/ports';
import { cardOf, localText, toDistributionVM } from './cards';
import type { ReviewReadDeps } from './provider-experience';

/** "Usually treated by": the top three specialties (prototype renderCondition). */
export const TOP_SPECIALTIES = 3;

function byCountThenName<T extends { count: number }>(
  name: (item: T) => string,
  locale: Locale,
): (a: T, b: T) => number {
  return (a, b) => b.count - a.count || name(a).localeCompare(name(b), locale);
}

/**
 * Mentioned medicines, treatments and symptoms: distinct reviews per label, the label being the
 * effective term's name in the locale or the free text as written (BR3.4, prototype tagFrequency).
 */
function mentionsOf(
  rows: readonly TermReviewRecord[],
  group: MentionRecord['group'],
  locale: Locale,
): ConditionMentionVM[] {
  const reviewsByLabel = new Map<string, Set<string>>();
  for (const row of rows) {
    for (const mention of row.mentions) {
      if (mention.group !== group) continue;
      const label =
        localText(locale, mention.termNameEn, mention.termNameBn) ??
        (mention.freeText?.trim() ? mention.freeText : undefined);
      if (label === undefined) continue;
      const set = reviewsByLabel.get(label) ?? new Set<string>();
      set.add(row.id);
      reviewsByLabel.set(label, set);
    }
  }
  return [...reviewsByLabel]
    .map(([label, set]) => ({ label, count: set.size }))
    .sort(byCountThenName((m) => m.label, locale));
}

function doctorsOf(rows: readonly TermReviewRecord[], locale: Locale): ConditionDoctorVM[] {
  const byDoctor = new Map<string, ConditionDoctorVM>();
  for (const row of rows) {
    const seen = byDoctor.get(row.doctorId);
    if (seen) {
      seen.count += 1;
      continue;
    }
    const doctor: ConditionDoctorVM = {
      publicId: row.doctorPublicId,
      name: locale === 'bn' ? row.doctorNameBn : row.doctorNameEn,
      count: 1,
      avatarHue: row.doctorAvatarHue ?? stableHue(row.doctorPublicId),
    };
    const specialty = localText(locale, row.doctorSpecialtyEn, row.doctorSpecialtyBn);
    const chamber = localText(locale, row.doctorPrimaryChamberEn, row.doctorPrimaryChamberBn);
    const area = localText(locale, row.doctorAreaEn, row.doctorAreaBn);
    const city = localText(locale, row.doctorCityEn, row.doctorCityBn);
    if (specialty !== undefined) doctor.specialty = specialty;
    if (chamber !== undefined) doctor.primaryChamber = chamber;
    if (area !== undefined) doctor.area = area;
    if (city !== undefined) doctor.city = city;
    byDoctor.set(row.doctorId, doctor);
  }
  return [...byDoctor.values()].sort(byCountThenName((d) => d.name, locale));
}

/**
 * Where patients went: each doctor's (primary chamber, area, city) with that doctor's account
 * count; equal places add up (prototype renderCondition, BR3.6).
 */
function placesOf(doctors: readonly ConditionDoctorVM[], locale: Locale): ConditionPlaceVM[] {
  const byPlace = new Map<string, ConditionPlaceVM>();
  for (const d of doctors) {
    const key = [d.primaryChamber ?? '', d.area ?? '', d.city ?? ''].join('|');
    const seen = byPlace.get(key);
    if (seen) {
      seen.count += d.count;
      continue;
    }
    const place: ConditionPlaceVM = { count: d.count };
    if (d.primaryChamber !== undefined) place.hospital = d.primaryChamber;
    if (d.area !== undefined) place.area = d.area;
    if (d.city !== undefined) place.city = d.city;
    byPlace.set(key, place);
  }
  return [...byPlace.values()].sort(byCountThenName((p) => p.hospital ?? '', locale));
}

function specialtiesOf(doctors: readonly ConditionDoctorVM[], locale: Locale) {
  const bySpecialty = new Map<string, number>();
  for (const d of doctors) {
    if (d.specialty === undefined) continue;
    bySpecialty.set(d.specialty, (bySpecialty.get(d.specialty) ?? 0) + d.count);
  }
  return [...bySpecialty]
    .map(([name, count]) => ({ name, count }))
    .sort(byCountThenName((s) => s.name, locale))
    .slice(0, TOP_SPECIALTIES);
}

/** The visible branches named on the condition's reviews, by count, then title (BR3.6). */
function facilitiesOf(rows: readonly TermReviewRecord[], locale: Locale): FacilityRefVM[] {
  const byBranch = new Map<string, { ref: FacilityRefVM; count: number }>();
  for (const row of rows) {
    const branch = row.branch;
    if (branch === null) continue;
    const seen = byBranch.get(branch.id);
    if (seen) {
      seen.count += 1;
      continue;
    }
    const names = branchNames({
      ownName: localText(locale, branch.ownNameEn, branch.ownNameBn),
      name: locale === 'bn' ? branch.nameBn : branch.nameEn,
      facilityName: locale === 'bn' ? branch.facilityNameBn : branch.facilityNameEn,
    });
    const ref: FacilityRefVM = {
      publicId: branch.publicId,
      name: names.title,
      type: branch.type,
      avatarHue: branch.avatarHue ?? stableHue(branch.publicId),
    };
    if (names.branchName !== undefined) ref.branchName = names.branchName;
    byBranch.set(branch.id, { ref, count: 1 });
  }
  return [...byBranch.values()].sort(byCountThenName((b) => b.ref.name, locale)).map((b) => b.ref);
}

export function createConditionStats(deps: ReviewReadDeps): ConditionStats {
  return {
    async forCondition(tx, termId, locale) {
      const threshold = (await deps.config.current()).limitedDataThreshold;
      const rows = await deps.reviews.publishedForTerm(tx, termId);
      const documents = await deps.evidence.countPublicEvidenceByReview(rows.map((r) => r.id));
      const doctors = doctorsOf(rows, locale);
      return {
        total: rows.length,
        limitedData: isLimitedData(rows.length, threshold),
        doctorsTotal: doctors.length,
        sentiment: toDistributionVM(
          distribution(
            rows.map((r) => r.sentiment),
            SENTIMENTS,
            threshold,
          ),
        ),
        outcome: toDistributionVM(
          distribution(
            rows.map((r) => r.outcome),
            OUTCOMES,
            threshold,
          ),
        ),
        cards: rows.map((r) => cardOf(r, locale, documents.get(r.id) ?? 0)),
        mentioned: {
          medicine: mentionsOf(rows, 'medicine', locale),
          treatment: mentionsOf(rows, 'treatment', locale),
          symptom: mentionsOf(rows, 'symptom', locale),
        },
        doctors,
        facilities: facilitiesOf(rows, locale),
        places: placesOf(doctors, locale),
        specialties: specialtiesOf(doctors, locale),
      };
    },

    async totalsForConditions(tx, termIds) {
      if (termIds.length === 0) return new Map();
      return deps.reviews.totalsForTerms(tx, termIds);
    },
  };
}
