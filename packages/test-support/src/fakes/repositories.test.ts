// Behaviour of the in-memory repository fakes that application-layer tests lean on: each fake
// stores what a command writes and returns it through the read method a query would use.
// The method-name parity with the Pg* stubs is covered by repositories-superset.test.ts.
import { describe, expect, it } from 'vitest';

import { aBranch } from '../builders/branch.js';
import { aCase, toDecideCaseInput } from '../builders/case.js';
import { aComment } from '../builders/comment.js';
import { aCondition } from '../builders/condition.js';
import { aDoctor } from '../builders/doctor.js';
import { anEvidenceItem } from '../builders/evidence.js';
import { aReview } from '../builders/review.js';
import { seqId } from '../builders/seq.js';
import {
  FakeAccountRepository,
  FakeAuditRepository,
  FakeCommunityRepository,
  FakeConfigRepository,
  FakeDataRequestRepository,
  FakeDirectoryRepository,
  FakeEvidenceRepository,
  FakeIdentityRepository,
  FakeModerationRepository,
  FakeNotificationRepository,
  FakeRetentionRepository,
  FakeReviewRepository,
  FakeTaxonomyRepository,
} from './repositories.js';

describe('FakeAccountRepository', () => {
  async function withProfile(repo: FakeAccountRepository) {
    const username = seqId('user');
    const profile = await repo.createProfile({ authUserId: seqId('auth'), username });
    return { profile, id: profile.id as string, username };
  }

  it('finds a created profile by auth user id and by username', async () => {
    const repo = new FakeAccountRepository();
    const { profile, username } = await withProfile(repo);

    expect(await repo.findByAuthUserId(profile.authUserId as string)).toEqual(profile);
    expect(await repo.findByUsername(username)).toEqual(profile);
  });

  it('returns nothing for an unknown auth user id or username', async () => {
    const repo = new FakeAccountRepository();
    await withProfile(repo);

    expect(await repo.findByAuthUserId('missing')).toBeUndefined();
    expect(await repo.findByUsername('missing')).toBeUndefined();
  });

  it('updates the status of an existing profile and ignores an unknown one', async () => {
    const repo = new FakeAccountRepository();
    const { id } = await withProfile(repo);

    expect(await repo.updateStatus(id, 'suspended')).toMatchObject({ id, status: 'suspended' });
    expect(await repo.updateStatus('missing', 'suspended')).toBeUndefined();
  });

  it('lists only the devices of the asked account', async () => {
    const repo = new FakeAccountRepository();
    await repo.upsertDevice({ accountId: 'a1', label: 'phone' });
    await repo.upsertDevice({ accountId: 'a2', label: 'laptop' });

    const devices = await repo.listDevices('a1');

    expect(devices.map((d) => d.label)).toEqual(['phone']);
  });

  it('consumes a device approval by its token hash and marks it used', async () => {
    const repo = new FakeAccountRepository();
    const approval = await repo.createDeviceApproval('device-1');

    const consumed = await repo.consumeDeviceApproval(approval.tokenHash as string);

    expect(consumed).toMatchObject({ deviceId: 'device-1' });
    expect(repo.deviceApprovals.get(approval.id as string)?.usedAt).toBeInstanceOf(Date);
  });

  it('returns nothing when the approval token is unknown', async () => {
    const repo = new FakeAccountRepository();
    await repo.createDeviceApproval('device-1');

    expect(await repo.consumeDeviceApproval('not-a-real-hash')).toBeUndefined();
  });

  it('saves preferences onto an existing profile', async () => {
    const repo = new FakeAccountRepository();
    const { id } = await withProfile(repo);

    const saved = await repo.savePreferences(id, { locale: 'bn' });

    expect(saved).toMatchObject({ id, preferences: { locale: 'bn' } });
  });

  it('returns the preferences on their own when the profile does not exist yet', async () => {
    const repo = new FakeAccountRepository();

    expect(await repo.savePreferences('ghost', { locale: 'en' })).toEqual({
      accountId: 'ghost',
      preferences: { locale: 'en' },
    });
  });

  it('gives feedback a fresh id and keeps its body', async () => {
    const repo = new FakeAccountRepository();

    const first = await repo.insertFeedback('a1', 'Thanks');
    const second = await repo.insertFeedback('a1', 'Again');

    expect(first).toMatchObject({ accountId: 'a1', body: 'Thanks' });
    expect(second.id).not.toBe(first.id);
  });

  it('adds, lists and removes a bookmark per account', async () => {
    const repo = new FakeAccountRepository();
    await repo.addBookmark('a1', 'r1');
    await repo.addBookmark('a2', 'r2');

    expect((await repo.listBookmarks('a1')).map((b) => b.reviewId)).toEqual(['r1']);
    expect(await repo.removeBookmark('a1', 'r1')).toBe(true);
    expect(await repo.listBookmarks('a1')).toEqual([]);
  });

  it('reports false when removing a bookmark that was never added', async () => {
    const repo = new FakeAccountRepository();

    expect(await repo.removeBookmark('a1', 'r1')).toBe(false);
  });

  it('blocks in one direction only and lifts the block on request', async () => {
    const repo = new FakeAccountRepository();
    await repo.setBlock('a1', 'a2');

    expect(await repo.isBlocked('a1', 'a2')).toBe(true);
    expect(await repo.isBlocked('a2', 'a1')).toBe(false);
    expect(await repo.unsetBlock('a1', 'a2')).toBe(true);
    expect(await repo.isBlocked('a1', 'a2')).toBe(false);
    expect(await repo.unsetBlock('a1', 'a2')).toBe(false);
  });
});

