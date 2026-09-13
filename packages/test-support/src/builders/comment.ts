// `aComment()` — a comment entity. `toCommentPostInput()` extracts the
// `comment.post` command-input subset for schema validation against the
// real `CommentPostInput` (contracts/schemas/community.ts).
import type { CommentPostInput } from '@rogikotha/contracts';
import type { z } from 'zod';

import type { CorpusComment } from '../corpus/types.js';
import { seqId } from './seq.js';

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
