import { expect } from '@playwright/test';

import { DEFAULT_MAILPIT_URL, E2E_ORIGIN } from './env';
import type { Locale } from './locale';
import { msg } from './messages';

// BR6.1, BR6.2: the newest message to one address with one subject, and its single app link.
// Mailpit is shared by every run on the machine; messages are told apart by recipient, and the
// suite never deletes one (only `pnpm demo:reset` clears Mailpit).

export const MAIL_TIMEOUT_MS = 30_000;
export const MAIL_INTERVAL_MS = 500;

export interface MailpitSummary {
  ID: string;
  Subject: string;
  Created: string;
  To: Array<{ Address: string; Name?: string }>;
}

export interface MailpitMessage {
  ID: string;
  Subject: string;
  Date?: string;
  From: { Address: string; Name?: string };
  To: Array<{ Address: string; Name?: string }>;
  Text: string;
  HTML: string;
}

export interface LatestLinkQuery {
  to: string;
  subjectKey: string;
  locale: Locale;
  /** The page the link opens, after `/<locale>`, for example `/verify-email`. */
  pathPrefix: string;
  /** Only messages created after this moment count. */
  after: Date;
}

export const mailpitUrl = (): string => process.env['MAILPIT_URL'] ?? DEFAULT_MAILPIT_URL;

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${mailpitUrl()}${path}`, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error(`Mailpit ${path} answered ${response.status}`);
  return (await response.json()) as T;
}

const decodeEntities = (text: string): string =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&#x3D;|&#61;/g, '=')
    .replace(/&quot;/g, '"');

/** The distinct app links in a message that start with `<APP_URL>/<locale><pathPrefix>`. */
export function appLinks(message: Pick<MailpitMessage, 'Text' | 'HTML'>, prefix: string): string[] {
  const found = new Set<string>();
  for (const body of [message.Text, decodeEntities(message.HTML)]) {
    for (const match of body.matchAll(/https?:\/\/[^\s"'<>)]+/g)) {
      const link = match[0].replace(/[.,;]+$/, '');
      if (link.startsWith(prefix)) found.add(link);
    }
  }
  return [...found];
}

export async function newestMessage(query: LatestLinkQuery): Promise<MailpitSummary | null> {
  const subject = msg(query.locale, query.subjectKey);
  const search = await getJson<{ messages: MailpitSummary[] }>(
    `/api/v1/search?query=${encodeURIComponent(`to:"${query.to}"`)}`,
  );
  return (
    search.messages
      .filter(
        (message) =>
          message.Subject === subject &&
          new Date(message.Created).getTime() > query.after.getTime(),
      )
      .sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime())[0] ?? null
  );
}

/** Waits up to 30 s for the message, then returns it with its one app link. */
export async function latestLink(
  query: LatestLinkQuery,
): Promise<{ link: string; message: MailpitMessage }> {
  let summary: MailpitSummary | null = null;
  await expect
    .poll(
      async () => {
        summary = await newestMessage(query);
        return summary !== null;
      },
      {
        message: `a "${query.subjectKey}" message to ${query.to}`,
        timeout: MAIL_TIMEOUT_MS,
        intervals: [MAIL_INTERVAL_MS],
      },
    )
    .toBe(true);
  const found = summary as MailpitSummary | null;
  if (!found) throw new Error(`No "${query.subjectKey}" message to ${query.to}`);
  const message = await getJson<MailpitMessage>(`/api/v1/message/${found.ID}`);
  const links = appLinks(message, `${E2E_ORIGIN}/${query.locale}${query.pathPrefix}`);
  if (links.length !== 1) {
    throw new Error(
      `Expected one ${query.pathPrefix} link in "${query.subjectKey}" to ${query.to}, found ${links.length}`,
    );
  }
  return { link: links[0] as string, message };
}

/** BR3.4: true when no message reached `to` after `after` (checked once the caller's wait ends). */
export async function hasNoMessageSince(to: string, after: Date): Promise<boolean> {
  const search = await getJson<{ messages: MailpitSummary[] }>(
    `/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
  );
  return search.messages.every((message) => new Date(message.Created).getTime() <= after.getTime());
}
