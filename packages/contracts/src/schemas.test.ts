import { describe, expect, it } from 'vitest';

import { RegisterInput } from './schemas/account.js';
import { FileReportInput } from './schemas/moderation.js';
import { REPORT_REASONS } from './enums.js';

const VALID_REGISTER = {
  email: 'shirin@example.com',
  password: 'correct-horse',
  username: 'shirin_88',
  displayName: 'Shirin',
  locale: 'en' as const,
  ageConfirmed: true,
  termsAccepted: true,
};

describe('RegisterInput', () => {
  it('rejects a 9-character password', () => {
    const result = RegisterInput.safeParse({ ...VALID_REGISTER, password: '123456789' });
    expect(result.success).toBe(false);
  });

  it('accepts a 10-character password', () => {
    const result = RegisterInput.safeParse({ ...VALID_REGISTER, password: '1234567890' });
    expect(result.success).toBe(true);
  });

  it('rejects an uppercase username', () => {
    const result = RegisterInput.safeParse({ ...VALID_REGISTER, username: 'Shirin_88' });
    expect(result.success).toBe(false);
  });
});

describe('FileReportInput', () => {
  it('accepts every report reason', () => {
    for (const reason of REPORT_REASONS) {
      const result = FileReportInput.safeParse({
        targetKind: 'review',
        targetId: 'r1',
        reason,
        detail: 'a report detail',
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects a detail longer than 2000 characters', () => {
    const result = FileReportInput.safeParse({
      targetKind: 'review',
      targetId: 'r1',
      reason: 'other',
      detail: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});
