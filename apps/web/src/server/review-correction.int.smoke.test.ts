// U22 smoke (`web-int`, cumulative suite): a detailed review is published, its outcome corrected
// through the review module, and `getHistory` shows the Edited date, one correction line naming
// the outcome and the earlier outcome as the original. Real container against the compose test
// database; every record is synthetic.
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
const SECTIONS = {
  symptoms: 'A synthetic cough that lasted for three weeks and kept me awake at night.',
  diagnosis: 'The doctor explained it was a slow-healing chest infection.',
  treatment: 'A short course of tablets and plenty of rest at home.',
  after: 'The cough faded over the next two weeks.',
};

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

it('corrects the outcome of a detailed review and reads the correction back through getHistory', async () => {
  const call = (actor: Actor, address: string) => ({
    actor,
    request: request(address),
    ports: container.ports,
  });
  const registered = await registerCommand.execute(
    {
      email: `smoke.correct+${RUN}@example.test`,
      password: 'a synthetic secret 2026',
      username: `smc_${RUN}`,
      displayName: 'Smoke Corrector',
      locale: 'en',
      ageConfirmed: true,
      termsAccepted: true,
    },
    call(ANONYMOUS_ACTOR('en', newId()), '198.51.100.221'),
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

  const saved = await container.review.saveDraft.execute(
    {
      payload: {
        target: 'doctor',
        mode: 'detailed',
        relationship: 'self',
        period: { year: 2025, month: 3 },
        title: 'A detailed smoke visit',
        sections: SECTIONS,
        outcome: 'uncertain',
        notSure: true,
        identityMode: 'named',
        newDoctor: { name: `Dr. Synthetic Correct ${RUN_LETTERS}` },
      },
    },
    call(author, '198.51.100.222'),
  );
  if (!saved.ok) throw new Error(`saveDraft failed: ${saved.error.code}`);
  const published = await container.review.publish.execute(
    { draftId: saved.data.draftId, identityMode: 'named', attestation: true },
    call(author, '198.51.100.223'),
  );
  if (!published.ok) throw new Error(`publish failed: ${published.error.code}`);
  const publicId = published.data.publicId;

  const corrected = await container.review.correct.execute(
    {
      publicId,
      expectedVersion: 1,
      title: 'A detailed smoke visit',
      content: { kind: 'detailed', sections: SECTIONS },
      outcome: 'helped',
      claims: [],
    },
    call(author, '198.51.100.224'),
  );
  if (!corrected.ok) throw new Error(`correct failed: ${corrected.error.code}`);
  expect(corrected.data).toMatchObject({ publicId, version: 2, changed: true });

  const history = await container.review.getHistory.execute(
    { reviewPublicId: publicId },
    call(ANONYMOUS_ACTOR('en', newId()), '198.51.100.225'),
  );
  if (!history.ok) throw new Error(`getHistory failed: ${history.error.code}`);
  expect(history.data.editedAt).toEqual(expect.any(String));
  expect(history.data.corrections).toHaveLength(1);
  expect(history.data.corrections[0]).toMatchObject({
    fields: ['outcome'],
    original: { kind: 'detailed', outcome: 'uncertain' },
  });
  expect(history.data.versions).toBeUndefined();
}, 60_000);
