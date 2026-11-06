'use client';

import { useTranslations } from 'next-intl';
import { changePasswordForm } from '@/server/actions/auth';
import { ErrorSummary, PasswordField, useAuthMessage } from './AuthFields';
import { PublishTick } from '../motion/PublishTick';
import { useAuthForm } from './use-auth-form';

const FORM = 'change-password';

/**
 * WF7 step 3, BR6.5: the current and the new password. Both fields come back empty after a
 * refusal; on `ok` the confirmation replaces the form with its one PublishTick.
 */
export function ChangePasswordForm() {
  const t = useTranslations();
  const render = useAuthMessage();
  const { state, formAction, pending, onSubmit, summaryRef } = useAuthForm(changePasswordForm);
  const errors = state.fieldErrors;

  if (state.status === 'done' && state.notice) {
    return (
      <p className="callout" data-testid="change-password-notice">
        <PublishTick>{render(state.notice)}</PublishTick>
      </p>
    );
  }
  return (
    <>
      <ErrorSummary
        form={FORM}
        fieldErrors={errors}
        formError={state.formError}
        summaryRef={summaryRef}
      />
      <form
        id="change-password-form"
        noValidate
        action={formAction}
        onSubmit={onSubmit}
        aria-busy={pending}
      >
        <PasswordField
          form={FORM}
          name="currentPassword"
          labelKey="auth.security.currentPassword"
          autoComplete="current-password"
          error={errors.currentPassword}
        />
        <PasswordField
          form={FORM}
          name="newPassword"
          labelKey="auth.reset.newPassword"
          hintKey="auth.passwordHint"
          autoComplete="new-password"
          error={errors.newPassword}
        />
        <button
          className="btn ghost"
          type="submit"
          disabled={pending}
          data-testid="change-password-form-submit-button"
        >
          {t('auth.security.changePassword')}
        </button>
      </form>
    </>
  );
}
