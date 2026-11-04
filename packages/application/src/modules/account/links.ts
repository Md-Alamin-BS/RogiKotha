// The app's own pages that T-101's emails link to (T-101 § 8, BR2.1, BR5.1); never a library URL.
import type { Locale } from '@rogikotha/contracts';

import type { AppSettings, EmailParams } from '../../ports';

export type EmailPage = 'verify-email' | 'reset-password' | 'sign-in';

/** `{link}` for the recipient's locale, with the token as the only query value. */
export function linkParams(
  app: AppSettings,
  page: EmailPage,
  token?: string,
): (locale: Locale) => EmailParams {
  const query = token === undefined ? '' : `?token=${encodeURIComponent(token)}`;
  return (locale) => ({ link: `${app.appUrl}/${locale}/${page}${query}` });
}
