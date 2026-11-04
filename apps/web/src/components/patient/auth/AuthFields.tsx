'use client';

import { useState, type InputHTMLAttributes, type Ref } from 'react';
import { useTranslations } from 'next-intl';

// Port of app.js's authField / authPasswordField / authErrorSummary (concept-04b, lines ~94-134).
// Field ids are namespaced `f-<form>-<name>` as in the prototype, so the summary links and the
// labels never collide between forms.

export function fieldId(form: string, name: string): string {
  return `f-${form}-${name}`;
}

function errorId(form: string, name: string): string {
  return `err-${form}-${name}`;
}

/** The `aria-*` pair that ties a control to its field error, or nothing when it has none. */
export function errorAttributes(form: string, name: string, error: string | undefined) {
  return error ? { 'aria-invalid': true, 'aria-describedby': errorId(form, name) } : {};
}

export function FieldError({
  form,
  name,
  error,
}: {
  form: string;
  name: string;
  error?: string | undefined;
}) {
  const t = useTranslations();
  if (!error) return null;
  return (
    <p className="field-error" id={errorId(form, name)}>
      {t(error)}
    </p>
  );
}

export function AuthField({
  form,
  name,
  labelKey,
  hintKey,
  error,
  ...input
}: {
  form: string;
  name: string;
  labelKey: string;
  hintKey?: string;
  error?: string | undefined;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'name' | 'form'>) {
  const t = useTranslations();
  const id = fieldId(form, name);
  return (
    <div className="field">
      <label htmlFor={id}>
        {t(labelKey)}
        <span className="req">{t('compose.required')}</span>
      </label>
      {hintKey ? <p className="sub">{t(hintKey)}</p> : null}
      <input id={id} name={name} {...input} {...errorAttributes(form, name, error)} />
      <FieldError form={form} name={name} error={error} />
    </div>
  );
}

/** A password input with the spec's Show/Hide toggle (auth-screens-spec §2). */
export function PasswordField({
  form,
  name,
  labelKey,
  hintKey,
  error,
  autoComplete,
}: {
  form: string;
  name: string;
  labelKey: string;
  hintKey?: string;
  error?: string | undefined;
  autoComplete: 'current-password' | 'new-password';
}) {
  const t = useTranslations();
  const [visible, setVisible] = useState(false);
  const id = fieldId(form, name);
  return (
    <div className="field">
      <label htmlFor={id}>
        {t(labelKey)}
        <span className="req">{t('compose.required')}</span>
      </label>
      {hintKey ? <p className="sub">{t(hintKey)}</p> : null}
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        {...errorAttributes(form, name, error)}
      />
      <p className="sub" style={{ marginTop: '6px' }}>
        <button
          className="link-btn"
          type="button"
          aria-pressed={visible}
          aria-controls={id}
          data-testid={`${form}-form-password-toggle`}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? t('auth.hidePassword') : t('auth.showPassword')}
        </button>
      </p>
      <FieldError form={form} name={name} error={error} />
    </div>
  );
}

/** The summary above a refused form: the form-level message, then one link per field error. */
export function ErrorSummary({
  form,
  fieldErrors,
  formError,
  summaryRef,
}: {
  form: string;
  fieldErrors: Partial<Record<string, string>>;
  formError: string | null;
  summaryRef: Ref<HTMLDivElement>;
}) {
  const t = useTranslations();
  const fields = Object.entries(fieldErrors).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  if (!formError && fields.length === 0) return null;
  return (
    <div
      className="callout warn"
      id={`auth-error-summary-${form}`}
      tabIndex={-1}
      ref={summaryRef}
      role="alert"
      data-testid={`${form}-form-error-summary`}
    >
      <b>{t('auth.errorSummary')}</b>
      <ul>
        {formError ? <li>{t(formError)}</li> : null}
        {fields.map(([name, key]) => (
          <li key={name}>
            <a href={`#${fieldId(form, name)}`}>{t(key)}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
