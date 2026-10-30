// @vitest-environment node
import type { DemoCurrentAccount, DemoDoctorOption } from '@rogikotha/contracts';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redirect } from '@/i18n/routing';
import { requireAccount } from '@/server/auth/session';
import { doctors, reviews } from '@/server/data';
import { publishReview, saveReviewEdit, type ComposeFormState, type EditFormState } from './review';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn() }));
vi.mock('@/i18n/routing', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('@/server/auth/session', () => ({ requireAccount: vi.fn() }));
vi.mock('@/server/data', () => ({
  doctors: { listDoctorOptions: vi.fn() },
  reviews: {
    createQuickReview: vi.fn(),
    createPseudonymousPersona: vi.fn(),
    updateOwnReview: vi.fn(),
  },
}));

const DOCTOR_ID = '0190f5a2-0000-7000-8000-0000000000d1';
const PUBLIC_ID = 'a1b2c3d4e5';

function anAccount(overrides: Partial<DemoCurrentAccount> = {}): DemoCurrentAccount {
  return {
    accountId: '0190f5a2-0000-7000-8000-000000000001',
    authUserId: 'auth-user-1',
    username: 'abba_of_two',
    displayName: 'Abba of Two',
    locale: 'en',
    status: 'active',
    currentPersonaId: '0190f5a2-0000-7000-8000-0000000000aa',
    pseudonymousPersonaId: null,
    pseudonymousDisplayName: null,
    ...overrides,
  };
}

function aDoctorOption(): DemoDoctorOption {
  return { id: DOCTOR_ID, publicId: 'd0c7015000', name: 'Dr. Synthetic Rahman', specialty: null };
}

const lastYear = new Date().getUTCFullYear() - 1;

function aComposeForm(overrides: Record<string, string | null> = {}): FormData {
  const fields: Record<string, string | null> = {
    doctorId: DOCTOR_ID,
    relationship: 'parent',
    period: `${lastYear}-03`,
    title: '  Calm and careful with my son  ',
    body: 'She listened to every question and explained the medicine doses slowly.',
    sentiment: 'positive',
    outcome: '',
    identity: 'named',
    attestation: 'on',
    ...overrides,
  };
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) if (value !== null) form.set(name, value);
  return form;
}

function anEditForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const fields = {
    publicId: PUBLIC_ID,
    title: 'Calm, but the follow-up was slow',
    body: 'The follow-up appointment took three weeks to arrange this time.',
    sentiment: 'mixed',
    outcome: 'helped',
    ...overrides,
  };
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return form;
}

const composeStart: ComposeFormState = {
  attempt: 0,
  values: null,
  fieldErrors: {},
  formError: null,
};
const editStart: EditFormState = { attempt: 0, values: null, fieldErrors: {}, formError: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getLocale).mockResolvedValue('en');
  vi.mocked(requireAccount).mockResolvedValue(anAccount());
  vi.mocked(doctors.listDoctorOptions).mockResolvedValue([aDoctorOption()]);
  vi.mocked(reviews.createQuickReview).mockResolvedValue({ reviewId: 'r-1', publicId: PUBLIC_ID });
  vi.mocked(reviews.updateOwnReview).mockResolvedValue({ ok: true, data: { version: 2 } });
});

