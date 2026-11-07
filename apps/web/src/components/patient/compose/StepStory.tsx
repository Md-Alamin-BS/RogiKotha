'use client';

import { useId, type Dispatch } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  DRAFT_TAG_MAX,
  REVIEW_SECTION_KEYS,
  TAG_GROUPS,
  type ComposerVM,
  type DraftPayload,
  type Locale,
} from '@rogikotha/contracts';
import { formatNumber } from '@rogikotha/i18n/format';

import { tagCount, type ComposerAction } from './composer-reducer';
import { draftTexts } from './safety';
import { SafetyChecks } from './SafetyChecks';
import { TagPicker } from './TagPicker';
import { TextField } from './TextField';

/** The shortest story the server accepts (REVIEW_STORY_MIN); a hint only, never a block here. */
const STORY_MIN = 20;

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const graphemeCount = (text: string) => Array.from(graphemes.segment(text.trim())).length;

// Step 2, "Your story" (frontend-components.md § 4): optional title, the story (one field, four
// sections, or the facility story), the tags and the automatic checks. Lengths are counted in
// graphemes, as the server counts them, so a Bengali story is not over-counted.
export function StepStory({
  payload,
  vm,
  duplicate,
  dispatch,
  errors = {},
}: {
  payload: DraftPayload;
  vm: Pick<ComposerVM, 'suggestedTags' | 'emergencyNumbers'>;
  duplicate: boolean;
  dispatch: Dispatch<ComposerAction>;
  /** Field -> message key from a refused publish: `story`, `tags`. */
  errors?: Record<string, string>;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const id = useId();
  const facility = payload.target === 'facility';
  const detailed = !facility && payload.mode === 'detailed';
  const story = payload.story ?? '';
  const storyLength = graphemeCount(story);
  const sectionsLength = REVIEW_SECTION_KEYS.reduce(
    (sum, key) => sum + graphemeCount(payload.sections?.[key] ?? ''),
    0,
  );
  const length = detailed ? sectionsLength : storyLength;
  const storyError = errors.story;
  const tagsError = errors.tags;
  const count = (n: number) => formatNumber(n, locale);
  const short = length < STORY_MIN;
  const counter = short ? (
    <p
      className="field-count"
      id={`${id}-story-count`}
      aria-live="polite"
      data-testid="compose-story-count"
    >
      {t('compose.bodyCount', { count: count(length), min: count(STORY_MIN) })}
    </p>
  ) : null;

  return (
    <div className="step-story" data-testid="compose-step-story">
      <TextField
        name="title"
        label={t('compose.titleLabel')}
        optional
        defaultValue={payload.title ?? ''}
        onChange={(title) => dispatch({ type: 'title', title })}
        error={errors.title}
      />

      {detailed ? (
        <fieldset className="field" data-testid="compose-sections">
          <legend className="lbl">
            {t('compose.story')}
            <span className="req">{t('compose.required')}</span>
          </legend>
          <p className="sub">{t('compose.storyHint')}</p>
          {REVIEW_SECTION_KEYS.map((key) => (
            <TextField
              key={key}
              name={key}
              label={t(`compose.${key}`)}
              multiline
              optional
              defaultValue={payload.sections?.[key] ?? ''}
              onChange={(text) => dispatch({ type: 'section', key, text })}
            />
          ))}
          {counter}
          {storyError ? (
            <p className="field-error" id={`${id}-story-error`}>
              {t(storyError)}
            </p>
          ) : null}
        </fieldset>
      ) : (
        <div className="field">
          <label htmlFor={`${id}-story`}>
            {t('compose.story')}
            <span className="req">{t('compose.required')}</span>
          </label>
          <p className="sub" id={`${id}-story-hint`}>
            {t(facility ? 'compose.facilityStoryHint' : 'compose.storyHint')}
          </p>
          <textarea
            id={`${id}-story`}
            value={story}
            onChange={(e) => dispatch({ type: 'story', story: e.target.value })}
            aria-invalid={storyError ? true : undefined}
            aria-describedby={[
              `${id}-story-hint`,
              short ? `${id}-story-count` : null,
              storyError ? `${id}-story-error` : null,
            ]
              .filter(Boolean)
              .join(' ')}
            data-testid="compose-story"
          />
          {counter}
          {storyError ? (
            <p className="field-error" id={`${id}-story-error`}>
              {t(storyError)}
            </p>
          ) : null}
        </div>
      )}

      {/* ASSUMPTION(U47): a facility account stores no tags, so the picker is for doctor accounts. */}
      {facility ? null : (
        <fieldset className="field" data-testid="compose-tags">
          <legend className="lbl">
            {t('compose.tags')}
            <span className="req">{t('compose.required')}</span>
          </legend>
          <p className="sub" data-testid="compose-tags-count">
            {t('compose.tagsMax', { count: count(tagCount(payload)), max: count(DRAFT_TAG_MAX) })}
          </p>
          {TAG_GROUPS.map((group) => (
            <TagPicker
              key={group}
              group={group}
              suggested={vm.suggestedTags[group]}
              payload={payload}
              dispatch={dispatch}
            />
          ))}
          {tagsError ? (
            <p className="field-error" id={`${id}-tags-error`}>
              {t(tagsError)}
            </p>
          ) : null}
        </fieldset>
      )}

      <SafetyChecks
        texts={draftTexts(payload)}
        numbers={vm.emergencyNumbers}
        duplicate={duplicate}
        dismissed={payload.dismissedChecks ?? []}
        onDismiss={(kind) => dispatch({ type: 'dismissCheck', kind })}
      />
    </div>
  );
}
