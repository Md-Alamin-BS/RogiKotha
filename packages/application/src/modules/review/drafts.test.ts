import { describe, expect, it } from 'vitest';

import { saveDraftRateLimitKey } from './commands/save-draft';
import {
  REVIEW_DRAFT_LIFE_DAYS,
  REVIEW_DRAFT_SAVE_LIMIT,
  REVIEW_DRAFT_SAVE_WINDOW_SEC,
  REVIEW_LIVE_DRAFT_CAP,
} from './limits';
import { expectErr, expectOk, makeReviewModuleWorld } from './review-test-support';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('review.saveDraft', () => {
  it('creates an encrypted draft that lives 30 days and resolves the listed doctor', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const now = w.fakes.clock.now();

    const saved = expectOk(await w.review.saveDraft.execute({ payload: w.payload() }, m.call));

    expect(new Date(saved.expiresAt).getTime()).toBe(
      now.getTime() + REVIEW_DRAFT_LIFE_DAYS * DAY_MS,
    );
    expect(w.reviews.drafts).toHaveLength(1);
    const row = w.reviews.drafts[0]!;
    expect(row.accountId).toBe(m.accountId);
    expect(row.doctorId).toBe(w.doctor.id);
    expect(new TextDecoder().decode(row.payloadEnc)).not.toContain('The doctor listened');
    expect(w.fakes.audit.events).toHaveLength(0);
    expect(w.fakes.outbox.events).toHaveLength(0);
  });

  it('updates the own draft in place and moves its expiry', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m);
    w.fakes.clock.advance(5);

    const saved = expectOk(
      await w.review.saveDraft.execute(
        { draftId, payload: w.payload('quick', { title: 'A second look at the visit' }) },
        m.call,
      ),
    );

    expect(saved.draftId).toBe(draftId);
    expect(w.reviews.drafts).toHaveLength(1);
    expect(w.reviews.drafts[0]!.expiresAt.getTime()).toBe(
      w.fakes.clock.now().getTime() + REVIEW_DRAFT_LIFE_DAYS * DAY_MS,
    );
    const read = expectOk(await w.review.getDraft.execute({ draftId }, m.call));
    expect(read.payload.title).toBe('A second look at the visit');
  });

  it("answers not_found for another account's draft and leaves it unchanged", async () => {
    const w = makeReviewModuleWorld();
    const owner = await w.member();
    const other = await w.member();
    const draftId = await w.draftOf(owner);
    const before = new Uint8Array(w.reviews.drafts[0]!.payloadEnc);

    const error = expectErr(
      await w.review.saveDraft.execute(
        { draftId, payload: w.payload('quick', { title: 'Not mine to change' }) },
        other.call,
      ),
    );

    expect(error.code).toBe('not_found');
    expect(w.reviews.drafts).toHaveLength(1);
    expect(w.reviews.drafts[0]!.payloadEnc).toEqual(before);
  });

  it('answers not_found for an expired draft, which no longer counts or lists', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m);
    w.fakes.clock.advance(REVIEW_DRAFT_LIFE_DAYS + 1);

    const update = expectErr(
      await w.review.saveDraft.execute({ draftId, payload: w.payload() }, m.call),
    );
    const read = expectErr(await w.review.getDraft.execute({ draftId }, m.call));
    const list = expectOk(await w.review.listOwnDrafts.execute({}, m.call));

    expect(update.code).toBe('not_found');
    expect(read.code).toBe('not_found');
    expect(list).toEqual([]);
  });

  it('is rate limited per account and writes nothing when limited', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const key = saveDraftRateLimitKey(m.accountId);
    for (let i = 0; i < REVIEW_DRAFT_SAVE_LIMIT; i += 1) {
      await w.fakes.rateLimiter.hit(key, REVIEW_DRAFT_SAVE_LIMIT, REVIEW_DRAFT_SAVE_WINDOW_SEC);
    }

    const error = expectErr(await w.review.saveDraft.execute({ payload: w.payload() }, m.call));

    expect(error.code).toBe('rate_limited');
    expect(w.reviews.drafts).toHaveLength(0);
    const other = await w.member();
    expectOk(await w.review.saveDraft.execute({ payload: w.payload() }, other.call));
  });

  it('refuses the eleventh live draft with errors.review.draftsFull while an existing one still saves', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const ids: string[] = [];
    for (let i = 0; i < REVIEW_LIVE_DRAFT_CAP; i += 1) ids.push(await w.draftOf(m));

    const eleventh = expectErr(await w.review.saveDraft.execute({ payload: w.payload() }, m.call));
    const existing = await w.review.saveDraft.execute(
      { draftId: ids[3]!, payload: w.payload('detailed') },
      m.call,
    );

    expect(eleventh.code).toBe('conflict');
    expect(eleventh.messageKey).toBe('errors.review.draftsFull');
    expect(existing.ok).toBe(true);
    expect(w.reviews.drafts).toHaveLength(REVIEW_LIVE_DRAFT_CAP);
  });

  it('refuses a payload that fails the lenient parse, such as an unknown Reviewer label', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();

    const error = expectErr(
      await w.review.saveDraft.execute(
        { payload: { ...w.payload(), claims: ['misdiagnosis'] } },
        m.call,
      ),
    );

    expect(error.code).toBe('validation');
    expect(w.reviews.drafts).toHaveLength(0);
  });

  it('refuses an account whose email is not confirmed', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member({ status: 'pending_verification' });

    const error = expectErr(await w.review.saveDraft.execute({ payload: w.payload() }, m.call));

    expect(error.code).toBe('auth.email_unverified');
    expect(w.reviews.drafts).toHaveLength(0);
  });
});

