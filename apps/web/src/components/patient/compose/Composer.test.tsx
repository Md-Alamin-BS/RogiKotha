import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComposerDraftVM, ComposerVM, DraftPayload } from '@rogikotha/contracts';

import {
  discardDraftAction,
  duplicateHintAction,
  previewAction,
  publishDraftAction,
  publishFacilityVisitAction,
  saveDraftAction,
} from '@/server/actions/review';
import { Composer } from './Composer';
import { emptyDraftPayload } from './composer-reducer';
import { renderInLocale, translatorFor, type TestLocale } from './compose-test-support';
import { DiscardDraftButton } from './DiscardDraftButton';

vi.mock('@/server/actions/review', () => ({
  saveDraftAction: vi.fn(),
  previewAction: vi.fn(),
  duplicateHintAction: vi.fn(),
  discardDraftAction: vi.fn(),
  publishDraftAction: vi.fn(),
  publishFacilityVisitAction: vi.fn(),
}));
const refresh = vi.fn();
const push = vi.fn();
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh, push }),
}));

const NOW = new Date('2026-11-07T10:00:00Z');

function someVm(overrides: Partial<ComposerVM> = {}): ComposerVM {
  return {
    doctors: [
      { publicId: 'doc0000001', label: 'Dr. Synthetic Rahman' },
      { publicId: 'doc0000002', label: 'Dr. Synthetic Akter' },
    ],
    branches: [],
    specialties: [{ id: '0b0f6d3c-2a53-4f2c-9d57-3a1f55a9a111', name: 'Cardiology' }],
    suggestedTags: { condition: [], symptom: [], treatment: [], medicine: [] },
    names: { named: 'Synthetic Patient', pseudonymous: 'synthetic_patient' },
    emergencyNumbers: {
      ambulance: '999',
      healthLine: '16263',
      crisisLine: '09612-119911',
      lastVerified: '2026-08-21',
    },
    ...overrides,
  };
}

function draftOf(patch: Partial<DraftPayload>): ComposerDraftVM {
  return {
    draftId: '11111111-1111-4111-8111-111111111111',
    payload: { ...emptyDraftPayload(), ...patch },
    expiresAt: '2026-12-07T00:00:00Z',
  };
}

const saved = {
  ok: true as const,
  draftId: '11111111-1111-4111-8111-111111111111',
  expiresAt: 'x',
};

