import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  FakeDirectoryModuleRepository,
  FakeReviewReadRepository,
  FakeTaxonomyModuleRepository,
  makeDirectoryFakes,
} from './directory-repositories.js';
import { FakeReviewModuleRepository } from './review-repository.js';

const repositoriesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../database/src/repositories',
);

/** Method names of the file's one `export class Pg…`, read from its body's source text. */
function classMethodNames(file: string): string[] {
  const source = fs.readFileSync(path.join(repositoriesDir, file), 'utf8');
  const body = /^export class Pg\w+[^{]*\{\n([^]*?)^\}$/m.exec(source)?.[1] ?? '';
  const pattern = /^ {2}(?:async\s+)?([a-zA-Z_$][\w$]*)\s*\([^]*?\)\s*:\s*Promise</gm;
  return [...new Set([...body.matchAll(pattern)].map((m) => m[1]!))];
}

describe('each U46 fake covers every method of its PostgreSQL repository (BR8.4)', () => {
  it.each([
    { file: 'directory-module.ts', fake: FakeDirectoryModuleRepository },
    { file: 'taxonomy-module.ts', fake: FakeTaxonomyModuleRepository },
    { file: 'review-reads.ts', fake: FakeReviewReadRepository },
  ])('$fake.name covers $file', ({ file, fake }) => {
    const methods = classMethodNames(file);
    const fakeMethods = new Set(Object.getOwnPropertyNames(fake.prototype));

    expect(methods.length).toBeGreaterThan(5);
    expect(methods.filter((name) => !fakeMethods.has(name))).toEqual([]);
  });
});

const tx = {} as never;

describe('the review read fake counts only eligible reviews (ISS-222)', () => {
  it('leaves out a hidden, a soft-deleted and an unpublished review', async () => {
    const { directory, reviews } = makeDirectoryFakes();
    const doctor = directory.addDoctor();
    reviews.addReview({ doctorId: doctor.id });
    reviews.addReview({ doctorId: doctor.id, state: 'hidden' });
    reviews.addReview({ doctorId: doctor.id, deletedAt: new Date('2026-10-02T00:00:00Z') });
    reviews.addReview({ doctorId: doctor.id, publishedAt: null });

    expect(await reviews.publishedForDoctor(tx, doctor.id)).toHaveLength(1);
    expect(await reviews.summariesForDoctors(tx, [doctor.id])).toHaveLength(1);
  });

  it('leaves out every review of a merged or unpublished doctor', async () => {
    const { directory, taxonomy, reviews } = makeDirectoryFakes();
    const term = taxonomy.addTerm({ nameEn: 'Asthma', nameBn: 'হাঁপানি' });
    const merged = directory.addDoctor({ mergedIntoId: directory.addDoctor().id });
    const hidden = directory.addDoctor({ state: 'hidden' });
    for (const doctor of [merged, hidden]) {
      reviews.addReview({ doctorId: doctor.id, tags: [{ group: 'condition', termId: term.id }] });
    }

    expect((await reviews.totalsForTerms(tx, [term.id])).get(term.id)).toBe(0);
    expect(await reviews.listRecentCards(tx, { limit: 10 })).toEqual([]);
  });

  it('counts a review once for a topic it is tagged with twice', async () => {
    const { directory, taxonomy, reviews } = makeDirectoryFakes();
    const term = taxonomy.addTerm({ nameEn: 'Asthma', nameBn: 'হাঁপানি' });
    const doctor = directory.addDoctor();
    reviews.addReview({
      doctorId: doctor.id,
      tags: [
        { group: 'condition', termId: term.id },
        { group: 'condition', freeText: ' হাঁপানি ' },
      ],
    });

    expect((await reviews.totalsForTerms(tx, [term.id])).get(term.id)).toBe(1);
  });
});

describe('the facility review fake', () => {
  it('leaves out hidden and deleted visits', async () => {
    const { directory, reviews } = makeDirectoryFakes();
    const branch = directory.addBranch();
    reviews.addFacilityReview({ branchId: branch.id });
    reviews.addFacilityReview({ branchId: branch.id, state: 'hidden' });
    reviews.addFacilityReview({ branchId: branch.id, deletedAt: new Date('2026-10-02T00:00:00Z') });

    expect(await reviews.publishedForBranch(tx, branch.id)).toHaveLength(1);
    expect(await reviews.summariesForBranches(tx, [branch.id])).toHaveLength(1);
  });
});

describe('U47 additions', () => {
  it('FakeReviewModuleRepository covers review-module.ts', () => {
    const methods = classMethodNames('review-module.ts');
    const fakeMethods = new Set(Object.getOwnPropertyNames(FakeReviewModuleRepository.prototype));

    expect(methods.length).toBeGreaterThan(5);
    expect(methods.filter((name) => !fakeMethods.has(name))).toEqual([]);
  });

  it('the card read filters by author persona and leaves out the excluded review', async () => {
    const { directory, reviews } = makeDirectoryFakes();
    const doctor = directory.addDoctor();
    const mine = reviews.addReview({ doctorId: doctor.id, authorPersonaId: 'p-mine' });
    const second = reviews.addReview({ doctorId: doctor.id, authorPersonaId: 'p-mine' });
    reviews.addReview({ doctorId: doctor.id, authorPersonaId: 'p-other' });

    const byPersona = await reviews.listRecentCards(tx, { limit: 10, personaIds: ['p-mine'] });
    const excluded = await reviews.listRecentCards(tx, {
      limit: 10,
      personaIds: ['p-mine'],
      excludePublicId: mine.publicId,
    });

    expect(byPersona.map((c) => c.id).sort()).toEqual([mine.id, second.id].sort());
    expect(excluded.map((c) => c.id)).toEqual([second.id]);
    expect(await reviews.listRecentCards(tx, { limit: 10, personaIds: [] })).toEqual([]);
  });
});
