import { describe, expect, expectTypeOf, it } from 'vitest';

import type { CommentVM, ThreadItemVM, ThreadVM } from '../view-models/thread';
import { DeleteCommentInput, GetThreadInput, PostCommentInput } from './community';

const REVIEW = 'a1b2c3d4e5';
const PARENT = 'f6g7h8j9k0';
// Latin e + U+0301, and Bengali KA + E sign + AA sign, which NFC composes to KA + O sign (U+09CB).
const DECOMPOSED = 'Cafe\u0301 \u0995\u09C7\u09BE';
const COMPOSED = 'Caf\u00E9 \u0995\u09CB';

function post(body: string) {
  return PostCommentInput.safeParse({ reviewPublicId: REVIEW, body });
}

describe('PostCommentInput', () => {
  it('accepts a top-level comment and a reply with public ids', () => {
    expect(post('Thank you for writing this.').success).toBe(true);
    expect(
      PostCommentInput.safeParse({ reviewPublicId: REVIEW, parentPublicId: PARENT, body: 'Same.' })
        .success,
    ).toBe(true);
  });

  it('refuses an empty and a whitespace-only body', () => {
    expect(post('').success).toBe(false);
    expect(post('   \n\t  ').success).toBe(false);
  });

  it('accepts one and 2000 code points and refuses 2001', () => {
    expect(post('a').success).toBe(true);
    expect(post('a'.repeat(2000)).success).toBe(true);
    expect(post('a'.repeat(2001)).success).toBe(false);
  });

  it('counts code points, not UTF-16 units, so 2000 astral characters fit', () => {
    expect(post('\u{1F600}'.repeat(2000)).success).toBe(true);
    expect(post('\u{1F600}'.repeat(2001)).success).toBe(false);
  });

  it('trims the body before the length check', () => {
    const parsed = post(`  ${'a'.repeat(2000)}  `);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.body).toBe('a'.repeat(2000));
  });

  it('keeps Bengali text and normalises a combining sequence to NFC', () => {
    const bengali = post('ডাক্তার খুব যত্ন নিয়ে দেখেছেন।');
    expect(bengali.success).toBe(true);
    expect(bengali.data?.body).toBe('ডাক্তার খুব যত্ন নিয়ে দেখেছেন।');

    const parsed = post(DECOMPOSED);
    expect(parsed.data?.body).toBe(COMPOSED);
    expect(parsed.data?.body).toBe(DECOMPOSED.normalize('NFC'));
  });

  it('keeps the Bengali joiners ZWJ and ZWNJ in a word, as review text does (FD-114)', () => {
    const ZWJ = String.fromCodePoint(0x200d);
    const ZWNJ = String.fromCodePoint(0x200c);
    const body = `র${ZWJ}্যাব উদ্${ZWNJ}যাপন`;
    const parsed = post(body);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.body).toBe(body);
  });

  it('keeps links, at-names and markdown as literal text', () => {
    const body = '**see** https://example.test @someone';
    expect(post(body).data?.body).toBe(body);
  });

  it('refuses a malformed review or parent id', () => {
    expect(PostCommentInput.safeParse({ reviewPublicId: 'NOT-AN-ID', body: 'x' }).success).toBe(
      false,
    );
    expect(
      PostCommentInput.safeParse({ reviewPublicId: REVIEW, parentPublicId: 'short', body: 'x' })
        .success,
    ).toBe(false);
    expect(
      PostCommentInput.safeParse({
        reviewPublicId: '0190a0b0-0000-7000-8000-000000000001',
        body: 'x',
      }).success,
    ).toBe(false);
  });

  it('refuses extra keys, so no internal id can be smuggled in', () => {
    expect(
      PostCommentInput.safeParse({ reviewPublicId: REVIEW, body: 'x', personaId: 'p' }).success,
    ).toBe(false);
    expect(
      PostCommentInput.safeParse({ reviewPublicId: REVIEW, body: 'x', reviewId: 'r' }).success,
    ).toBe(false);
  });

  it('names the length message key on a refused body', () => {
    const parsed = post('');
    expect(parsed.error?.issues[0]?.message).toBe('experience.commentLength');
  });
});

describe('DeleteCommentInput', () => {
  it('accepts a comment public id and refuses anything else', () => {
    expect(DeleteCommentInput.safeParse({ commentPublicId: PARENT }).success).toBe(true);
    expect(DeleteCommentInput.safeParse({ commentPublicId: 'bad' }).success).toBe(false);
    expect(DeleteCommentInput.safeParse({ commentPublicId: PARENT, extra: 1 }).success).toBe(false);
  });
});

describe('GetThreadInput', () => {
  it('accepts a review public id and refuses anything else', () => {
    expect(GetThreadInput.safeParse({ reviewPublicId: REVIEW }).success).toBe(true);
    expect(GetThreadInput.safeParse({ reviewPublicId: 'NOT-AN-ID' }).success).toBe(false);
    expect(GetThreadInput.safeParse({ reviewPublicId: REVIEW, extra: 1 }).success).toBe(false);
  });
});

describe('ThreadVM', () => {
  it('carries public ids only and no quality number', () => {
    expectTypeOf<keyof ThreadVM>().toEqualTypeOf<'open' | 'items' | 'truncated'>();
    expectTypeOf<keyof ThreadItemVM>().toEqualTypeOf<
      'kind' | 'comment' | 'placeholderPublicId' | 'replies'
    >();
    expectTypeOf<keyof CommentVM>().toEqualTypeOf<
      'publicId' | 'author' | 'body' | 'postedAt' | 'mine' | 'isReply'
    >();
  });
});