describe('review.discardDraft', () => {
  it('deletes the own draft', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m);

    expectOk(await w.review.discardDraft.execute({ draftId }, m.call));

    expect(w.reviews.drafts).toHaveLength(0);
    expect(expectErr(await w.review.getDraft.execute({ draftId }, m.call)).code).toBe('not_found');
  });

  it("answers not_found for another account's draft and an unknown id alike", async () => {
    const w = makeReviewModuleWorld();
    const owner = await w.member();
    const other = await w.member();
    const draftId = await w.draftOf(owner);

    const foreign = expectErr(await w.review.discardDraft.execute({ draftId }, other.call));
    const unknown = expectErr(
      await w.review.discardDraft.execute({ draftId: w.fakes.ids.newId() }, other.call),
    );

    expect(foreign.code).toBe('not_found');
    expect(unknown.code).toBe(foreign.code);
    expect(w.reviews.drafts).toHaveLength(1);
  });
});

describe('review.getDraft and review.listOwnDrafts', () => {
  it('returns the own draft with its payload', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, w.payload('detailed'));

    const draft = expectOk(await w.review.getDraft.execute({ draftId }, m.call));

    expect(draft.draftId).toBe(draftId);
    expect(draft.payload.mode).toBe('detailed');
    expect(draft.payload.sections?.diagnosis).toContain('অ্যালার্জি');
  });

  it('answers not_found for an unreadable draft, logs only its code, and leaves it out of the list', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const readable = await w.draftOf(m);
    const unreadable = w.fakes.ids.newId();
    const now = w.fakes.clock.now();
    w.reviews.drafts.push({
      id: unreadable,
      accountId: m.accountId,
      kind: 'quick',
      payloadEnc: new TextEncoder().encode('{"story":"plain text, never sealed"}'),
      doctorId: null,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + DAY_MS),
    });

    const error = expectErr(await w.review.getDraft.execute({ draftId: unreadable }, m.call));
    const list = expectOk(await w.review.listOwnDrafts.execute({}, m.call));

    expect(error.code).toBe('not_found');
    expect(list.map((d) => d.draftId)).toEqual([readable]);
    const warnings = w.fakes.logger.entries.filter((e) => e.event === 'review.draft_unreadable');
    expect(warnings.length).toBeGreaterThan(0);
    for (const warning of warnings) {
      expect(Object.keys(warning.fields).sort()).toEqual(['correlationId', 'errorCode']);
      expect(JSON.stringify(warning.fields)).not.toContain('plain text');
    }
    expect(w.reviews.drafts.some((d) => d.id === unreadable)).toBe(true);
  });

  it('lists the own drafts newest save first with a derived title and never another account', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const other = await w.member();
    const first = await w.draftOf(m, w.payload('quick', { title: 'The first draft' }));
    w.fakes.clock.advanceMs(60_000);
    const second = await w.draftOf(m, w.payload('facility', { title: 'The clinic visit' }));
    await w.draftOf(other);

    const list = expectOk(await w.review.listOwnDrafts.execute({}, m.call));

    expect(list.map((d) => d.draftId)).toEqual([second, first]);
    expect(list[0]).toMatchObject({ title: 'The clinic visit', target: 'facility' });
    expect(list[1]).toMatchObject({ title: 'The first draft', target: 'doctor' });
  });
});
