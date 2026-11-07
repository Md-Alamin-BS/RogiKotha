import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { DEFAULT_CONFIG_VALUES, type ConfigValues, type Result } from '@rogikotha/contracts';
import { emptyDraftPayload } from '@/components/patient/compose/composer-reducer';
import {
  renderInLocale,
  translatorFor,
  type TestLocale,
} from '@/components/patient/compose/compose-test-support';
import { getContributionAccess } from '@/server/actions/account';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';
import ComposerPage from './page';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', async () => {
  const support = await import('@/components/patient/compose/compose-test-support');
  return {
    getTranslations: () => Promise.resolve(support.translatorFor(active.locale)),
    getLocale: () => Promise.resolve(active.locale),
  };
});
vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname: string; query?: Record<string, string> };
    children?: ReactNode;
  }) => (
    <a
      href={
        typeof href === 'string'
          ? href
          : `${href.pathname}${href.query ? `?${new URLSearchParams(href.query).toString()}` : ''}`
      }
      {...rest}
    >
      {children}
    </a>
  ),
  usePathname: () => '/write',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/server/actions/account', () => ({ getContributionAccess: vi.fn() }));
vi.mock('@/server/actions/auth', () => ({ resendOwnLink: vi.fn() }));
vi.mock('@/server/actions/review', () => ({
  saveDraftAction: vi.fn(),
  previewAction: vi.fn(),
  duplicateHintAction: vi.fn(),
  discardDraftAction: vi.fn(),
  publishDraftAction: vi.fn(),
  publishFacilityVisitAction: vi.fn(),
}));
vi.mock('@/server/command-call', () => ({ runCommand: vi.fn() }));
vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));
// The draft list is an async server component, which the test renderer cannot render.
vi.mock('@/components/patient/compose/DraftList', () => ({
  DraftList: ({ drafts }: { drafts: unknown[] }) => (
    <p data-testid="draft-list">{`${drafts.length} drafts`}</p>
  ),
}));

const DRAFT_ID = '0190f5a2-0000-7000-8000-0000000000d1';
type Answer = (raw: Record<string, unknown>) => Result<unknown>;

let facilityAccounts = false;
let answers: Record<string, Answer> = {};

function ok(data: unknown): Result<unknown> {
  return { ok: true, data };
}

function defaultAnswers(): Record<string, Answer> {
  return {
    'directory.listDoctors': () =>
      ok({
        items: [
          { publicId: 'd0c7015000', name: 'Dr. Synthetic Rahman', specialty: 'Paediatrics' },
          { publicId: 'd0c7015001', name: 'Dr. Example Sultana' },
        ],
        page: 1,
        pageSize: 100,
        total: 2,
      }),
    'directory.listFacilities': () =>
      ok({
        items: [{ publicId: 'b4a0c11000', name: 'Synthetic Clinic', city: 'Dhaka' }],
        page: 1,
        pageSize: 100,
        total: 1,
      }),
    'taxonomy.listSpecialties': () => ok([{ id: 'spec-1', name: 'Paediatrics' }]),
    'taxonomy.listSuggested': (raw) =>
      ok([{ termId: `term-${String(raw.group)}`, publicId: 'a1b2c3d4e5', name: 'Fever' }]),
    'account.getOwnAccount': () =>
      ok({ username: 'abba_of_two', displayName: 'Abba of Two', emailVerified: true }),
    'review.listOwnDrafts': () => ok([]),
    'review.getDraft': () =>
      ok({
        draftId: DRAFT_ID,
        payload: { ...emptyDraftPayload(), step: 3 },
        expiresAt: '2026-12-07T10:00:00.000Z',
      }),
  };
}

function config(): ConfigValues {
  return {
    ...DEFAULT_CONFIG_VALUES,
    featureVisibility: { ...DEFAULT_CONFIG_VALUES.featureVisibility, facilityAccounts },
  };
}

function command(name: string) {
  return { name };
}

function installContainer(): void {
  vi.mocked(getContainer).mockReturnValue({
    ports: { config: { current: () => Promise.resolve(config()) } },
    directory: {
      listDoctors: command('directory.listDoctors'),
      listFacilities: command('directory.listFacilities'),
    },
    taxonomy: {
      listSpecialties: command('taxonomy.listSpecialties'),
      listSuggested: command('taxonomy.listSuggested'),
    },
    review: {
      getDraft: command('review.getDraft'),
      listOwnDrafts: command('review.listOwnDrafts'),
    },
  } as unknown as ReturnType<typeof getContainer>);
  vi.mocked(runCommand).mockImplementation((cmd, raw) => {
    const answer = answers[cmd.name];
    if (!answer) throw new Error(`unexpected command ${cmd.name}`);
    return Promise.resolve(answer(raw as Record<string, unknown>) as never);
  });
}

function calledNames(): string[] {
  return vi.mocked(runCommand).mock.calls.map(([cmd]) => cmd.name);
}

