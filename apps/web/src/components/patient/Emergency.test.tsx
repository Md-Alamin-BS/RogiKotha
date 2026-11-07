import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { Emergency, type EmergencyConfig } from './Emergency';

const require = createRequire(import.meta.url);
const i18nEntryPath = require.resolve('@rogikotha/i18n');
const i18nPackageRoot = path.resolve(path.dirname(i18nEntryPath), '..');

function loadMessages(locale: 'en' | 'bn'): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

// Config values as they are typed literally in packages/contracts
// (DEFAULT_CONFIG_VALUES.emergency): a leading zero and an embedded hyphen
// in the crisis line, exactly as the task's step 1 names them.
const CONFIG: EmergencyConfig = {
  ambulance: '999',
  healthLine: '16263',
  crisisLine: '09612-119911',
  lastVerified: '2026-08-21',
};

function renderEmergency(locale: 'en' | 'bn') {
  return render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      <Emergency config={CONFIG} locale={locale} />
    </NextIntlClientProvider>,
  );
}

describe('Emergency', () => {
  it('renders three tel: cards plus the BMDC card, hrefs matching config numbers exactly', () => {
    const { container } = renderEmergency('en');
    const cards = container.querySelectorAll('a.emerg-card');
    expect(cards).toHaveLength(4);

    const ambulance = container.querySelector('a[href="tel:999"]');
    expect(ambulance?.querySelector('.k')?.textContent).toBe('Ambulance');
    expect(ambulance?.querySelector('.num')?.textContent).toBe('999');
    expect(ambulance?.querySelector('.cta')?.textContent).toBe('Tap to call');

    const healthLine = container.querySelector('a[href="tel:16263"]');
    expect(healthLine?.querySelector('.k')?.textContent).toBe('National health helpline');
    expect(healthLine?.querySelector('.num')?.textContent).toBe('16263');

    // The hyphen in the crisis line's `tel:` href is kept verbatim, not
    // stripped into a plain digit string.
    const crisis = container.querySelector('a[href="tel:09612-119911"]');
    expect(crisis).not.toBeNull();
    expect(crisis?.querySelector('.k')?.textContent).toBe('Mental health crisis line');
    expect(crisis?.querySelector('.num')?.textContent).toBe('09612-119911');
  });

  it('renders the BMDC card as an external link with target=_blank rel=noopener', () => {
    const { container } = renderEmergency('en');
    const bmdc = container.querySelector('a.emerg-card.bmdc');
    expect(bmdc).not.toBeNull();
    expect(bmdc).toHaveAttribute('href', 'https://verify.bmdc.org.bd/');
    expect(bmdc).toHaveAttribute('target', '_blank');
    expect(bmdc).toHaveAttribute('rel', 'noopener');
    expect(bmdc?.querySelector('.k')?.textContent).toBe('BMDC doctor register check');
    expect(bmdc?.querySelector('.num')?.textContent).toBe('BMDC');
    expect(bmdc?.querySelector('.cta')?.textContent).toBe(
      "To verify a doctor's registration number, use the official BMDC register. RogiKotha shows the number but does not replace the official check.",
    );
  });

  it('shows the last-verified line formatted through formatDate, in English', () => {
    const { getByText } = renderEmergency('en');
    expect(getByText('Last verified 21 August 2026')).toBeInTheDocument();
  });

  it('renders Bengali digits for the numbers and the last-verified date, keeping the hyphen', () => {
    const { container, getByText } = renderEmergency('bn');
    const crisis = container.querySelector('a[href="tel:09612-119911"]');
    expect(crisis?.querySelector('.num')?.textContent).toBe('০৯৬১২-১১৯৯১১');

    const healthLine = container.querySelector('a[href="tel:16263"]');
    // Bengali digit substitution only — no thousands grouping inserted.
    expect(healthLine?.querySelector('.num')?.textContent).toBe('১৬২৬৩');

    expect(getByText('সর্বশেষ যাচাই ২১ আগস্ট ২০২৬')).toBeInTheDocument();
  });

  it('renders the emerg-head panel with the kicker, h1 and intro, and no poison card', () => {
    const { container, queryByText } = renderEmergency('en');
    const head = container.querySelector('section.panel.emerg-head');
    expect(head?.querySelector('.kicker')?.textContent).toBe('Emergency help');
    expect(head?.querySelector('h1')?.textContent).toBe(
      'If this is an emergency, do not wait for an answer here',
    );
    expect(head?.querySelector('p')?.textContent).toContain('national emergency numbers');
    // Task step 1 / 03 read-first §5: emergview.poison exists as a key but
    // the prototype renders no poison card — this must stay that way.
    expect(queryByText('Poison information centre')).toBeNull();
  });
});

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';
const inLocale = (locale: 'en' | 'bn', latin: string) =>
  locale === 'en' ? latin : latin.replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)] ?? d);

describe.each(['en', 'bn'] as const)('Emergency in %s (U20)', (locale) => {
  const messages = loadMessages(locale) as { emergview: Record<string, string> };

  it.each([
    ['ambulance', CONFIG.ambulance],
    ['healthLine', CONFIG.healthLine],
    ['crisis', CONFIG.crisisLine],
  ] as const)('names the %s link by its label and the provider number', (labelKey, number) => {
    const { getByRole } = renderEmergency(locale);
    const label = messages.emergview[labelKey] ?? '';
    const link = getByRole('link', { name: new RegExp(`${label}.*${inLocale(locale, number)}`) });
    expect(link).toHaveAttribute('href', `tel:${number}`);
  });

  it('shows the short register name from the dictionary', () => {
    const { container } = renderEmergency(locale);
    expect(container.querySelector('a.emerg-card.bmdc .num')?.textContent).toBe(
      messages.emergview.bmdcShort,
    );
  });

  it('shows the last-verified line under the emerg-note class', () => {
    const { container } = renderEmergency(locale);
    const note = container.querySelector('p.note.emerg-note');
    expect(note?.textContent).toContain(inLocale(locale, '2026'));
    expect(note?.textContent).toContain(inLocale(locale, '21'));
  });

  it('carries no inline style attribute', () => {
    const { container } = renderEmergency(locale);
    expect(container.querySelectorAll('[style]')).toHaveLength(0);
  });
});
