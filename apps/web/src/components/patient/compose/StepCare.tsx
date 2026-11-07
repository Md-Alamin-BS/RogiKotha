'use client';

import { useId, useMemo, type Dispatch } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  RELATIONSHIPS,
  type ComposerVM,
  type DraftPayload,
  type Locale,
  type Relationship,
} from '@rogikotha/contracts';
import { formatMonthYear } from '@rogikotha/i18n/format';

import type { ComposerAction } from './composer-reducer';
import { NewDoctorFields } from './NewDoctorFields';
import { OptionGroup } from './OptionGroup';
import { periodValue, type PeriodOption } from './period';

const RELATIONSHIP_SET: ReadonlySet<string> = new Set(RELATIONSHIPS);

function parsePeriod(value: string): DraftPayload['period'] {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return { year: Number(match[1]), month: Number(match[2]) };
}

// Step 1, "The care" (frontend-components.md § 4): who and what the account is about, when, and
// how it is shown. The doctor is preselected only from `?doctor=` (BR8.8), by the composer's init.
export function StepCare({
  payload,
  vm,
  periods,
  today,
  dispatch,
  errors = {},
}: {
  payload: DraftPayload;
  vm: Pick<ComposerVM, 'doctors' | 'branches' | 'specialties'>;
  periods: readonly PeriodOption[];
  /** "YYYY-MM-DD", the latest date the private exact date may take. */
  today: string;
  dispatch: Dispatch<ComposerAction>;
  /** Field -> message key from a refused publish: `doctor`, `branch`, `relationship`, `period`. */
  errors?: Record<string, string>;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const id = useId();
  const facility = payload.target === 'facility';
  const anonymous = payload.identityMode === 'anonymous';
  const adding = payload.newDoctor !== undefined;
  const periodNow = payload.period ? periodValue(payload.period.year, payload.period.month) : '';

  // A stored draft may hold a month older than the ten years offered; keep it selectable.
  const periodChoices = useMemo(() => {
    if (periodNow === '' || periods.some((p) => p.value === periodNow) || !payload.period) {
      return periods;
    }
    return [...periods, { value: periodNow, label: formatMonthYear(payload.period, locale) }];
  }, [periods, periodNow, payload.period, locale]);

  const errorId = (field: string) => `${id}-${field}-error`;
  const doctorError = errors.doctor;
  const branchError = errors.branch;
  const periodError = errors.period;

  return (
    <div className="step-care" data-testid="compose-step-care">
      {vm.branches.length > 0 ? (
        <div className="c-modes" data-testid="compose-target">
          {(['doctor', 'facility'] as const).map((target) => (
            <button
              key={target}
              type="button"
              className="c-mode"
              aria-pressed={payload.target === target}
              onClick={() => dispatch({ type: 'target', target })}
            >
              <b>{t(`compose.target.${target}`)}</b>
            </button>
          ))}
        </div>
      ) : null}

      {facility ? (
        <div className="field">
          <label htmlFor={`${id}-branch`}>
            {t('compose.target.facility')}
            <span className="req">{t('compose.required')}</span>
          </label>
          <select
            id={`${id}-branch`}
            value={payload.branchPublicId ?? ''}
            onChange={(e) =>
              dispatch({ type: 'branch', branchPublicId: e.target.value || undefined })
            }
            aria-invalid={branchError ? true : undefined}
            aria-describedby={branchError ? errorId('branch') : undefined}
            data-testid="compose-branch"
          >
            <option value="">{t('label.notProvided')}</option>
            {vm.branches.map((b) => (
              <option key={b.publicId} value={b.publicId}>
                {b.label}
              </option>
            ))}
          </select>
          {branchError ? (
            <p className="field-error" id={errorId('branch')}>
              {t(branchError)}
            </p>
          ) : null}
        </div>
      ) : adding && payload.newDoctor ? (
        <NewDoctorFields
          value={payload.newDoctor}
          specialties={vm.specialties}
          onChange={(newDoctor) => dispatch({ type: 'newDoctor', newDoctor })}
          onCancel={() => dispatch({ type: 'newDoctor', newDoctor: undefined })}
          errors={errors}
        />
      ) : (
        <div className="field">
          <label htmlFor={`${id}-doctor`}>
            {t('compose.doctor')}
            <span className="req">{t('compose.required')}</span>
          </label>
          <select
            id={`${id}-doctor`}
            value={payload.doctorPublicId ?? ''}
            onChange={(e) =>
              dispatch({ type: 'doctor', doctorPublicId: e.target.value || undefined })
            }
            aria-invalid={doctorError ? true : undefined}
            aria-describedby={doctorError ? errorId('doctor') : undefined}
            data-testid="compose-doctor"
          >
            <option value="">{t('compose.chooseDoctor')}</option>
            {vm.doctors.map((d) => (
              <option key={d.publicId} value={d.publicId}>
                {d.label}
              </option>
            ))}
          </select>
          {doctorError ? (
            <p className="field-error" id={errorId('doctor')}>
              {t(doctorError)}
            </p>
          ) : null}
          <button
            type="button"
            className="btn ghost small add-doctor-open"
            disabled={anonymous}
            aria-describedby={anonymous ? `${id}-anon-new-doctor` : undefined}
            onClick={() => dispatch({ type: 'newDoctor', newDoctor: { name: '' } })}
            data-testid="compose-add-doctor-open"
          >
            {t('compose.addDoctor')}
          </button>
          {anonymous ? (
            <p className="sub" id={`${id}-anon-new-doctor`} data-testid="compose-anon-new-doctor">
              {t('compose.anonNewDoctor')}
            </p>
          ) : null}
        </div>
      )}

      <OptionGroup
        name="relationship"
        label={t('compose.relationship')}
        required
        options={RELATIONSHIPS.map((r) => ({ value: r, label: t(`rel.${r}`) }))}
        value={payload.relationship ?? ''}
        onChange={(value) => {
          if (RELATIONSHIP_SET.has(value)) {
            dispatch({ type: 'relationship', relationship: value as Relationship });
          }
        }}
        error={errors.relationship}
      />

      <div className="field">
        <label htmlFor={`${id}-period`}>
          {t('compose.period')}
          <span className="req">{t('compose.required')}</span>
        </label>
        <p className="sub" id={`${id}-period-hint`}>
          {t('compose.periodNote')}
        </p>
        <select
          id={`${id}-period`}
          value={periodNow}
          onChange={(e) => dispatch({ type: 'period', period: parsePeriod(e.target.value) })}
          aria-invalid={periodError ? true : undefined}
          aria-describedby={
            periodError ? `${id}-period-hint ${errorId('period')}` : `${id}-period-hint`
          }
          data-testid="compose-period"
        >
          <option value="">{t('label.notProvided')}</option>
          {periodChoices.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {periodError ? (
          <p className="field-error" id={errorId('period')}>
            {t(periodError)}
          </p>
        ) : null}
      </div>

      {/* ASSUMPTION(U47): a facility account stores no exact date and has no detailed layout. */}
      {facility ? null : (
        <>
          <div className="field">
            <label htmlFor={`${id}-exact`}>{t('compose.exactDate')}</label>
            <p className="sub" id={`${id}-exact-hint`}>
              {t('compose.exactDateNote')}
            </p>
            <input
              id={`${id}-exact`}
              type="date"
              max={today}
              value={payload.exactDate ?? ''}
              onChange={(e) =>
                dispatch({ type: 'exactDate', exactDate: e.target.value || undefined })
              }
              aria-describedby={`${id}-exact-hint`}
              data-testid="compose-exactDate"
            />
          </div>

          <div className="c-modes" data-testid="compose-mode">
            {(['quick', 'detailed'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className="c-mode"
                aria-pressed={payload.mode === mode}
                onClick={() => dispatch({ type: 'mode', mode })}
              >
                <b>{t(`compose.mode.${mode}`)}</b>
                <span>{t(`compose.mode.${mode}Hint`)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