describe('FakeIdentityRepository', () => {
  it('serves the public projection of a created persona and nothing for an unknown one', async () => {
    const repo = new FakeIdentityRepository();
    const persona = await repo.createPersona({ handle: 'quiet_owl' });

    expect(await repo.publicProjection(persona.id as string)).toEqual(persona);
    expect(await repo.publicProjection('missing')).toBeUndefined();
  });

  it('links a persona to an account and review', async () => {
    const repo = new FakeIdentityRepository();

    const link = await repo.linkPersona('p1', 'a1', 'r1');

    expect(link).toMatchObject({ personaId: 'p1', accountId: 'a1', reviewId: 'r1' });
  });

  it('finds the persona link of an account for a review and identity mode', async () => {
    const repo = new FakeIdentityRepository();
    repo.links.insert({ id: 'l1', accountId: 'a1', reviewId: 'r1', mode: 'pseudonymous' });

    expect(await repo.findPersonaFor('a1', 'r1', 'pseudonymous')).toMatchObject({ id: 'l1' });
    expect(await repo.findPersonaFor('a1', 'r1', 'anonymous')).toBeUndefined();
    expect(await repo.findPersonaFor('a2', 'r1', 'pseudonymous')).toBeUndefined();
  });

  it('records an identity reveal', async () => {
    const repo = new FakeIdentityRepository();

    const reveal = await repo.recordReveal({ reviewId: 'r1', reason: 'legal' });

    expect(reveal).toMatchObject({ reviewId: 'r1', reason: 'legal' });
    expect(repo.reveals.all()).toHaveLength(1);
  });
});

describe('FakeDirectoryRepository', () => {
  it('finds a doctor and a facility by public id', async () => {
    const repo = new FakeDirectoryRepository();
    repo.doctors.insert({ ...aDoctor(), publicId: 'D-1' });
    repo.facilities.insert({ ...aBranch(), publicId: 'F-1' });

    expect(await repo.getDoctor('D-1')).toMatchObject({ publicId: 'D-1' });
    expect(await repo.getFacility('F-1')).toMatchObject({ publicId: 'F-1' });
    expect(await repo.getDoctor('F-1')).toBeUndefined();
    expect(await repo.getFacility('D-1')).toBeUndefined();
  });

  it('lists every doctor and every facility whatever the filters', async () => {
    const repo = new FakeDirectoryRepository();
    repo.doctors.insert({ ...aDoctor() });
    repo.doctors.insert({ ...aDoctor() });
    repo.facilities.insert({ ...aBranch() });

    expect(await repo.listDoctors({ city: 'Dhaka' })).toHaveLength(2);
    expect(await repo.listFacilities({})).toHaveLength(1);
  });

  it('lists the doctors at a branch', async () => {
    const repo = new FakeDirectoryRepository();
    repo.doctors.insert({ ...aDoctor(), branchId: 'b1' });
    repo.doctors.insert({ ...aDoctor(), branchId: 'b2' });

    expect(await repo.doctorsAtBranch('b1')).toHaveLength(1);
    expect(await repo.doctorsAtBranch('b3')).toEqual([]);
  });

  it('lists the facilities a doctor practises at and none for a facility without doctors', async () => {
    const repo = new FakeDirectoryRepository();
    repo.facilities.insert({ ...aBranch(), doctorIds: ['d1', 'd2'] });
    repo.facilities.insert({ ...aBranch() });

    expect(await repo.facilitiesForDoctor('d1')).toHaveLength(1);
    expect(await repo.facilitiesForDoctor('d9')).toEqual([]);
  });

  it('filters submissions, claims and field changes by status when one is asked for', async () => {
    const repo = new FakeDirectoryRepository();
    await repo.submitProfile({ status: 'pending' });
    await repo.submitProfile({ status: 'approved' });
    await repo.claimProfile({ status: 'pending' });
    await repo.claimProfile({ status: 'rejected' });
    await repo.proposeFieldChange({ status: 'pending' });
    await repo.proposeFieldChange({ status: 'applied' });

    expect(await repo.listSubmissions({ status: 'pending' })).toHaveLength(1);
    expect(await repo.listSubmissions({})).toHaveLength(2);
    expect(await repo.listClaims({ status: 'rejected' })).toHaveLength(1);
    expect(await repo.listClaims({})).toHaveLength(2);
    expect(await repo.listFieldChanges({ status: 'applied' })).toHaveLength(1);
    expect(await repo.listFieldChanges({})).toHaveLength(2);
  });

  it('records the decision on a submission, a claim and a field change', async () => {
    const repo = new FakeDirectoryRepository();
    const submission = await repo.submitProfile({ status: 'pending' });
    const claim = await repo.claimProfile({ status: 'pending' });
    const change = await repo.proposeFieldChange({ status: 'pending' });

    expect(
      await repo.decideSubmission({ submissionId: submission.id, decision: 'approved' }),
    ).toMatchObject({ status: 'approved' });
    expect(await repo.decideClaim({ claimId: claim.id, decision: 'rejected' })).toMatchObject({
      status: 'rejected',
    });
    expect(
      await repo.decideFieldChange({ changeId: change.id, decision: 'applied' }),
    ).toMatchObject({ status: 'applied' });
  });

  it('returns nothing when the decided submission, claim or change does not exist', async () => {
    const repo = new FakeDirectoryRepository();

    expect(
      await repo.decideSubmission({ submissionId: 'x', decision: 'approved' }),
    ).toBeUndefined();
    expect(await repo.decideClaim({ claimId: 'x', decision: 'approved' })).toBeUndefined();
    expect(await repo.decideFieldChange({ changeId: 'x', decision: 'applied' })).toBeUndefined();
  });
});

