'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@rogikotha/i18n';
import { Link } from '@/i18n/routing';
import { register } from '@/server/actions/auth';
import { DISPLAY_NAME_MAX } from '@/server/actions/auth-form';
import {
  AuthField,
  ErrorSummary,
  FieldError,
  PasswordField,
  errorAttributes,
  fieldId,
} from './AuthFields';
import { useAuthForm } from './use-auth-form';

const FORM = 'register';
const LOCALE_CHOICES: readonly Locale[] = ['en', 'bn'];

// Port of app.js's renderRegister() form (concept-04b, lines ~2115-2170).
export function RegisterForm({ next }: { next: string | null }) {
  const t = useTranslations();
  const activeLocale = useLocale() as Locale;
  const [locale, setLocale] = useState<Locale>(activeLocale);
  const [username, setUsername] = useState('');
  const { state, formAction, pending, onSubmit, summaryRef } = useAuthForm(register);
  const errors = state.fieldErrors;

  return (
    <>
      <ErrorSummary
        form={FORM}
        fieldErrors={errors}
        formError={state.formError}
        summaryRef={summaryRef}
      />
      <form
        id="register-form"
        noValidate
        action={formAction}
        onSubmit={onSubmit}
        aria-busy={pending}
      >
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <AuthField
          form={FORM}
          name="email"
          labelKey="auth.email"
          type="email"
          autoComplete="email"
          maxLength={254}
          error={errors.email}
        />
        <PasswordField
          form={FORM}
          name="password"
          labelKey="auth.password"
          hintKey="auth.passwordHint"
          autoComplete="new-password"
          error={errors.password}
        />
        <AuthField
          form={FORM}
          name="username"
          labelKey="auth.username"
          hintKey="auth.usernameHint"
          type="text"
          autoCapitalize="off"
          autoComplete="username"
          spellCheck={false}
          maxLength={24}
          error={errors.username}
          onChange={(event) => setUsername(event.currentTarget.value.trim().toLowerCase())}
        />
        <p className="sub" id="username-preview" style={{ marginTop: '-4px' }}>
          {username ? `@${username}` : ''}
        </p>
        <AuthField
          form={FORM}
          name="displayName"
          labelKey="auth.displayName"
          hintKey="auth.displayNameHint"
          type="text"
          autoComplete="nickname"
          maxLength={DISPLAY_NAME_MAX}
          error={errors.displayName}
        />
        <div className="field">
          <span className="lbl">{t('auth.language')}</span>
          <div className="opt-row" role="radiogroup" aria-label={t('auth.language')}>
            {LOCALE_CHOICES.map((choice) => (
              <button
                key={choice}
                className="opt"
                type="button"
                role="radio"
                // fix: U50 (ISS-760): a radio states its choice with aria-checked only.
                aria-checked={locale === choice}
                data-testid={`register-form-locale-${choice}`}
                onClick={() => setLocale(choice)}
              >
                {t(`user2.lang.${choice}`)}
              </button>
            ))}
          </div>
          <input type="hidden" name="locale" value={locale} />
        </div>
        <div className="field">
          <label className="check">
            <input
              type="checkbox"
              id={fieldId(FORM, 'age')}
              name="age"
              {...errorAttributes(FORM, 'age', errors.age)}
            />
            <span>{t('auth.ageLabel')}</span>
          </label>
          <FieldError form={FORM} name="age" error={errors.age} />
        </div>
        <div className="field">
          <label className="check">
            <input
              type="checkbox"
              id={fieldId(FORM, 'terms')}
              name="terms"
              {...errorAttributes(FORM, 'terms', errors.terms)}
            />
            <span>
              <TermsLabel />
            </span>
          </label>
          <FieldError form={FORM} name="terms" error={errors.terms} />
        </div>
        <button
          className="btn ghost"
          type="submit"
          disabled={pending}
          data-testid="register-form-submit-button"
        >
          {t('auth.register.submit')}
        </button>
      </form>
      <p className="sub" style={{ marginTop: '14px' }}>
        <Link
          className="link-btn"
          href={next ? { pathname: '/sign-in', query: { next } } : '/sign-in'}
        >
          {t('auth.haveAccount')}
        </Link>
      </p>
    </>
  );
}

const TERMS_PLACEHOLDERS = /(\{terms\}|\{privacy\})/;

/** `auth.termsLabel` with its two placeholders as links, in the order the language puts them. */
function TermsLabel() {
  const t = useTranslations();
  const template = String(t.raw('auth.termsLabel'));
  return (
    <>
      {template.split(TERMS_PLACEHOLDERS).map((part, index) => {
        if (part === '{terms}') {
          return (
            <Link key={index} href="/terms">
              {t('auth.termsLink')}
            </Link>
          );
        }
        if (part === '{privacy}') {
          return (
            <Link key={index} href="/privacy">
              {t('auth.privacyLink')}
            </Link>
          );
        }
        return part;
      })}
    </>
  );
}
