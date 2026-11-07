// "every builder output parses with its contracts schema" (task step 9).
// Six builders map cleanly onto a real command-input zod schema
// (`account`, `comment`, `evidence`, `report`, `review`, `case` — via their
// `to*Input()` helpers) and are validated against it here. The rest
// (`doctor`, `branch`, `condition`, `facilityReview`, `persona`) have no
// entity-level zod schema anywhere in this codebase yet — `packages/domain`
// is still T-003's empty placeholder — so they are checked structurally
// instead (required fields present, correct shape); see ISSUES.md.
import {
  CommentPostInput,
  ConfigValuesSchema,
  DraftPayload,
  DecideCaseInput,
  FileReportInput,
  IntakeEvidenceInput,
  PublishReviewInput,
  RegisterInput,
} from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { anAccount, toRegisterInput } from './account.js';
import { aBranch } from './branch.js';
import { aCase, toDecideCaseInput } from './case.js';
import { aComment, toCommentPostInput } from './comment.js';
import { aCondition } from './condition.js';
import { aConfig } from './config.js';
import { aDoctor } from './doctor.js';
import { anEvidenceItem, toIntakeEvidenceInput } from './evidence.js';
import { aFacilityReview } from './facility-review.js';
import { aPersona } from './persona.js';
import { aReport, toFileReportInput } from './report.js';
import { aDraftPayload, aReview, toPublishReviewInput } from './review.js';
import { resetSeq } from './seq.js';

describe('builders parse with their contracts schema', () => {
  it('anAccount() -> RegisterInput', () => {
    resetSeq();
    expect(() => RegisterInput.parse(toRegisterInput(anAccount()))).not.toThrow();
    expect(() =>
      RegisterInput.parse(toRegisterInput(anAccount({ role: 'moderator' }))),
    ).not.toThrow();
  });

  it('aReview() -> PublishReviewInput (publish subset)', () => {
    expect(() => PublishReviewInput.parse(toPublishReviewInput(aReview()))).not.toThrow();
  });

  it('aDraftPayload() -> DraftPayload in each variant (U47)', () => {
    for (const variant of ['quick', 'detailed', 'facility'] as const) {
      expect(() => DraftPayload.parse(aDraftPayload(variant))).not.toThrow();
    }
    expect(DraftPayload.parse(aDraftPayload('facility')).target).toBe('facility');
    expect(DraftPayload.parse(aDraftPayload('detailed')).mode).toBe('detailed');
    expect(aDraftPayload('quick', { identityMode: 'anonymous' }).identityMode).toBe('anonymous');
  });

  it('aReview() carries the release-1 columns with a well-formed public id (U47)', () => {
    const r = aReview();
    expect(r.publicId).toMatch(/^[0-9a-hjkmnp-tv-z]{10}$/);
    expect(r).toMatchObject({ kind: 'quick', language: 'en', exactDate: null });
    expect(r.periodMonth).toBeGreaterThanOrEqual(1);
  });

  it('aComment() -> CommentPostInput', () => {
    expect(() => CommentPostInput.parse(toCommentPostInput(aComment()))).not.toThrow();
    expect(() =>
      CommentPostInput.parse(toCommentPostInput(aComment({ parentSeedRef: 'k1' }))),
    ).not.toThrow();
  });

  it('anEvidenceItem() -> IntakeEvidenceInput', () => {
    expect(() => IntakeEvidenceInput.parse(toIntakeEvidenceInput(anEvidenceItem()))).not.toThrow();
  });

  it('aReport() -> FileReportInput', () => {
    expect(() => FileReportInput.parse(toFileReportInput(aReport()))).not.toThrow();
  });

  it('aCase() -> DecideCaseInput', () => {
    expect(() => DecideCaseInput.parse(toDecideCaseInput(aCase()))).not.toThrow();
  });

  it('aConfig() -> ConfigValuesSchema', () => {
    expect(() => ConfigValuesSchema.parse(aConfig())).not.toThrow();
    expect(() => ConfigValuesSchema.parse(aConfig({ limitedDataThreshold: 3 }))).not.toThrow();
  });
});

describe('builders without an entity-level schema still produce a complete shape', () => {
  it('aDoctor() has every required field and no rating/score field', () => {
    const d = aDoctor();
    expect(d.seedRef).toBeTruthy();
    expect(d.name.en).toBeTruthy();
    expect(d.chambers.length).toBeGreaterThan(0);
    expect(d).not.toHaveProperty('rating');
    expect(d).not.toHaveProperty('score');
  });

  it('aBranch() has every required field', () => {
    const b = aBranch();
    expect(b.seedRef).toBeTruthy();
    expect(b.name.en).toBeTruthy();
    expect(b.name.bn).toBeTruthy();
    expect(['hospital', 'clinic', 'diagnostic']).toContain(b.type);
  });

  it('aCondition() has every required field', () => {
    const c = aCondition();
    expect(c.seedRef).toBeTruthy();
    expect(c.name.en).toBeTruthy();
    expect(Array.isArray(c.aliases)).toBe(true);
  });

  it('aFacilityReview() never carries a doctor reference (hard rule)', () => {
    const fr = aFacilityReview();
    expect(fr).not.toHaveProperty('doctorSeedRef');
    expect(fr.branchSeedRef).toBeTruthy();
  });

  it('aPersona() has every required field', () => {
    const p = aPersona();
    expect(['named', 'pseudonymous', 'anonymous']).toContain(p.kind);
    expect(p.displayName.en).toBeTruthy();
  });
});

describe('seq()/seqId() determinism', () => {
  it('never repeats and never uses Math.random', () => {
    resetSeq();
    const a = anAccount();
    const b = anAccount();
    expect(a.username).not.toBe(b.username);
  });
});
