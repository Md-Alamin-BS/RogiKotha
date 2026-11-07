import { useReducer } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComposerVM, DraftPayload } from '@rogikotha/contracts';

import {
  composerReducer,
  emptyDraftPayload,
  initComposerState,
  type ComposerAction,
} from './composer-reducer';
import { renderInLocale, translatorFor, type TestLocale } from './compose-test-support';
import { SafetyChecks } from './SafetyChecks';
import { StepCheck } from './StepCheck';
import { StepHowItWent } from './StepHowItWent';
import { StepStory } from './StepStory';

const vm: Pick<ComposerVM, 'suggestedTags' | 'emergencyNumbers' | 'names'> = {
  suggestedTags: {
    condition: [
      { termPublicId: 'tm00000001', name: 'Synthetic asthma' },
      { termPublicId: 'tm00000002', name: 'Synthetic migraine' },
    ],
    symptom: [{ termPublicId: 'tm00000003', name: 'Synthetic cough' }],
    treatment: [],
    medicine: [],
  },
  emergencyNumbers: {
    ambulance: '999',
    healthLine: '16263',
    crisisLine: '09612-119911',
    lastVerified: '2026-08-21',
  },
  names: { named: 'Synthetic Patient', pseudonymous: 'synthetic_patient' },
};

/** The composer's real reducer behind one step, so a click shows its effect on the payload. */
function Harness({
  initial,
  children,
  onState,
}: {
  initial?: Partial<DraftPayload>;
  children: (
    payload: DraftPayload,
    dispatch: (action: ComposerAction) => void,
    duplicate: boolean,
  ) => React.ReactNode;
  onState?: (payload: DraftPayload) => void;
}) {
  const [state, dispatch] = useReducer(composerReducer, undefined, () =>
    initComposerState({ payload: { ...emptyDraftPayload(), ...initial } }),
  );
  onState?.(state.payload);
  return <>{children(state.payload, dispatch, state.duplicate)}</>;
}

afterEach(() => {
  cleanup();
});

