'use client';

import { useCallback, useEffect, useState, type InputHTMLAttributes, type Ref } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatNumber } from '@rogikotha/i18n/format';
import type { Locale } from '@rogikotha/i18n';
import { useAnnounce } from '@/lib/announce';
import type { AuthMessage } from '@/server/actions/auth-form';

// Port of app.js's authField / authPasswordField / authErrorSummary (concept-04b, lines ~94-134).
// Field ids are namespaced `f-<form>-<name>` as in the prototype, so the summary links and the
// labels never collide between forms.

export function fieldId(form: string, name: string): string {
  return `f-${form}-${name}`;
}

function errorId(form: string, name: string): string {
  return `err-${form}-${name}`;
}

/**
 * Renders an action's message. `count` stays the raw number, which picks the plural form; every
 * other number is formatted for the active locale, so Bengali gets Bengali digits (R-01).
 */
export function useAuthMessage(): (authMessage: AuthMessage) => string {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  return useCallback(
    ({ key, params }: AuthMessage) => {
      if (!params) return t(key);
      const values: Record<string, string | number> = {};
      for (const [name, value] of Object.entries(params)) {
        values[name] = name === 'count' ? value : formatNumber(value, locale);
      }
      return t(key, values);
    },
    [t, locale],
  );
}

/** The `aria-*` pair that ties a control to its field error, or nothing when it has none. */
export function errorAttributes(form: string, name: string, error: AuthMessage | undefined) {
  return error ? { 'aria-invalid': true, 'aria-describedby': errorId(form, name) } : {};
}

export function FieldError({
  form,
  name,
  error,
}: {
  form: string;
  name: string;
  error?: AuthMessage | undefined;
}) {
  const render = useAuthMessage();
  if (!error) return null;
  return (
    <p className="field-error" id={errorId(form, name)}>
      {render(error)}
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
  error?: AuthMessage | undefined;
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

/**
 * A password input with the spec's Show/Hide control (auth-screens-spec §2, Q8). The control
 * renders only after hydration, because without JavaScript it could do nothing; its text names
 * the action, so it carries no `aria-pressed`. The field goes back to hidden when its form submits.
 */
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
  error?: AuthMessage | undefined;
  autoComplete: 'current-password' | 'new-password';
}) {
  const t = useTranslations();
  const announce = useAnnounce();
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const id = fieldId(form, name);

  useEffect(() => {
    setHydrated(true);
    const owner = document.getElementById(id) as HTMLInputElement | null;
    const ownerForm = owner?.form;
    if (!ownerForm) return;
    const hide = () => setVisible(false);
    ownerForm.addEventListener('submit', hide);
    return () => ownerForm.removeEventListener('submit', hide);
  }, [id]);

  function toggle() {
    const next = !visible;
    setVisible(next);
    announce(t(next ? 'auth.passwordShown' : 'auth.passwordHidden'));
  }

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
      {hydrated ? (
        <p className="sub" style={{ marginTop: '6px' }}>
          <button
            className="link-btn"
            type="button"
            aria-label={t(visible ? 'auth.hidePasswordLabel' : 'auth.showPasswordLabel')}
            aria-controls={id}
            data-testid={`${form}-form-${name}-toggle`}
            onClick={toggle}
          >
            {visible ? t('auth.hidePassword') : t('auth.showPassword')}
          </button>
        </p>
      ) : null}
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
  fieldErrors: Partial<Record<string, AuthMessage>>;
  formError: AuthMessage | null;
  summaryRef: Ref<HTMLDivElement>;
}) {
  const t = useTranslations();
  const render = useAuthMessage();
  const fields = Object.entries(fieldErrors).filter(
    (entry): entry is [string, AuthMessage] => entry[1] !== undefined,
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
        {formError ? <li>{render(formError)}</li> : null}
        {fields.map(([name, error]) => (
          <li key={name}>
            <a href={`#${fieldId(form, name)}`}>{render(error)}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A notice that replaced a form (status `done`): plain text, announced once by the form. */
export function FormNotice({ notice, testId }: { notice: AuthMessage; testId: string }) {
  const render = useAuthMessage();
  return (
    <p className="callout" data-testid={testId}>
      {render(notice)}
    </p>
  );
}
