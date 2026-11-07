'use client';

import { useId, useState, type Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import type { ComposerVM, DraftPayload, IdentityMode } from '@rogikotha/contracts';

import { anonymousNewDoctorBlocked, type ComposerAction } from './composer-reducer';
import { OptionGroup } from './OptionGroup';
import { draftTexts } from './safety';
import { SafetyChecks } from './SafetyChecks';

const ATTESTATIONS = ['confirm1', 'confirm2', 'confirm3', 'age'] as const;

const IDENTITY_SET: ReadonlySet<string> = new Set<IdentityMode>([
  'named',
  'pseudonymous',
  'anonymous',
]);

// Step 4, "Check and publish" (BR3.5, BR3.12, BR8.6, BR8.12): who the name is shown as, the
// automatic checks again, four attestation boxes and Publish. The boxes live only in this
// component: they are asked again on every publish and are never saved with the draft.
export function StepCheck({
  payload,
  vm,
  duplicate,
  dispatch,
  onPublish,
  onSaveExit,
  publishing,
  errors = {},
}: {
  payload: DraftPayload;
  vm: Pick<ComposerVM, 'names' | 'emergencyNumbers'>;
  duplicate: boolean;
  dispatch: Dispatch<ComposerAction>;
  onPublish: () => void;
  onSaveExit: () => void;
  publishing: boolean;
  /** Field -> message key from a refused publish: `identity`, `attestation`. */
  errors?: Record<string, string>;
}) {
  const t = useTranslations();
  const id = useId();
  const [ticked, setTicked] = useState<readonly boolean[]>(ATTESTATIONS.map(() => false));
  const facility = payload.target === 'facility';
  const blocked = anonymousNewDoctorBlocked(payload);
  const allTicked = ticked.every(Boolean);
  const named = vm.names.named;
  const pseudonymous = vm.names.pseudonymous;

  const options = [
    {
      value: 'named',
      label: named ? `${t('compose.identity.real')} (${named})` : t('compose.identity.real'),
    },
    {
      value: 'pseudonymous',
      label: pseudonymous
        ? `${t('compose.identity.pseudo')} (@${pseudonymous.replace(/^@/, '')})`
        : t('compose.identity.pseudo'),
    },
    ...(facility ? [] : [{ value: 'anonymous', label: t('compose.identity.anon') }]),
  ];

  // The Publish button is described by the attestation legend (what must be ticked) and, while it
  // is blocked, by the anonymous new-doctor explanation.
  const describedBy = [
    allTicked ? null : `${id}-attest-legend`,
    blocked ? `${id}-anon-new-doctor` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="step-check" data-testid="compose-step-check">
      <OptionGroup
        name="identity"
        label={t('compose.identity.label')}
        required
        options={options}
        value={payload.identityMode}
        onChange={(value) => {
          if (IDENTITY_SET.has(value)) {
            dispatch({ type: 'identity', identityMode: value as IdentityMode });
          }
        }}
        error={errors.identity}
      />
      {payload.identityMode === 'anonymous' && !facility ? (
        <p className="sub" data-testid="compose-anon-note">
          {t('compose.identity.anonNote')}
        </p>
      ) : null}

      {blocked ? (
        <div
          className="callout warn"
          id={`${id}-anon-new-doctor`}
          data-testid="compose-anon-blocked"
        >
          <p>{t('compose.anonNewDoctor')}</p>
          <div className="btn-row">
            <button
              type="button"
              className="btn ghost small"
              onClick={() => dispatch({ type: 'step', step: 1 })}
            >
              {t('compose.stepName.care')}
            </button>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => dispatch({ type: 'identity', identityMode: 'named' })}
            >
              {t('compose.identity.real')}
            </button>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => dispatch({ type: 'identity', identityMode: 'pseudonymous' })}
            >
              {t('compose.identity.pseudo')}
            </button>
          </div>
        </div>
      ) : null}

      <SafetyChecks
        texts={draftTexts(payload)}
        numbers={vm.emergencyNumbers}
        duplicate={duplicate}
        dismissed={payload.dismissedChecks ?? []}
        onDismiss={(kind) => dispatch({ type: 'dismissCheck', kind })}
      />

      <fieldset className="field" data-testid="compose-attestation">
        <legend className="lbl" id={`${id}-attest-legend`}>
          {t('compose.confirmTitle')}
        </legend>
        <div className="check-list">
          {ATTESTATIONS.map((key, index) => (
            <label key={key} className="check">
              <input
                type="checkbox"
                checked={ticked[index] ?? false}
                onChange={(e) =>
                  setTicked((prev) => prev.map((v, i) => (i === index ? e.target.checked : v)))
                }
                aria-invalid={errors.attestation && !allTicked ? true : undefined}
                data-testid={`compose-attest-${key}`}
              />
              <span>{t(`compose.${key}`)}</span>
            </label>
          ))}
        </div>
        {errors.attestation ? <p className="field-error">{t(errors.attestation)}</p> : null}
      </fieldset>

      <div className="btn-row">
        <button
          type="button"
          className="btn"
          disabled={!allTicked || blocked || publishing}
          aria-busy={publishing || undefined}
          aria-describedby={describedBy || undefined}
          onClick={onPublish}
          data-testid="compose-publish"
        >
          {t('compose.publish')}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={publishing}
          onClick={onSaveExit}
          data-testid="compose-save-exit"
        >
          {t('compose.saveExit')}
        </button>
      </div>
    </div>
  );
}
