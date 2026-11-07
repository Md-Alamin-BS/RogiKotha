// The composer's client state (frontend-components.md § 4). Pure: no fetch, no timers, no storage
// (BR8.3 keeps nothing in the browser), so every transition is unit-tested on its own.
import {
  DRAFT_TAG_MAX,
  type Criterion,
  type CriterionValue,
  type DraftPayload,
  type DraftTarget,
  type FacilityPreviewVM,
  type IdentityMode,
  type Outcome,
  type PreviewVM,
  type Relationship,
  type ReviewKind,
  type ReviewerLabelCode,
  type SafetyCheckKind,
  type Sentiment,
  type TagGroup,
} from '@rogikotha/contracts';

export type ComposerStep = 1 | 2 | 3 | 4;
export const COMPOSER_STEPS: readonly ComposerStep[] = [1, 2, 3, 4];

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export type DraftTag = DraftPayload['tags'][number];
export type DraftNewDoctor = NonNullable<DraftPayload['newDoctor']>;

export interface ComposerErrors {
  /** Field -> message key. */
  fieldErrors: Record<string, string>;
  formError?: string;
}

export interface ComposerState {
  payload: DraftPayload;
  draftId?: string;
  step: ComposerStep;
  save: { status: SaveStatus; seq: number };
  preview?: PreviewVM | FacilityPreviewVM;
  /** The sequence number of the save the shown preview belongs to; older answers are dropped. */
  previewSeq: number;
  duplicate: boolean;
  /** `compose.draftMissing` is shown once after a stored draft could not be found. */
  draftMissing: boolean;
  publishing: boolean;
  errors: ComposerErrors;
}

export type ComposerAction =
  | { type: 'step'; step: ComposerStep }
  | { type: 'target'; target: DraftTarget }
  | { type: 'mode'; mode: ReviewKind }
  | { type: 'relationship'; relationship: Relationship }
  | { type: 'identity'; identityMode: IdentityMode }
  | { type: 'doctor'; doctorPublicId: string | undefined }
  | { type: 'newDoctor'; newDoctor: DraftNewDoctor | undefined }
  | { type: 'branch'; branchPublicId: string | undefined }
  | { type: 'period'; period: DraftPayload['period'] }
  | { type: 'exactDate'; exactDate: string | undefined }
  | { type: 'title'; title: string }
  | { type: 'story'; story: string }
  | { type: 'section'; key: keyof NonNullable<DraftPayload['sections']>; text: string }
  | { type: 'sentiment'; sentiment: Sentiment }
  | { type: 'outcome'; outcome: Outcome }
  | { type: 'claim'; claim: ReviewerLabelCode }
  | { type: 'criterion'; criterion: Criterion; value: CriterionValue }
  | { type: 'tag'; tag: DraftTag }
  | { type: 'typedTag'; group: TagGroup; text: string }
  | { type: 'notSure' }
  | { type: 'dismissCheck'; kind: SafetyCheckKind }
  | { type: 'saveStarted'; seq: number }
  | { type: 'saveSucceeded'; seq: number; draftId: string }
  | { type: 'saveFailed'; seq: number }
  | { type: 'draftMissing' }
  | { type: 'draftMissingShown' }
  | { type: 'preview'; seq: number; preview: PreviewVM | FacilityPreviewVM }
  | { type: 'duplicate'; duplicate: boolean }
  | { type: 'publishStarted' }
  | { type: 'publishRefused'; errors: ComposerErrors };

/** The empty payload, equal to `DraftPayload.parse({})` without loading zod on every keystroke. */
export function emptyDraftPayload(): DraftPayload {
  return {
    v: 1,
    target: 'doctor',
    mode: 'quick',
    step: 1,
    tags: [],
    notSure: false,
    claims: [],
    identityMode: 'pseudonymous',
  };
}

export interface ComposerInit {
  draftId?: string;
  payload?: DraftPayload;
  initialStep?: ComposerStep;
  /** `?doctor=`, the only way a doctor is preselected (BR8.8). */
  doctorPublicId?: string;
}

