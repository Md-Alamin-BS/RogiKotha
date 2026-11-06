import { useTranslations } from 'next-intl';
import type { SessionVM } from '@rogikotha/contracts';
import { formatDate } from '@rogikotha/i18n/format';
import type { Locale } from '@rogikotha/i18n';
import { dhakaIsoDate } from '../profile/dates';

/**
 * BR6.3: each active session's device, first and last seen, and "This device". No IP and no login
 * history; dates follow the active language.
 */
export function SessionList({ sessions, locale }: { sessions: SessionVM[]; locale: Locale }) {
  const t = useTranslations();
  const day = (iso: string) => formatDate(dhakaIsoDate(new Date(iso)), locale);
  return (
    <table className="session-table" data-testid="session-list">
      <thead>
        <tr>
          <th scope="col">{t('auth.security.device')}</th>
          <th scope="col">{t('auth.security.firstSeen')}</th>
          <th scope="col">{t('auth.security.lastSeen')}</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((session) => (
          <tr key={session.id} data-current={session.current ? 'true' : 'false'}>
            <td>
              {session.browser && session.os
                ? t('auth.security.deviceLabel', { browser: session.browser, os: session.os })
                : t('auth.security.deviceUnknown')}
              {session.current ? (
                <span className="note"> · {t('auth.security.thisDevice')}</span>
              ) : null}
            </td>
            <td>{day(session.firstSeen)}</td>
            <td>{day(session.lastSeen)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
