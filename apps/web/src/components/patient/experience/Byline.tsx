import type { Relationship } from '@rogikotha/contracts';
import { useTranslations } from 'next-intl';

import { initials, type BylineIdentity } from './people';

// Port of concept-04b's byline() (app.js) in its static form: the slice has no person pages, so
// the name is a span rather than the prototype's person button.
export function Byline({
  variant,
  name,
  identity,
  relationship,
  when,
  whenDateTime,
}: {
  variant: 'lead' | 'row' | 'comment';
  /** Null for an anonymous author. */
  name: string | null;
  /** Omitted when the identity mode is not known, as for comments. */
  identity?: BylineIdentity | undefined;
  relationship?: Relationship | undefined;
  when?: string | undefined;
  whenDateTime?: string | undefined;
}) {
  const t = useTranslations();
  const anonymous = name === null || identity === 'anon';
  const ledeKey = variant === 'comment' ? 'byline.commentBy' : 'experience.writtenBy';

  return (
    <p className={`byline byline--${variant}`}>
      <span className="byline-av" data-identity={anonymous ? 'anon' : identity} aria-hidden="true">
        {anonymous ? '—' : initials(name, identity)}
      </span>
      {anonymous ? (
        <span className="byline-name">{t('byline.anonSentence')}</span>
      ) : (
        <>
          <span className="byline-lede">{t(ledeKey)}</span>
          <span className="byline-name">{name}</span>
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
