import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { OwnAccountVM, SessionVM } from '@rogikotha/contracts';
import { formatDate, formatNumber } from '@rogikotha/i18n/format';
import {
  changePasswordForm,
  confirmEmail,
  requestReset,
  resendLink,
  resendOwnLink,
  setNewPassword,
  signOutEverywhereForm,
} from '@/server/actions/auth';
import { dhakaIsoDate } from '../profile/dates';
import { AuthNotice } from './AuthNotice';
import { ChangePasswordForm } from './ChangePasswordForm';
import { ConfirmEmailForm } from './ConfirmEmailForm';
import { JoinSteps } from './JoinSteps';
import { PendingPanel } from './PendingPanel';
import { ResendLinkForm } from './ResendLinkForm';
import { ResendOwnButton } from './ResendOwnButton';
import { ResetRequestForm } from './ResetRequestForm';
import { SecuritySettings } from './SecuritySettings';
import { SessionList } from './SessionList';
import { SetPasswordForm } from './SetPasswordForm';
import { SignOutEverywhere } from './SignOutEverywhere';
import { VerifyDone } from './VerifyDone';
import { LOCALES, loadMessages, translatorFor, type TestLocale } from './auth-test-support';

vi.mock('@/server/actions/auth', () => ({
  changePasswordForm: vi.fn(),
  confirmEmail: vi.fn(),
  requestReset: vi.fn(),
  resendLink: vi.fn(),
  resendOwnLink: vi.fn(),
  setNewPassword: vi.fn(),
  signOutEverywhereForm: vi.fn(),
}));

// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname: string; query?: Record<string, string> };
    children?: ReactNode;
    [key: string]: unknown;
  }) => {
    const target =
      typeof href === 'string' ? href : `${href.pathname}?${new URLSearchParams(href.query)}`;
    return (
      <a href={target} {...rest}>
        {children}
      </a>
    );
  },
}));

function renderIn(locale: TestLocale, ui: ReactNode) {
  render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {ui}
    </NextIntlClientProvider>,
  );
  return translatorFor(locale);
}

const SYNTHETIC_EMAIL = 'reader@example.test';

function buildSession(overrides: Partial<SessionVM> = {}): SessionVM {
  return {
    id: 'session-synthetic-1',
    current: false,
    browser: 'Firefox',
    os: 'Linux',
    firstSeen: '2026-10-01T04:00:00.000Z',
    lastSeen: '2026-11-05T10:00:00.000Z',
    ...overrides,
  };
}

function buildOwnAccount(overrides: Partial<OwnAccountVM> = {}): OwnAccountVM {
  return {
    username: 'synthetic-reader',
    displayName: 'Synthetic Reader',
    emailVerified: true,
    emailMasked: 'r****@example.test',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});

describe.each(LOCALES)('the joining steps in %s', (locale) => {
  it('mark only the current step and read its position in the active numerals', () => {
    const t = renderIn(locale, <JoinSteps current={2} />);

    const list = screen.getByRole('list', { name: t('auth.steps.label') });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[2]).not.toHaveAttribute('aria-current');
    expect(items[1]).toHaveTextContent(t('auth.steps.confirm'));
    expect(items[1]).toHaveTextContent(
      t('auth.steps.position', { step: formatNumber(2, locale), total: formatNumber(3, locale) }),
    );
  });
});