describe('FakeTaxonomyRepository', () => {
  it('finds a condition by public id and lists only condition terms', async () => {
    const repo = new FakeTaxonomyRepository();
    repo.terms.insert({ ...aCondition(), publicId: 'C-1', kind: 'condition' });
    repo.terms.insert({ id: 'sym-1', kind: 'symptom' });

    expect(await repo.getCondition('C-1')).toMatchObject({ publicId: 'C-1' });
    expect(await repo.getCondition('C-2')).toBeUndefined();
    expect(await repo.listConditions({})).toHaveLength(1);
  });

  it('resolves free text through alias keys, ignoring case and surrounding spaces', async () => {
    const repo = new FakeTaxonomyRepository();
    repo.terms.insert({ id: 't1', aliasKeys: ['sugar', 'diabetes'] });
    repo.terms.insert({ id: 't2' });

    expect(await repo.resolve('  Sugar ')).toMatchObject({ id: 't1' });
    expect(await repo.resolve('asthma')).toBeUndefined();
  });

  it('lists the suggested terms of one group only', async () => {
    const repo = new FakeTaxonomyRepository();
    repo.terms.insert({ id: 't1', suggested: true, group: 'symptom' });
    repo.terms.insert({ id: 't2', suggested: true, group: 'cause' });
    repo.terms.insert({ id: 't3', suggested: false, group: 'symptom' });

    expect((await repo.listSuggested('symptom')).map((t) => t.id)).toEqual(['t1']);
  });

  it('creates a provisional term and maps it to a canonical one', async () => {
    const repo = new FakeTaxonomyRepository();
    const term = await repo.createProvisional({ label: 'fever at night' });

    expect(term).toMatchObject({ provisional: true });
    expect(await repo.mapProvisional(term.id as string, 'canon-1')).toMatchObject({
      canonicalId: 'canon-1',
    });
    expect(await repo.mapProvisional('missing', 'canon-1')).toBeUndefined();
  });
});

