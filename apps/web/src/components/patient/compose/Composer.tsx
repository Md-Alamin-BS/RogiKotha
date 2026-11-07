'use client';

import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { ComposerVM, FacilityPreviewVM, Locale, PreviewVM } from '@rogikotha/contracts';

import { useRouter } from '@/i18n/routing';
import {
  duplicateHintAction,
  previewAction,
  publishDraftAction,
  publishFacilityVisitAction,
  saveDraftAction,
} from '@/server/actions/review';
import { composerReducer, initComposerState, type ComposerStep } from './composer-reducer';
import { FormErrorSummary } from './FormErrorSummary';
import { periodOptions } from './period';
import { PreviewAside } from './PreviewAside';
import { PreviewBody } from './PreviewBody';
import { StepCare } from './StepCare';
import { StepCheck } from './StepCheck';
import { StepHowItWent } from './StepHowItWent';
import { StepStory } from './StepStory';
import { STEP_HEADING_ID, StepRail } from './StepRail';
import { useAutosave, type AutosaveAnswer } from './use-autosave';

/** Field -> label key, as the error summary lists a refused publish. */
const FIELD_LABELS: Record<string, string> = {
  doctor: 'compose.doctor',
  branch: 'compose.target.facility',
  relationship: 'compose.relationship',
  period: 'compose.period',
  story: 'compose.story',
  tags: 'compose.tags',
  identity: 'compose.identity.label',
  attestation: 'compose.confirmTitle',
  newDoctorName: 'compose.addName',
  newDoctorSpecialtyId: 'compose.addSpecialty',
  newDoctorChamber: 'compose.addChamber',
  newDoctorBmdc: 'compose.addBmdc',
  exactDate: 'compose.exactDate',
  title: 'compose.titleLabel',
  symptoms: 'compose.symptoms',
  diagnosis: 'compose.diagnosis',
  treatment: 'compose.treatment',
  after: 'compose.after',
};

/** The step each refusable field is on, so the summary can take the author to it. */
const FIELD_STEP: Record<string, ComposerStep> = {
  doctor: 1,
  branch: 1,
  relationship: 1,
  period: 1,
  exactDate: 1,
  newDoctorName: 1,
  newDoctorSpecialtyId: 1,
  newDoctorChamber: 1,
  newDoctorBmdc: 1,
  title: 2,
  story: 2,
  symptoms: 2,
  diagnosis: 2,
  treatment: 2,
  after: 2,
  tags: 2,
  identity: 4,
  attestation: 4,
};

const NEW_DOCTOR_FIELD: Record<string, string> = {
  name: 'newDoctorName',
  specialtyId: 'newDoctorSpecialtyId',
  practiceArea: 'newDoctorChamber',
  bmdc: 'newDoctorBmdc',
};

const PAYLOAD_FIELD: Record<string, string> = {
  doctorPublicId: 'doctor',
  branchPublicId: 'branch',
};

/** A refused save names input paths (`payload.tags.0.text`); the composer names its fields. */
function composerFieldErrors(
  saveErrors: Record<string, string> | undefined,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const [path, key] of Object.entries(saveErrors ?? {})) {
    const [root, first, second] = path.split('.');
    if (root !== 'payload' || first === undefined) continue;
    const field =
      first === 'newDoctor'
        ? NEW_DOCTOR_FIELD[second ?? 'name']
        : first === 'sections'
          ? second
          : (PAYLOAD_FIELD[first] ?? first);
    if (field !== undefined && FIELD_LABELS[field] !== undefined) fieldErrors[field] ??= key;
  }
  return fieldErrors;
}

const STEP_NAME_KEY: Record<ComposerStep, string> = {
  1: 'compose.stepName.care',
  2: 'compose.stepName.story',
  3: 'compose.stepName.how',
  4: 'compose.stepName.check',
};