describe.each(LOCALES)('the pending panel in %s', (locale) => {
  it('signed out, names the address, offers the resend form and links to sign in with next', () => {
    const t = renderIn(
      locale,
      <PendingPanel
        address={SYNTHETIC_EMAIL}
        signedIn={false}
        expired={false}
        next={`/${locale}/write`}
      />,
    );

    expect(screen.getByText(t('auth.verify.body', { email: SYNTHETIC_EMAIL }))).toBeVisible();
    expect(screen.getByLabelText(new RegExp(t('auth.email')))).toHaveValue(SYNTHETIC_EMAIL);
    expect(screen.getByTestId('verify-sign-in-link')).toHaveAttribute(
      'href',
      `/sign-in?next=%2F${locale}%2Fwrite`,
    );
    expect(screen.queryByTestId('verify-expired')).toBeNull();
    expect(screen.queryByTestId('verify-dev-inbox-link')).toBeNull();
  });

  it('signed in, shows one resend button, no address field and no sign-in link', () => {
    const t = renderIn(
      locale,
      <PendingPanel address={null} signedIn expired={false} next={null} />,
    );

    expect(screen.getByText(t('auth.verify.bodyNoEmail'))).toBeVisible();
    expect(screen.getByTestId('resend-own-submit-button')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByTestId('verify-sign-in-link')).toBeNull();
  });

  it('as the expired panel, says so first and links to the local inbox when given one', () => {
    const t = renderIn(
      locale,
      <PendingPanel
        address={null}
        signedIn={false}
        expired
        next={null}
        devInboxUrl="http://localhost:8025"
      />,
    );

    expect(screen.getByTestId('verify-pending-panel')).toHaveAttribute('data-expired', 'true');
    expect(screen.getByTestId('verify-expired')).toHaveTextContent(t('auth.verify.expired'));
    expect(screen.getByTestId('verify-sign-in-link')).toHaveAttribute('href', '/sign-in');
    expect(screen.getByRole('link', { name: t('auth.verify.devInbox') })).toHaveAttribute(
      'href',
      'http://localhost:8025',
    );
  });
});

