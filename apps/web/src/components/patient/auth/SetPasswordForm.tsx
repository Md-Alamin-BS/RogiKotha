'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { setNewPassword } from '@/server/actions/auth';
import { ErrorSummary, PasswordField } from './AuthFields';
import { useAuthForm } from './use-auth-form';

const FORM = 'set-password';

/**
 * WF6, BR5.2, BR5.3: the new password from the emailed link. A mismatch is refused before any
 * command runs; a used or expired link changes nothing and offers a new request.
 */
export function SetPasswordForm({ token }: { token: string }) {
  const t = useTranslations();
  const { state, formAction, pending, onSubmit, summaryRef } = useAuthForm(setNewPassword);
  const errors = state.fieldErrors;

  return (
    <>
      <ErrorSummary
        form={FORM}
        fieldErrors={errors}
        formError={state.formError}
        summaryRef={summaryRef}
      />
      {state.expired ? (
        <p className="sub">
          <Link
            className="link-btn"
            href="/reset-password"
            data-testid="set-password-request-again-link"
          >
            {t('auth.reset.requestAgain')}
          </Link>
        </p>
      ) : (
        <form
          id="set-password-form"
          noValidate
          action={formAction}
          onSubmit={onSubmit}
          aria-busy={pending}
        >
          <input type="hidden" name="token" value={token} />
          <PasswordField
            form={FORM}
            name="newPassword"
            labelKey="auth.reset.newPassword"
            hintKey="auth.passwordHint"
            autoComplete="new-password"
            error={errors.newPassword}
          />
          <PasswordField
            form={FORM}
            name="confirmPassword"
            labelKey="auth.reset.confirmPassword"
            autoComplete="new-password"
            error={errors.confirmPassword}
          />
          <button
            className="btn ghost"
            type="submit"
            disabled={pending}
            data-testid="set-password-form-submit-button"
          >
            {t('auth.reset.setSubmit')}
          </button>
        </form>
      )}
    </>
  );
}
