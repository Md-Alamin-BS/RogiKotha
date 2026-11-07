'use client';

import { useId, useState, type Dispatch } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  DRAFT_TAG_MAX,
  type ComposerTagSuggestionVM,
  type DraftPayload,
  type Locale,
  type TagGroup,
} from '@rogikotha/contracts';
import { formatNumber } from '@rogikotha/i18n/format';

import { useAnnounce } from '@/lib/announce';
import { tagCount, type ComposerAction, type DraftTag } from './composer-reducer';

// One tag group of step 2 (BR3.3, AC5.3.2): suggested chips, a free-text box with Add (Enter adds
// too), typed chips marked as provisional, and, in the condition group, Not sure. The 20-tag
// counter and every add or remove are announced.
export function TagPicker({
  group,
  suggested,
  payload,
  dispatch,
}: {
  group: TagGroup;
  suggested: readonly ComposerTagSuggestionVM[];
  payload: DraftPayload;
  dispatch: Dispatch<ComposerAction>;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const announce = useAnnounce();
  const id = useId();
  const [text, setText] = useState('');
  const total = tagCount(payload);
  const full = total >= DRAFT_TAG_MAX;
  const chosen = payload.tags.filter((tag) => tag.group === group);
  const typed = chosen.filter((tag): tag is Extract<DraftTag, { text: string }> => 'text' in tag);

  const counter = () =>
    t('compose.tagsMax', {
      count: formatNumber(total, locale),
      max: formatNumber(DRAFT_TAG_MAX, locale),
    });

  const toggle = (tag: DraftTag, name: string, pressed: boolean) => {
    dispatch({ type: 'tag', tag });
    const next = total + (pressed ? -1 : 1);
    announce(
      `${name}: ${t('compose.tagsMax', {
        count: formatNumber(next, locale),
        max: formatNumber(DRAFT_TAG_MAX, locale),
      })}`,
    );
  };

  const add = () => {
    const value = text.trim();
    if (value === '') return;
    dispatch({ type: 'typedTag', group, text: value });
    setText('');
    announce(`${value}: ${counter()}`);
  };

  return (
    <div className="field" data-testid={`compose-tags-${group}`}>
      <span className="lbl" id={`${id}-label`}>
        {t(`compose.tagGroup.${group}`)}
      </span>
      <div className="opt-row" role="group" aria-labelledby={`${id}-label`}>
        {suggested.map((s) => {
          const pressed = chosen.some(
            (tag) => 'termPublicId' in tag && tag.termPublicId === s.termPublicId,
          );
          return (
            <button
              key={s.termPublicId}
              type="button"
              className="opt"
              aria-pressed={pressed}
              disabled={full && !pressed}
              onClick={() => toggle({ group, termPublicId: s.termPublicId }, s.name, pressed)}
            >
              {s.name}
            </button>
          );
        })}
        {typed.map((tag) => (
          <button
            key={tag.text}
            type="button"
            className="opt"
            aria-pressed="true"
            title={t('condition.provisional')}
            onClick={() => toggle(tag, tag.text, true)}
          >
            {tag.text}
          </button>
        ))}
        {group === 'condition' ? (
          <button
            type="button"
            className="opt"
            aria-pressed={payload.notSure}
            disabled={full && !payload.notSure}
            data-testid="compose-not-sure"
            onClick={() => {
              dispatch({ type: 'notSure' });
              announce(
                `${t('compose.notSure')}: ${t('compose.tagsMax', {
                  count: formatNumber(total + (payload.notSure ? -1 : 1), locale),
                  max: formatNumber(DRAFT_TAG_MAX, locale),
                })}`,
              );
            }}
          >
            {t('compose.notSure')}
          </button>
        ) : null}
      </div>
      <div className="tag-free">
        <label htmlFor={`${id}-free`} className="sub">
          {t('compose.tagFree')}
        </label>
        <input
          id={`${id}-free`}
          type="text"
          value={text}
          disabled={full}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            add();
          }}
          data-testid={`compose-tag-free-${group}`}
        />
        <button
          type="button"
          className="btn ghost small"
          disabled={full || text.trim() === ''}
          onClick={add}
          data-testid={`compose-tag-add-${group}`}
        >
          {t('compose.tagAdd')}
        </button>
      </div>
    </div>
  );
}
