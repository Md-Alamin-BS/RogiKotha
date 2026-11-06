'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { signIn } from '@/server/actions/auth';
import { AuthField, ErrorSummary, PasswordField } from './AuthFields';
import { useAuthForm } from './use-auth-form';

const FORM = 'signin';

// Port of app.js's renderSignin() form (concept-04b, lines ~2173-2198), with its "Forgot your
// password?" link now that T-102 builds the reset screens.
export function SignInForm({ next }: { next: string | null }) {
  const t = useTranslations();
  const { state, formAction, pending, onSubmit, summaryRef } = useAuthForm(signIn);

  return (
    <>
      <ErrorSummary
        form={FORM}
        fieldErrors={state.fieldErrors}
        formError={state.formError}
        summaryRef={summaryRef}
      />
      <form id="signin-form" noValidate action={formAction} onSubmit={onSubmit} aria-busy={pending}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <AuthField
          form={FORM}
          name="email"
          labelKey="auth.email"
          type="email"
          autoComplete="email"
          maxLength={254}
        />
        <PasswordField
          form={FORM}
          name="password"
          labelKey="auth.password"
          autoComplete="current-password"
        />
        <button
          className="btn ghost"
          type="submit"
          disabled={pending}
          data-testid="signin-form-submit-button"
        >
          {t('auth.signIn.submit')}
        </button>
      </form>
      <p className="sub" style={{ marginTop: '14px' }}>
        <Link className="link-btn" href="/reset-password" data-testid="signin-form-forgot-link">
          {t('auth.forgot')}
        </Link>
      </p>
      <p className="sub" style={{ marginTop: '6px' }}>
        <Link
          className="link-btn"
          href={next ? { pathname: '/register', query: { next } } : '/register'}
        >
          {t('auth.noAccount')}
        </Link>
      </p>
    </>
  );
}
