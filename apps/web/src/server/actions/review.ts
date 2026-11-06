'use server';

// Write and edit an experience (FR4, plan Step 8; U47 Step 36). Every action reads the signed-in
// account on the server and answers with i18n message keys, never with copy. The U47 actions only
// hand the request to the review module through `runCommand`, which parses, authorizes and decides.
import { getOwnAccountQuery } from '@rogikotha/application';
import {
  doctorNameLetterCount,
  LOCALES,
  hasControlOrFormat,
  OUTCOMES,
  PUBLIC_ID_RE,
  RELATIONSHIPS,
  SENTIMENTS,
  type AppError,
  type DemoReviewLanguage,
  type FacilityPreviewVM,
  type Locale,
  type PreviewVM,
} from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';

import { redirect } from '@/i18n/routing';
import { requireContributor, type CurrentAccount } from '@/server/auth/session';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';
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

// ASSUMPTION(U47): `publishReview` and its `Compose*` schemas and helpers stay until Step 56 deletes
// `ComposeForm.tsx`, their only caller, so the build stays green between plan steps.
/** Publishes a quick review at once and opens its page; signed-out authors go to sign-in. */
export async function publishReview(
  prev: ComposeFormState,
  formData: FormData,
): Promise<ComposeFormState> {
  const account = await requireContributor({ returnTo: '/write' });
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
  const account = await requireContributor({
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

/** A refused U47 action: the module's message keys only, never copy or an internal id. */
export interface ReviewActionRefusal {
  ok: false;
  messageKey: string;
  /** Field -> message key. */
  fieldErrors?: Record<string, string>;
  /** On `rate_limited`, for `errors.common.rateLimited {minutes}`. */
  retryAfterSec?: number;
}

export type ReviewActionAnswer<T extends object> = ({ ok: true } & T) | ReviewActionRefusal;

/** What `publishDraftAction` answers when it does not redirect. */
export interface PublishDraftState {
  formError: string;
  fieldErrors: Record<string, string>;
  retryAfterSec?: number;
}

function refusalOf(error: AppError): ReviewActionRefusal {
  return {
    ok: false,
    messageKey: error.messageKey,
    ...(error.fieldErrors !== undefined ? { fieldErrors: error.fieldErrors } : {}),
    ...(error.retryAfterSec !== undefined ? { retryAfterSec: error.retryAfterSec } : {}),
  };
}

function publishRefusalOf(error: AppError): PublishDraftState {
  const fieldErrors = { ...error.fieldErrors };
  // BR3.12: the composer shows this refusal on the identity choice.
  if (error.code === 'review.anonymous_new_doctor') fieldErrors.identity ??= error.messageKey;
  return {
    formError: error.messageKey,
    fieldErrors,
    ...(error.retryAfterSec !== undefined ? { retryAfterSec: error.retryAfterSec } : {}),
  };
}

/** The draft id of `{draftId}`; anything else is left for the command's schema to refuse. */
function draftIdOf(raw: unknown): unknown {
  return typeof raw === 'object' && raw !== null ? (raw as { draftId?: unknown }).draftId : raw;
}

/** WF2: `{draftId?, payload}`; the command checks the limit, parses leniently and encrypts. */
export async function saveDraftAction(
  raw: unknown,
): Promise<ReviewActionAnswer<{ draftId: string; expiresAt: string }>> {
  const result = await runCommand(getContainer().review.saveDraft, raw);
  return result.ok ? { ok: true, ...result.data } : refusalOf(result.error);
}

/** Deletes the actor's own draft; another account's draft reads as not found (BR2.3). */
export async function discardDraftAction(raw: unknown): Promise<ReviewActionAnswer<object>> {
  const result = await runCommand(getContainer().review.discardDraft, raw);
  if (!result.ok) return refusalOf(result.error);
  for (const locale of LOCALES) revalidatePath(`/${locale}/write`);
  return { ok: true };
}

/** WF3: the preview of the draft, with the author's own names for the byline. */
export async function previewAction(
  raw: unknown,
): Promise<ReviewActionAnswer<{ preview: PreviewVM | FacilityPreviewVM }>> {
  const own = await runCommand(getOwnAccountQuery, {});
  if (!own.ok) return refusalOf(own.error);
  const result = await runCommand(getContainer().review.preview, {
    draftId: draftIdOf(raw),
    names: { named: own.data.displayName, pseudonymous: own.data.username },
  });
  return result.ok ? { ok: true, preview: result.data } : refusalOf(result.error);
}

/** Whether the author already has a public review of the draft's doctor (the `dup` check). */
export async function duplicateHintAction(
  raw: unknown,
): Promise<ReviewActionAnswer<{ duplicate: boolean }>> {
  const result = await runCommand(getContainer().review.hasOwnReviewOfDoctor, {
    draftId: draftIdOf(raw),
  });
  return result.ok ? { ok: true, duplicate: result.data.duplicate } : refusalOf(result.error);
}

/** WF4: `{draftId, identityMode, attestation: true}`; opens the new experience on success. */
export async function publishDraftAction(raw: unknown): Promise<PublishDraftState> {
  const result = await runCommand(getContainer().review.publish, raw);
  if (!result.ok) return publishRefusalOf(result.error);

  revalidatePath('/', 'layout');
  const locale = (await getLocale()) as Locale;
  return redirect({ href: `/experiences/${result.data.publicId}?published=1`, locale });
}

/** WF5: a facility visit account; opens the facility page on success. */
export async function publishFacilityVisitAction(raw: unknown): Promise<PublishDraftState> {
  const result = await runCommand(getContainer().review.facilityReviewPublish, raw);
  if (!result.ok) return publishRefusalOf(result.error);

  revalidatePath('/', 'layout');
  const locale = (await getLocale()) as Locale;
  return redirect({ href: `/facilities/${result.data.branchPublicId}`, locale });
}
