'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAnnounce } from '@/lib/announce';
import { changePasswordForm } from '@/server/actions/auth';
import { ErrorSummary, PasswordField } from './AuthFields';
import { PublishTick } from '../motion/PublishTick';
import { useAuthForm } from './use-auth-form';

const FORM = 'change-password';

/**
 * WF7 step 3, BR6.5: the current and the new password. Both fields come back empty after a
 * refusal; after a change the action redirects with `?changed=1` (ISS-778), and `changed` shows
 * the confirmation in place of the form with its one PublishTick, announced once.
 */
export function ChangePasswordForm({ changed = false }: { changed?: boolean }) {
  const t = useTranslations();
  const announce = useAnnounce();
  const announced = useRef(false);
  const { state, formAction, pending, onSubmit, summaryRef } = useAuthForm(changePasswordForm);
  const errors = state.fieldErrors;
  const notice = t('auth.security.passwordChanged');

  useEffect(() => {
    if (!changed || announced.current) return;
    announced.current = true;
    announce(notice);
  }, [changed, announce, notice]);

  if (changed) {
    return (
      <p className="callout" data-testid="change-password-notice">
        <PublishTick>{notice}</PublishTick>
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
