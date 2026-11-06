// Directory display rules (U46 BR2.2, BR2.5, BR3.11). Plain values only (BR6.6).

/**
 * Every doctor shows "Registration not verified" until BMDC verification exists (PRODUCT.md hard
 * rule, D-003). Nothing stored, a BMDC number included, changes it.
 */
export function registrationNotVerified(): true {
  return true;
}

/** A field's provenance entry; `hidden` is a read-only convention (entities.md ProvenanceEntry). */
export interface ProvenanceEntryValue {
  source: string;
  updatedAt: string;
  hidden?: boolean;
}

export interface FactCandidate<K extends string> {
  key: K;
  value: string | null | undefined;
  /** The field names whose provenance entry may hide this fact. */
  provenanceFields: readonly string[];
}

/** True for null, undefined, an empty string or only whitespace. */
export function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}

/**
 * The value of an `_en`/`_bn` pair in the reader's language, or undefined when that one is blank:
 * never the other language, so a missing value reads "Not provided" (BR2.2, BR2.9).
 */
export function textIn(
  locale: 'en' | 'bn',
  en: string | null | undefined,
  bn: string | null | undefined,
): string | undefined {
  const value = locale === 'bn' ? bn : en;
  return isBlank(value) ? undefined : value!;
}

/**
 * The facts that have a value and are not hidden, in the order given. A missing fact is left out,
 * never shown as `0` or an empty string (BR2.2).
 */
export function omitEmptyFields<K extends string>(
  facts: readonly FactCandidate<K>[],
  provenance: Readonly<Record<string, ProvenanceEntryValue | undefined>>,
): { key: K; value: string; provenanceField: string | undefined }[] {
  const shown: { key: K; value: string; provenanceField: string | undefined }[] = [];
  for (const fact of facts) {
    if (isBlank(fact.value)) continue;
    const field = fact.provenanceFields.find((f) => provenance[f] !== undefined);
    if (field !== undefined && provenance[field]?.hidden === true) continue;
    shown.push({ key: fact.key, value: fact.value!, provenanceField: field });
  }
  return shown;
}

export interface BranchNameInput {
  /** `facility_branches.own_name_*` in the reader's locale (FD-108). */
  ownName: string | null | undefined;
  /** `facility_branches.name_*`: the label when there is one, else the full name. */
  name: string;
  /** The organisation's name (`facilities.name_*`). */
  facilityName: string;
}

export interface BranchNames {
  title: string;
  branchName?: string;
  parentName?: string;
}

/**
 * The title is the branch's own name, else its organisation's; the label shows when it differs
 * from the title, and the organisation shows as "Part of" when it differs from the title (BR3.11).
 */
export function branchNames(input: BranchNameInput): BranchNames {
  const title = isBlank(input.ownName) ? input.facilityName : input.ownName!;
  const names: BranchNames = { title };
  if (!isBlank(input.name) && input.name !== title) names.branchName = input.name;
  if (input.facilityName !== title) names.parentName = input.facilityName;
  return names;
}
