import { describe, expect, it } from 'vitest';
import { DRAFT_TAG_MAX, DraftPayload, type FacilityPreviewVM } from '@rogikotha/contracts';

import {
  anonymousNewDoctorBlocked,
  composerReducer,
  emptyDraftPayload,
  initComposerState,
  tagCount,
  type ComposerAction,
  type ComposerState,
} from './composer-reducer';

function run(state: ComposerState, ...actions: ComposerAction[]): ComposerState {
  return actions.reduce(composerReducer, state);
}

const facilityPreview: FacilityPreviewVM = {
  kind: 'facility',
  author: { personaKind: 'pseudonymous', username: 'synthetic_author' },
  body: 'Synthetic visit',
  criteria: [],
};

describe('composer reducer', () => {
  it('starts from the same payload the lenient schema gives an empty draft', () => {
    expect(emptyDraftPayload()).toEqual(DraftPayload.parse({}));
    const state = initComposerState();
    expect(state.step).toBe(1);
    expect(state.save).toEqual({ status: 'idle', seq: 0 });
    expect(state.draftId).toBeUndefined();
  });

  it('preselects a doctor only from the doctor query parameter of a new draft', () => {
    expect(initComposerState({ doctorPublicId: 'dr_aaaa' }).payload.doctorPublicId).toBe('dr_aaaa');
    const stored = { ...emptyDraftPayload(), doctorPublicId: 'dr_bbbb' };
    const reopened = initComposerState({
      draftId: 'd1',
      payload: stored,
      doctorPublicId: 'dr_cccc',
    });
    expect(reopened.payload.doctorPublicId).toBe('dr_bbbb');
    expect(reopened.save.status).toBe('saved');
  });

  it('restores the saved step on reopen and keeps the step in the payload', () => {
    const state = initComposerState({
      draftId: 'd1',
      payload: { ...emptyDraftPayload(), step: 3 },
    });
    expect(state.step).toBe(3);
    const next = run(state, { type: 'step', step: 4 });
    expect(next.step).toBe(4);
    expect(next.payload.step).toBe(4);
  });

  it('clears sentiment and outcome on a second press of the same value', () => {
    const once = run(initComposerState(), { type: 'sentiment', sentiment: 'mixed' });
    expect(once.payload.sentiment).toBe('mixed');
    const changed = run(once, { type: 'sentiment', sentiment: 'positive' });
    expect(changed.payload.sentiment).toBe('positive');
    const cleared = run(changed, { type: 'sentiment', sentiment: 'positive' });
    expect('sentiment' in cleared.payload).toBe(false);

    const outcome = run(
      initComposerState(),
      { type: 'outcome', outcome: 'helped' },
      {
        type: 'outcome',
        outcome: 'helped',
      },
    );
    expect('outcome' in outcome.payload).toBe(false);
  });

  it('toggles reviewer labels', () => {
    const state = run(
      initComposerState(),
      { type: 'claim', claim: 'wrongDx' },
      { type: 'claim', claim: 'secondOpinion' },
      { type: 'claim', claim: 'wrongDx' },
    );
    expect(state.payload.claims).toEqual(['secondOpinion']);
  });

  it('keeps target, mode, relationship and identity as single choices', () => {
    const state = run(
      initComposerState(),
      { type: 'mode', mode: 'detailed' },
      { type: 'mode', mode: 'detailed' },
      { type: 'relationship', relationship: 'parent' },
      { type: 'relationship', relationship: 'parent' },
      { type: 'identity', identityMode: 'named' },
      { type: 'identity', identityMode: 'named' },
    );
    expect(state.payload.mode).toBe('detailed');
    expect(state.payload.relationship).toBe('parent');
    expect(state.payload.identityMode).toBe('named');
  });

  it('offers no anonymous choice for a facility visit', () => {
    const anon = run(initComposerState(), { type: 'identity', identityMode: 'anonymous' });
    const facility = run(anon, { type: 'target', target: 'facility' });
    expect(facility.payload.identityMode).toBe('pseudonymous');
    const refused = run(facility, { type: 'identity', identityMode: 'anonymous' });
    expect(refused).toBe(facility);
  });

  it('clears a doctor being added when a listed doctor is chosen, and the other way round', () => {
    const adding = run(initComposerState(), {
      type: 'newDoctor',
      newDoctor: { name: 'Dr. Synthetic Rahman' },
    });
    const listed = run(adding, { type: 'doctor', doctorPublicId: 'dr_aaaa' });
    expect(listed.payload.doctorPublicId).toBe('dr_aaaa');
    expect('newDoctor' in listed.payload).toBe(false);
    const again = run(listed, { type: 'newDoctor', newDoctor: { name: 'Dr. Synthetic Karim' } });
    expect('doctorPublicId' in again.payload).toBe(false);
    expect(DraftPayload.safeParse(again.payload).success).toBe(true);
  });

  it('flags an anonymous review that adds a doctor (BR3.12)', () => {
    const state = run(
      initComposerState(),
      { type: 'newDoctor', newDoctor: { name: 'Dr. Synthetic Rahman' } },
      { type: 'identity', identityMode: 'anonymous' },
    );
    expect(anonymousNewDoctorBlocked(state.payload)).toBe(true);
    const named = run(state, { type: 'identity', identityMode: 'named' });
    expect(anonymousNewDoctorBlocked(named.payload)).toBe(false);
  });

  it('removes emptied text fields instead of storing empty strings', () => {
    const state = run(
      initComposerState(),
      { type: 'story', story: 'Synthetic story' },
      { type: 'title', title: 'A title' },
      { type: 'section', key: 'symptoms', text: 'Fever' },
      { type: 'story', story: '' },
      { type: 'title', title: '' },
      { type: 'section', key: 'symptoms', text: '' },
      { type: 'exactDate', exactDate: '' },
    );
    expect(state.payload).toEqual(emptyDraftPayload());
  });

  it('toggles a facility criterion and drops the criteria when none is left', () => {
    const state = run(initComposerState(), {
      type: 'criterion',
      criterion: 'waiting',
      value: 'poor',
    });
    expect(state.payload.criteria).toEqual({ waiting: 'poor' });
    const cleared = run(state, { type: 'criterion', criterion: 'waiting', value: 'poor' });
    expect('criteria' in cleared.payload).toBe(false);
  });

  it('toggles suggested tags and de-duplicates typed tags case-insensitively', () => {
    const tag = { group: 'condition' as const, termPublicId: 'tm_aaaa' };
    const state = run(
      initComposerState(),
      { type: 'tag', tag },
      { type: 'typedTag', group: 'symptom', text: ' Night Cough ' },
      { type: 'typedTag', group: 'symptom', text: 'night cough' },
      { type: 'typedTag', group: 'symptom', text: '   ' },
    );
    expect(state.payload.tags).toEqual([tag, { group: 'symptom', text: 'Night Cough' }]);
    const removed = run(
      state,
      { type: 'tag', tag },
      {
        type: 'tag',
        tag: { group: 'symptom', text: 'night cough' },
      },
    );
    expect(removed.payload.tags).toEqual([]);
  });

  it('caps tags at the limit and counts Not sure as one of them', () => {
    let state = initComposerState();
    for (let i = 0; i < DRAFT_TAG_MAX - 1; i++) {
      state = run(state, { type: 'typedTag', group: 'symptom', text: `symptom ${i}` });
    }
    state = run(state, { type: 'notSure' });
    expect(tagCount(state.payload)).toBe(DRAFT_TAG_MAX);
    const full = run(state, { type: 'typedTag', group: 'symptom', text: 'one more' });
    expect(full).toBe(state);
    const freed = run(state, { type: 'notSure' });
    expect(freed.payload.notSure).toBe(false);
    expect(
      run(freed, { type: 'typedTag', group: 'symptom', text: 'one more' }).payload.tags,
    ).toHaveLength(DRAFT_TAG_MAX);
  });

  it('keeps each dismissed check once', () => {
    const state = run(
      initComposerState(),
      { type: 'dismissCheck', kind: 'pii' },
      { type: 'dismissCheck', kind: 'pii' },
    );
    expect(state.payload.dismissedChecks).toEqual(['pii']);
  });

  it('returns the same state for an action that changes nothing, so no save is triggered', () => {
    const state = initComposerState();
    expect(run(state, { type: 'step', step: 1 })).toBe(state);
    expect(run(state, { type: 'mode', mode: 'quick' })).toBe(state);
    expect(run(state, { type: 'duplicate', duplicate: false })).toBe(state);
  });

  it('tracks the save status by sequence number and drops an older answer', () => {
    const started = run(initComposerState(), { type: 'saveStarted', seq: 1 });
    expect(started.save).toEqual({ status: 'saving', seq: 1 });
    const second = run(started, { type: 'saveStarted', seq: 2 });
    expect(run(second, { type: 'saveSucceeded', seq: 1, draftId: 'd1' })).toBe(second);
    const saved = run(second, { type: 'saveSucceeded', seq: 2, draftId: 'd2' });
    expect(saved.draftId).toBe('d2');
    expect(saved.save.status).toBe('saved');
    const failed = run(saved, { type: 'saveStarted', seq: 3 }, { type: 'saveFailed', seq: 3 });
    expect(failed.save.status).toBe('failed');
    expect(run(failed, { type: 'saveStarted', seq: 2 })).toBe(failed);
  });

  it('forgets a missing draft id and shows the notice once', () => {
    const state = run(initComposerState({ draftId: 'd1' }), { type: 'draftMissing' });
    expect(state.draftId).toBeUndefined();
    expect(state.draftMissing).toBe(true);
    expect(run(state, { type: 'draftMissingShown' }).draftMissing).toBe(false);
  });

  it('drops a preview answer older than the one shown', () => {
    const newer = run(initComposerState(), { type: 'preview', seq: 3, preview: facilityPreview });
    const older = { ...facilityPreview, body: 'Older' };
    expect(run(newer, { type: 'preview', seq: 2, preview: older })).toBe(newer);
    expect(run(newer, { type: 'preview', seq: 4, preview: older }).preview).toBe(older);
  });

  it('clears errors when publishing starts and keeps the draft on a refusal', () => {
    const publishing = run(initComposerState({ draftId: 'd1' }), { type: 'publishStarted' });
    expect(publishing.publishing).toBe(true);
    const refused = run(publishing, {
      type: 'publishRefused',
      errors: {
        formError: 'errors.review.minFields',
        fieldErrors: { doctor: 'errors.review.missingDoctor' },
      },
    });
    expect(refused.publishing).toBe(false);
    expect(refused.draftId).toBe('d1');
    expect(refused.errors.fieldErrors).toEqual({ doctor: 'errors.review.missingDoctor' });
    expect(run(refused, { type: 'publishStarted' }).errors).toEqual({ fieldErrors: {} });
  });
});
