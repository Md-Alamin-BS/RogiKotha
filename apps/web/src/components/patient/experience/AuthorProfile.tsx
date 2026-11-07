import type { ExperienceCardVM } from '@rogikotha/contracts';
import { useTranslations } from 'next-intl';

import { Reveal } from '@/components/patient/motion/Reveal';
import { AccountRow } from '@/components/patient/shared/AccountRow';
import { Pager } from './Pager';

// The author page (WF8, BR7.2): `@username`, the display name when one is known, and the public
// experiences. An unknown username and one with no public experience look the same.
export function AuthorProfile({
  header,
  cards,
  nextCursor,
  isLaterPage = false,
}: {
  header: { username: string; displayName?: string | undefined };
  cards: readonly ExperienceCardVM[];
  nextCursor?: string | undefined;
  isLaterPage?: boolean;
}) {
  const t = useTranslations();
  return (
    <>
      <section className="a-head">
        <h1 className="a-title display" data-testid="author-username">{`@${header.username}`}</h1>
        {header.displayName ? (
          <p className="lede" data-testid="author-display-name">
            {header.displayName}
          </p>
        ) : null}
      </section>
      {cards.length > 0 ? (
        <>
          <Reveal as="div" className="index-list">
            {cards.map((card) => (
              <AccountRow key={card.publicId} card={card} headingLevel={2} />
            ))}
          </Reveal>
          <Pager
            nextCursor={nextCursor}
            isLaterPage={isLaterPage}
            basePath={`/authors/${header.username}`}
          />
        </>
      ) : (
        <p className="note" data-testid="author-empty">
          {t('profile.noContributions')}
        </p>
      )}
    </>
  );
}
