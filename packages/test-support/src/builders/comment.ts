// `aComment()` — a comment entity. `toCommentPostInput()` extracts the
// `comment.post` command-input subset for schema validation against the
// real `CommentPostInput` (contracts/schemas/community.ts).
import type { CommentRecord } from '@rogikotha/application';
import type { CommentPostInput } from '@rogikotha/contracts';
import type { z } from 'zod';

import type { CorpusComment } from '../corpus/types.js';
import { seq, seqId } from './seq.js';

export interface CommentBuild extends CorpusComment {
  id: string;
}

export function aComment(overrides: Partial<CommentBuild> = {}): CommentBuild {
  const n = seqId('comment');
  return {
    id: n,
    seedRef: n,
    reviewSeedRef: overrides.reviewSeedRef ?? 'r1',
    parentSeedRef: null,
    author: { en: `builder_${n}`, bn: `builder_${n}` },
    identity: 'pseudo',
    when: { en: 'June 2026', bn: 'জুন ২০২৬' },
    likes: 0,
    dislikes: 0,
    body: { en: 'A synthetic comment for tests.', bn: 'পরীক্ষার জন্য একটি কাল্পনিক মন্তব্য।' },
    dangerous: false,
    externalLink: null,
    mentions: [],
    providerForDoctorSeedRef: null,
    ...overrides,
  };
}

export function toCommentPostInput(c: CommentBuild): z.infer<typeof CommentPostInput> {
  return {
    reviewId: c.reviewSeedRef,
    ...(c.parentSeedRef ? { parentId: c.parentSeedRef } : {}),
    body: c.body.en,
  };
}

// ASSUMPTION(U49): `aComment()` keeps the corpus shape its existing tests use; the release-1 row
// shape of `CommunityRepository` is a separate builder rather than a change to that one.
/** A release-1 `comments` row as `CommunityRepository` returns it: published, top-level, live. */
export function aCommentRecord(overrides: Partial<CommentRecord> = {}): CommentRecord {
  const n = seq('comment-record');
  return {
    id: `comment-record-${n}`,
    publicId: `cmt${String(n).padStart(7, '0')}`,
    reviewId: 'review-1',
    parentId: null,
    authorPersonaId: 'persona-1',
    body: 'A synthetic comment for tests.',
    state: 'published',
    deletedAt: null,
    tombstone: false,
    createdAt: new Date(Date.UTC(2026, 5, 1, 9, 0, n)),
    ...overrides,
  };
}