async function renderPage(locale: TestLocale, search: Record<string, string> = {}) {
  active.locale = locale;
  const element = (await ComposerPage({ searchParams: Promise.resolve(search) })) as ReactElement;
  return renderInLocale(element, locale);
}

beforeEach(() => {
  vi.clearAllMocks();
  facilityAccounts = false;
  answers = defaultAnswers();
  installContainer();
  vi.mocked(getContributionAccess).mockResolvedValue('allowed');
});

describe.each(['en', 'bn'] as const)('the write page in %s', (locale) => {
  const t = translatorFor(locale);

  it.each(['signed-out', 'unconfirmed', 'unavailable'] as const)(
    'shows only the gate to a %s visitor and loads no composer data',
    async (access) => {
      vi.mocked(getContributionAccess).mockResolvedValue(access);
      await renderPage(locale);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('nav.compose'));
      expect(screen.getByTestId('contribution-gate')).toHaveAttribute('data-access', access);
      expect(screen.queryByTestId('composer')).toBeNull();
      expect(runCommand).not.toHaveBeenCalled();
      expect(getContainer).not.toHaveBeenCalled();
    },
  );

  it('brings a signed-out visitor back to the same doctor after sign-in', async () => {
    vi.mocked(getContributionAccess).mockResolvedValue('signed-out');
    await renderPage(locale, { doctor: 'd0c7015001' });

    const next = `/${locale}/write?doctor=d0c7015001`;
    expect(screen.getByTestId('contribution-gate-sign-in')).toHaveAttribute(
      'href',
      `/sign-in?${new URLSearchParams({ next }).toString()}`,
    );
  });

  it('shows the composer with the doctor list and the author names when allowed', async () => {
    await renderPage(locale);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('nav.compose'));
    expect(screen.queryByTestId('contribution-gate')).toBeNull();
    expect(screen.getByTestId('composer')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Dr. Synthetic Rahman — Paediatrics' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Dr. Example Sultana' })).toBeInTheDocument();
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'directory.listDoctors' }),
      { page: 1, pageSize: 100 },
    );
    expect(calledNames().filter((n) => n === 'taxonomy.listSuggested')).toHaveLength(4);
    expect(calledNames()).toContain('review.listOwnDrafts');
    expect(calledNames()).not.toContain('directory.listFacilities');
    expect(screen.queryByTestId('draft-list')).toBeNull();
  });

  it('opens a stored draft at its saved step without listing drafts', async () => {
    await renderPage(locale, { draft: DRAFT_ID });

    expect(runCommand).toHaveBeenCalledWith(expect.objectContaining({ name: 'review.getDraft' }), {
      draftId: DRAFT_ID,
    });
    expect(calledNames()).not.toContain('review.listOwnDrafts');
    expect(screen.getByTestId('compose-step-body-3')).toBeInTheDocument();
    expect(screen.getByTestId('compose-saved-flag')).not.toHaveTextContent(
      t('compose.draftMissing'),
    );
  });

  it('starts a new draft and says so once when the stored draft is gone', async () => {
    answers['review.getDraft'] = () => ({
      ok: false,
      error: { code: 'not_found', messageKey: 'errors.common.notFound', correlationId: 'c-1' },
    });
    await renderPage(locale, { draft: DRAFT_ID });

    expect(screen.getByTestId('compose-step-body-1')).toBeInTheDocument();
    expect(screen.getByTestId('compose-saved-flag')).toHaveTextContent(t('compose.draftMissing'));
  });
});

describe('the write page', () => {
  it('preselects the doctor named by ?doctor=', async () => {
    await renderPage('en', { doctor: 'd0c7015001' });
    expect(screen.getByTestId('compose-doctor')).toHaveValue('d0c7015001');
  });

  it('opens the step named by ?step=', async () => {
    await renderPage('en', { step: '2' });
    expect(screen.getByTestId('compose-step-body-2')).toBeInTheDocument();
  });

  it('lists the author’s drafts above a new composer', async () => {
    answers['review.listOwnDrafts'] = () =>
      ok([
        {
          draftId: DRAFT_ID,
          title: null,
          target: 'doctor',
          updatedAt: '2026-11-06T10:00:00.000Z',
          expiresAt: '2026-12-06T10:00:00.000Z',
        },
      ]);
    await renderPage('en');
    expect(screen.getByTestId('draft-list')).toHaveTextContent('1 drafts');
  });

  it('loads the branches only while facility feedback is on', async () => {
    facilityAccounts = true;
    await renderPage('en');
    expect(calledNames()).toContain('directory.listFacilities');
    expect(screen.getByTestId('compose-target')).toBeInTheDocument();
  });

  it('hands a failed read to the error boundary', async () => {
    answers['directory.listDoctors'] = () => ({
      ok: false,
      error: { code: 'internal', messageKey: 'errors.common.internal', correlationId: 'c-2' },
    });
    await expect(ComposerPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'directory.listDoctors: internal',
    );
  });
});
