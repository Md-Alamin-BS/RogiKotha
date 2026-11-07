import { describe, expect, it } from 'vitest';

import { ERROR_CODES, errorMessageKey } from '../errors';
import {
  CheckUploadInput,
  EvidenceUploadFields,
  GetForAuthorInput,
  IntakeInput,
  ProcessEvidenceJobInput,
  RemoveEvidenceInput,
} from './evidence';

const REVIEW = 'a1b2c3d4e5';
const ITEM = 'f6g7h8j9k0';
const KEY = '3f1c2b9e-4d5a-4b6c-8d7e-9f0a1b2c3d4e';

describe('EvidenceUploadFields', () => {
  it('accepts a public review id and a UUID idempotency key', () => {
    expect(EvidenceUploadFields.parse({ reviewPublicId: REVIEW, idempotencyKey: KEY })).toEqual({
      reviewPublicId: REVIEW,
      idempotencyKey: KEY,
    });
  });

  it('refuses an idempotency key that is not a UUID', () => {
    const result = EvidenceUploadFields.safeParse({
      reviewPublicId: REVIEW,
      idempotencyKey: 'idem-1',
    });
    expect(result.success).toBe(false);
  });

  it('refuses an empty or malformed review id', () => {
    expect(
      EvidenceUploadFields.safeParse({ reviewPublicId: '', idempotencyKey: KEY }).success,
    ).toBe(false);
    expect(
      EvidenceUploadFields.safeParse({ reviewPublicId: 'A1B2C3D4E5', idempotencyKey: KEY }).success,
    ).toBe(false);
  });

  it('strips a field it does not know', () => {
    const parsed = EvidenceUploadFields.parse({
      reviewPublicId: REVIEW,
      idempotencyKey: KEY,
      accountId: 'someone-else',
    });
    expect(parsed).not.toHaveProperty('accountId');
  });
});

describe('CheckUploadInput', () => {
  it('accepts a positive whole byte count', () => {
    expect(
      CheckUploadInput.safeParse({ reviewPublicId: REVIEW, idempotencyKey: KEY, bytes: 1 }).success,
    ).toBe(true);
  });

  it('leaves the size limit to the command, so a file over 15 MB still parses', () => {
    const result = CheckUploadInput.safeParse({
      reviewPublicId: REVIEW,
      idempotencyKey: KEY,
      bytes: 15_728_641,
    });
    expect(result.success).toBe(true);
  });

  it('refuses zero, negative and fractional byte counts', () => {
    for (const bytes of [0, -1, 1.5]) {
      expect(
        CheckUploadInput.safeParse({ reviewPublicId: REVIEW, idempotencyKey: KEY, bytes }).success,
      ).toBe(false);
    }
  });

  it('refuses a bad UUID and strips an extra field', () => {
    expect(
      CheckUploadInput.safeParse({ reviewPublicId: REVIEW, idempotencyKey: 'x', bytes: 5 }).success,
    ).toBe(false);
    const parsed = CheckUploadInput.parse({
      reviewPublicId: REVIEW,
      idempotencyKey: KEY,
      bytes: 5,
      reviewId: 'internal',
    });
    expect(parsed).not.toHaveProperty('reviewId');
  });
});

describe('IntakeInput', () => {
  const valid = {
    reviewPublicId: REVIEW,
    declaredMime: 'image/png',
    declaredName: 'scan.png',
    idempotencyKey: KEY,
  };

  it('accepts the form fields of one upload', () => {
    expect(IntakeInput.parse(valid)).toEqual(valid);
  });

  it('leaves the type check to the command, so an unsupported MIME still parses', () => {
    expect(IntakeInput.safeParse({ ...valid, declaredMime: 'application/pdf' }).success).toBe(true);
  });

  it('accepts an empty file name, which renders as "Not provided"', () => {
    expect(IntakeInput.safeParse({ ...valid, declaredName: '' }).success).toBe(true);
  });

  it('refuses an empty MIME, a bad UUID and an empty review id', () => {
    expect(IntakeInput.safeParse({ ...valid, declaredMime: '' }).success).toBe(false);
    expect(IntakeInput.safeParse({ ...valid, idempotencyKey: 'not-a-uuid' }).success).toBe(false);
    expect(IntakeInput.safeParse({ ...valid, reviewPublicId: '' }).success).toBe(false);
  });

  it('strips an extra field', () => {
    expect(IntakeInput.parse({ ...valid, uploadedByAccountId: 'x' })).not.toHaveProperty(
      'uploadedByAccountId',
    );
  });
});

describe('RemoveEvidenceInput', () => {
  it('accepts an item public id', () => {
    expect(RemoveEvidenceInput.parse({ itemPublicId: ITEM })).toEqual({ itemPublicId: ITEM });
  });

  it('refuses an empty id and the old internal itemId field', () => {
    expect(RemoveEvidenceInput.safeParse({ itemPublicId: '' }).success).toBe(false);
    expect(RemoveEvidenceInput.safeParse({ itemId: ITEM }).success).toBe(false);
  });

  it('strips an extra field', () => {
    expect(RemoveEvidenceInput.parse({ itemPublicId: ITEM, reason: 'x' })).not.toHaveProperty(
      'reason',
    );
  });
});

describe('GetForAuthorInput', () => {
  it('accepts a review public id and refuses an empty one', () => {
    expect(GetForAuthorInput.safeParse({ reviewPublicId: REVIEW }).success).toBe(true);
    expect(GetForAuthorInput.safeParse({ reviewPublicId: '' }).success).toBe(false);
  });

  it('strips an extra field', () => {
    expect(GetForAuthorInput.parse({ reviewPublicId: REVIEW, draftId: 'd1' })).not.toHaveProperty(
      'draftId',
    );
  });
});

describe('ProcessEvidenceJobInput', () => {
  it('accepts the envelope payload and refuses an empty item id', () => {
    expect(ProcessEvidenceJobInput.safeParse({ itemId: 'item-1' }).success).toBe(true);
    expect(ProcessEvidenceJobInput.safeParse({ itemId: '' }).success).toBe(false);
  });
});

describe('evidence error codes', () => {
  it('lists evidence.rate_limited and evidence.upload_failed', () => {
    expect(ERROR_CODES).toContain('evidence.rate_limited');
    expect(ERROR_CODES).toContain('evidence.upload_failed');
  });

  it('maps them to errors.evidence.rateLimited and errors.evidence.uploadFailed', () => {
    expect(errorMessageKey('evidence.rate_limited')).toBe('errors.evidence.rateLimited');
    expect(errorMessageKey('evidence.upload_failed')).toBe('errors.evidence.uploadFailed');
  });
});
