import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { PublishTick } from '../motion/PublishTick';

/**
 * WF3 step 4, BR3.2: the done panel, shown only to a verified actor. `next` has already passed
 * `safeAuthNext`, so it is a locale-prefixed path on this site and goes in a plain anchor.
 */
export function VerifyDone({ next }: { next: string | null }) {
  const t = useTranslations();
  return (
    <div data-testid="verify-done-panel">
      <p className="callout">
        <PublishTick>{t('auth.verify.done')}</PublishTick>
      </p>
      {next ? (
        <p className="sub" style={{ marginTop: '14px' }}>
          <a className="btn" href={next} data-testid="verify-continue-link">
            {t('auth.verify.continue')}
          </a>
        </p>
      ) : null}
      <p className="sub" style={{ marginTop: '14px' }}>
        <Link className="link-btn" href="/write" data-testid="verify-write-link">
          {t('auth.verify.startWriting')}
        </Link>
      </p>
      <p className="sub" style={{ marginTop: '6px' }}>
        <Link className="link-btn" href="/me" data-testid="verify-me-link">
          {t('nav.mine')}
        </Link>
      </p>
    </div>
  );
}
