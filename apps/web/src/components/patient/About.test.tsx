import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { About } from './About';

const require = createRequire(import.meta.url);
const i18nEntryPath = require.resolve('@rogikotha/i18n');
const i18nPackageRoot = path.resolve(path.dirname(i18nEntryPath), '..');

function loadMessages(locale: 'en' | 'bn'): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

function renderAbout(locale: 'en' | 'bn') {
  return render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      <About />
    </NextIntlClientProvider>,
  );
}

describe('About', () => {
  it('renders the head panel (kicker, h1, lead) then five sections in the task order, in English', () => {
    const { container } = renderAbout('en');
    const head = container.querySelector('section.panel.about-head');
    expect(head?.querySelector('.kicker')?.textContent).toBe('About & methodology');
    expect(head?.querySelector('h1')?.textContent).toBe('About RogiKotha');
    expect(head?.querySelector('p.lead')?.textContent).toContain('RogiKotha is a place');

    const sectionTitles = Array.from(
      container.querySelectorAll('.about-sections > .about-section > h2'),
    ).map((h2) => h2.textContent);
    expect(sectionTitles).toEqual([
      'How experiences are moderated',
      'What a reviewer label means',
      'Privacy and identity',
      'What this is not',
      'Contact and feedback',
    ]);
  });

  it('uses the product contact copy, not the prototype-era "not monitored" clause', () => {
    const { getByText, queryByText } = renderAbout('en');
    expect(
      getByText('Email: hello@rogikotha.example. For real emergencies, do not use this site.'),
    ).toBeInTheDocument();
    expect(queryByText(/not monitored/)).toBeNull();
  });

  it('renders the about-foot last-reviewed note', () => {
    const { container } = renderAbout('en');
    expect(container.querySelector('p.note.about-foot')?.textContent).toBe(
      'Methodology last reviewed 21 August 2026',
    );
  });

  it('renders all five sections in Bengali with no English fallback', () => {
    const { container } = renderAbout('bn');
    const sectionTitles = Array.from(
      container.querySelectorAll('.about-sections > .about-section > h2'),
    ).map((h2) => h2.textContent);
    expect(sectionTitles).toEqual([
      'অভিজ্ঞতা কীভাবে মডারেট করা হয়',
      'রিভিউয়ার লেবেলের অর্থ কী',
      'গোপনীয়তা ও পরিচয়',
      'এটি যা নয়',
      'যোগাযোগ ও মতামত',
    ]);
  });
});
