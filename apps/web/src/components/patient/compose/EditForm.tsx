'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { OUTCOMES, SENTIMENTS } from '@rogikotha/contracts';
import { Link } from '@/i18n/routing';
import { saveReviewEdit, type EditFormState, type EditValues } from '@/server/actions/review';
import { FormErrorSummary } from './FormErrorSummary';
import { OptionGroup } from './OptionGroup';
import { TextField } from './TextField';

export interface EditFormProps {
  publicId: string;
  doctorName: string | null;
  defaults: EditValues;
}

const INITIAL_STATE: EditFormState = { attempt: 0, values: null, fieldErrors: {}, formError: null };
const TONE: Record<string, string> = { positive: 'pos', mixed: 'mix', negative: 'neg' };

// The author's correction form (FR4.2): title, story, sentiment and outcome of their own quick
// experience, in the composer's markup. Each save becomes a new version.
export function EditForm(props: EditFormProps) {
  const [state, formAction, pending] = useActionState(saveReviewEdit, INITIAL_STATE);
  return (
    <form action={formAction} noValidate data-testid="edit-form">
      <input type="hidden" name="publicId" value={props.publicId} />
      <FormErrorSummary attempt={state.attempt} error={state.formError} />
      <EditFields
        key={state.attempt}
        {...props}
        initial={state.values ?? props.defaults}
        errors={state.fieldErrors}
        pending={pending}
      />
    </form>
  );
}

function EditFields({
  publicId,
  doctorName,
  initial,
  errors,
  pending,
}: EditFormProps & {
  initial: EditValues;
  errors: EditFormState['fieldErrors'];
  pending: boolean;
}) {
  const t = useTranslations();
  const [sentiment, setSentiment] = useState(initial.sentiment);
  const [outcome, setOutcome] = useState(initial.outcome);
  return (
    <section className="panel">
      <div className="field">
        <span className="lbl">{t('compose.doctor')}</span>
        <p className="denominator" data-testid="edit-doctor">
          {doctorName ?? t('label.notProvided')}
        </p>
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
        error={errors.body}
      />
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
      <p className="note">{t('compose.edit.versionNote')}</p>
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
          href={`/experiences/${publicId}`}
          data-testid="edit-cancel"
        >
          {t('experience.cancelEdit')}
        </Link>
      </div>
    </section>
  );
}
