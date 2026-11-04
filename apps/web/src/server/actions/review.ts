'use server';

// Write and edit an experience (FR4, plan Step 8). Every action reads the signed-in account on the
// server, validates the form with zod and answers with i18n message keys, never with copy.
import {
  doctorNameLetterCount,
  hasControlOrFormat,
  OUTCOMES,
  PUBLIC_ID_RE,
  RELATIONSHIPS,
  SENTIMENTS,
  type DemoReviewLanguage,
  type Locale,
} from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import { redirect } from '@/i18n/routing';
import { requireAccount, type CurrentAccount } from '@/server/auth/session';
import { doctors, reviews } from '@/server/data';

export type ComposeField =
  | 'doctorId'
  | 'relationship'
  | 'period'
  | 'title'
  | 'body'
  | 'sentiment'
  | 'outcome'
  | 'identity'
  | 'attestation'
  | 'newDoctor'
  | 'newDoctorName'
  | 'newDoctorSpecialtyId'
  | 'newDoctorChamber'
  | 'newDoctorBmdc';

export type EditField = 'title' | 'body' | 'sentiment' | 'outcome';

/** The form as submitted, handed back so a refused submission keeps what the author typed. */
export type ComposeValues = Record<Exclude<ComposeField, 'attestation'>, string> & {
  /** `'on'` when the attestation box was ticked. */
  attestation?: string;
};
export type EditValues = Record<EditField, string>;

export interface ReviewFormState<F extends string, V> {
  /** Counts refused submissions, so the form can remount with `values`. */
  attempt: number;
  values: V | null;
  /** i18n message keys, one per field. */
  fieldErrors: Partial<Record<F, string>>;
  formError: string | null;
}

export type ComposeFormState = ReviewFormState<ComposeField, ComposeValues>;
export type EditFormState = ReviewFormState<EditField, EditValues>;

// ASSUMPTION(demo-slice): title 1-120 characters (the T-301 draft's limit) and body 20-10,000
// characters (T-301's quick-review minimum; the maximum is the slice's own guard).
const TITLE_MAX = 120;
const BODY_MIN = 20;
const BODY_MAX = 10_000;
const EARLIEST_YEAR = 2000;

const COMPOSE_FIELDS = [
  'doctorId',
  'relationship',
  'period',
  'title',
  'body',
  'sentiment',
  'outcome',
  'identity',
  'newDoctor',
  'newDoctorName',
  'newDoctorSpecialtyId',
  'newDoctorChamber',
  'newDoctorBmdc',
] as const satisfies readonly (keyof ComposeValues)[];
const EDIT_FIELDS = [
  'title',
  'body',
  'sentiment',
  'outcome',
] as const satisfies readonly EditField[];

/** `''` (no choice) becomes null; anything else must be one of `values`. */
function optionalChoice<const T extends readonly [string, ...string[]]>(values: T) {
  return z
    .union([z.literal(''), z.enum(values)], { error: 'errors.common.validation' })
    .transform((v) => (v === '' ? null : v));
}

/** Line breaks and tabs are fine in a story; any other control or invisible character is not. */
function plainText(v: string) {
  return !hasControlOrFormat(v.replace(/[\n\r\t]/g, ''));
}

const titleField = z
  .string()
  .trim()
  .refine(plainText, { error: 'errors.common.validation' })
  .min(1, { error: 'formErrors.compose.titleLength' })
  .max(TITLE_MAX, { error: 'formErrors.compose.titleLength' });

const bodyField = z
  .string()
  .trim()
  .refine(plainText, { error: 'errors.common.validation' })
  .min(BODY_MIN, { error: 'formErrors.compose.bodyTooShort' })
  .max(BODY_MAX, { error: 'formErrors.compose.bodyTooLong' });

/** "YYYY-MM", from 2000 up to the current month. */
const periodField = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: 'formErrors.compose.periodInvalid' })
  .transform((v) => ({ year: Number(v.slice(0, 4)), month: Number(v.slice(5, 7)) }))
  .refine(
    ({ year, month }) => {
      const now = new Date();
      const current = now.getUTCFullYear() * 12 + now.getUTCMonth() + 1;
      return year >= EARLIEST_YEAR && year * 12 + month <= current;
    },
    { error: 'formErrors.compose.periodInvalid' },
  );

