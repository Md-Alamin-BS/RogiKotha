// Builds the `EmailCatalog` from the message files' `email` tree (FD-098). The worker imports
// `@rogikotha/i18n/messages/{en,bn}.json` and hands them here; any nested object with a string
// `subject` and `body` becomes one template, keyed by its dotted path (`email.security.passwordChanged`).
import { LOCALES, type Locale } from '@rogikotha/contracts';

import type { EmailCatalog, EmailTemplate } from '../../ports';

type Tree = { readonly [key: string]: unknown };

function isTree(value: unknown): value is Tree {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collect(node: Tree, path: string, into: Record<string, EmailTemplate>): void {
  const { subject, body } = node;
  if (typeof subject === 'string' && typeof body === 'string') {
    into[path] = { subject, body };
  }
  for (const [key, child] of Object.entries(node)) {
    if (isTree(child)) collect(child, `${path}.${key}`, into);
  }
}

export function emailCatalogFromMessages(
  messages: Readonly<Record<Locale, unknown>>,
): EmailCatalog {
  const catalog = {} as Record<Locale, Record<string, EmailTemplate>>;
  for (const locale of LOCALES) {
    const templates: Record<string, EmailTemplate> = {};
    const root = messages[locale];
    const email = isTree(root) ? root.email : undefined;
    if (isTree(email)) collect(email, 'email', templates);
    catalog[locale] = templates;
  }
  return catalog;
}