beforeEach(() => {
  vi.mocked(saveDraftAction).mockResolvedValue(saved);
  vi.mocked(previewAction).mockResolvedValue({ ok: false, messageKey: 'errors.common.notFound' });
  vi.mocked(duplicateHintAction).mockResolvedValue({ ok: true, duplicate: false });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe.each(['en', 'bn'] as const)('the composer shell in %s', (locale: TestLocale) => {
  const t = translatorFor(locale);

  it('opens on step 1 with four reachable steps, the disclaimer and an empty preview', () => {
    renderInLocale(<Composer vm={someVm()} initialStep={1} now={NOW} />, locale);

    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByTestId('compose-step-1')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(t('compose.stepName.care'));
    expect(screen.getByText(t('disclaimer.long'))).toHaveAttribute('data-static', 'disclaimer');
    expect(screen.getByText(t('compose.previewEmpty'))).toBeInTheDocument();
  });

  it('moves focus to the step heading when another step is chosen', async () => {
    const user = userEvent.setup();
    renderInLocale(<Composer vm={someVm()} initialStep={1} now={NOW} />, locale);

    await user.click(screen.getByTestId('compose-step-3'));

    expect(screen.getByTestId('compose-step-3')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(t('compose.stepName.how'));
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('slides a new step in from its direction of travel and not on first render', async () => {
    const user = userEvent.setup();
    renderInLocale(<Composer vm={someVm()} initialStep={2} now={NOW} />, locale);

    expect(screen.getByTestId('compose-step-body-2')).not.toHaveAttribute('data-step-dir');

    await user.click(screen.getByTestId('compose-step-4'));
    expect(screen.getByTestId('compose-step-body-4')).toHaveAttribute('data-step-dir', 'forward');

    await user.click(screen.getByTestId('compose-step-1'));
    expect(screen.getByTestId('compose-step-body-1')).toHaveAttribute('data-step-dir', 'back');
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('preselects the doctor only from the link parameter', () => {
    const first = renderInLocale(
      <Composer vm={someVm()} initialStep={1} doctorPublicId="doc0000002" now={NOW} />,
      locale,
    );
    expect(screen.getByTestId('compose-doctor')).toHaveValue('doc0000002');
    first.unmount();

    renderInLocale(<Composer vm={someVm()} initialStep={1} now={NOW} />, locale);
    expect(screen.getByTestId('compose-doctor')).toHaveValue('');
  });

  it('offers the target switch only when branches exist', () => {
    const first = renderInLocale(<Composer vm={someVm()} initialStep={1} now={NOW} />, locale);
    expect(screen.queryByTestId('compose-target')).not.toBeInTheDocument();
    first.unmount();

    renderInLocale(
      <Composer
        vm={someVm({ branches: [{ publicId: 'br00000001', label: 'Synthetic Clinic' }] })}
        initialStep={1}
        now={NOW}
      />,
      locale,
    );
    expect(screen.getByTestId('compose-target')).toBeInTheDocument();
  });

  it('opens the add-a-doctor fields and clears the listed doctor', async () => {
    const user = userEvent.setup();
    renderInLocale(
      <Composer vm={someVm()} initialStep={1} doctorPublicId="doc0000001" now={NOW} />,
      locale,
    );

    await user.click(screen.getByTestId('compose-add-doctor-open'));

    expect(screen.getByTestId('compose-add-doctor')).toBeInTheDocument();
    expect(screen.queryByTestId('compose-doctor')).not.toBeInTheDocument();
    expect(screen.getByText(t('label.memberAddedWhy'))).toBeInTheDocument();

    await user.click(screen.getByTestId('compose-add-doctor-cancel'));
    expect(screen.getByTestId('compose-doctor')).toHaveValue('');
  });

  it('disables the add-a-doctor toggle while the identity is anonymous and says why', () => {
    renderInLocale(
      <Composer
        vm={someVm({ draft: draftOf({ identityMode: 'anonymous' }) })}
        initialStep={1}
        now={NOW}
      />,
      locale,
    );

    expect(screen.getByTestId('compose-add-doctor-open')).toBeDisabled();
    expect(screen.getByTestId('compose-anon-new-doctor')).toHaveTextContent(
      t('compose.anonNewDoctor'),
    );
  });

  it('reads the private exact date note and keeps a stored period selectable', () => {
    renderInLocale(
      <Composer
        vm={someVm({ draft: draftOf({ period: { year: 2012, month: 3 } }) })}
        initialStep={1}
        now={NOW}
      />,
      locale,
    );

    expect(screen.getByText(t('compose.exactDateNote'))).toBeInTheDocument();
    expect(screen.getByTestId('compose-period')).toHaveValue('2012-03');
  });

  it('saves the draft after a choice and then shows it as saved', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderInLocale(<Composer vm={someVm()} initialStep={1} now={NOW} />, locale);

      await user.click(screen.getByRole('button', { name: t('rel.parent') }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_600);
      });

      await waitFor(() => expect(saveDraftAction).toHaveBeenCalledTimes(1));
      const sent = vi.mocked(saveDraftAction).mock.calls[0]?.[0] as { payload: DraftPayload };
      expect(sent.payload.relationship).toBe('parent');
      await waitFor(() =>
        expect(screen.getByTestId('compose-saved-flag')).toHaveTextContent(t('compose.draftSaved')),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the draft-missing notice when the stored draft is gone', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      vi.mocked(saveDraftAction).mockResolvedValue({
        ok: false,
        messageKey: 'errors.common.notFound',
      });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderInLocale(
        <Composer vm={someVm({ draft: draftOf({}) })} initialStep={1} now={NOW} />,
        locale,
      );

      await user.click(screen.getByRole('button', { name: t('rel.self') }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_600);
      });

      await waitFor(() =>
        expect(screen.getByTestId('compose-saved-flag')).toHaveTextContent(
          t('compose.draftMissing'),
        ),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the preview the caller renders once a save has produced one', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      vi.mocked(previewAction).mockResolvedValue({
        ok: true,
        preview: { kind: 'facility', body: 'x', criteria: [], author: { personaKind: 'named' } },
      } as unknown as Awaited<ReturnType<typeof previewAction>>);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderInLocale(
        <Composer
          vm={someVm()}
          initialStep={1}
          now={NOW}
          renderPreview={(p) => <p data-testid="preview-body">{p.kind}</p>}
        />,
        locale,
      );

      await user.click(screen.getByRole('button', { name: t('rel.witness') }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_600);
      });

      await waitFor(() => expect(screen.getByTestId('preview-body')).toHaveTextContent('facility'));
    } finally {
      vi.useRealTimers();
    }
  });
});

