'use server';

import { UpdatePreferencesInput } from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { redirect } from '@/i18n/routing';
import { requireAccount } from '@/server/auth/session';
import { accounts } from '@/server/data';

import { setLang } from './preferences';

/** Matches the prototype's `maxlength="60"` on the display-name field. */
const DISPLAY_NAME_MAX = 60;
const ME = '/me';

export type ProfileErrorKey =
  | 'formErrors.profile.displayNameRequired'
  | 'formErrors.profile.displayNameTooLong'
  | 'errors.common.validation';

/** The result a profile form renders; `value` keeps the typed name after a refusal. */
export type ProfileFormState =
  | { status: 'idle' }
  | { status: 'saved'; value: string }
  | { status: 'error'; errorKey: ProfileErrorKey; value?: string };

const DisplayNameInput = z.object({
  displayName: z
    .string({ message: 'formErrors.profile.displayNameRequired' })
    .trim()
    .min(1, { message: 'formErrors.profile.displayNameRequired' })
    .max(DISPLAY_NAME_MAX, { message: 'formErrors.profile.displayNameTooLong' }),
});

function rawText(value: FormDataEntryValue | null): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * FR2.2: a new display name. The account comes from the session, never from the form, so a user
 * can only rename themselves. A change adds a named persona; earlier content keeps the old name.
 */
export async function updateDisplayNameAction(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const account = await requireAccount({ returnTo: ME });
  const typed = rawText(formData.get('displayName'));
  const parsed = DisplayNameInput.safeParse({ displayName: typed });
  if (!parsed.success) {
    const errorKey = parsed.error.issues[0]?.message as ProfileErrorKey | undefined;
    return {
      status: 'error',
      errorKey: errorKey ?? 'formErrors.profile.displayNameRequired',
      ...(typed === undefined ? {} : { value: typed }),
    };
  }

  const { displayName } = parsed.data;
  // An unchanged name would only add a duplicate persona.
  if (displayName !== account.displayName) {
    await accounts.updateDisplayName(account.accountId, displayName);
    revalidatePath('/', 'layout');
  }
  return { status: 'saved', value: displayName };
}

/**
 * FR2.3: the preferred language. Stored on the account and in the `rk.lang` cookie, then the
 * workspace reopens in that language.
 */
export async function updateLanguageAction(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const account = await requireAccount({ returnTo: ME });
  // The account.updatePreferences contract (zod, @rogikotha/contracts) validates the language.
  const parsed = UpdatePreferencesInput.safeParse({
    interfaceLocale: rawText(formData.get('locale')),
  });
  const locale = parsed.success ? parsed.data.interfaceLocale : undefined;
  if (!locale) return { status: 'error', errorKey: 'errors.common.validation' };

  if (locale !== account.locale) {
    await accounts.updateLocale(account.accountId, locale);
  }
  await setLang(locale);
  return redirect({ href: ME, locale });
}