describe('FakeReviewRepository', () => {
  it('saves, reads and deletes a draft', async () => {
    const repo = new FakeReviewRepository();
    const draft = await repo.saveDraft({ title: 'Draft' });
    const id = draft.id as string;

    expect(await repo.getDraft(id)).toEqual(draft);
    expect(await repo.deleteDraft(id)).toBe(true);
    expect(await repo.getDraft(id)).toBeUndefined();
    expect(await repo.deleteDraft(id)).toBe(false);
  });

  it('finds a review by internal id and by public id', async () => {
    const repo = new FakeReviewRepository();
    const review = await repo.insertReview({ ...aReview(), publicId: 'E-1' });

    expect(await repo.getById(review.id as string)).toEqual(review);
    expect(await repo.getByPublicId('E-1')).toEqual(review);
    expect(await repo.getByPublicId('E-2')).toBeUndefined();
  });

  it('changes the state of a review and ignores an unknown one', async () => {
    const repo = new FakeReviewRepository();
    const review = await repo.insertReview({ ...aReview(), state: 'published' });

    expect(await repo.updateState(review.id as string, 'hidden')).toMatchObject({
      state: 'hidden',
    });
    expect(await repo.updateState('missing', 'hidden')).toBeUndefined();
  });

  it('stores a follow-up', async () => {
    const repo = new FakeReviewRepository();

    const followUp = await repo.addFollowUp({ reviewId: 'r1', outcome: 'improved' });

    expect(followUp).toMatchObject({ reviewId: 'r1', outcome: 'improved' });
  });

  it('applies a correction to the review it names', async () => {
    const repo = new FakeReviewRepository();
    const review = await repo.insertReview({ ...aReview(), body: 'before' });

    const corrected = await repo.correctReview({ reviewId: review.id, body: 'after' });

    expect(corrected).toMatchObject({ id: review.id, body: 'after' });
    expect(await repo.correctReview({ reviewId: 'missing', body: 'x' })).toBeUndefined();
  });

  it('soft-deletes a review with a timestamp and restores it by clearing the timestamp', async () => {
    const repo = new FakeReviewRepository();
    const review = await repo.insertReview({ ...aReview() });
    const id = review.id as string;

    expect((await repo.softDeleteReview(id))?.deletedAt).toBeInstanceOf(Date);
    expect((await repo.restoreReview(id))?.deletedAt).toBeNull();
    expect(await repo.softDeleteReview('missing')).toBeUndefined();
    expect(await repo.restoreReview('missing')).toBeUndefined();
  });

  it('lists reviews for a doctor, a branch and a condition', async () => {
    const repo = new FakeReviewRepository();
    await repo.insertReview({ ...aReview(), doctorId: 'd1', branchId: 'b1', conditionId: 'c1' });
    await repo.insertReview({ ...aReview(), doctorId: 'd2', branchId: 'b2', conditionId: 'c2' });

    expect(await repo.listForDoctor('d1')).toHaveLength(1);
    expect(await repo.listForBranch('b2')).toHaveLength(1);
    expect(await repo.listForCondition('c1')).toHaveLength(1);
    expect(await repo.listForDoctor('d9')).toEqual([]);
  });

  it('narrows experiences by every filter that is given and keeps all when none is', async () => {
    const repo = new FakeReviewRepository();
    await repo.insertReview({ ...aReview(), doctorId: 'd1', branchId: 'b1', conditionId: 'c1' });
    await repo.insertReview({ ...aReview(), doctorId: 'd1', branchId: 'b2', conditionId: 'c1' });
    await repo.insertReview({ ...aReview(), doctorId: 'd2', branchId: 'b1', conditionId: 'c2' });

    expect(await repo.listExperiences({})).toHaveLength(3);
    expect(await repo.listExperiences({ doctorId: 'd1' })).toHaveLength(2);
    expect(await repo.listExperiences({ doctorId: 'd1', branchId: 'b1' })).toHaveLength(1);
    expect(await repo.listExperiences({ conditionId: 'c2' })).toHaveLength(1);
    expect(await repo.listExperiences({ branchId: 'b9' })).toEqual([]);
  });

  it('counts sentiments and outcomes of one doctor and skips reviews that lack the field', async () => {
    const repo = new FakeReviewRepository();
    const bare = () => ({ ...aReview(), sentiment: undefined, outcome: undefined });
    await repo.insertReview({
      ...bare(),
      doctorId: 'd1',
      sentiment: 'positive',
      outcome: 'helped',
    });
    await repo.insertReview({
      ...bare(),
      doctorId: 'd1',
      sentiment: 'positive',
      outcome: 'helped',
    });
    await repo.insertReview({ ...bare(), doctorId: 'd1', sentiment: 'negative' });
    await repo.insertReview({ ...bare(), doctorId: 'd1', outcome: 'unsure' });
    await repo.insertReview({
      ...bare(),
      doctorId: 'd2',
      sentiment: 'negative',
      outcome: 'helped',
    });

    expect(await repo.sentimentDistribution('d1')).toEqual({ positive: 2, negative: 1 });
    expect(await repo.outcomeDistribution('d1')).toEqual({ helped: 2, unsure: 1 });
    expect(await repo.sentimentDistribution('nobody')).toEqual({});
  });

  it('counts criteria of one branch from facility feedback alone', async () => {
    const repo = new FakeReviewRepository();
    await repo.insertFacilityReview({
      branchId: 'b1',
      criteria: { cleanliness: 'good', wait: 'long' },
    });
    await repo.insertFacilityReview({
      branchId: 'b1',
      criteria: { cleanliness: 'good', wait: null },
    });
    await repo.insertFacilityReview({ branchId: 'b1' });
    await repo.insertFacilityReview({ branchId: 'b2', criteria: { cleanliness: 'poor' } });

    expect(await repo.criteriaDistribution('b1')).toEqual({
      cleanliness: { good: 2 },
      wait: { long: 1 },
    });
  });

  it('keeps facility feedback out of a doctor distribution and doctor reviews out of a facility one', async () => {
    const repo = new FakeReviewRepository();
    await repo.insertFacilityReview({
      branchId: 'b1',
      doctorId: 'd1',
      sentiment: 'negative',
      criteria: { wait: 'long' },
    });
    await repo.insertReview({
      ...aReview(),
      doctorId: 'd1',
      branchId: 'b1',
      sentiment: 'positive',
      criteria: { wait: 'short' },
    });

    expect(await repo.sentimentDistribution('d1')).toEqual({ positive: 1 });
    expect(await repo.criteriaDistribution('b1')).toEqual({ wait: { long: 1 } });
  });

  it('soft-deletes and restores facility feedback', async () => {
    const repo = new FakeReviewRepository();
    const feedback = await repo.insertFacilityReview({ branchId: 'b1' });
    const id = feedback.id as string;

    expect((await repo.softDeleteFacilityReview(id))?.deletedAt).toBeInstanceOf(Date);
    expect((await repo.restoreFacilityReview(id))?.deletedAt).toBeNull();
    expect(await repo.softDeleteFacilityReview('missing')).toBeUndefined();
    expect(await repo.restoreFacilityReview('missing')).toBeUndefined();
  });
});

