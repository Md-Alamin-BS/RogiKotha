import { useTranslations } from 'next-intl';
import { PublishTick } from '../motion/PublishTick';

/**
 * One notice above an auth form. It is plain text with no live region (CR-004); a `done` notice
 * gets the one PublishTick beside it (BR9.2).
 */
export function AuthNotice({ messageKey, tone }: { messageKey: string; tone: 'info' | 'done' }) {
  const t = useTranslations();
  return (
    <p className="callout" data-testid="auth-notice" data-tone={tone}>
      {tone === 'done' ? <PublishTick>{t(messageKey)}</PublishTick> : t(messageKey)}
    </p>
  );
}
