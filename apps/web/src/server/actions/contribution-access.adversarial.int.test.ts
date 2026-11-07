// Adversarial test (U9 plan Step 14, angle 4; BR8.1, BR8.3): an account that registered but never
// confirmed its address signs in with its password and tries to write and comment anyway. The
// gate must not answer `allowed`, and the publish and comment actions must refuse it on their own,
// because a page that skips the gate (or a hand-built POST) reaches them directly.
// The publish path is U47's `publishDraftAction` (the review module); the comment path is still the
// demo slice's `postComment`, which U49 replaces.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { optionalEnv } from '../env';
import {
  formOf,
  newRequest,
  signedOutBrowser,
  stateOf,
  submit,
  thrownBy,
} from './auth-adversarial-test-support';

vi.mock('next/headers', async () =>
  (await import('./auth-adversarial-test-support')).cookieJarModule(),
);
vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT ${target}`);
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('en') }));
vi.mock('@/i18n/routing', () => ({
  redirect: vi.fn((target: unknown) => {
    throw new Error(`NEXT_REDIRECT ${JSON.stringify(target)}`);
  }),
}));
vi.mock('@rogikotha/i18n', () => ({
  redirect: vi.fn((target: unknown) => {
    throw new Error(`NEXT_REDIRECT ${JSON.stringify(target)}`);
  }),
}));

const RUN = Date.now().toString(36);
const EMAIL = `adv.gate+${RUN}@example.test`;
const PASSWORD = 'a synthetic secret 2026';
// Well-formed but unknown: an action that answers "not found" has already let the account through.
const REVIEW_PUBLIC_ID = 'exp0000001';

beforeAll(async () => {
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  const { register, signIn } = await import('./auth');
  const { INITIAL_AUTH_STATE } = await import('./auth-form');

  signedOutBrowser();
  await submit(() =>
    register(
      INITIAL_AUTH_STATE,
      formOf({
        email: EMAIL,
        password: PASSWORD,
        username: `gate_${RUN}`,
        displayName: 'Gate Demo',
        locale: 'en',
        age: 'on',
        terms: 'on',
      }),
    ),
  );
  // No confirm step: the account stays `pending_verification`, and sign-in still lets it in.
  newRequest();
  const signedIn = await submit(() =>
    signIn(INITIAL_AUTH_STATE, formOf({ email: EMAIL, password: PASSWORD })),
  );
  expect(thrownBy(signedIn)).toContain('NEXT_REDIRECT');
}, 90_000);

afterAll(async () => {
  // The demo actions reach the pool through the `@/` alias; end it once whichever way it loaded.
  const pools = new Set([
    (await import('../db')).getDb().$client,
    (await import('@/server/db')).getDb().$client,
  ]);
  await Promise.all([...pools].map((pool) => pool.end()));
});

describe('an unconfirmed account trying to contribute (BR8.1)', () => {
  it('is not allowed by the contribution gate', async () => {
    newRequest();
    const { getContributionAccess } = await import('./account');

    await expect(getContributionAccess()).resolves.toBe('unconfirmed');
  });

  it('cannot post a comment by calling the comment action directly', async () => {
    newRequest();
    const { postComment } = await import('./comments');

    const outcome = await submit(() =>
      postComment(
        { status: 'idle' },
        formOf({ reviewPublicId: REVIEW_PUBLIC_ID, body: 'A synthetic adversarial comment.' }),
      ),
    );

    // Refused by the guard, as a signed-out visitor is, before any data is read: a returned
    // `errors.common.notFound` for the review means the account got past it.
    expect(stateOf(outcome)).toBeNull();
    expect(thrownBy(outcome)).toContain('NEXT_REDIRECT');
  }, 60_000);

  it('cannot publish a review by calling the publish action directly', async () => {
    newRequest();
    const { publishDraftAction } = await import('./review');

    // A well-formed draft id that no account owns: a command past its authorization would answer
    // with a missing draft, not the unconfirmed-address refusal of the module's requirements.
    const outcome = await submit(() =>
      publishDraftAction({
        draftId: '0190f5a2-0000-7000-8000-0000000000f1',
        identityMode: 'named',
        attestation: true,
      }),
    );

    expect(stateOf(outcome)).toMatchObject({ formError: 'errors.auth.emailUnverified' });
    expect(thrownBy(outcome)).toBeNull();
  }, 60_000);
});
