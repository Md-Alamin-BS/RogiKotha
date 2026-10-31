import { describe, expect, it } from 'vitest';

import { doctorNameKey, doctorNameLetterCount, hasControlOrFormat } from './doctor-name';

describe('doctorNameKey', () => {
  it('ignores a Dr. or Prof. Dr. title, case and spaces', () => {
    expect(doctorNameKey('Dr. Same Person')).toBe('sameperson');
    expect(doctorNameKey('  same   PERSON ')).toBe('sameperson');
    expect(doctorNameKey('Prof. Dr. Same Person')).toBe('sameperson');
    expect(doctorNameKey('Dr Same Person')).toBe('sameperson');
  });

  it('ignores the Bengali titles ডাঃ, ডা. and ডা:', () => {
    expect(doctorNameKey('ডাঃ রহিম')).toBe('রহিম');
    expect(doctorNameKey('ডা. রহিম')).toBe('রহিম');
    expect(doctorNameKey('ডা: রহিম')).toBe('রহিম');
  });

  it('keeps a name that only starts with the letters "Dr"', () => {
    expect(doctorNameKey('Dristy Akter')).toBe('dristyakter');
    expect(doctorNameKey('Dristy Akter')).not.toBe(doctorNameKey('Isty Akter'));
  });
});

describe('doctorNameLetterCount', () => {
  it('counts no letters in a bare title, dots or digits', () => {
    expect(doctorNameLetterCount('Dr.')).toBe(0);
    expect(doctorNameLetterCount('ডা.')).toBe(0);
    expect(doctorNameLetterCount('...')).toBe(0);
    expect(doctorNameLetterCount('123')).toBe(0);
  });

  it('counts the letters of a real name after its title', () => {
    expect(doctorNameLetterCount('Dr. Ali')).toBe(3);
  });
});

describe('hasControlOrFormat', () => {
  it('finds zero-width, bidi and NUL characters', () => {
    expect(hasControlOrFormat('\u200b\u200b\u200b')).toBe(true);
    expect(hasControlOrFormat('Dr. \u202eilA')).toBe(true);
    expect(hasControlOrFormat('A\u0000B')).toBe(true);
  });

  it('accepts ordinary Bengali and English names', () => {
    expect(hasControlOrFormat('ডা. সিনথেটিক রহমান')).toBe(false);
    expect(hasControlOrFormat('Dr. Synthetic Rahman')).toBe(false);
  });
});
