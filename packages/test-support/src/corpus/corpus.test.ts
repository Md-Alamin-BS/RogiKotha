// The five invariants named in the task's step 9 / "Tests to write".
import { describe, expect, it } from 'vitest';

import { COMMENTS } from './comments.js';
import { DOCTORS } from './doctors.js';
import { PERSONAS } from './personas.js';
import { REVIEWS } from './reviews.js';

describe('corpus invariants', () => {
  it("every review's doctorId exists", () => {
    const doctorRefs = new Set(DOCTORS.map((d) => d.seedRef));
    for (const r of REVIEWS) {
      expect(doctorRefs.has(r.doctorSeedRef), `review ${r.seedRef} references unknown doctor ${r.doctorSeedRef}`).toBe(
        true,
      );
    }
  });

  it("every comment's reviewId exists", () => {
    const reviewRefs = new Set(REVIEWS.map((r) => r.seedRef));
    for (const c of COMMENTS) {
      expect(
        reviewRefs.has(c.reviewSeedRef),
        `comment ${c.seedRef} references unknown review ${c.reviewSeedRef}`,
      ).toBe(true);
    }
  });

  it("k9's parent is k8", () => {
    const k9 = COMMENTS.find((c) => c.seedRef === 'k9');
    expect(k9?.parentSeedRef).toBe('k8');
  });

  // ASSUMPTION(T-007) / ISS-: the task's step 3 names review "r4" as the
  // anonymous review that "proves alias isolation" ("anon_author_r4"), but
  // in the actual prototype data (ui-design-prototype/shared/rogikotha-
  // data.js) r4's identity is 'pseudo' (author "r_ahmed") — the anonymous
  // reviews are r2, r8 and r12. This test proves the same hard rule the
  // task intended (an anonymous persona shares no account or key with any
  // other anonymous persona) across every anonymous review the corpus
  // actually has, instead of hard-coding the task text's wrong id.
  it('every anonymous review has its own persona, shared with no other content', () => {
    const anonPersonas = PERSONAS.filter((p) => p.kind === 'anonymous');
    const reviewIds = anonPersonas.map((p) => p.reviewSeedRef);
    expect(new Set(reviewIds).size).toBe(reviewIds.length); // one persona per anonymous review
    const accountUsernames = anonPersonas.map((p) => p.accountUsername);
    expect(new Set(accountUsernames).size).toBe(accountUsernames.length); // no shared account
    const keys = anonPersonas.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length); // no shared persona key
  });

  it('no doctor has a rating/score field', () => {
    for (const d of DOCTORS) {
      expect(d).not.toHaveProperty('rating');
      expect(d).not.toHaveProperty('score');
      expect(d).not.toHaveProperty('averageRating');
    }
  });
});