export function initComposerState(init: ComposerInit = {}): ComposerState {
  let payload = init.payload ?? emptyDraftPayload();
  if (init.payload === undefined && init.doctorPublicId !== undefined) {
    payload = { ...payload, doctorPublicId: init.doctorPublicId };
  }
  const step = init.initialStep ?? toStep(payload.step);
  return {
    payload: { ...payload, step },
    ...(init.draftId !== undefined ? { draftId: init.draftId } : {}),
    step,
    save: { status: init.draftId !== undefined ? 'saved' : 'idle', seq: 0 },
    previewSeq: 0,
    duplicate: false,
    draftMissing: false,
    publishing: false,
    errors: { fieldErrors: {} },
  };
}

function toStep(n: number): ComposerStep {
  return n === 2 || n === 3 || n === 4 ? n : 1;
}

// `exactOptionalPropertyTypes`: an optional field is removed, never set to undefined.
function withField<K extends keyof DraftPayload>(
  payload: DraftPayload,
  key: K,
  value: DraftPayload[K] | undefined,
): DraftPayload {
  if (value === undefined) {
    const next = { ...payload };
    delete next[key];
    return next;
  }
  return { ...payload, [key]: value };
}

/** Rows a review stores for its tags; Not sure is one of them (the ASSUMPTION(U47) of Step 6). */
export function tagCount(payload: DraftPayload): number {
  return payload.tags.length + (payload.notSure ? 1 : 0);
}

function tagKey(tag: DraftTag): string {
  return 'termPublicId' in tag
    ? `${tag.group}:id:${tag.termPublicId}`
    : `${tag.group}:text:${tag.text.trim().toLocaleLowerCase()}`;
}

function toggleTag(payload: DraftPayload, tag: DraftTag): DraftPayload {
  const key = tagKey(tag);
  const kept = payload.tags.filter((t) => tagKey(t) !== key);
  if (kept.length !== payload.tags.length) return { ...payload, tags: kept };
  if (tagCount(payload) >= DRAFT_TAG_MAX) return payload;
  return { ...payload, tags: [...payload.tags, tag] };
}

/** BR3.12: an anonymous review cannot add a doctor who is not listed. */
export function anonymousNewDoctorBlocked(payload: DraftPayload): boolean {
  return payload.identityMode === 'anonymous' && payload.newDoctor !== undefined;
}

function edit(state: ComposerState, payload: DraftPayload): ComposerState {
  return payload === state.payload ? state : { ...state, payload };
}

