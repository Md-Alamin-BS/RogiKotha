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

const EXPECTED = {
  en: {
    kicker: 'About & methodology',
    title: 'About RogiKotha',
    intro: 'RogiKotha is a place',
    sections: [
      'How experiences are moderated',
      'What a reviewer label means',
      'Privacy and identity',
      'What this is not',
      'Contact and feedback',
    ],
    foot: 'Methodology last reviewed 21 August 2026',
  },
  bn: {
    sections: [
      'অভিজ্ঞতা কীভাবে মডারেট করা হয়',
      'রিভিউয়ার লেবেলের অর্থ কী',
      'গোপনীয়তা ও পরিচয়',
      'এটি যা নয়',
      'যোগাযোগ ও মতামত',
    ],
  },
} as const;

// One block per locale, so `-t bn` selects the Bengali set (ISS-151).
describe.each(['en', 'bn'] as const)('About in %s', (locale) => {
  const messages = loadMessages(locale) as {
    nav: Record<string, string>;
    aboutview: Record<string, string>;
  };

  it('renders the head panel (kicker, h1, lead) from the locale dictionary', () => {
    const { container } = renderAbout(locale);
    const head = container.querySelector('section.panel.about-head');
    expect(head?.querySelector('.kicker')?.textContent).toBe(messages.nav.about);
    expect(head?.querySelector('h1')?.textContent).toBe(messages.aboutview.title);
    expect(head?.querySelector('p.lead')?.textContent).toBe(messages.aboutview.intro);
  });

  it('renders the five sections in the task order with no English fallback', () => {
    const { container } = renderAbout(locale);
    const sectionTitles = Array.from(
      container.querySelectorAll('.about-sections > .about-section > h2'),
    ).map((h2) => h2.textContent);
    expect(sectionTitles).toEqual(EXPECTED[locale].sections);
  });

  it('renders the about-foot last-reviewed note', () => {
    const { container } = renderAbout(locale);
    expect(container.querySelector('p.note.about-foot')?.textContent).toBe(
      messages.aboutview.lastReviewed,
    );
  });
});

describe('About in en, literal copy', () => {
  it('renders the English head copy', () => {
    const { container } = renderAbout('en');
    const head = container.querySelector('section.panel.about-head');
    expect(head?.querySelector('.kicker')?.textContent).toBe(EXPECTED.en.kicker);
    expect(head?.querySelector('h1')?.textContent).toBe(EXPECTED.en.title);
    expect(head?.querySelector('p.lead')?.textContent).toContain(EXPECTED.en.intro);
    expect(container.querySelector('p.note.about-foot')?.textContent).toBe(EXPECTED.en.foot);
  });

  it('uses the product contact copy, not the prototype-era "not monitored" clause', () => {
    const { getByText, queryByText } = renderAbout('en');
    expect(
      getByText('Email: hello@rogikotha.example. For real emergencies, do not use this site.'),
    ).toBeInTheDocument();
    expect(queryByText(/not monitored/)).toBeNull();
  });
});
