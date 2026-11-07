// Builders of the release-1 thread view models for the comment component tests (U49).
import type { CommentVM, PersonaPublicVM, ThreadItemVM, ThreadVM } from '@rogikotha/contracts';

let sequence = 0;

export const NAMED_AUTHOR: PersonaPublicVM = {
  kind: 'named',
  displayName: 'Karim Reader',
  username: null,
  avatarHue: 120,
};

export const ANONYMOUS_AUTHOR: PersonaPublicVM = {
  kind: 'anonymous',
  displayName: 'patient-7k2q',
  avatarHue: 0,
};

export function aCommentVM(overrides: Partial<CommentVM> = {}): CommentVM {
  sequence += 1;
  const n = String(sequence).padStart(4, '0');
  return {
    publicId: `cmt000${n}`,
    author: NAMED_AUTHOR,
    body: `Synthetic comment ${n}`,
    postedAt: '2026-04-03T08:00:00.000Z',
    mine: false,
    isReply: false,
    ...overrides,
  };
}

/** A live top-level comment with its live replies. */
export function aCommentItem(
  overrides: Partial<CommentVM> = {},
  replies: CommentVM[] = [],
): ThreadItemVM {
  return {
    kind: 'comment',
    comment: aCommentVM({ ...overrides, isReply: false }),
    replies: replies.map((reply) => ({ ...reply, isReply: true })),
  };
}

/** A deleted top-level comment kept for its live replies. */
export function aPlaceholderItem(replies: CommentVM[]): ThreadItemVM {
  sequence += 1;
  return {
    kind: 'placeholder',
    placeholderPublicId: `cmt000${String(sequence).padStart(4, '0')}`,
    replies: replies.map((reply) => ({ ...reply, isReply: true })),
  };
}

export function aThreadVM(items: ThreadItemVM[] = [], overrides: Partial<ThreadVM> = {}): ThreadVM {
  return { open: true, items, truncated: false, ...overrides };
}