describe('FakeEvidenceRepository', () => {
  it('takes an item in as quarantined whatever state the input carries', async () => {
    const repo = new FakeEvidenceRepository();

    const item = await repo.intake({ ...anEvidenceItem(), state: 'published' });

    expect(item).toMatchObject({ state: 'quarantined' });
  });

  it('moves an item through states and keeps a fail reason only when one is given', async () => {
    const repo = new FakeEvidenceRepository();
    const item = await repo.intake({ ...anEvidenceItem() });
    const id = item.id as string;

    expect(await repo.updateState(id, 'failed', 'scan_unavailable')).toMatchObject({
      state: 'failed',
      failReason: 'scan_unavailable',
    });
    expect(await repo.updateState(id, 'clean')).toMatchObject({
      state: 'clean',
      failReason: 'scan_unavailable',
    });
    expect(await repo.updateState('missing', 'clean')).toBeUndefined();
  });

  it('stores artifacts and custody events', async () => {
    const repo = new FakeEvidenceRepository();

    const artifact = await repo.insertArtifact({ itemId: 'i1', kind: 'derivative' });
    const event = await repo.recordCustodyEvent({ itemId: 'i1', event: 'scanned' });

    expect(artifact).toMatchObject({ kind: 'derivative' });
    expect(event).toMatchObject({ event: 'scanned' });
  });

  it('applies a redaction and confirms privacy on an existing item only', async () => {
    const repo = new FakeEvidenceRepository();
    const item = await repo.intake({ ...anEvidenceItem() });
    const id = item.id as string;

    expect(await repo.applyRedaction({ itemId: id, boxes: [] })).toMatchObject({
      lastRedaction: { itemId: id },
    });
    expect(await repo.confirmPrivacy(id)).toMatchObject({ state: 'privacy_confirmed' });
    expect(await repo.applyRedaction({ itemId: 'missing' })).toBeUndefined();
    expect(await repo.confirmPrivacy('missing')).toBeUndefined();
  });

  it('publishes every item of one review and leaves the others alone', async () => {
    const repo = new FakeEvidenceRepository();
    await repo.intake({ ...anEvidenceItem(), reviewId: 'r1' });
    await repo.intake({ ...anEvidenceItem(), reviewId: 'r1' });
    const other = await repo.intake({ ...anEvidenceItem(), reviewId: 'r2' });

    const published = await repo.publish('r1');

    expect(published).toHaveLength(2);
    expect(await repo.getPublic('r1')).toHaveLength(2);
    expect(await repo.getPublic('r2')).toEqual([]);
    expect(repo.items.get(other.id as string)?.state).toBe('quarantined');
  });

  it('removes an item so it no longer reads as public', async () => {
    const repo = new FakeEvidenceRepository();
    const item = await repo.intake({ ...anEvidenceItem(), reviewId: 'r1' });
    await repo.publish('r1');

    expect(await repo.remove(item.id as string)).toMatchObject({ state: 'removed' });
    expect(await repo.getPublic('r1')).toEqual([]);
    expect(await repo.remove('missing')).toBeUndefined();
  });

  it('shows an author the items of their draft', async () => {
    const repo = new FakeEvidenceRepository();
    await repo.intake({ ...anEvidenceItem(), reviewDraftId: 'dr1' });
    await repo.intake({ ...anEvidenceItem(), reviewDraftId: 'dr2' });

    expect(await repo.getForAuthor('dr1')).toHaveLength(1);
  });

  it('lists items for staff by state, or all when no state is asked for', async () => {
    const repo = new FakeEvidenceRepository();
    const item = await repo.intake({ ...anEvidenceItem() });
    await repo.intake({ ...anEvidenceItem() });
    await repo.updateState(item.id as string, 'clean');

    expect(await repo.listForStaff({})).toHaveLength(2);
    expect(await repo.listForStaff({ state: 'clean' })).toHaveLength(1);
  });

  it('records a custody event with the reason each time an original is read', async () => {
    const repo = new FakeEvidenceRepository();
    const item = await repo.intake({ ...anEvidenceItem() });

    const original = await repo.readOriginal(item.id as string, 'moderation_review');

    expect(original).toEqual(item);
    expect(repo.custodyEvents.all()).toMatchObject([
      { itemId: item.id, event: 'original_accessed', reason: 'moderation_review' },
    ]);
  });
});

