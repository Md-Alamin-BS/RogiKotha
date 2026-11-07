import bn from '../../../../packages/i18n/messages/bn.json' with { type: 'json' };
import en from '../../../../packages/i18n/messages/en.json' with { type: 'json' };

import { formatNumber } from './digits';
import type { Locale } from './locale';

// BR2.6: specs assert the copy the pages render, read from the message files, never literals.

type Messages = { [key: string]: string | Messages };
export type MessageParams = Record<string, string | number>;

const MESSAGES: Record<Locale, Messages> = { bn, en };

/** The raw message at a dotted key; a missing key throws. */
export function rawMessage(locale: Locale, key: string): string {
  let node: string | Messages | undefined = MESSAGES[locale];
  for (const part of key.split('.')) {
    node = typeof node === 'object' ? node[part] : undefined;
  }
  if (typeof node !== 'string') throw new Error(`No ${locale} message at ${key}`);
  return node;
}

function matchingBrace(text: string, open: number): number {
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    else if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Unbalanced braces in message: ${text}`);
}

/** `selector {message}` pairs of a plural or select argument. */
function options(text: string): Map<string, string> {
  const found = new Map<string, string>();
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf('{', index);
    if (open < 0) break;
    const close = matchingBrace(text, open);
    found.set(text.slice(index, open).trim(), text.slice(open + 1, close));
    index = close + 1;
  }
  return found;
}

/** `#` outside nested arguments becomes the formatted number. */
function replaceHash(text: string, value: string): string {
  let out = '';
  let depth = 0;
  for (const char of text) {
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    out += char === '#' && depth === 0 ? value : char;
  }
  return out;
}

function argument(body: string, locale: Locale, params: MessageParams): string {
  const [name = '', type, ...rest] = body.split(',');
  const key = name.trim();
  const value = params[key];
  if (value === undefined) throw new Error(`Message parameter ${key} is missing`);
  const shown = typeof value === 'number' ? formatNumber(value, locale) : value;
  if (type === undefined) return shown;
  const choices = options(rest.join(','));
  const kind = type.trim();
  let chosen: string | undefined;
  if (kind === 'plural' && typeof value === 'number') {
    chosen =
      choices.get(`=${value}`) ??
      choices.get(new Intl.PluralRules(locale).select(value)) ??
      choices.get('other');
    if (chosen !== undefined) chosen = replaceHash(chosen, shown);
  } else if (kind === 'select') {
    chosen = choices.get(String(value)) ?? choices.get('other');
  } else {
    return shown;
  }
  if (chosen === undefined) throw new Error(`No option for ${key}=${String(value)}`);
  return format(chosen, locale, params);
}

function format(message: string, locale: Locale, params: MessageParams): string {
  let out = '';
  let index = 0;
  while (index < message.length) {
    if (message[index] === '{') {
      const close = matchingBrace(message, index);
      out += argument(message.slice(index + 1, close), locale, params);
      index = close + 1;
    } else {
      out += message[index];
      index += 1;
    }
  }
  return out;
}

/**
 * The text a page renders for `key`: ICU arguments filled (numbers in the locale's digits) and
 * rich-text tags dropped, as the browser shows them.
 */
export function msg(locale: Locale, key: string, params: MessageParams = {}): string {
  return format(rawMessage(locale, key), locale, params).replace(/<\/?[a-zA-Z][\w-]*>/g, '');
}

/** Every dotted key and value of one message file (used by the copy and no-rating checks). */
export function allMessages(locale: Locale): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const walk = (node: Messages, prefix: string) => {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') out.push([path, value]);
      else walk(value, path);
    }
  };
  walk(MESSAGES[locale], '');
  return out;
}
