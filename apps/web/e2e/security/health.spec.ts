import { expect, test } from '@playwright/test';

// BR2.9: with every compose service up, the health route reports all four probes ok. The
// stopped-scanner and stopped-mail cases are walked by hand in the record (BR10.3).

test('OPS health every probe is ok', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    ok: true,
    db: 'ok',
    queue: 'ok',
    mail: 'ok',
    scanner: 'ok',
    // The suite's web server runs with APP_MODE=demo (env.ts).
    mode: 'demo',
  });
});
