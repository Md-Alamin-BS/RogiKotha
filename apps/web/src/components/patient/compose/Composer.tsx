'use client';

import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { ComposerVM, FacilityPreviewVM, Locale, PreviewVM } from '@rogikotha/contracts';

import { duplicateHintAction, previewAction, saveDraftAction } from '@/server/actions/review';
import { composerReducer, initComposerState, type ComposerStep } from './composer-reducer';
import { FormErrorSummary } from './FormErrorSummary';
import { periodOptions } from './period';
import { PreviewAside } from './PreviewAside';
import { StepCare } from './StepCare';
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
};

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
  /** Renders the preview body (ExperienceBody or the facility row); the aside is empty without it. */
  renderPreview?: (preview: PreviewVM | FacilityPreviewVM) => ReactNode;
  /** Overrides the clock in tests. */
  now?: Date;
}

// The four-step composer (frontend-components.md § 4): owns the reducer and the autosave, and puts
// the rail, the current step, the preview aside and the static disclaimer on the page.
export function Composer({ vm, initialStep, doctorPublicId, renderPreview, now }: ComposerProps) {
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
        : { ok: false, messageKey: answer.messageKey };
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

  useAutosave({
    payload: state.payload,
    draftId: state.draftId,
    dispatch,
    save,
    enabled: !state.publishing,
    onSaved,
  });

  const periods = useMemo(() => periodOptions(clock, locale), [clock, locale]);
  const today = clock.toISOString().slice(0, 10);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (state.errors.formError) setAttempt((n) => n + 1);
  }, [state.errors]);

  // The draft-missing notice is shown once, then cleared.
  useEffect(() => {
    if (!state.draftMissing) return;
    const timer = window.setTimeout(() => dispatch({ type: 'draftMissingShown' }), 5_000);
    return () => window.clearTimeout(timer);
  }, [state.draftMissing]);

  const savedFlag = state.draftMissing
    ? 'compose.draftMissing'
    : state.save.status === 'failed'
      ? 'compose.draftNotSaved'
      : state.save.status === 'saved'
        ? 'compose.draftSaved'
        : null;

  const refusedLabels = Object.keys(state.errors.fieldErrors)
    .map((field) => FIELD_LABELS[field])
    .filter((label): label is string => label !== undefined);

  return (
    <div className="c-grid" data-testid="composer">
      <div className="c-main">
        <StepRail step={state.step} onStep={(step) => dispatch({ type: 'step', step })} />
        <p id="saved-flag" role="status" className="sub" data-testid="compose-saved-flag">
          {savedFlag ? t(savedFlag) : null}
        </p>
        <FormErrorSummary
          attempt={attempt}
          error={state.errors.formError ?? null}
          fields={refusedLabels}
        />
        <section className="panel c-step-body" data-testid={`compose-step-body-${state.step}`}>
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
          {/* TODO(U47): StepStory, StepHowItWent and StepCheck land with plan Steps 44 and 45. */}
        </section>
        <div className="callout warn" data-static="disclaimer">
          {t('disclaimer.long')}
        </div>
      </div>
      <PreviewAside step={state.step}>
        {state.preview && renderPreview ? renderPreview(state.preview) : null}
      </PreviewAside>
    </div>
  );
}