export interface ComposerProps {
  vm: ComposerVM;
  initialStep: ComposerStep;
  /** `?doctor=`, the only way a doctor is preselected (BR8.8); ignored when a draft is open. */
  doctorPublicId?: string | undefined;
  /** Renders the preview body; defaults to `PreviewBody` (ExperienceBody or the facility row). */
  renderPreview?: (preview: PreviewVM | FacilityPreviewVM) => ReactNode;
  /** `?draft=` named a draft that is gone: start a new one and say so once (WF1 step 3). */
  draftMissing?: boolean;
  /** Overrides the clock in tests. */
  now?: Date;
}

function defaultPreview(preview: PreviewVM | FacilityPreviewVM): ReactNode {
  return <PreviewBody preview={preview} />;
}

// The four-step composer (frontend-components.md § 4): owns the reducer and the autosave, and puts
// the rail, the current step, the preview aside and the static disclaimer on the page.
export function Composer({
  vm,
  initialStep,
  doctorPublicId,
  renderPreview = defaultPreview,
  draftMissing = false,
  now,
}: ComposerProps) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [clock] = useState(() => now ?? new Date());
  const [state, dispatch] = useReducer(composerReducer, undefined, () =>
    initComposerState({
      ...(vm.draft
        ? { draftId: vm.draft.draftId, payload: vm.draft.payload }
        : doctorPublicId !== undefined
          ? { doctorPublicId }
          : {}),
      initialStep,
    }),
  );

  const save = useCallback(
    async (input: Parameters<typeof saveDraftAction>[0]): Promise<AutosaveAnswer> => {
      const answer = await saveDraftAction(input);
      return answer.ok
        ? { ok: true, draftId: answer.draftId, expiresAt: answer.expiresAt }
        : {
            ok: false,
            messageKey: answer.messageKey,
            ...(answer.fieldErrors !== undefined ? { fieldErrors: answer.fieldErrors } : {}),
          };
    },
    [],
  );

  // After each save the preview and the duplicate hint are refreshed (BR8.5); older answers drop.
  const onSaved = useCallback((draftId: string, seq: number) => {
    void previewAction({ draftId }).then((answer) => {
      if (answer.ok) dispatch({ type: 'preview', seq, preview: answer.preview });
    });
    void duplicateHintAction({ draftId }).then((answer) => {
      if (answer.ok) dispatch({ type: 'duplicate', duplicate: answer.duplicate });
    });
  }, []);

  const { flush } = useAutosave({
    payload: state.payload,
    draftId: state.draftId,
    dispatch,
    save,
    enabled: !state.publishing,
    onSaved,
  });

  const router = useRouter();

  // Publish saves the last change first, then hands the draft to the publish action, which
  // redirects on success. A refusal comes back as message keys for the summary (WF4, WF5).
  const publish = useCallback(async () => {
    const flushed = await flush();
    // The stored draft is older than the screen: publishing it would publish other words.
    if (!flushed.saved) {
      dispatch({
        type: 'publishRefused',
        errors: {
          fieldErrors: composerFieldErrors(flushed.failure?.fieldErrors),
          formError: 'compose.publishNotSaved',
        },
      });
      return;
    }
    const draftId = flushed.draftId;
    if (draftId === undefined) {
      dispatch({
        type: 'publishRefused',
        errors: { fieldErrors: {}, formError: 'compose.draftNotSaved' },
      });
      return;
    }
    dispatch({ type: 'publishStarted' });
    const input = { draftId, identityMode: state.payload.identityMode, attestation: true };
    const answer =
      state.payload.target === 'facility'
        ? await publishFacilityVisitAction(input)
        : await publishDraftAction(input);
    dispatch({
      type: 'publishRefused',
      errors: { fieldErrors: answer.fieldErrors, formError: answer.formError },
    });
  }, [flush, state.payload.identityMode, state.payload.target]);

  const saveExit = useCallback(async () => {
    await flush();
    router.push('/write');
  }, [flush, router]);

  const periods = useMemo(() => periodOptions(clock, locale), [clock, locale]);
  const today = clock.toISOString().slice(0, 10);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (state.errors.formError) setAttempt((n) => n + 1);
  }, [state.errors]);

  // A gone `?draft=` is reported once; the page already started a new draft.
  const [initialDraftMissing] = useState(draftMissing);
  useEffect(() => {
    if (initialDraftMissing) dispatch({ type: 'draftMissing' });
  }, [initialDraftMissing]);

  // The draft-missing notice is shown once, then cleared.
  useEffect(() => {
    if (!state.draftMissing) return;
    const timer = window.setTimeout(() => dispatch({ type: 'draftMissingShown' }), 5_000);
    return () => window.clearTimeout(timer);
  }, [state.draftMissing]);

  // T-011's `[data-step-dir]` slide runs from `@starting-style`, so the panel is keyed by step and
  // the first render carries no direction (BR8.11).
  const [shown, setShown] = useState<{ step: ComposerStep; dir?: 'forward' | 'back' }>({
    step: state.step,
  });
  if (shown.step !== state.step) {
    setShown({ step: state.step, dir: state.step > shown.step ? 'forward' : 'back' });
  }

  const savedFlag = state.draftMissing
    ? 'compose.draftMissing'
    : state.save.status === 'failed'
      ? 'compose.draftNotSaved'
      : state.save.status === 'saved'
        ? 'compose.draftSaved'
        : null;
  // A save the server refused names its fields, so the author knows what to change.
  const unsavedLabels =
    savedFlag === 'compose.draftNotSaved'
      ? Object.keys(composerFieldErrors(state.save.fieldErrors)).map((field) =>
          t(FIELD_LABELS[field] as string),
        )
      : [];

  const refusedFields = Object.keys(state.errors.fieldErrors).filter(
    (field) => FIELD_LABELS[field] !== undefined,
  );
  const refusedLabels = refusedFields.map((field) => FIELD_LABELS[field] as string);
  const goToField = (label: string) => {
    const field = refusedFields.find((f) => FIELD_LABELS[f] === label);
    const step = field ? FIELD_STEP[field] : undefined;
    if (step) dispatch({ type: 'step', step });
  };

  return (
    <div className="c-grid" data-testid="composer">
      <div className="c-main">
        <StepRail step={state.step} onStep={(step) => dispatch({ type: 'step', step })} />
        <p id="saved-flag" role="status" className="sub" data-testid="compose-saved-flag">
          {savedFlag ? t(savedFlag) : null}
          {unsavedLabels.length > 0 ? (
            <span data-testid="compose-saved-flag-fields">
              {' '}
              {t('compose.errorFields')}{' '}
              {new Intl.ListFormat(locale, { type: 'conjunction' }).format(unsavedLabels)}
            </span>
          ) : null}
        </p>
        <FormErrorSummary
          attempt={attempt}
          error={state.errors.formError ?? null}
          fields={refusedLabels}
          onField={goToField}
        />
        <section
          key={state.step}
          className="panel c-step-body"
          data-step-dir={shown.dir}
          data-testid={`compose-step-body-${state.step}`}
        >
          <h2 id={STEP_HEADING_ID} tabIndex={-1}>
            {t(STEP_NAME_KEY[state.step])}
          </h2>
          {state.step === 1 ? (
            <StepCare
              payload={state.payload}
              vm={vm}
              periods={periods}
              today={today}
              dispatch={dispatch}
              errors={state.errors.fieldErrors}
            />
          ) : null}
          {state.step === 2 ? (
            <StepStory
              payload={state.payload}
              vm={vm}
              duplicate={state.duplicate}
              dispatch={dispatch}
              errors={state.errors.fieldErrors}
            />
          ) : null}
          {state.step === 3 ? <StepHowItWent payload={state.payload} dispatch={dispatch} /> : null}
          {state.step === 4 ? (
            <StepCheck
              payload={state.payload}
              vm={vm}
              duplicate={state.duplicate}
              dispatch={dispatch}
              onPublish={() => void publish()}
              onSaveExit={() => void saveExit()}
              publishing={state.publishing}
              errors={state.errors.fieldErrors}
            />
          ) : null}
        </section>
        <div className="callout warn" data-static="disclaimer">
          {t('disclaimer.long')}
        </div>
      </div>
      <PreviewAside step={state.step}>
        {state.preview ? renderPreview(state.preview) : null}
      </PreviewAside>
    </div>
  );
}
