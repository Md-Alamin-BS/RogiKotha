'use client';

import { useActionState, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { OUTCOMES, RELATIONSHIPS, SENTIMENTS } from '@rogikotha/contracts';
import { publishReview, type ComposeFormState, type ComposeValues } from '@/server/actions/review';
import { ComposePreview } from './ComposePreview';
import { FormErrorSummary } from './FormErrorSummary';
import { OptionGroup } from './OptionGroup';
import { TextField } from './TextField';
import type { PeriodOption } from './period';

export interface DoctorChoice {
  id: string;
  label: string;
}

export interface ComposeFormProps {
  doctors: DoctorChoice[];
  periods: PeriodOption[];
  defaults: ComposeValues;
  /** The byline under each identity choice: the display name, and the username alias. */
  names: { named: string; pseudonymous: string };
}

const INITIAL_STATE: ComposeFormState = {
  attempt: 0,
  values: null,
  fieldErrors: {},
  formError: null,
};
const TONE: Record<string, string> = { positive: 'pos', mixed: 'mix', negative: 'neg' };

// Port of concept-04b's renderCompose() quick mode (STORY-REV-001): doctor, relationship, period,
// title, story, optional sentiment and outcome, identity, the attestation tick and Publish.
export function ComposeForm(props: ComposeFormProps) {
  const [state, formAction, pending] = useActionState(publishReview, INITIAL_STATE);
  return (
    <form action={formAction} noValidate data-testid="compose-form">
      <FormErrorSummary attempt={state.attempt} error={state.formError} />
      {/* Remounts after a refused submission, so the fields start from what was sent. */}
      <ComposeFields
        key={state.attempt}
        {...props}
        initial={state.values ?? props.defaults}
        errors={state.fieldErrors}
        pending={pending}
      />
    </form>
  );
}

function ComposeFields({
  doctors,
  periods,
  names,
  initial,
  errors,
  pending,
}: ComposeFormProps & {
  initial: ComposeValues;
  errors: ComposeFormState['fieldErrors'];
  pending: boolean;
}) {
  const t = useTranslations();
  const id = useId();
  const [values, setValues] = useState(initial);
  const set = (field: keyof ComposeValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  const doctorName = doctors.find((d) => d.id === values.doctorId)?.label ?? null;
  const errorId = (field: string) => `${id}-${field}-error`;

  return (
    <div className="c-grid">
      <section className="panel">
        <div className="field">
          <label htmlFor={`${id}-doctor`}>
            {t('compose.doctor')}
            <span className="req">{t('compose.required')}</span>
          </label>
          <select
            id={`${id}-doctor`}
            name="doctorId"
            value={values.doctorId}
            onChange={(e) => set('doctorId')(e.target.value)}
            aria-invalid={errors.doctorId ? true : undefined}
            aria-describedby={errors.doctorId ? errorId('doctor') : undefined}
            data-testid="compose-doctor"
          >
            <option value="">{t('compose.chooseDoctor')}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          {errors.doctorId ? (
            <p className="field-error" id={errorId('doctor')}>
              {t(errors.doctorId)}
            </p>
          ) : null}
        </div>

        <OptionGroup
          name="relationship"
          label={t('compose.relationship')}
          required
          options={RELATIONSHIPS.map((r) => ({ value: r, label: t(`rel.${r}`) }))}
          value={values.relationship}
          onChange={set('relationship')}
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
            name="period"
            value={values.period}
            onChange={(e) => set('period')(e.target.value)}
            aria-invalid={errors.period ? true : undefined}
            aria-describedby={
              errors.period ? `${id}-period-hint ${errorId('period')}` : `${id}-period-hint`
            }
            data-testid="compose-period"
          >
            {periods.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {errors.period ? (
            <p className="field-error" id={errorId('period')}>
              {t(errors.period)}
            </p>
          ) : null}
        </div>

        <TextField
          name="title"
          label={t('compose.titleLabel')}
          defaultValue={initial.title}
          error={errors.title}
        />
        <TextField
          name="body"
          label={t('compose.story')}
          hint={t('compose.storyHint')}
          multiline
          defaultValue={initial.body}
          onChange={set('body')}
          error={errors.body}
        />

        <OptionGroup
          name="sentiment"
          label={`${t('compose.sentiment')} — ${t('compose.optional')}`}
          clearable
          options={SENTIMENTS.map((s) => ({ value: s, label: t(`sentiment.${s}`), tone: TONE[s] }))}
          value={values.sentiment}
          onChange={set('sentiment')}
          error={errors.sentiment}
        />
        <OptionGroup
          name="outcome"
          label={`${t('compose.outcome')} — ${t('compose.optional')}`}
          clearable
          options={OUTCOMES.map((o) => ({ value: o, label: t(`outcome.${o}`) }))}
          value={values.outcome}
          onChange={set('outcome')}
          error={errors.outcome}
        />

        <OptionGroup
          name="identity"
          label={t('compose.identity.label')}
          required
          options={[
            { value: 'named', label: t('compose.identity.real') },
            { value: 'pseudonymous', label: t('compose.identity.pseudo') },
          ]}
          value={values.identity}
          onChange={set('identity')}
          error={errors.identity}
        />

        <div className="field">
          <span className="lbl">{t('compose.confirmTitle')}</span>
          <div className="check-list">
            <label className="check">
              <input
                type="checkbox"
                name="attestation"
                aria-invalid={errors.attestation ? true : undefined}
                aria-describedby={errors.attestation ? errorId('attestation') : undefined}
                data-testid="compose-attestation"
              />
              <span>{t('compose.confirm1')}</span>
            </label>
          </div>
          {errors.attestation ? (
            <p className="field-error" id={errorId('attestation')}>
              {t(errors.attestation)}
            </p>
          ) : null}
          <div className="btn-row">
            <button
              className="btn"
              type="submit"
              disabled={pending}
              aria-busy={pending || undefined}
              data-testid="compose-publish"
            >
              {t('compose.publish')}
            </button>
          </div>
        </div>
      </section>

      <aside className="c-side">
        <ComposePreview
          authorName={values.identity === 'pseudonymous' ? names.pseudonymous : names.named}
          identity={values.identity}
          relationship={values.relationship}
          doctorName={doctorName}
          sentiment={values.sentiment}
          outcome={values.outcome}
          body={values.body}
        />
        <div className="callout warn">{t('disclaimer.long')}</div>
      </aside>
    </div>
  );
}