describe('FakeCommunityRepository', () => {
  it('posts a comment and shows it in the thread of its review', async () => {
    const repo = new FakeCommunityRepository();
    await repo.postComment({ ...aComment(), reviewId: 'r1' });
    await repo.postComment({ ...aComment(), reviewId: 'r2' });

    expect(await repo.thread('r1')).toHaveLength(1);
    expect(await repo.thread('r9')).toEqual([]);
  });

  it('edits a comment body and stamps the edit time', async () => {
    const repo = new FakeCommunityRepository();
    const comment = await repo.postComment({ ...aComment(), reviewId: 'r1' });

    const edited = await repo.editComment(comment.id as string, 'Updated');

    expect(edited).toMatchObject({ body: 'Updated' });
    expect(edited?.editedAt).toBeInstanceOf(Date);
    expect(await repo.editComment('missing', 'x')).toBeUndefined();
  });

  it('deletes a comment without replies outright', async () => {
    const repo = new FakeCommunityRepository();
    const comment = await repo.postComment({ ...aComment(), reviewId: 'r1' });

    const deleted = await repo.deleteComment(comment.id as string);

    expect(deleted?.deletedAt).toBeInstanceOf(Date);
    expect(deleted?.tombstone).toBeUndefined();
  });

  it('turns a deleted comment that has replies into a tombstone', async () => {
    const repo = new FakeCommunityRepository();
    const parent = await repo.postComment({ ...aComment(), reviewId: 'r1' });
    await repo.postComment({ ...aComment(), reviewId: 'r1', parentId: parent.id });

    const deleted = await repo.deleteComment(parent.id as string);

    expect(deleted).toMatchObject({ tombstone: true });
  });

  it('keeps one reaction per account and target, and removes it when the value is null', async () => {
    const repo = new FakeCommunityRepository();
    const reaction = { targetKind: 'review', targetId: 'r1', accountId: 'a1' };
    await repo.setReaction({ ...reaction, value: 'like' });
    await repo.setReaction({ ...reaction, value: 'dislike' });
    await repo.setReaction({ ...reaction, accountId: 'a2', value: 'like' });

    const reactions = await repo.reactionsOf('review', 'r1');
    expect(reactions).toHaveLength(2);
    expect(reactions.find((r) => r.accountId === 'a1')?.value).toBe('dislike');

    const cleared = await repo.setReaction({ ...reaction, value: null });
    expect(cleared).toMatchObject({ value: null });
    expect(await repo.reactionsOf('review', 'r1')).toHaveLength(1);
    expect(await repo.reactionsOf('comment', 'r1')).toEqual([]);
  });
});

describe('FakeModerationRepository', () => {
  it('stores a report and an appeal', async () => {
    const repo = new FakeModerationRepository();

    expect(await repo.fileReport({ reason: 'factual' })).toMatchObject({ reason: 'factual' });
    expect(await repo.fileAppeal({ caseCode: 'MOD-1' })).toMatchObject({ caseCode: 'MOD-1' });
  });

  it('filters the queue by lane and status, and returns every case when neither is given', async () => {
    const repo = new FakeModerationRepository();
    repo.cases.insert({ ...aCase({ lane: 'standard' }), status: 'open' });
    repo.cases.insert({ ...aCase({ lane: 'critical' }), status: 'open' });
    repo.cases.insert({ ...aCase({ lane: 'critical' }), status: 'decided' });

    expect(await repo.queue({})).toHaveLength(3);
    expect(await repo.queue({ lane: 'critical' })).toHaveLength(2);
    expect(await repo.queue({ status: 'decided' })).toHaveLength(1);
    expect(await repo.queue({ lane: 'critical', status: 'open' })).toHaveLength(1);
  });

  it('finds a case by its code', async () => {
    const repo = new FakeModerationRepository();
    const c = aCase();
    repo.cases.insert({ ...c });

    expect(await repo.getCase(c.code)).toMatchObject({ code: c.code });
    expect(await repo.getCase('MOD-0')).toBeUndefined();
  });

  it('records a decision on a case and marks it decided', async () => {
    const repo = new FakeModerationRepository();
    const c = aCase();
    repo.cases.insert({ ...c, status: 'open' });

    const decided = await repo.decide({ ...toDecideCaseInput(c, 'hide') });

    expect(decided).toMatchObject({ status: 'decided', lastDecision: { action: 'hide' } });
    expect(await repo.decide({ caseCode: 'MOD-0' })).toBeUndefined();
  });

  it('reopens a case with the restore reason', async () => {
    const repo = new FakeModerationRepository();
    const c = aCase();
    repo.cases.insert({ ...c, status: 'decided' });

    expect(await repo.restore(c.code, 'appeal_upheld')).toMatchObject({
      status: 'open',
      restoreReason: 'appeal_upheld',
    });
    expect(await repo.restore('MOD-0', 'x')).toBeUndefined();
  });

  it('records the status an appeal was decided with', async () => {
    const repo = new FakeModerationRepository();
    const appeal = await repo.fileAppeal({ caseCode: 'MOD-1' });

    expect(await repo.decideAppeal({ appealId: appeal.id, status: 'upheld' })).toMatchObject({
      status: 'upheld',
    });
    expect(await repo.decideAppeal({ appealId: 'missing', status: 'upheld' })).toBeUndefined();
  });

  it('lists the cases an account may appeal', async () => {
    const repo = new FakeModerationRepository();
    repo.cases.insert({ ...aCase(), affectedAccountId: 'a1' });
    repo.cases.insert({ ...aCase(), affectedAccountId: 'a2' });

    expect(await repo.myAppealable('a1')).toHaveLength(1);
  });

  it('previews a bulk action with a token and applies it by that token', async () => {
    const repo = new FakeModerationRepository();

    const preview = await repo.bulkPreview(['MOD-1', 'MOD-2'], 'hide');
    const applied = await repo.bulkApply(preview.previewToken as string, 'spam_wave');

    expect(preview).toMatchObject({ affected: ['MOD-1', 'MOD-2'], action: 'hide' });
    expect(applied).toMatchObject({
      previewToken: preview.previewToken,
      reasonCode: 'spam_wave',
      applied: true,
    });
  });
});