const EditInput = z.object({
  title: titleField,
  body: bodyField,
  sentiment: optionalChoice(SENTIMENTS),
  outcome: optionalChoice(OUTCOMES),
});

const ComposeCommon = EditInput.extend({
  relationship: z.enum(RELATIONSHIPS, { error: 'formErrors.compose.relationshipRequired' }),
  period: periodField,
  identity: z.enum(['named', 'pseudonymous'], { error: 'formErrors.compose.identityRequired' }),
  attestation: z.literal('on', { error: 'errors.review.attestationRequired' }),
});

const ComposeInput = ComposeCommon.extend({
  doctorId: z.uuid({ error: 'formErrors.compose.doctorRequired' }),
});

/** Empty text becomes null. */
const blankToNull = (v: string) => (v === '' ? null : v);

// ASSUMPTION(demo-slice): a member-added name has 3+ letters and at most 120 characters, the chamber at most 200 and a
// BMDC number up to 20 letters, digits or dashes (FD-100).
const NewDoctorInput = ComposeCommon.extend({
  // At least three letters once a "Dr." title is removed, so "Dr." or "..." is never a doctor.
  newDoctorName: z
    .string()
    .trim()
    .max(120, { error: 'formErrors.compose.newDoctorName' })
    .refine((v) => !hasControlOrFormat(v) && doctorNameLetterCount(v) >= 3, {
      error: 'formErrors.compose.newDoctorName',
    }),
  newDoctorSpecialtyId: z
    .union([z.literal(''), z.uuid()], { error: 'formErrors.compose.newDoctorSpecialty' })
    .transform(blankToNull),
  newDoctorChamber: z
    .string()
    .trim()
    .max(200, { error: 'formErrors.compose.newDoctorChamber' })
    .refine((v) => !hasControlOrFormat(v), { error: 'formErrors.compose.newDoctorChamber' })
    .transform(blankToNull),
  newDoctorBmdc: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{0,20}$/, { error: 'formErrors.compose.newDoctorBmdc' })
    .transform(blankToNull),
});

function readFields<const K extends string>(formData: FormData, fields: readonly K[]) {
  const values = {} as Record<K, string>;
  for (const field of fields) {
    const value = formData.get(field);
    values[field] = typeof value === 'string' ? value : '';
  }
  return values;
}

function fieldErrorsOf<F extends string>(error: z.ZodError): Partial<Record<F, string>> {
  const errors: Partial<Record<F, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as F | undefined;
    if (field !== undefined && errors[field] === undefined) errors[field] = issue.message;
  }
  return errors;
}

function refused<F extends string, V>(
  prev: ReviewFormState<F, V>,
  values: V,
  fieldErrors: Partial<Record<F, string>>,
  formError: string | null = 'errors.common.validation',
): ReviewFormState<F, V> {
  return { attempt: prev.attempt + 1, values, fieldErrors, formError };
}

const BENGALI = /\p{Script=Bengali}/u;
const LATIN = /[a-z]/i;

/** The `reviews.language` of what the author wrote; nothing is translated (FD-024). */
function languageOf(text: string): DemoReviewLanguage {
  const bangla = BENGALI.test(text);
  const latin = LATIN.test(text);
  if (bangla && latin) return 'mixed';
  return bangla ? 'bn' : 'en';
}

async function personaFor(account: CurrentAccount, identity: 'named' | 'pseudonymous') {
  if (identity === 'named') return account.currentPersonaId;
  return (
    account.pseudonymousPersonaId ??
    (await reviews.createPseudonymousPersona({
      accountId: account.accountId,
      username: account.username,
    }))
  );
}

/** Logs the failure class only: a database error can echo the submitted text. */
function logFailure(action: string, error: unknown) {
  console.error(`${action} failed`, { error: error instanceof Error ? error.name : 'unknown' });
}