describe.each(['en', 'bn'] as const)('the step 2 components in %s', (locale: TestLocale) => {
  const t = translatorFor(locale);

  it('counts the quick story in graphemes and stores what is typed', async () => {
    const user = userEvent.setup();
    let seen: DraftPayload = emptyDraftPayload();
    renderInLocale(
      <Harness onState={(p) => (seen = p)}>
        {(payload, dispatch) => (
          <StepStory payload={payload} vm={vm} duplicate={false} dispatch={dispatch} />
        )}
      </Harness>,
      locale,
    );

    expect(screen.getByTestId('compose-story-count')).toBeInTheDocument();
    await user.type(screen.getByTestId('compose-story'), 'কোনো');
    // Four code points but only two grapheme clusters: the counter reads 2, not 4.
    expect(screen.getByTestId('compose-story-count')).toHaveTextContent(
      t('compose.bodyCount', {
        count: locale === 'bn' ? '২' : '2',
        min: locale === 'bn' ? '২০' : '20',
      }),
    );
    expect(seen.story).toBe('কোনো');
    await user.type(screen.getByTestId('compose-story'), ' a long enough synthetic story.');
    expect(screen.queryByTestId('compose-story-count')).not.toBeInTheDocument();
  });

  it('shows four section fields in the detailed mode and the facility hint for a facility', () => {
    const first = renderInLocale(
      <Harness initial={{ mode: 'detailed' }}>
        {(payload, dispatch) => (
          <StepStory payload={payload} vm={vm} duplicate={false} dispatch={dispatch} />
        )}
      </Harness>,
      locale,
    );
    expect(screen.getByTestId('compose-sections')).toBeInTheDocument();
    for (const key of ['symptoms', 'diagnosis', 'treatment', 'after']) {
      expect(screen.getByTestId(`compose-${key}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('compose-story')).not.toBeInTheDocument();
    first.unmount();

    renderInLocale(
      <Harness initial={{ target: 'facility' }}>
        {(payload, dispatch) => (
          <StepStory payload={payload} vm={vm} duplicate={false} dispatch={dispatch} />
        )}
      </Harness>,
      locale,
    );
    expect(screen.getByText(t('compose.facilityStoryHint'))).toBeInTheDocument();
    expect(screen.queryByTestId('compose-tags')).not.toBeInTheDocument();
  });

  it('toggles suggested chips with aria-pressed and keeps the 20-tag counter', async () => {
    const user = userEvent.setup();
    renderInLocale(
      <Harness>
        {(payload, dispatch) => (
          <StepStory payload={payload} vm={vm} duplicate={false} dispatch={dispatch} />
        )}
      </Harness>,
      locale,
    );

    const chip = screen.getByRole('button', { name: 'Synthetic asthma' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('compose-tags-count')).toHaveTextContent(
      t('compose.tagsMax', {
        count: locale === 'bn' ? '১' : '1',
        max: locale === 'bn' ? '২০' : '20',
      }),
    );
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });

  it('adds a typed tag with Enter and with Add, marks it provisional, and offers Not sure once', async () => {
    const user = userEvent.setup();
    let seen: DraftPayload = emptyDraftPayload();
    renderInLocale(
      <Harness onState={(p) => (seen = p)}>
        {(payload, dispatch) => (
          <StepStory payload={payload} vm={vm} duplicate={false} dispatch={dispatch} />
        )}
      </Harness>,
      locale,
    );

    const free = screen.getByTestId('compose-tag-free-symptom');
    await user.type(free, 'synthetic itch{Enter}');
    expect(seen.tags).toEqual([{ group: 'symptom', text: 'synthetic itch' }]);
    expect(free).toHaveValue('');
    const typed = screen.getByRole('button', { name: 'synthetic itch' });
    expect(typed).toHaveAttribute('title', t('condition.provisional'));

    await user.type(free, 'second itch');
    await user.click(screen.getByTestId('compose-tag-add-symptom'));
    expect(seen.tags).toHaveLength(2);

    expect(screen.getAllByTestId('compose-not-sure')).toHaveLength(1);
    await user.click(screen.getByTestId('compose-not-sure'));
    expect(seen.notSure).toBe(true);
    expect(screen.getByTestId('compose-not-sure')).toHaveAttribute('aria-pressed', 'true');
  });

  it('stops adding tags at the limit', () => {
    const tags = Array.from({ length: 20 }, (_, i) => ({
      group: 'symptom' as const,
      text: `synthetic tag ${i}`,
    }));
    renderInLocale(
      <Harness initial={{ tags }}>
        {(payload, dispatch) => (
          <StepStory payload={payload} vm={vm} duplicate={false} dispatch={dispatch} />
        )}
      </Harness>,
      locale,
    );

    expect(screen.getByTestId('compose-tag-free-symptom')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Synthetic cough' })).toBeDisabled();
  });

  it('shows a phone finding and a static emergency finding, each with Leave as it is', async () => {
    const user = userEvent.setup();
    renderInLocale(
      <Harness initial={{ story: 'Call me on 01712345678 it was an emergency' }}>
        {(payload, dispatch) => (
          <StepStory payload={payload} vm={vm} duplicate={false} dispatch={dispatch} />
        )}
      </Harness>,
      locale,
    );

    const safety = screen.getByTestId('compose-safety');
    expect(safety).toHaveAttribute('data-static', 'emergency');
    expect(within(safety).getByTestId('compose-safety-pii')).toHaveTextContent(
      t('compose.safetyPii'),
    );
    expect(within(safety).getByTestId('compose-safety-emerg')).toHaveTextContent(
      t('compose.safetyEmerg'),
    );

    await user.click(
      within(screen.getByTestId('compose-safety-emerg')).getByRole('button', {
        name: t('compose.ignore'),
      }),
    );
    expect(screen.queryByTestId('compose-safety-emerg')).not.toBeInTheDocument();
    expect(screen.getByTestId('compose-safety')).not.toHaveAttribute('data-static');
  });

  it('says nothing needs fixing when there are no findings, and flags a duplicate', () => {
    const first = renderInLocale(
      <SafetyChecks
        texts={['A plain synthetic story.']}
        numbers={vm.emergencyNumbers}
        duplicate={false}
        dismissed={[]}
        onDismiss={() => undefined}
      />,
      locale,
    );
    expect(screen.getByTestId('compose-safety-pass')).toHaveTextContent(t('compose.safetyPass'));
    first.unmount();

    renderInLocale(
      <SafetyChecks
        texts={[]}
        numbers={vm.emergencyNumbers}
        duplicate
        dismissed={[]}
        onDismiss={() => undefined}
      />,
      locale,
    );
    expect(screen.getByTestId('compose-safety-dup')).toHaveTextContent(t('compose.safetyDup'));
  });
});

describe.each(['en', 'bn'] as const)('the step 3 component in %s', (locale: TestLocale) => {
  const t = translatorFor(locale);

  it('toggles sentiment, outcome and the three Reviewers labels', async () => {
    const user = userEvent.setup();
    let seen: DraftPayload = emptyDraftPayload();
    renderInLocale(
      <Harness onState={(p) => (seen = p)}>
        {(payload, dispatch) => <StepHowItWent payload={payload} dispatch={dispatch} />}
      </Harness>,
      locale,
    );

    const mixed = screen.getByRole('button', { name: t('sentiment.mixed') });
    await user.click(mixed);
    expect(seen.sentiment).toBe('mixed');
    await user.click(mixed);
    expect(seen.sentiment).toBeUndefined();

    await user.click(screen.getByRole('button', { name: t('outcome.helped') }));
    expect(seen.outcome).toBe('helped');

    expect(within(screen.getByTestId('compose-claims')).getAllByRole('button')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: t('claim.wrongDx') }));
    await user.click(screen.getByRole('button', { name: t('claim.secondOpinion') }));
    expect(seen.claims).toEqual(['wrongDx', 'secondOpinion']);
    await user.click(screen.getByRole('button', { name: t('claim.wrongDx') }));
    expect(seen.claims).toEqual(['secondOpinion']);
    expect(screen.getByText(t('compose.claimsNote'))).toBeInTheDocument();
  });

  it('shows nine optional choices for a facility and no score', async () => {
    const user = userEvent.setup();
    let seen: DraftPayload = emptyDraftPayload();
    renderInLocale(
      <Harness initial={{ target: 'facility' }} onState={(p) => (seen = p)}>
        {(payload, dispatch) => <StepHowItWent payload={payload} dispatch={dispatch} />}
      </Harness>,
      locale,
    );

    expect(screen.getAllByRole('group')).toHaveLength(9);
    expect(screen.getByText(t('crit.reportTrustNote'))).toBeInTheDocument();
    expect(screen.queryByTestId('compose-claims')).not.toBeInTheDocument();

    const staff = screen.getByTestId('compose-crit-staff-options');
    await user.click(within(staff).getByRole('button', { name: t('crit.good') }));
    expect(seen.criteria).toEqual({ staff: 'good' });
    await user.click(within(staff).getByRole('button', { name: t('crit.good') }));
    expect(seen.criteria).toBeUndefined();
    expect(document.body.textContent ?? '').not.toMatch(/\d\s*\/\s*5|★/u);
  });
});

describe.each(['en', 'bn'] as const)('the step 4 component in %s', (locale: TestLocale) => {
  const t = translatorFor(locale);

  function renderCheck(
    initial: Partial<DraftPayload>,
    handlers: { onPublish?: () => void; onSaveExit?: () => void; publishing?: boolean } = {},
    errors?: Record<string, string>,
  ) {
    return renderInLocale(
      <Harness initial={initial}>
        {(payload, dispatch, duplicate) => (
          <StepCheck
            payload={payload}
            vm={vm}
            duplicate={duplicate}
            dispatch={dispatch}
            onPublish={handlers.onPublish ?? (() => undefined)}
            onSaveExit={handlers.onSaveExit ?? (() => undefined)}
            publishing={handlers.publishing ?? false}
            {...(errors ? { errors } : {})}
          />
        )}
      </Harness>,
      locale,
    );
  }

  it('keeps Publish disabled until all four boxes are ticked, then publishes', async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn();
    renderCheck({}, { onPublish });

    const publish = screen.getByTestId('compose-publish');
    expect(publish).toBeDisabled();
    expect(publish.getAttribute('aria-describedby')).toBeTruthy();
    const keys = ['confirm1', 'confirm2', 'confirm3', 'age'];
    for (const [i, key] of keys.entries()) {
      expect(publish).toBeDisabled();
      await user.click(screen.getByTestId(`compose-attest-${key}`));
      if (i < keys.length - 1) expect(publish).toBeDisabled();
    }
    expect(publish).toBeEnabled();
    await user.click(publish);
    expect(onPublish).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId('compose-attest-age'));
    expect(publish).toBeDisabled();
  });

  it('shows the author names in the identity choice and the reworded anonymous note', async () => {
    const user = userEvent.setup();
    renderCheck({});

    expect(
      screen.getByRole('button', { name: `${t('compose.identity.real')} (Synthetic Patient)` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: `${t('compose.identity.pseudo')} (@synthetic_patient)`,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('compose-anon-note')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: t('compose.identity.anon') }));
    expect(screen.getByTestId('compose-anon-note')).toHaveTextContent(
      t('compose.identity.anonNote'),
    );
  });

  it('offers no anonymous choice for a facility visit', () => {
    renderCheck({ target: 'facility' });

    expect(screen.queryByRole('button', { name: t('compose.identity.anon') })).toBeNull();
  });

  it('blocks Publish for an anonymous review that adds a doctor and links to the way out', async () => {
    const user = userEvent.setup();
    renderCheck({ identityMode: 'anonymous', newDoctor: { name: 'Dr. Synthetic New' } });
    for (const key of ['confirm1', 'confirm2', 'confirm3', 'age']) {
      await user.click(screen.getByTestId(`compose-attest-${key}`));
    }

    const blocked = screen.getByTestId('compose-anon-blocked');
    expect(blocked).toHaveTextContent(t('compose.anonNewDoctor'));
    expect(screen.getByTestId('compose-publish')).toBeDisabled();
    expect(screen.getByTestId('compose-publish').getAttribute('aria-describedby')).toContain(
      blocked.id,
    );

    await user.click(within(blocked).getByRole('button', { name: t('compose.identity.pseudo') }));
    expect(screen.queryByTestId('compose-anon-blocked')).not.toBeInTheDocument();
    expect(screen.getByTestId('compose-publish')).toBeEnabled();
  });

  it('runs the checks again, shows a refused identity, and saves and finishes later', async () => {
    const user = userEvent.setup();
    const onSaveExit = vi.fn();
    renderCheck(
      { story: 'It was an emergency' },
      { onSaveExit },
      { identity: 'errors.review.anonymousNewDoctor' },
    );

    expect(screen.getByTestId('compose-safety-emerg')).toBeInTheDocument();
    expect(screen.getByText(t('errors.review.anonymousNewDoctor'))).toBeInTheDocument();
    await user.click(screen.getByTestId('compose-save-exit'));
    expect(onSaveExit).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons while publishing', () => {
    renderCheck({}, { publishing: true });

    expect(screen.getByTestId('compose-publish')).toBeDisabled();
    expect(screen.getByTestId('compose-publish')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('compose-save-exit')).toBeDisabled();
  });
});
