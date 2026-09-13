import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { Policy } from './Policy';

const require = createRequire(import.meta.url);
const i18nEntryPath = require.resolve('@rogikotha/i18n');
const i18nPackageRoot = path.resolve(path.dirname(i18nEntryPath), '..');

function loadMessages(locale: 'en' | 'bn'): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

function renderPolicy(kind: 'terms' | 'privacy', locale: 'en' | 'bn' = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      <Policy kind={kind} />
    </NextIntlClientProvider>,
  );
}

function sectionTitles(container: HTMLElement): (string | null)[] {
  return Array.from(container.querySelectorAll('.about-sections > .about-section > h2')).map(
    (h2) => h2.textContent,
  );
}

describe('Policy — terms', () => {
  it('renders the head panel and the five Terms sections in task order', () => {
    const { container } = renderPolicy('terms');
    const head = container.querySelector('section.panel.about-head');
    expect(head?.querySelector('h1')?.textContent).toBe('Terms of use');
    expect(head?.querySelector('p.lead')?.textContent).toBe(
      'These terms describe what RogiKotha is, what you agree to when you write, and what we do not do.',
    );
    expect(sectionTitles(container)).toEqual([
      'What this is not',
      'What a reviewer label means',
      'How experiences are moderated',
      'Who can write',
      'Reports and enforcement',
    ]);
  });

  it('never renders the FD-022 lawful-access sentence', () => {
    const { queryByText } = renderPolicy('terms');
    expect(
      queryByText(
        'An anonymous account is never publicly linked to you. A small number of authorised staff can, for a stated moderation, security or legal reason, look up which account wrote it; every such access is recorded. We may be required to disclose that link in response to a lawful order.',
      ),
    ).toBeNull();
  });
});

describe('Policy — privacy', () => {
  it('renders the head panel and the three Privacy sections in task order', () => {
    const { container } = renderPolicy('privacy');
    const head = container.querySelector('section.panel.about-head');
    expect(head?.querySelector('h1')?.textContent).toBe('Privacy policy');
    expect(sectionTitles(container)).toEqual([
      'Privacy and identity',
      'What we keep',
      'Anonymous accounts and lawful requests',
    ]);
  });

  it('renders the FD-022 lawful-access sentence as its own section', () => {
    const { getByText } = renderPolicy('privacy');
    expect(
      getByText(
        'An anonymous account is never publicly linked to you. A small number of authorised staff can, for a stated moderation, security or legal reason, look up which account wrote it; every such access is recorded. We may be required to disclose that link in response to a lawful order.',
      ),
    ).toBeInTheDocument();
  });

  it('renders in Bengali with no English fallback', () => {
    const { container } = renderPolicy('privacy', 'bn');
    expect(sectionTitles(container)).toEqual([
      'গোপনীয়তা ও পরিচয়',
      'আমরা কী রাখি',
      'বেনামী অভিজ্ঞতা ও আইনসম্মত অনুরোধ',
    ]);
  });
});
