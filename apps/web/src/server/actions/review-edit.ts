'use server';

// The author's correction of a published experience (U22 WF2, BR5.4). The action only reads the
// form and hands it to `review.correct` through `runCommand`; the command decides ownership,
// versions and limits, and the action maps each answer to one i18n message key.
import { PUBLIC_ID_RE, type AppError, type Locale } from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { redirect } from '@/i18n/routing';
import { requireContributor } from '@/server/auth/session';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';

export type CorrectField =
  | 'title'
  | 'story'
  | 'symptoms'
  | 'diagnosis'
  | 'treatment'
  | 'after'
  | 'sentiment'
  | 'outcome'
  | 'claims';

/** The form as submitted, handed back so a refused save keeps what the author typed. */
export interface CorrectValues {
  title: string;
  story: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  after: string;
  sentiment: string;
  outcome: string;
  claims: string[];
}

export interface CorrectFormState {
  /** Counts refused saves, so the form can remount with `values`. */
  attempt: number;
  values: CorrectValues | null;
  /** Field -> i18n message key. */
  fieldErrors: Partial<Record<string, string>>;
  formError: string | null;
  /** Set on `conflict`: the form offers the reload link. */
  conflict?: boolean;
  /** Set on `rate_limited`. */
  retryAfterSec?: number;
}

const SECTION_FIELDS = ['symptoms', 'diagnosis', 'treatment', 'after'] as const;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function valuesOf(formData: FormData): CorrectValues {
  return {
    title: text(formData, 'title'),
    story: text(formData, 'story'),
    symptoms: text(formData, 'symptoms'),
    diagnosis: text(formData, 'diagnosis'),
    treatment: text(formData, 'treatment'),
    after: text(formData, 'after'),
    sentiment: text(formData, 'sentiment'),
    outcome: text(formData, 'outcome'),
    claims: formData.getAll('claims').filter((claim): claim is string => typeof claim === 'string'),
  };
}

/** The command's input; a value the schema refuses comes back as the command's `validation`. */
function rawOf(formData: FormData, values: CorrectValues): Record<string, unknown> {
  const kind = text(formData, 'kind');
  const sections: Record<string, string> = {};
  for (const field of SECTION_FIELDS) if (values[field] !== '') sections[field] = values[field];
  return {
    publicId: text(formData, 'publicId'),
    expectedVersion: Number(text(formData, 'expectedVersion')),
    title: values.title,
    content: kind === 'detailed' ? { kind, sections } : { kind, story: values.story },
    ...(values.sentiment !== '' ? { sentiment: values.sentiment } : {}),
    ...(values.outcome !== '' ? { outcome: values.outcome } : {}),
    claims: values.claims,
  };
}

function refused(
  prev: CorrectFormState,
  values: CorrectValues,
  formError: string,
  extra: Partial<CorrectFormState> = {},
): CorrectFormState {
  return { attempt: prev.attempt + 1, values, fieldErrors: {}, formError, ...extra };
}

function refusalOf(
  prev: CorrectFormState,
  values: CorrectValues,
  error: AppError,
): CorrectFormState {
  switch (error.code) {
    case 'validation':
      return refused(prev, values, 'errors.common.validation', {
        fieldErrors: { ...error.fieldErrors },
      });
    case 'conflict':
      return refused(prev, values, 'errors.review.editConflict', { conflict: true });
    case 'rate_limited':
      return refused(prev, values, 'errors.review.correctionsLimit', {
        ...(error.retryAfterSec !== undefined ? { retryAfterSec: error.retryAfterSec } : {}),
      });
    case 'forbidden':
      return refused(prev, values, 'errors.common.forbidden');
    // `not_found` also means "not yours": the answer never tells the two apart.
    case 'not_found':
      return refused(prev, values, 'errors.common.notFound');
    default:
      getContainer().ports.logger.error('review.correct_failed', {
        errorCode: error.code,
        correlationId: error.correlationId,
      });
      return refused(prev, values, 'errors.common.internal');
  }
}

/** Saves the author's correction and opens the experience page again. */
export async function correctReviewAction(
  prev: CorrectFormState,
  formData: FormData,
): Promise<CorrectFormState> {
  const rawPublicId = text(formData, 'publicId');
  const publicId = PUBLIC_ID_RE.test(rawPublicId) ? rawPublicId : null;
  await requireContributor({ returnTo: publicId ? `/experiences/${publicId}/edit` : '/me' });
  const locale = (await getLocale()) as Locale;
  const values = valuesOf(formData);
  if (!publicId) return refused(prev, values, 'errors.common.notFound');

  let result: Awaited<ReturnType<typeof runCommand>>;
  try {
    result = await runCommand(getContainer().review.correct, rawOf(formData, values));
  } catch {
    getContainer().ports.logger.error('review.correct_failed', { errorCode: 'internal' });
    return refused(prev, values, 'errors.common.internal');
  }
  if (!result.ok) return refusalOf(prev, values, result.error);

  revalidatePath('/', 'layout');
  return redirect({ href: `/experiences/${publicId}`, locale });
}
