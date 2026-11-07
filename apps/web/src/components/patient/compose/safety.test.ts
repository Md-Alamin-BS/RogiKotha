import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG_VALUES, type ConfigValues } from '@rogikotha/contracts';

import { emptyDraftPayload } from './composer-reducer';
import { draftTexts, hasEmergencyMention, hasPhoneNumber, safetyFindings } from './safety';

const numbers: ConfigValues['emergency'] = {
  ambulance: '999',
  healthLine: '16263',
  crisisLine: '09612-119911',
  lastVerified: '2026-08-21',
};

describe('phone pattern', () => {
  it.each([
    ['01712345678', 'a local number in Latin digits'],
    ['call me on 01712-345-678 please', 'dashes between the groups'],
    ['01712 345 678', 'spaces between the groups'],
    ['+8801712345678', 'the country code'],
    ['+880 1712-345678', 'the country code with a space and a dash'],
    ['8801712345678', 'the country code without the plus'],
    ['০১৭১২৩৪৫৬৭৮', 'Bengali digits'],
    ['আমার নম্বর ০১৭১২-৩৪৫ ৬৭৮', 'Bengali digits with a dash and a space'],
    ['+৮৮০ ১৭১২৩৪৫৬৭৮', 'the country code in Bengali digits'],
  ])('finds %s (%s)', (text) => {
    expect(hasPhoneNumber(text)).toBe(true);
  });

  it.each([
    ['It started in 2019 and lasted until 2021.', 'years'],
    ['২০১৯ সালে শুরু হয়েছিল', 'a year in Bengali digits'],
    ['0171234567', 'one digit short'],
    ['017123456789', 'one digit too many'],
    ['Report 1201712345678', 'a longer record number'],
    ['02-9123456', 'a landline'],
    ['I took 500 mg twice a day for 10 days', 'doses'],
  ])('does not flag %s (%s)', (text) => {
    expect(hasPhoneNumber(text)).toBe(false);
  });
});

describe('emergency mention', () => {
  it.each([
    'I had chest pain now and then',
    'We called an AMBULANCE',
    'It was an emergency',
    'জরুরি বিভাগে নিয়ে গেলাম',
    'অ্যাম্বুলেন্স ডাকতে হয়েছিল',
    'We called 999 at night',
    'আমরা ৯৯৯-এ ফোন করেছিলাম',
    'The health line 16263 told us to come in',
    'I phoned 09612 119911',
  ])('finds "%s"', (text) => {
    expect(hasEmergencyMention(text, numbers)).toBe(true);
  });

  it.each([
    'The treatment began in 1999 and ended in 2001.',
    '১৯৯৯ সালে চিকিৎসা শুরু',
    'The fee was 9990 taka',
    'A calm follow-up visit',
  ])('does not flag "%s"', (text) => {
    expect(hasEmergencyMention(text, numbers)).toBe(false);
  });

  it('uses the configured numbers, not a fixed list', () => {
    expect(hasEmergencyMention('Dial 112', { ...numbers, ambulance: '112' })).toBe(true);
    expect(hasEmergencyMention('Dial 112', numbers)).toBe(false);
    expect(DEFAULT_CONFIG_VALUES.emergency.ambulance).toBe('999');
  });
});

describe('safety findings', () => {
  it('reports pii before emerg across every text field', () => {
    const payload = {
      ...emptyDraftPayload(),
      title: 'Emergency visit',
      sections: { symptoms: 'Fever', after: 'Call 01712345678' },
    };
    expect(draftTexts(payload)).toEqual(['Emergency visit', 'Fever', 'Call 01712345678']);
    expect(safetyFindings(draftTexts(payload), numbers)).toEqual(['pii', 'emerg']);
  });

  it('finds nothing in a plain story', () => {
    const payload = { ...emptyDraftPayload(), story: 'The doctor listened carefully in 2024.' };
    expect(safetyFindings(draftTexts(payload), numbers)).toEqual([]);
    expect(safetyFindings([], numbers)).toEqual([]);
  });
});
