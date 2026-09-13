import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { titleForView, documentTitle, type Translate } from './titles';

// Reads the real dictionaries that ship with @rogikotha/i18n (T-006, "usable
// as-is" per the T-008 task file — this reads its shipped data file rather
// than importing an unexported subpath the package's `exports` map doesn't
// list).
const require = createRequire(import.meta.url);
const i18nEntryPath = require.resolve('@rogikotha/i18n');
const i18nPackageRoot = path.resolve(path.dirname(i18nEntryPath), '..');

function loadMessages(locale: 'en' | 'bn'): Record<string, unknown> {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
}

function translatorFor(locale: 'en' | 'bn'): Translate {
  const messages = loadMessages(locale);
  return (key: string) => {
    const value = key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, messages);
    if (typeof value !== 'string') {
      throw new Error(`Missing test fixture message "${key}" for locale ${locale}`);
    }
    return value;
  };
}

describe('titleForView', () => {
  it('matches the prototype static titles in English', () => {
    const t = translatorFor('en');
    expect(titleForView('discover', t)).toBe('');
    expect(titleForView('results', t)).toBe('Results');
    expect(titleForView('doctors', t)).toBe('Doctors');
    expect(titleForView('profile', t)).toBe('Doctors');
    expect(titleForView('facilities', t)).toBe('Hospitals & clinics');
    expect(titleForView('topics', t)).toBe('Health topics');
    expect(titleForView('experiences', t)).toBe('Experiences');
    expect(titleForView('compose', t)).toBe('Share your experience');
    expect(titleForView('mine', t)).toBe('My writing');
    expect(titleForView('security', t)).toBe('Security');
    expect(titleForView('saved', t)).toBe('Saved');
    expect(titleForView('notifications', t)).toBe('Notifications');
    expect(titleForView('person', t)).toBe('Public profile');
    expect(titleForView('emergency', t)).toBe('Emergency help');
    expect(titleForView('about', t)).toBe('About & methodology');
    expect(titleForView('register', t)).toBe('Create an account');
    expect(titleForView('signin', t)).toBe('Sign in');
    expect(titleForView('verify', t)).toBe('Confirm your email');
    expect(titleForView('reset', t)).toBe('Reset your password');
    expect(titleForView('queue', t)).toBe('Report queue');
    expect(titleForView('evidence', t)).toBe('Evidence quarantine');
    expect(titleForView('providers', t)).toBe('Providers & claims');
    expect(titleForView('config', t)).toBe('Configuration');
    expect(titleForView('admin-notifications', t)).toBe('Notifications');
    expect(titleForView('admin-signin', t)).toBe('Sign in');
    expect(titleForView('admin-approve', t)).toBe('Approve this device');
    expect(titleForView('admin-security', t)).toBe('Security');
  });

  it('matches the prototype static titles in Bengali', () => {
    const t = translatorFor('bn');
    expect(titleForView('discover', t)).toBe('');
    expect(titleForView('results', t)).toBe('ফলাফল');
    expect(titleForView('doctors', t)).toBe('ডাক্তারেরা');
    expect(titleForView('facilities', t)).toBe('হাসপাতাল ও ক্লিনিক');
    expect(titleForView('topics', t)).toBe('রোগ ও স্বাস্থ্য');
    expect(titleForView('experiences', t)).toBe('অভিজ্ঞতা');
    expect(titleForView('compose', t)).toBe('অভিজ্ঞতা লিখুন');
    expect(titleForView('mine', t)).toBe('আমার লেখা');
    expect(titleForView('saved', t)).toBe('সংরক্ষিত');
    expect(titleForView('notifications', t)).toBe('বিজ্ঞপ্তি');
    expect(titleForView('person', t)).toBe('প্রকাশ্য প্রোফাইল');
    expect(titleForView('emergency', t)).toBe('জরুরি সাহায্য');
    expect(titleForView('about', t)).toBe('সম্পর্কে ও পদ্ধতি');
    expect(titleForView('register', t)).toBe('অ্যাকাউন্ট খুলুন');
    expect(titleForView('signin', t)).toBe('সাইন ইন');
    expect(titleForView('reset', t)).toBe('পাসওয়ার্ড রিসেট করুন');
    expect(titleForView('queue', t)).toBe('রিপোর্ট সারি');
  });

  it('falls back to the detail view\'s index title (no separate detail key exists yet)', () => {
    const t = translatorFor('en');
    expect(titleForView('facility', t)).toBe(titleForView('facilities', t));
    expect(titleForView('condition', t)).toBe(titleForView('topics', t));
    expect(titleForView('account', t)).toBe(titleForView('experiences', t));
  });
});

describe('documentTitle', () => {
  it('appends the brand name, except for discover which uses the brand + tagline fallback', () => {
    const t = translatorFor('en');
    expect(documentTitle('doctors', t)).toBe('Doctors — RogiKotha');
    expect(documentTitle('discover', t)).toBe('RogiKotha — Patient-reported treatment experiences');
  });
});
