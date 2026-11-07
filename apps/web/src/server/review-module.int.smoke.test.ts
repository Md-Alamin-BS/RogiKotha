// U47 smoke (`web-int`, cumulative suite): a quick review published through the review module is
// read back through `getExperience`. This replaces the publish assertion of the demo slice's
// smoke test, whose writer was deleted with the demo code. Real container against the compose
// test database; every record is synthetic.
import { registerCommand, type CommandRequest } from '@rogikotha/application';
import { ANONYMOUS_ACTOR, newId, type Actor } from '@rogikotha/contracts';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';

import type { WebContainer } from './container';
import { optionalEnv } from './env';

vi.mock('next/headers', () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('en') }));

const RUN = Date.now().toString(36);
// A member-added doctor name takes letters only, so the run id is spelled in letters.
const RUN_LETTERS = RUN.replace(/\d/g, (digit) => 'abcdefghij'[Number(digit)] ?? 'x');
const STORY =
  'A synthetic smoke account: the doctor listened, explained the plan slowly and wrote it down.';

let container: WebContainer;

beforeAll(async () => {
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  container = (await import('./container')).getContainer();
});

afterAll(async () => {
  const { getDb } = await import('./db');
  await getDb().$client.end();
});

function request(address: string): CommandRequest {
  return {
    headers: new Headers({ 'x-forwarded-for': address }),
    clientAddress: address,
    sessionId: null,
  };
}

it('publishes a quick review through the review module and reads it back through getExperience', async () => {
  const call = (actor: Actor, address: string) => ({
    actor,
    request: request(address),
    ports: container.ports,
  });
  const registered = await registerCommand.execute(
    {
      email: `smoke.review+${RUN}@example.test`,
      password: 'a synthetic secret 2026',
      username: `smk_${RUN}`,
      displayName: 'Smoke Author',
      locale: 'en',
      ageConfirmed: true,
      termsAccepted: true,
    },
    call(ANONYMOUS_ACTOR('en', newId()), '198.51.100.201'),
  );
  if (!registered.ok) throw new Error(`register failed: ${registered.error.code}`);
  const author: Actor = {
    kind: 'account',
    accountId: registered.data.accountId,
    emailVerified: true,
    status: 'active',
    capabilities: [],
    locale: 'en',
    correlationId: newId(),
  };

  const doctorName = `Dr. Synthetic Smoke ${RUN_LETTERS}`;
  const saved = await container.review.saveDraft.execute(
    {
      payload: {
        target: 'doctor',
        mode: 'quick',
        relationship: 'self',
        period: { year: 2025, month: 3 },
        title: 'A calm smoke visit',
        story: STORY,
        notSure: true,
        identityMode: 'named',
        newDoctor: { name: doctorName },
      },
    },
    call(author, '198.51.100.202'),
  );
  if (!saved.ok) throw new Error(`saveDraft failed: ${saved.error.code}`);
  const published = await container.review.publish.execute(
    { draftId: saved.data.draftId, identityMode: 'named', attestation: true },
    call(author, '198.51.100.203'),
  );
  if (!published.ok) throw new Error(`publish failed: ${published.error.code}`);

  const page = await container.review.getExperience.execute(
    { publicId: published.data.publicId },
    call(ANONYMOUS_ACTOR('en', newId()), '198.51.100.204'),
  );
  if (!page.ok) throw new Error(`getExperience failed: ${page.error.code}`);
  expect(page.data).toMatchObject({
    publicId: published.data.publicId,
    reviewKind: 'quick',
    title: 'A calm smoke visit',
    story: STORY,
    byline: { personaKind: 'named', displayName: 'Smoke Author' },
    doctor: { name: doctorName, memberAddedNotConfirmed: true },
  });
}, 60_000);
