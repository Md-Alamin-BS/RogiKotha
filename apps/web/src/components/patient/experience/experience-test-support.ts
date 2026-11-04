// Builders and an intl wrapper for the experience and comment tests (demo slice, FR6).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator, type AbstractIntlMessages } from 'next-intl';
import type {
  DemoComment,
  DemoCommentThread,
  DemoReviewCard,
  DemoReviewDetail,
} from '@rogikotha/contracts';

export type TestLocale = 'en' | 'bn';

const require = createRequire(import.meta.url);
const messagesDir = path.join(
  path.resolve(path.dirname(require.resolve('@rogikotha/i18n')), '..'),
  'messages',
);

/** The real message file for `locale`. */
export function loadMessages(locale: TestLocale): AbstractIntlMessages {
  const file = path.join(messagesDir, `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

/** A translator over the same messages, for the text a test expects. */
export function testTranslator(
  locale: TestLocale,
): (key: string, values?: Record<string, string>) => string {
  const t = createTranslator({ locale, messages: loadMessages(locale) });
  return (key, values) => t(key as never, values as never);
}

export function renderInLocale(locale: TestLocale, ui: ReactNode) {
  return render(
    createElement(NextIntlClientProvider, {
      locale,
      messages: loadMessages(locale),
      timeZone: 'Asia/Dhaka',
      children: ui,
    }) as ReactElement,
  );
}

/** Stand-in for `@/i18n/routing`'s Link: next-intl's own needs a running Next router. */
export function TestLink({
  href,
  children,
  ...rest
}: {
  href: string | { pathname: string; query?: Record<string, string> };
  children?: ReactNode;
  [key: string]: unknown;
}) {
  const target =
    typeof href === 'string'
      ? href
      : `${href.pathname}${href.query ? `?${new URLSearchParams(href.query).toString()}` : ''}`;
  return createElement('a', { href: target, ...rest }, children);
}

export function buildReviewDetail(overrides: Partial<DemoReviewDetail> = {}): DemoReviewDetail {
  return {
    id: '0190f5a2-0000-7000-8000-00000000r001',
    publicId: 'exp0000001',
    title: 'Clear advice after a long wait',
    body: 'The doctor listened to every symptom.\n\nShe explained the tests in plain words.',
    doctor: {
      id: '0190f5a2-0000-7000-8000-00000000d001',
      publicId: 'dcr0000001',
      name: 'Dr. Nasrin Synthetic',
      specialty: 'Medicine',
    },
    authorDisplayName: 'Rina Akter',
    identityMode: 'named',
    relationship: 'parent',
    sentiment: 'positive',
    outcome: 'helped',
    periodYear: 2026,
    periodMonth: 3,
    language: 'en',
    publishedAt: new Date('2026-04-02T06:00:00Z'),
    updatedAt: null,
    edited: false,
    version: 1,
    readyEvidenceCount: 0,
    ...overrides,
  };
}

export function buildReviewCard(overrides: Partial<DemoReviewCard> = {}): DemoReviewCard {
  return {
    publicId: 'exp0000001',
    title: 'Clear advice after a long wait',
    excerpt: 'The doctor listened to every symptom.',
    doctor: {
      id: '0190f5a2-0000-7000-8000-00000000d001',
      publicId: 'dcr0000001',
      name: 'Dr. Nasrin Synthetic',
      specialty: 'Medicine',
    },
    authorDisplayName: 'Rina Akter',
    identityMode: 'named',
    relationship: 'self',
    sentiment: 'mixed',
    outcome: 'uncertain',
    periodYear: 2026,
    periodMonth: 3,
    publishedAt: new Date('2026-04-02T06:00:00Z'),
    edited: false,
    commentCount: 0,
    readyEvidenceCount: 0,
    ...overrides,
  };
}

let commentSequence = 0;

export function buildComment(overrides: Partial<DemoComment> = {}): DemoComment {
  commentSequence += 1;
  const n = String(commentSequence).padStart(4, '0');
  return {
    id: `0190f5a2-0000-7000-8000-00000000${n}`,
    publicId: `cmt000${n}`,
    body: `Synthetic comment ${n}`,
    authorDisplayName: 'Karim Reader',
    createdAt: new Date('2026-04-03T08:00:00Z'),
    tombstone: false,
    canDelete: false,
    ...overrides,
  };
}

export function buildThread(
  overrides: Partial<DemoComment> = {},
  replies: DemoComment[] = [],
): DemoCommentThread {
  return { ...buildComment(overrides), replies };
}