export function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
  const p = state.payload;
  switch (action.type) {
    case 'step':
      if (action.step === state.step) return state;
      return { ...state, step: action.step, payload: { ...p, step: action.step } };
    case 'target': {
      if (action.target === p.target) return state;
      let next: DraftPayload = { ...p, target: action.target };
      // ASSUMPTION(U47): a facility visit offers no anonymous option (BR8.12), so the choice
      // falls back to the default instead of holding a mode step 4 cannot show.
      if (action.target === 'facility' && next.identityMode === 'anonymous') {
        next = { ...next, identityMode: 'pseudonymous' };
      }
      return edit(state, next);
    }
    case 'mode':
      return edit(state, p.mode === action.mode ? p : { ...p, mode: action.mode });
    case 'relationship':
      return edit(
        state,
        p.relationship === action.relationship ? p : { ...p, relationship: action.relationship },
      );
    case 'identity':
      if (action.identityMode === p.identityMode) return state;
      if (action.identityMode === 'anonymous' && p.target === 'facility') return state;
      return edit(state, { ...p, identityMode: action.identityMode });
    case 'doctor': {
      // Choosing a listed doctor clears a doctor being added (BR3.11).
      const next = withField(p, 'doctorPublicId', action.doctorPublicId);
      return edit(
        state,
        action.doctorPublicId === undefined ? next : withField(next, 'newDoctor', undefined),
      );
    }
    case 'newDoctor': {
      const next = withField(p, 'newDoctor', action.newDoctor);
      return edit(
        state,
        action.newDoctor === undefined ? next : withField(next, 'doctorPublicId', undefined),
      );
    }
    case 'branch':
      return edit(state, withField(p, 'branchPublicId', action.branchPublicId));
    case 'period':
      return edit(state, withField(p, 'period', action.period));
    case 'exactDate':
      return edit(state, withField(p, 'exactDate', action.exactDate || undefined));
    case 'title':
      return edit(state, withField(p, 'title', action.title === '' ? undefined : action.title));
    case 'story':
      return edit(state, withField(p, 'story', action.story === '' ? undefined : action.story));
    case 'section': {
      const sections = { ...p.sections };
      if (action.text === '') delete sections[action.key];
      else sections[action.key] = action.text;
      return edit(
        state,
        withField(p, 'sections', Object.keys(sections).length === 0 ? undefined : sections),
      );
    }
    case 'sentiment':
      // Prototype toggle: a second press on the chosen value clears it.
      return edit(
        state,
        withField(p, 'sentiment', p.sentiment === action.sentiment ? undefined : action.sentiment),
      );
    case 'outcome':
      return edit(
        state,
        withField(p, 'outcome', p.outcome === action.outcome ? undefined : action.outcome),
      );
    case 'claim': {
      const has = p.claims.includes(action.claim);
      return edit(state, {
        ...p,
        claims: has ? p.claims.filter((c) => c !== action.claim) : [...p.claims, action.claim],
      });
    }
    case 'criterion': {
      // ASSUMPTION(U47): each criterion is optional, so a second press clears it like sentiment.
      const criteria = { ...p.criteria };
      if (criteria[action.criterion] === action.value) delete criteria[action.criterion];
      else criteria[action.criterion] = action.value;
      return edit(
        state,
        withField(p, 'criteria', Object.keys(criteria).length === 0 ? undefined : criteria),
      );
    }
    case 'tag':
      return edit(state, toggleTag(p, action.tag));
    case 'typedTag': {
      const text = action.text.trim();
      if (text === '') return state;
      const tag: DraftTag = { group: action.group, text };
      const key = tagKey(tag);
      if (p.tags.some((t) => tagKey(t) === key)) return state;
      return edit(state, toggleTag(p, tag));
    }
    case 'notSure':
      if (!p.notSure && tagCount(p) >= DRAFT_TAG_MAX) return state;
      return edit(state, { ...p, notSure: !p.notSure });
    case 'dismissCheck': {
      const dismissed = p.dismissedChecks ?? [];
      if (dismissed.includes(action.kind)) return state;
      return edit(state, { ...p, dismissedChecks: [...dismissed, action.kind] });
    }
    case 'saveStarted':
      if (action.seq <= state.save.seq) return state;
      return { ...state, save: { status: 'saving', seq: action.seq } };
    case 'saveSucceeded':
      if (action.seq !== state.save.seq) return state;
      return { ...state, draftId: action.draftId, save: { status: 'saved', seq: action.seq } };
    case 'saveFailed':
      if (action.seq !== state.save.seq) return state;
      return { ...state, save: { status: 'failed', seq: action.seq } };
    case 'draftMissing': {
      const next = { ...state, draftMissing: true };
      delete next.draftId;
      return next;
    }
    case 'draftMissingShown':
      return state.draftMissing ? { ...state, draftMissing: false } : state;
    case 'preview':
      if (action.seq < state.previewSeq) return state;
      return { ...state, preview: action.preview, previewSeq: action.seq };
    case 'duplicate':
      return action.duplicate === state.duplicate
        ? state
        : { ...state, duplicate: action.duplicate };
    case 'publishStarted':
      return { ...state, publishing: true, errors: { fieldErrors: {} } };
    case 'publishRefused':
      return { ...state, publishing: false, errors: action.errors };
  }
}