describe.each(LOCALES)('the resend forms in %s', (locale) => {
  it('the signed-out form replaces itself with the neutral notice', async () => {
    vi.mocked(resendLink).mockResolvedValue({
      status: 'done',
      formError: null,
      fieldErrors: {},
      notice: { key: 'auth.verify.resent' },
    });
    const user = userEvent.setup();
    const t = renderIn(locale, <ResendLinkForm defaultEmail="" />);

    await user.type(screen.getByLabelText(new RegExp(t('auth.email'))), SYNTHETIC_EMAIL);
    await user.click(screen.getByRole('button', { name: t('auth.verify.resend') }));

    expect(await screen.findByTestId('resend-notice')).toHaveTextContent(t('auth.verify.resent'));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('the signed-out form shows a refused address next to the field', async () => {
    vi.mocked(resendLink).mockResolvedValue({
      status: 'refused',
      formError: null,
      fieldErrors: { email: { key: 'formErrors.auth.emailInvalid' } },
    });
    const user = userEvent.setup();
    const t = renderIn(locale, <ResendLinkForm defaultEmail="" />);

    await user.click(screen.getByRole('button', { name: t('auth.verify.resend') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(t('formErrors.auth.emailInvalid'));
    expect(screen.getByLabelText(new RegExp(t('auth.email')))).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('the signed-in button replaces itself with the notice', async () => {
    vi.mocked(resendOwnLink).mockResolvedValue({
      status: 'done',
      formError: null,
      fieldErrors: {},
      notice: { key: 'auth.verify.resent' },
    });
    const user = userEvent.setup();
    const t = renderIn(locale, <ResendOwnButton />);

    await user.click(screen.getByRole('button', { name: t('auth.verify.resend') }));

    expect(await screen.findByTestId('resend-own-notice')).toHaveTextContent(
      t('auth.verify.resent'),
    );
  });

  it('the signed-in button formats a rate-limit wait in the active numerals', async () => {
    vi.mocked(resendOwnLink).mockResolvedValue({
      status: 'refused',
      formError: { key: 'formErrors.auth.rateLimitedSeconds', params: { count: 30, seconds: 30 } },
      fieldErrors: {},
    });
    const user = userEvent.setup();
    const t = renderIn(locale, <ResendOwnButton />);

    await user.click(screen.getByRole('button', { name: t('auth.verify.resend') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(formatNumber(30, locale));
  });
});

describe.each(LOCALES)('the confirm form in %s', (locale) => {
  it('renders only the button, carries the token and drops it from the address bar', () => {
    window.history.replaceState(null, '', `/${locale}/verify-email?token=synthetic-token&next=x`);
    const t = renderIn(
      locale,
      <ConfirmEmailForm token="synthetic-token" expiredPanel={<p>expired-slot</p>} />,
    );

    expect(screen.getByText(t('auth.verify.confirmLede'))).toBeVisible();
    expect(screen.getByRole('button', { name: t('auth.verify.confirm') })).toBeInTheDocument();
    expect(document.querySelector<HTMLInputElement>('input[name="token"]')?.value).toBe(
      'synthetic-token',
    );
    expect(window.location.search).toBe('?next=x');
    expect(confirmEmail).not.toHaveBeenCalled();
  });

  it('swaps in the expired panel when the link was used or has expired', async () => {
    vi.mocked(confirmEmail).mockResolvedValue({
      status: 'refused',
      formError: null,
      fieldErrors: {},
      expired: true,
    });
    const user = userEvent.setup();
    const t = renderIn(
      locale,
      <ConfirmEmailForm
        token="synthetic-token"
        expiredPanel={<PendingPanel address={null} signedIn={false} expired next={null} />}
      />,
    );

    await user.click(screen.getByRole('button', { name: t('auth.verify.confirm') }));

    expect(await screen.findByTestId('verify-expired')).toHaveTextContent(t('auth.verify.expired'));
    expect(screen.queryByRole('button', { name: t('auth.verify.confirm') })).toBeNull();
  });
});

describe.each(LOCALES)('the done panel in %s', (locale) => {
  it('confirms, continues to a safe next and links to writing and the workspace', () => {
    const t = renderIn(locale, <VerifyDone next={`/${locale}/doctors/doc0000001`} />);

    expect(screen.getByText(t('auth.verify.done'))).toBeVisible();
    expect(screen.getByRole('link', { name: t('auth.verify.continue') })).toHaveAttribute(
      'href',
      `/${locale}/doctors/doc0000001`,
    );
    expect(screen.getByRole('link', { name: t('auth.verify.startWriting') })).toHaveAttribute(
      'href',
      '/write',
    );
    expect(screen.getByRole('link', { name: t('nav.mine') })).toHaveAttribute('href', '/me');
  });

  it('offers no continue link without a next', () => {
    const t = renderIn(locale, <VerifyDone next={null} />);
    expect(screen.queryByRole('link', { name: t('auth.verify.continue') })).toBeNull();
  });
});

describe.each(LOCALES)('the password reset forms in %s', (locale) => {
  it('the request form replaces itself with the same sent notice', async () => {
    vi.mocked(requestReset).mockResolvedValue({
      status: 'done',
      formError: null,
      fieldErrors: {},
      notice: { key: 'auth.reset.sent' },
    });
    const user = userEvent.setup();
    const t = renderIn(locale, <ResetRequestForm />);

    await user.type(screen.getByLabelText(new RegExp(t('auth.email'))), SYNTHETIC_EMAIL);
    await user.click(screen.getByRole('button', { name: t('auth.reset.submit') }));

    expect(await screen.findByTestId('reset-request-notice')).toHaveTextContent(
      t('auth.reset.sent'),
    );
  });

  it('the new-password form carries the token and both password fields', () => {
    const t = renderIn(locale, <SetPasswordForm token="synthetic-reset-token" />);

    expect(document.querySelector<HTMLInputElement>('input[name="token"]')?.value).toBe(
      'synthetic-reset-token',
    );
    // In Bengali the confirm label starts with the new-password label, so each is found by name.
    const fresh = document.querySelector<HTMLInputElement>('input[name="newPassword"]');
    const again = document.querySelector<HTMLInputElement>('input[name="confirmPassword"]');
    expect(fresh).toHaveAttribute('type', 'password');
    expect(fresh).toHaveAccessibleName(new RegExp(t('auth.reset.newPassword')));
    expect(again).toHaveAttribute('autocomplete', 'new-password');
    expect(again).toHaveAccessibleName(new RegExp(t('auth.reset.confirmPassword')));
  });

  it('the new-password form shows a mismatch on the confirm field', async () => {
    vi.mocked(setNewPassword).mockResolvedValue({
      status: 'refused',
      formError: null,
      fieldErrors: { confirmPassword: { key: 'auth.reset.mismatch' } },
    });
    const user = userEvent.setup();
    const t = renderIn(locale, <SetPasswordForm token="synthetic-reset-token" />);

    await user.click(screen.getByRole('button', { name: t('auth.reset.setSubmit') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(t('auth.reset.mismatch'));
    expect(
      screen.getByLabelText(new RegExp(t('auth.reset.confirmPassword')), { selector: 'input' }),
    ).toHaveAttribute('aria-invalid', 'true');
  });

  it('a used or expired link removes the form and offers a new request', async () => {
    vi.mocked(setNewPassword).mockResolvedValue({
      status: 'refused',
      formError: { key: 'errors.auth.tokenExpired' },
      fieldErrors: {},
      expired: true,
    });
    const user = userEvent.setup();
    const t = renderIn(locale, <SetPasswordForm token="synthetic-reset-token" />);

    await user.click(screen.getByRole('button', { name: t('auth.reset.setSubmit') }));

    expect(await screen.findByRole('link', { name: t('auth.reset.requestAgain') })).toHaveAttribute(
      'href',
      '/reset-password',
    );
    expect(document.getElementById('set-password-form')).toBeNull();
  });
});

describe.each(LOCALES)('the security settings in %s', (locale) => {
  it('show the masked address only, the password form, the sessions and sign out everywhere', () => {
    const t = renderIn(
      locale,
      <SecuritySettings
        account={buildOwnAccount()}
        sessions={[buildSession({ current: true })]}
        locale={locale}
      />,
    );

    expect(screen.getByTestId('security-email')).toHaveTextContent('r****@example.test');
    expect(screen.getByTestId('security-email-status')).toHaveTextContent(
      t('auth.security.verified'),
    );
    expect(screen.queryByTestId('resend-own-submit-button')).toBeNull();
    expect(screen.getByText(t('auth.security.emailNote'))).toBeVisible();
    expect(
      screen.getByRole('button', { name: t('auth.security.changePassword') }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('session-list')).toBeInTheDocument();
    expect(screen.getByTestId('sign-out-all')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
  });

  it('offer the resend button while the address is unconfirmed', () => {
    const t = renderIn(
      locale,
      <SecuritySettings
        account={buildOwnAccount({ emailVerified: false })}
        sessions={[]}
        locale={locale}
      />,
    );

    expect(screen.getByTestId('security-email-status')).toHaveTextContent(
      t('auth.security.unverified'),
    );
    expect(screen.getByTestId('resend-own-submit-button')).toBeInTheDocument();
  });

  it('blank only the section whose query failed', () => {
    const t = renderIn(locale, <SecuritySettings account={null} sessions={null} locale={locale} />);

    const failed = screen.getAllByTestId('security-section-failed');
    expect(failed).toHaveLength(2);
    expect(failed[0]).toHaveTextContent(t('errors.common.internal'));
    expect(screen.queryByTestId('security-email')).toBeNull();
    expect(screen.queryByTestId('session-list')).toBeNull();
    expect(
      screen.getByRole('button', { name: t('auth.security.changePassword') }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('sign-out-all')).toBeInTheDocument();
  });
});

describe.each(LOCALES)('the session list in %s', (locale) => {
  it('shows device, first and last seen in the active language and marks this device', () => {
    const current = buildSession({ id: 's-1', current: true });
    const other = buildSession({ id: 's-2', browser: null, os: null });
    const t = renderIn(locale, <SessionList sessions={[current, other]} locale={locale} />);

    const rows = within(screen.getByTestId('session-list')).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveAttribute('data-current', 'true');
    expect(rows[1]).toHaveTextContent(
      t('auth.security.deviceLabel', { browser: 'Firefox', os: 'Linux' }),
    );
    expect(rows[1]).toHaveTextContent(t('auth.security.thisDevice'));
    expect(rows[1]).toHaveTextContent(
      formatDate(dhakaIsoDate(new Date(current.firstSeen)), locale),
    );
    expect(rows[1]).toHaveTextContent(formatDate(dhakaIsoDate(new Date(current.lastSeen)), locale));
    expect(rows[2]).toHaveTextContent(t('auth.security.deviceUnknown'));
    expect(rows[2]).not.toHaveTextContent(t('auth.security.thisDevice'));
  });
});

describe.each(LOCALES)('the change-password form in %s', (locale) => {
  it('after the redirect with changed, shows the confirmation in place of the form, announced once', () => {
    const live = document.createElement('div');
    live.id = 'sr-live';
    document.body.append(live);
    const t = renderIn(locale, <ChangePasswordForm changed />);

    expect(screen.getByTestId('change-password-notice')).toHaveTextContent(
      t('auth.security.passwordChanged'),
    );
    expect(screen.queryByRole('button', { name: t('auth.security.changePassword') })).toBeNull();
    expect(live).toHaveTextContent(t('auth.security.passwordChanged'));
    live.remove();
  });

  it('shows the form and no confirmation without changed', () => {
    const t = renderIn(locale, <ChangePasswordForm />);

    expect(screen.queryByTestId('change-password-notice')).toBeNull();
    expect(screen.getByRole('button', { name: t('auth.security.changePassword') })).toBeVisible();
  });

  it('shows a wrong current password next to its field', async () => {
    vi.mocked(changePasswordForm).mockResolvedValue({
      status: 'refused',
      formError: null,
      fieldErrors: { currentPassword: { key: 'errors.auth.invalidCredentials' } },
    });
    const user = userEvent.setup();
    const t = renderIn(locale, <ChangePasswordForm />);

    await user.click(screen.getByRole('button', { name: t('auth.security.changePassword') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.auth.invalidCredentials'));
    expect(
      screen.getByLabelText(new RegExp(t('auth.security.currentPassword')), { selector: 'input' }),
    ).toHaveAttribute('aria-invalid', 'true');
  });
});

describe.each(LOCALES)('sign out everywhere in %s', (locale) => {
  it('asks for an explicit confirmation behind a disclosure and no password', async () => {
    const user = userEvent.setup();
    const t = renderIn(locale, <SignOutEverywhere />);

    const disclosure = screen.getByTestId('sign-out-all');
    expect(disclosure.tagName).toBe('DETAILS');
    expect(disclosure).not.toHaveAttribute('open');
    await user.click(screen.getByText(t('auth.security.signOutAll')));
    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByText(t('auth.security.signOutAllNote'))).toBeVisible();
    expect(document.querySelector<HTMLInputElement>('input[name="confirm"]')?.value).toBe('yes');
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it('shows a refusal instead of losing it', async () => {
    vi.mocked(signOutEverywhereForm).mockResolvedValue({
      status: 'refused',
      formError: { key: 'errors.common.internal' },
      fieldErrors: {},
    });
    const user = userEvent.setup();
    const t = renderIn(locale, <SignOutEverywhere />);

    await user.click(screen.getByText(t('auth.security.signOutAll')));
    await user.click(screen.getByRole('button', { name: t('auth.security.signOutAllConfirm') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.common.internal'));
  });
});

describe.each(LOCALES)('the auth notice in %s', (locale) => {
  it('is plain text with no live region, and a done notice carries the tick', () => {
    const t = renderIn(
      locale,
      <>
        <AuthNotice messageKey="auth.security.signedOutAll" tone="info" />
        <AuthNotice messageKey="auth.reset.done" tone="done" />
      </>,
    );

    const [info, done] = screen.getAllByTestId('auth-notice');
    expect(info).toHaveTextContent(t('auth.security.signedOutAll'));
    expect(info).not.toHaveAttribute('role');
    expect(info).not.toHaveAttribute('aria-live');
    expect(info?.querySelector('.publish-tick')).toBeNull();
    expect(done).toHaveTextContent(t('auth.reset.done'));
    expect(done?.querySelector('.publish-tick')).not.toBeNull();
  });
});
