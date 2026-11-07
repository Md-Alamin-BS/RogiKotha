import type { ExperienceCardVM } from '@rogikotha/contracts';
import { useTranslations } from 'next-intl';

import { Reveal } from '@/components/patient/motion/Reveal';
import { AccountRow } from '@/components/patient/shared/AccountRow';

// A related list under the experience (concept-04b renderAccount, `.related-grid`): U46's account
// rows at heading level 3. The condition list is always headed, with an empty note; the
// same-doctor list appears only when it has rows (BR5.8).
export function RelatedGrid({
  title,
  cards,
  note,
  alwaysShow,
  testId,
}: {
  title: string;
  cards: readonly ExperienceCardVM[];
  note?: string | undefined;
  alwaysShow: boolean;
  testId?: string | undefined;
}) {
  const t = useTranslations();
  if (!alwaysShow && cards.length === 0) return null;
  return (
    <section data-testid={testId}>
      <h2 className="section-head">{title}</h2>
      {note ? <p className="note related-note">{note}</p> : null}
      {cards.length > 0 ? (
        <Reveal as="div" className="related-grid">
          {cards.map((card) => (
            <AccountRow key={card.publicId} card={card} headingLevel={3} />
          ))}
        </Reveal>
      ) : (
        <p className="note">{t('mine.empty')}</p>
      )}
    </section>
  );
}
