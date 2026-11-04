import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { AbstractIntlMessages } from 'next-intl';

const require = createRequire(import.meta.url);
const messagesDir = path.join(
  path.resolve(path.dirname(require.resolve('@rogikotha/i18n')), '..'),
  'messages',
);

/** The real dictionary for `locale`. */
export function loadEvidenceMessages(locale: 'en' | 'bn'): AbstractIntlMessages {
  const file = path.join(messagesDir, `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}