describe('FakeNotificationRepository', () => {
  it('lists the notifications of one account', async () => {
    const repo = new FakeNotificationRepository();
    await repo.insert({ accountId: 'a1' });
    await repo.insert({ accountId: 'a2' });

    expect(await repo.list('a1')).toHaveLength(1);
    expect(await repo.list('a1', 'cursor')).toHaveLength(1);
  });

  it('counts unread notifications and stops counting once they are read', async () => {
    const repo = new FakeNotificationRepository();
    const first = await repo.insert({ accountId: 'a1' });
    await repo.insert({ accountId: 'a1' });
    await repo.insert({ accountId: 'a2' });

    expect(await repo.unreadCount('a1')).toBe(2);
    expect(await repo.markRead('a1', [first.id as string])).toBe(1);
    expect(await repo.unreadCount('a1')).toBe(1);
  });

  it('marks every notification of an account read when asked for all', async () => {
    const repo = new FakeNotificationRepository();
    await repo.insert({ accountId: 'a1' });
    await repo.insert({ accountId: 'a1' });
    await repo.insert({ accountId: 'a2' });

    expect(await repo.markRead('a1', 'all')).toBe(2);
    expect(await repo.unreadCount('a1')).toBe(0);
    expect(await repo.unreadCount('a2')).toBe(1);
  });

  it('skips ids that name no notification when marking read', async () => {
    const repo = new FakeNotificationRepository();

    expect(await repo.markRead('a1', ['missing'])).toBe(0);
  });

  it('hides acknowledged staff notifications when only unacknowledged ones are asked for', async () => {
    const repo = new FakeNotificationRepository();
    const first = repo.staffNotifications.insert({ kind: 'queue_old' });
    repo.staffNotifications.insert({ kind: 'scan_down' });

    expect(await repo.ackStaffNotification(first.id as string)).toMatchObject({
      kind: 'queue_old',
    });
    expect(await repo.listStaffNotifications({})).toHaveLength(2);
    expect(await repo.listStaffNotifications({ unackedOnly: true })).toHaveLength(1);
    expect(await repo.ackStaffNotification('missing')).toBeUndefined();
  });

  it('tracks an email delivery and records an error code only when one is given', async () => {
    const repo = new FakeNotificationRepository();
    const delivery = await repo.insertEmailDelivery({ status: 'queued' });
    const id = delivery.id as string;

    expect(await repo.updateEmailDeliveryStatus(id, 'failed', 'smtp_timeout')).toMatchObject({
      status: 'failed',
      lastErrorCode: 'smtp_timeout',
    });
    expect(await repo.updateEmailDeliveryStatus(id, 'sent')).toMatchObject({ status: 'sent' });
    expect(await repo.updateEmailDeliveryStatus('missing', 'sent')).toBeUndefined();
  });
});

describe('FakeConfigRepository', () => {
  it('has no current version before any is inserted', async () => {
    const repo = new FakeConfigRepository();

    expect(await repo.currentVersion()).toBeUndefined();
    expect(await repo.history()).toEqual([]);
  });

  it('reports the highest version as current and lists history oldest first', async () => {
    const repo = new FakeConfigRepository();
    await repo.insertVersion({ version: 2 });
    await repo.insertVersion({ version: 3 });
    await repo.insertVersion({ version: 1 });

    expect(await repo.currentVersion()).toMatchObject({ version: 3 });
    expect((await repo.history()).map((v) => v.version)).toEqual([1, 2, 3]);
  });

  it('gives each inserted version its own id', async () => {
    const repo = new FakeConfigRepository();

    const first = await repo.insertVersion({ version: 1, id: 'caller-id' });
    const second = await repo.insertVersion({ version: 2 });

    expect(first.id).not.toBe(second.id);
    expect(first.id).not.toBe('caller-id');
  });
});