describe('publishing an experience', () => {
  it('publishes the quick review as the named persona and opens its page', async () => {
    await expect(publishReview(composeStart, aComposeForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(reviews.createQuickReview).toHaveBeenCalledWith({
      authorPersonaId: anAccount().currentPersonaId,
      authorAccountId: anAccount().accountId,
      doctorId: DOCTOR_ID,
      relationship: 'parent',
      periodYear: lastYear,
      periodMonth: 3,
      title: 'Calm and careful with my son',
      body: 'She listened to every question and explained the medicine doses slowly.',
      sentiment: 'positive',
      outcome: null,
      identityMode: 'named',
      language: 'en',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
    expect(redirect).toHaveBeenCalledWith({ href: `/experiences/${PUBLIC_ID}`, locale: 'en' });
  });

  it('sends a signed-out visitor to sign in and writes nothing', async () => {
    vi.mocked(requireAccount).mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(publishReview(composeStart, aComposeForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(requireAccount).toHaveBeenCalledWith({ returnTo: '/write' });
    expect(reviews.createQuickReview).not.toHaveBeenCalled();
  });

  it('creates the pseudonymous persona on first use', async () => {
    vi.mocked(reviews.createPseudonymousPersona).mockResolvedValue('persona-alias');

    await expect(
      publishReview(composeStart, aComposeForm({ identity: 'pseudonymous' })),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(reviews.createPseudonymousPersona).toHaveBeenCalledWith({
      accountId: anAccount().accountId,
      username: 'abba_of_two',
    });
    expect(reviews.createQuickReview).toHaveBeenCalledWith(
      expect.objectContaining({ authorPersonaId: 'persona-alias', identityMode: 'pseudonymous' }),
    );
  });

  it('reuses an existing pseudonymous persona', async () => {
    vi.mocked(requireAccount).mockResolvedValue(anAccount({ pseudonymousPersonaId: 'alias-1' }));

    await expect(
      publishReview(composeStart, aComposeForm({ identity: 'pseudonymous' })),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(reviews.createPseudonymousPersona).not.toHaveBeenCalled();
    expect(reviews.createQuickReview).toHaveBeenCalledWith(
      expect.objectContaining({ authorPersonaId: 'alias-1' }),
    );
  });

  it.each([
    ['এক বছর ধরে মাথাব্যথা, ডাক্তার ধৈর্য নিয়ে সব শুনেছেন।', 'bn'],
    ['Headache for a year; ডাক্তার ধৈর্য নিয়ে সব শুনেছেন।', 'mixed'],
  ])('records the language the author wrote in (%s)', async (body, language) => {
    await expect(
      publishReview(composeStart, aComposeForm({ title: 'মাথাব্যথা', body })),
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(reviews.createQuickReview).toHaveBeenCalledWith(expect.objectContaining({ language }));
  });

  it('refuses a form with field errors, keeps what was typed and writes nothing', async () => {
    const state = await publishReview(
      composeStart,
      aComposeForm({
        attestation: null,
        body: 'Too short',
        period: `${new Date().getUTCFullYear() + 1}-01`,
        relationship: 'neighbour',
        title: '',
      }),
    );

    expect(state).toMatchObject({
      attempt: 1,
      formError: 'errors.common.validation',
      fieldErrors: {
        attestation: 'errors.review.attestationRequired',
        body: 'formErrors.compose.bodyTooShort',
        period: 'formErrors.compose.periodInvalid',
        relationship: 'formErrors.compose.relationshipRequired',
        title: 'formErrors.compose.titleLength',
      },
    });
    expect(state.values?.body).toBe('Too short');
    expect(reviews.createQuickReview).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('refuses a doctor that is not in the published list', async () => {
    vi.mocked(doctors.listDoctorOptions).mockResolvedValue([]);

    const state = await publishReview(composeStart, aComposeForm());

    expect(state.fieldErrors).toEqual({ doctorId: 'formErrors.compose.doctorRequired' });
    expect(reviews.createQuickReview).not.toHaveBeenCalled();
  });

  it('answers a database failure with the internal message and keeps the text out of the log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(reviews.createQuickReview).mockRejectedValue(
      new Error('duplicate key: Calm and careful with my son'),
    );

    const state = await publishReview(composeStart, aComposeForm());

    expect(state.formError).toBe('errors.common.internal');
    expect(JSON.stringify(log.mock.calls)).not.toContain('Calm and careful');
    log.mockRestore();
  });
});

describe('editing an experience', () => {
  it("saves the author's correction and opens the experience again", async () => {
    await expect(saveReviewEdit(editStart, anEditForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(reviews.updateOwnReview).toHaveBeenCalledWith(PUBLIC_ID, anAccount().accountId, {
      title: 'Calm, but the follow-up was slow',
      body: 'The follow-up appointment took three weeks to arrange this time.',
      sentiment: 'mixed',
      outcome: 'helped',
    });
    expect(redirect).toHaveBeenCalledWith({ href: `/experiences/${PUBLIC_ID}`, locale: 'en' });
  });

  it("answers someone else's experience with not found and does not redirect", async () => {
    vi.mocked(reviews.updateOwnReview).mockResolvedValue({ ok: false, reason: 'not_found' });

    const state = await saveReviewEdit(editStart, anEditForm());

    expect(state).toMatchObject({ attempt: 1, formError: 'errors.common.notFound' });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('never touches the database for a malformed public id', async () => {
    const state = await saveReviewEdit(editStart, anEditForm({ publicId: "x' or 1=1" }));

    expect(state.formError).toBe('errors.common.notFound');
    expect(reviews.updateOwnReview).not.toHaveBeenCalled();
  });

  it('sends a signed-out visitor to sign in, back to the edit page', async () => {
    vi.mocked(requireAccount).mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(saveReviewEdit(editStart, anEditForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(requireAccount).toHaveBeenCalledWith({ returnTo: `/experiences/${PUBLIC_ID}/edit` });
    expect(reviews.updateOwnReview).not.toHaveBeenCalled();
  });

  it('refuses an invalid sentiment and a too-long body next to their fields', async () => {
    const state = await saveReviewEdit(
      editStart,
      anEditForm({ sentiment: 'five-stars', body: 'x'.repeat(10_001) }),
    );

    expect(state.fieldErrors).toEqual({
      sentiment: 'errors.common.validation',
      body: 'formErrors.compose.bodyTooLong',
    });
    expect(reviews.updateOwnReview).not.toHaveBeenCalled();
  });
});
