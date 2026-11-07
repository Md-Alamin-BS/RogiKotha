'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  OUTCOMES,
  REVIEWER_LABEL_CODES,
  REVIEW_SECTION_KEYS,
  SENTIMENTS,
  type EditReviewVM,
} from '@rogikotha/contracts';
import { Link } from '@/i18n/routing';
import {
  correctReviewAction,
  type CorrectFormState,
  type CorrectValues,
} from '@/server/actions/review-edit';
import { FormErrorSummary } from './FormErrorSummary';
import { OptionGroup } from './OptionGroup';
import { TextField } from './TextField';

export interface EditFormProps {
  vm: EditReviewVM;
}

const INITIAL_STATE: CorrectFormState = {
  attempt: 0,
  values: null,
  fieldErrors: {},
  formError: null,
};
const TONE: Record<string, string> = { positive: 'pos', mixed: 'mix', negative: 'neg' };
const CODES: readonly string[] = REVIEWER_LABEL_CODES;

function valuesOfVm(vm: EditReviewVM): CorrectValues {
  return {
    title: vm.title,
    story: vm.story ?? '',
    symptoms: vm.sections?.symptoms ?? '',
    diagnosis: vm.sections?.diagnosis ?? '',
    treatment: vm.sections?.treatment ?? '',
    after: vm.sections?.after ?? '',
    sentiment: vm.sentiment ?? '',
    outcome: vm.outcome ?? '',
    claims: vm.claims,
  };
}

// The author's correction form (FR4.2): the title, story or sections, sentiment, outcome and
// reviewer labels of their own experience, in the composer's markup. A material change becomes a
// dated correction; the page sends `expectedVersion` so a stale tab is refused, not overwritten.
export function EditForm({ vm }: EditFormProps) {
  const [state, formAction, pending] = useActionState(correctReviewAction, INITIAL_STATE);
  const t = useTranslations();
  return (
    <form action={formAction} noValidate data-testid="edit-form">
      <input type="hidden" name="publicId" value={vm.publicId} />
      <input type="hidden" name="expectedVersion" value={vm.version} />
      <input type="hidden" name="kind" value={vm.kind} />
      <FormErrorSummary attempt={state.attempt} error={state.formError} />
      {state.conflict ? (
        <p className="note">
          <Link href={`/experiences/${vm.publicId}/edit`} data-testid="edit-reload">
            {t('compose.edit.reload')}
          </Link>
        </p>
      ) : null}
      <EditFields
        key={state.attempt}
        vm={vm}
        initial={state.values ?? valuesOfVm(vm)}
        errors={state.fieldErrors}
        pending={pending}
      />
    </form>
  );
}

function EditFields({
  vm,
  initial,
  errors,
  pending,
}: {
  vm: EditReviewVM;
  initial: CorrectValues;
  errors: CorrectFormState['fieldErrors'];
  pending: boolean;
}) {
  const t = useTranslations();
  const [sentiment, setSentiment] = useState(initial.sentiment);
  const [outcome, setOutcome] = useState(initial.outcome);
  // A label the author stored as text (a seeded one) stays a removable box, sent as received.
  const storedLabels = vm.claims.filter((claim) => !CODES.includes(claim));
  return (
    <section className="panel">
      <div className="field">
        <span className="lbl">{t('compose.doctor')}</span>
        <p className="denominator" data-testid="edit-doctor">
          {vm.doctorName ?? t('label.notProvided')}
        </p>
      </div>
      <TextField
        name="title"
        label={t('compose.titleLabel')}
        optional
        defaultValue={initial.title}
        error={errors.title}
      />
      {vm.kind === 'detailed' ? (
        <fieldset className="field" data-testid="compose-sections">
          <legend className="lbl">{t('compose.story')}</legend>
          <p className="sub">{t('compose.storyHint')}</p>
          {REVIEW_SECTION_KEYS.map((key) => (
            <TextField
              key={key}
              name={key}
              label={t(`compose.${key}`)}
              multiline
              optional
              defaultValue={initial[key]}
              error={errors[key]}
            />
          ))}
          {errors.story ? <p className="field-error">{t(errors.story)}</p> : null}
        </fieldset>
      ) : (
        <TextField
          name="story"
          label={t('compose.story')}
          hint={t('compose.storyHint')}
          multiline
          defaultValue={initial.story}
          error={errors.story}
        />
      )}
      <OptionGroup
        name="sentiment"
        label={`${t('compose.sentiment')} — ${t('compose.optional')}`}
        clearable
        options={SENTIMENTS.map((s) => ({ value: s, label: t(`sentiment.${s}`), tone: TONE[s] }))}
        value={sentiment}
        onChange={setSentiment}
        error={errors.sentiment}
      />
      <OptionGroup
        name="outcome"
        label={`${t('compose.outcome')} — ${t('compose.optional')}`}
        clearable
        options={OUTCOMES.map((o) => ({ value: o, label: t(`outcome.${o}`) }))}
        value={outcome}
        onChange={setOutcome}
        error={errors.outcome}
      />
      <fieldset className="field" data-testid="edit-claims">
        <legend className="lbl">
          {t('compose.claims')}
          <span className="req optional">{t('compose.optional')}</span>
        </legend>
        <p className="sub">{t('compose.claimsNote')}</p>
        {[...REVIEWER_LABEL_CODES, ...storedLabels].map((claim) => (
          <label key={claim} className="check">
            <input
              type="checkbox"
              name="claims"
              value={claim}
              defaultChecked={initial.claims.includes(claim)}
            />
            {CODES.includes(claim) ? t(`claim.${claim}`) : claim}
          </label>
        ))}
        {errors.claims ? <p className="field-error">{t(errors.claims)}</p> : null}
      </fieldset>
      <p className="note">{t('compose.edit.versionNote')}</p>
      <p className="note">{t('compose.edit.correctionNote')}</p>
      <div className="btn-row">
        <button
          className="btn"
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          data-testid="edit-save"
        >
          {t('compose.edit.save')}
        </button>
        <Link
          className="btn ghost small"
          href={`/experiences/${vm.publicId}`}
          data-testid="edit-cancel"
        >
          {t('experience.cancelEdit')}
        </Link>
      </div>
    </section>
  );
}
