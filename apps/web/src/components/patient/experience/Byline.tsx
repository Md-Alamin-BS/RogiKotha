import type { Relationship } from '@rogikotha/contracts';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { initials, type BylineIdentity } from './people';

// Port of concept-04b's byline() (app.js) in its static form. The alias form (U47 BR5.7) adds the
// `/authors` link for a pseudonymous author and the thread alias of an anonymous one.
export function Byline({
  variant,
  name,
  identity,
  relationship,
  when,
  whenDateTime,
  username,
  alias,
}: {
  variant: 'lead' | 'row' | 'comment';
  /** Null for an anonymous author. */
  name: string | null;
  /** Omitted when the identity mode is not known, as for comments. */
  identity?: BylineIdentity | undefined;
  relationship?: Relationship | undefined;
  when?: string | undefined;
  whenDateTime?: string | undefined;
  /** Pseudonymous only: the name becomes `@username`, linking to the author page. */
  username?: string | undefined;
  /** Anonymous only: the thread alias, shown on the lead and comment bylines, never as a link. */
  alias?: string | null | undefined;
}) {
  const t = useTranslations();
  const anonymous = name === null || identity === 'anon';
  const ledeKey = variant === 'comment' ? 'byline.commentBy' : 'experience.writtenBy';
  const profileUsername = !anonymous && identity === 'pseudo' ? username : undefined;

  return (
    <p className={`byline byline--${variant}`}>
      <span className="byline-av" data-identity={anonymous ? 'anon' : identity} aria-hidden="true">
        {anonymous ? '—' : initials(name, identity)}
      </span>
      {anonymous ? (
        <>
          <span className="byline-name">{t('byline.anonSentence')}</span>
          {alias && variant !== 'row' ? (
            <span className="byline-alias" data-testid="byline-alias">
              {alias}
            </span>
          ) : null}
        </>
      ) : (
        <>
          <span className="byline-lede">{t(ledeKey)}</span>
          {profileUsername ? (
            <Link className="byline-name link-btn" href={`/authors/${profileUsername}`}>
              {`@${profileUsername}`}
            </Link>
          ) : (
            <span className="byline-name">{name}</span>
          )}
        </>
      )}
      {identity ? (
        <span className="byline-id" data-identity={identity}>
          {identity === 'anon' ? t('compose.identity.anon') : t(`byline.identity.${identity}`)}
        </span>
      ) : null}
      {relationship && variant !== 'comment' ? (
        <span className="byline-rel">{t(`rel.${relationship}`)}</span>
      ) : null}
      {when ? (
        <time className="byline-when" dateTime={whenDateTime}>
          {when}
        </time>
      ) : null}
    </p>
  );
}
