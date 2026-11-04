// FD-098: the worker renders email copy from the i18n message files themselves, never from the
// `@rogikotha/i18n` root (which loads next-intl). The application turns them into the catalog.
import type { EmailCatalog } from '@rogikotha/application';
import { emailCatalogFromMessages } from '@rogikotha/application/worker';
import bn from '@rogikotha/i18n/messages/bn.json' with { type: 'json' };
import en from '@rogikotha/i18n/messages/en.json' with { type: 'json' };

export function buildEmailCatalog(): EmailCatalog {
  return emailCatalogFromMessages({ en, bn });
}