describe.each(['en', 'bn'] as const)('the composer steps 2 to 4 in %s', (locale: TestLocale) => {
  const t = translatorFor(locale);

  const ticks = async (user: ReturnType<typeof userEvent.setup>) => {
    for (const key of ['confirm1', 'confirm2', 'confirm3', 'age']) {
      await user.click(screen.getByTestId(`compose-attest-${key}`));
    }
  };

  it('plugs in the story, how-it-went and check steps through the rail', async () => {
    const user = userEvent.setup();
    renderInLocale(<Composer vm={someVm()} initialStep={1} now={NOW} />, locale);

    await user.click(screen.getByTestId('compose-step-2'));
    expect(screen.getByTestId('compose-step-story')).toBeInTheDocument();
    await user.click(screen.getByTestId('compose-step-3'));
    expect(screen.getByTestId('compose-step-how')).toBeInTheDocument();
    await user.click(screen.getByTestId('compose-step-4'));
    expect(screen.getByTestId('compose-step-check')).toBeInTheDocument();
    expect(screen.getByText(t('disclaimer.long'))).toHaveAttribute('data-static', 'disclaimer');
  });

  it('publishes a doctor draft once the four boxes are ticked, after saving it', async () => {
    const user = userEvent.setup();
    vi.mocked(publishDraftAction).mockResolvedValue({
      formError: 'errors.review.minFields',
      fieldErrors: { doctor: 'errors.review.missingDoctor' },
    });
    renderInLocale(
      <Composer vm={someVm({ draft: draftOf({ step: 4 }) })} initialStep={4} now={NOW} />,
      locale,
    );

    await ticks(user);
    await user.click(screen.getByTestId('compose-publish'));

    await waitFor(() =>
      expect(publishDraftAction).toHaveBeenCalledWith({
        draftId: '11111111-1111-4111-8111-111111111111',
        identityMode: 'pseudonymous',
        attestation: true,
      }),
    );
    expect(publishFacilityVisitAction).not.toHaveBeenCalled();
  });

  it('lists the missing fields with links that open the step they are on', async () => {
    const user = userEvent.setup();
    vi.mocked(publishDraftAction).mockResolvedValue({
      formError: 'errors.review.minFields',
      fieldErrors: {
        doctor: 'errors.review.missingDoctor',
        story: 'errors.review.missingStory',
      },
    });
    renderInLocale(
      <Composer vm={someVm({ draft: draftOf({ step: 4 }) })} initialStep={4} now={NOW} />,
      locale,
    );

    await ticks(user);
    await user.click(screen.getByTestId('compose-publish'));

    const summary = await screen.findByTestId('compose-error');
    expect(summary).toHaveTextContent(t('errors.review.minFields'));
    const links = within(screen.getByTestId('compose-error-fields')).getAllByRole('button');
    expect(links.map((l) => l.textContent)).toEqual([t('compose.doctor'), t('compose.story')]);

    await user.click(links[1] as HTMLElement);
    expect(screen.getByTestId('compose-step-story')).toBeInTheDocument();
    expect(screen.getByTestId('compose-step-2')).toHaveAttribute('aria-current', 'step');
  });

  it('publishes a facility draft through the facility action', async () => {
    const user = userEvent.setup();
    vi.mocked(publishFacilityVisitAction).mockResolvedValue({
      formError: 'errors.common.validation',
      fieldErrors: {},
    });
    renderInLocale(
      <Composer
        vm={someVm({
          branches: [{ publicId: 'br00000001', label: 'Synthetic Clinic' }],
          draft: draftOf({ target: 'facility', step: 4 }),
        })}
        initialStep={4}
        now={NOW}
      />,
      locale,
    );

    expect(screen.queryByRole('button', { name: t('compose.identity.anon') })).toBeNull();
    await ticks(user);
    await user.click(screen.getByTestId('compose-publish'));

    await waitFor(() => expect(publishFacilityVisitAction).toHaveBeenCalledTimes(1));
    expect(publishDraftAction).not.toHaveBeenCalled();
  });

  it('keeps Publish disabled for an anonymous review that adds a doctor', async () => {
    const user = userEvent.setup();
    renderInLocale(
      <Composer
        vm={someVm({
          draft: draftOf({
            step: 4,
            identityMode: 'anonymous',
            newDoctor: { name: 'Dr. Synthetic New' },
          }),
        })}
        initialStep={4}
        now={NOW}
      />,
      locale,
    );

    await ticks(user);
    expect(screen.getByTestId('compose-publish')).toBeDisabled();
    expect(screen.getByTestId('compose-anon-blocked')).toHaveTextContent(
      t('compose.anonNewDoctor'),
    );
    await user.click(
      within(screen.getByTestId('compose-anon-blocked')).getByRole('button', {
        name: t('compose.stepName.care'),
      }),
    );
    expect(screen.getByTestId('compose-step-care')).toBeInTheDocument();
  });

  it('saves and goes back to the write page on Save and finish later', async () => {
    const user = userEvent.setup();
    renderInLocale(
      <Composer vm={someVm({ draft: draftOf({ step: 4 }) })} initialStep={4} now={NOW} />,
      locale,
    );

    await user.click(screen.getByTestId('compose-save-exit'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/write'));
  });
});

describe('the preview aside', () => {
  it('is a closed details on a narrow screen and open on step 4', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    try {
      const user = userEvent.setup();
      renderInLocale(<Composer vm={someVm()} initialStep={1} now={NOW} />, 'en');

      const details = await screen.findByTestId('compose-preview-details');
      expect(details).not.toHaveAttribute('open');

      await user.click(screen.getByTestId('compose-step-4'));
      await waitFor(() =>
        expect(screen.getByTestId('compose-preview-details')).toHaveAttribute('open'),
      );
      expect(screen.getByTestId('compose-aside')).not.toContainElement(
        screen.queryByText(translatorFor('en')('disclaimer.long')),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('DiscardDraftButton', () => {
  it('asks first and discards only after the author confirms', async () => {
    vi.mocked(discardDraftAction).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm');
    renderInLocale(<DiscardDraftButton draftId="d-1" label="Untitled draft" />, 'en');

    confirm.mockReturnValueOnce(false);
    await user.click(screen.getByTestId('draft-discard'));
    expect(discardDraftAction).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    await user.click(screen.getByTestId('draft-discard'));
    await waitFor(() => expect(discardDraftAction).toHaveBeenCalledWith({ draftId: 'd-1' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    confirm.mockRestore();
  });

  it('shows the refusal key as text when the discard fails', async () => {
    vi.mocked(discardDraftAction).mockResolvedValue({
      ok: false,
      messageKey: 'errors.common.notFound',
    });
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderInLocale(<DiscardDraftButton draftId="d-1" label="Untitled draft" />, 'en');

    await user.click(screen.getByTestId('draft-discard'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      translatorFor('en')('errors.common.notFound'),
    );
  });
});