describe('FakeRetentionRepository', () => {
  it('reports the highest-version policy as current', async () => {
    const repo = new FakeRetentionRepository();
    expect(await repo.currentPolicy()).toBeUndefined();

    await repo.setPolicy({ version: 1 });
    await repo.setPolicy({ version: 2 });

    expect(await repo.currentPolicy()).toMatchObject({ version: 2 });
  });

  it('previews a bulk change with a token and records its execution against that token', async () => {
    const repo = new FakeRetentionRepository();

    const preview = await repo.previewBulk(30, 90);
    const executed = await repo.executeBulk(preview.previewToken as string, 'policy_change');

    expect(preview).toMatchObject({ fromDays: 30, toDays: 90, count: 0 });
    expect(executed).toMatchObject({ previewToken: preview.previewToken, reason: 'policy_change' });
    expect(executed.executedAt).toBeInstanceOf(Date);
  });

  it('places a hold and releases it with the reason', async () => {
    const repo = new FakeRetentionRepository();
    const hold = await repo.placeHold({ itemId: 'i1' });

    const released = await repo.releaseHold(hold.id as string, 'case_closed');

    expect(released).toMatchObject({ releaseReason: 'case_closed' });
    expect(released?.releasedAt).toBeInstanceOf(Date);
    expect(await repo.releaseHold('missing', 'x')).toBeUndefined();
  });

  it('lists only entries whose retention expiry is before the cut-off', async () => {
    const repo = new FakeRetentionRepository();
    repo.holds.insert({ id: 'old', retentionExpiresAt: new Date('2026-01-01T00:00:00.000Z') });
    repo.holds.insert({ id: 'new', retentionExpiresAt: new Date('2027-01-01T00:00:00.000Z') });
    repo.holds.insert({ id: 'none' });

    const expired = await repo.expireOriginals(new Date('2026-06-01T00:00:00.000Z'));

    expect(expired.map((h) => h.id)).toEqual(['old']);
  });
});

describe('FakeDataRequestRepository', () => {
  it('opens an export and a deletion request as requested, keyed by their idempotency key', async () => {
    const repo = new FakeDataRequestRepository();

    const exportRequest = await repo.createExportRequest('a1', 'k1');
    const deletion = await repo.createDeletionRequest('a1', 'k2', [
      { module: 'review', status: 'pending' },
    ]);

    expect(exportRequest).toMatchObject({
      kind: 'export',
      status: 'requested',
      idempotencyKey: 'k1',
    });
    expect(deletion).toMatchObject({ kind: 'delete', status: 'requested', idempotencyKey: 'k2' });
    expect(await repo.getStatus(deletion.id as string)).toEqual(deletion);
    expect(await repo.getStatus('missing')).toBeUndefined();
  });

  it('updates the status of one plan step and leaves the other steps alone', async () => {
    const repo = new FakeDataRequestRepository();
    const request = await repo.createDeletionRequest('a1', 'k', [
      { module: 'review', status: 'pending' },
      { module: 'evidence', status: 'pending' },
    ]);

    const updated = await repo.updatePlanStep(request.id as string, 'review', 'failed', 'db_down');

    expect(updated?.plan).toEqual([
      { module: 'review', status: 'failed', errorCode: 'db_down' },
      { module: 'evidence', status: 'pending' },
    ]);
  });

  it('omits the error code when a plan step succeeds', async () => {
    const repo = new FakeDataRequestRepository();
    const request = await repo.createDeletionRequest('a1', 'k', [
      { module: 'review', status: 'pending' },
    ]);

    const updated = await repo.updatePlanStep(request.id as string, 'review', 'done');

    expect(updated?.plan).toEqual([{ module: 'review', status: 'done' }]);
  });

  it('treats a request without a plan as having no steps to update', async () => {
    const repo = new FakeDataRequestRepository();
    const request = await repo.createExportRequest('a1', 'k');

    const updated = await repo.updatePlanStep(request.id as string, 'review', 'done');

    expect(updated?.plan).toEqual([]);
  });

  it('returns nothing when the request to update does not exist', async () => {
    const repo = new FakeDataRequestRepository();

    expect(await repo.updatePlanStep('missing', 'review', 'done')).toBeUndefined();
  });
});

describe('FakeAuditRepository', () => {
  it('lists the events of one stream up to the limit', async () => {
    const repo = new FakeAuditRepository();
    repo.events.insert({ stream: 'config', n: 1 });
    repo.events.insert({ stream: 'config', n: 2 });
    repo.events.insert({ stream: 'config', n: 3 });
    repo.events.insert({ stream: 'moderation', n: 4 });

    const events = await repo.listByStream('config', 2);

    expect(events.map((e) => e.n)).toEqual([1, 2]);
    expect(await repo.listByStream('retention', 10)).toEqual([]);
  });
});