/** Publishes a quick review at once and opens its page; signed-out authors go to sign-in. */
export async function publishReview(
  prev: ComposeFormState,
  formData: FormData,
): Promise<ComposeFormState> {
  const account = await requireAccount({ returnTo: '/write' });
  const locale = (await getLocale()) as Locale;
  const values = readFields(formData, COMPOSE_FIELDS);
  const raw = { ...values, attestation: formData.get('attestation') ?? '' };
  const addingDoctor = values.newDoctor === '1';
  const parsed = addingDoctor ? NewDoctorInput.safeParse(raw) : ComposeInput.safeParse(raw);
  const kept: ComposeValues = { ...values, attestation: raw.attestation === 'on' ? 'on' : '' };
  if (!parsed.success) return refused(prev, kept, fieldErrorsOf<ComposeField>(parsed.error));

  const input = parsed.data;
  if ('doctorId' in input) {
    const options = await doctors.listDoctorOptions(locale);
    if (!options.some((option) => option.id === input.doctorId)) {
      return refused(prev, kept, { doctorId: 'formErrors.compose.doctorRequired' });
    }
  } else if (input.newDoctorSpecialtyId) {
    const specialties = await doctors.listSpecialtyOptions(locale);
    if (!specialties.some((option) => option.id === input.newDoctorSpecialtyId)) {
      return refused(prev, kept, {
        newDoctorSpecialtyId: 'formErrors.compose.newDoctorSpecialty',
      });
    }
  }

  let publicId: string;
  try {
    const review = {
      authorPersonaId: await personaFor(account, input.identity),
      authorAccountId: account.accountId,
      relationship: input.relationship,
      periodYear: input.period.year,
      periodMonth: input.period.month,
      title: input.title,
      body: input.body,
      sentiment: input.sentiment,
      outcome: input.outcome,
      identityMode: input.identity,
      language: languageOf(`${input.title} ${input.body}`),
    };
    const created =
      'doctorId' in input
        ? await reviews.createQuickReview({ ...review, doctorId: input.doctorId })
        : await reviews.createQuickReviewWithNewDoctor({
            doctor: {
              name: input.newDoctorName,
              specialtyId: input.newDoctorSpecialtyId,
              chamber: input.newDoctorChamber,
              bmdc: input.newDoctorBmdc,
            },
            review,
          });
    publicId = created.publicId;
  } catch (error) {
    logFailure('review.publish', error);
    return refused(prev, kept, {}, 'errors.common.internal');
  }

  revalidatePath('/', 'layout');
  return redirect({ href: `/experiences/${publicId}`, locale });
}

/** Saves the author's correction (a new version) and opens the experience page again. */
export async function saveReviewEdit(
  prev: EditFormState,
  formData: FormData,
): Promise<EditFormState> {
  const rawPublicId = formData.get('publicId');
  const publicId =
    typeof rawPublicId === 'string' && PUBLIC_ID_RE.test(rawPublicId) ? rawPublicId : null;
  const account = await requireAccount({
    returnTo: publicId ? `/experiences/${publicId}/edit` : '/me',
  });
  const locale = (await getLocale()) as Locale;
  const values = readFields(formData, EDIT_FIELDS);
  if (!publicId) return refused(prev, values, {}, 'errors.common.notFound');

  const parsed = EditInput.safeParse(values);
  if (!parsed.success) return refused(prev, values, fieldErrorsOf<EditField>(parsed.error));

  let outcome: Awaited<ReturnType<typeof reviews.updateOwnReview>>;
  try {
    outcome = await reviews.updateOwnReview(publicId, account.accountId, parsed.data);
  } catch (error) {
    logFailure('review.edit', error);
    return refused(prev, values, {}, 'errors.common.internal');
  }
  // `not_found` also means "not yours": the answer never tells the two apart.
  if (!outcome.ok) return refused(prev, values, {}, 'errors.common.notFound');

  revalidatePath('/', 'layout');
  return redirect({ href: `/experiences/${publicId}`, locale });
}
