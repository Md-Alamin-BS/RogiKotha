import type {
  ExperiencePageVM,
  PageBylineVM,
  PreviewVM,
  ReviewSectionKey,
} from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatMonthYear } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';

import { Byline } from './Byline';
import { Flags } from './Flags';
import { bylineIdentity, paragraphs } from './people';
import { ReviewerLabels } from './ReviewerLabels';

/** The page title's id: the published note moves focus here (BR8.7). */
export const EXPERIENCE_TITLE_ID = 'experience-title';

export type ExperienceBodyVM = ExperiencePageVM | PreviewVM;
export type ExperienceBodyMode = 'page' | 'preview';

const SECTION_LABEL: Record<ReviewSectionKey, string> = {
  symptoms: 'compose.symptoms',
  diagnosis: 'compose.diagnosis',
  treatment: 'compose.treatment',
  after: 'compose.after',
};

/** `lang` for the author's text when it is in the other language; a mixed text keeps the page's. */
function foreignLang(vm: ExperienceBodyVM, locale: Locale): string | undefined {
  return vm.contentLanguage !== 'mixed' && vm.contentLanguage !== locale
    ? vm.contentLanguage
    : undefined;
}

function bylineProps(byline: PageBylineVM, mode: ExperienceBodyMode) {
  if (byline.personaKind === 'named') {
    return { name: byline.displayName ?? null, identity: bylineIdentity('named') };
  }
  if (byline.personaKind === 'pseudonymous') {
    return {
      name: byline.username ?? null,
      identity: bylineIdentity('pseudonymous'),
      username: byline.username,
    };
  }
  // Never a name, a link or initials for an anonymous author; the alias only on the page (BR5.7).
  return {
    name: null,
    identity: bylineIdentity('anonymous'),
    alias: mode === 'page' ? (byline.alias ?? null) : null,
  };
}

/** Kicker, title, byline, flags and Reviewer's labels (concept-04b renderAccount, `.a-head`). */
export function ExperienceHead({ vm, mode }: { vm: ExperienceBodyVM; mode: ExperienceBodyMode }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const lang = foreignLang(vm, locale);
  const publishedAt = 'publishedAt' in vm ? vm.publishedAt : undefined;
  const published = publishedAt
    ? {
        iso: publishedAt,
        label: formatMonthYear(
          { year: Number(publishedAt.slice(0, 4)), month: Number(publishedAt.slice(5, 7)) },
          locale,
        ),
      }
    : undefined;

  return (
    <section className="a-head" data-testid={`experience-head-${mode}`}>
      <span className="kicker">{t('experience.episode')}</span>
      {mode === 'page' ? (
        <h1 className="a-title display" id={EXPERIENCE_TITLE_ID} tabIndex={-1} lang={lang}>
          {vm.title}
        </h1>
      ) : (
        <h2 className="a-title display" lang={lang}>
          {vm.title}
        </h2>
      )}
      <Byline
        variant="lead"
        {...bylineProps(vm.byline, mode)}
        relationship={vm.relationship}
        when={published?.label}
        whenDateTime={published?.iso.slice(0, 7)}
      />
      <Flags sentiment={vm.sentiment} outcome={vm.outcome} period={vm.period} />
      <ReviewerLabels claims={vm.claims} />
    </section>
  );
}

/** The quick story as paragraphs, or the detailed sections in their fixed order (BR5.4). */
export function ExperienceStory({ vm, mode }: { vm: ExperienceBodyVM; mode: ExperienceBodyMode }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const lang = foreignLang(vm, locale);

  if (vm.reviewKind === 'detailed' && vm.sections.length > 0) {
    const Heading = mode === 'page' ? 'h2' : 'h3';
    return (
      <ol className="chapters" data-testid="experience-sections">
        {vm.sections.map((section) => (
          <li key={section.key}>
            <Heading className="k">{t(SECTION_LABEL[section.key])}</Heading>
            {paragraphs(section.body).map((text, index) => (
              <p key={index} lang={lang}>
                {text}
              </p>
            ))}
          </li>
        ))}
      </ol>
    );
  }

  const story = paragraphs(vm.story ?? null);
  if (story.length === 0) return <p className="story">{t('label.notProvided')}</p>;
  return (
    <div data-testid="experience-story">
      {story.map((text, index) => (
        <p key={index} className={index === 0 ? 'story story-lead' : 'story'} lang={lang}>
          {text}
        </p>
      ))}
    </div>
  );
}

// The shared body of the experience page and the composer's preview (frontend-components § 5),
// so the author sees what readers will see.
export function ExperienceBody({ vm, mode }: { vm: ExperienceBodyVM; mode: ExperienceBodyMode }) {
  return (
    <>
      <ExperienceHead vm={vm} mode={mode} />
      <ExperienceStory vm={vm} mode={mode} />
    </>
  );
}
