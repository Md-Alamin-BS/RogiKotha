'use server';

// Write an experience (FR4, plan Step 8; U47 Step 36). Every action answers with i18n message keys,
// never with copy, and only hands the request to the review module through `runCommand`, which
// parses, authorizes and decides. The author's correction is in `review-edit.ts` (U22).
import { getOwnAccountQuery } from '@rogikotha/application';
import {
  LOCALES,
  type AppError,
  type FacilityPreviewVM,
  type Locale,
  type PreviewVM,
} from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { redirect } from '@/i18n/routing';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';

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
