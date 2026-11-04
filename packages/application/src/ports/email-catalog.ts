// FD-098: the worker container builds this from `@rogikotha/i18n/messages/{en,bn}.json` and hands
// it to `sendEmailDelivery`; application code never imports `packages/i18n`.
import type { Locale } from '@rogikotha/contracts';

export interface EmailTemplate {
  subject: string;
  /** Plain text with exactly one `{link}` placeholder. */
  body: string;
}

/** Locale, then message key (`email.verify`), then the template. */
export type EmailCatalog = Readonly<Record<Locale, Readonly<Record<string, EmailTemplate>>>>;
