import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';

import { expect, test, type APIResponse } from '@playwright/test';

import { E2E_HOST, E2E_ORIGIN, E2E_PORT } from '../helpers/env';
import { forEachLocale } from '../helpers/locale';
import { msg } from '../helpers/messages';

// BR2.8: U41's outcomes end to end on the built app: the CSP header, the Host and Origin
// refusals and the upload cap before the body. Runs only in chromium-desktop; the CSP rows of
// every page `checkPage` saw are re-read by log-scan.spec.ts once every journey has run.

const FOREIGN_HOST = 'evil.example';
const FOREIGN_ORIGIN = `http://${FOREIGN_HOST}`;
const UPLOAD_PATH = '/api/evidence/upload';
// Far above the 15 MB file cap plus its multipart room, so the exact cap value never matters.
const DECLARED_BYTES = 64 * 1024 * 1024;
const SENT_BYTES = 64 * 1024;
const RAW_TIMEOUT_MS = 15_000;

/** The release-1 public pages a signed-out visitor reaches from the masthead and footer. */
const PUBLIC_PAGES = [
  '',
  '/doctors',
  '/experiences',
  '/sign-in',
  '/register',
  '/about',
  '/terms',
  '/privacy',
];

interface RawAnswer {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
  /** Request body bytes written before the answer arrived. */
  written: number;
}

/**
 * One request over node:http, because the browser and Playwright's request context both fix
 * the Host header and the body length themselves.
 */
function rawRequest(options: {
  method: string;
  path: string;
  headers: Record<string, string>;
  declaredBytes?: number;
  sendBytes?: number;
}): Promise<RawAnswer> {
  return new Promise((resolve, reject) => {
    let written = 0;
    const headers = { ...options.headers };
    if (options.declaredBytes !== undefined)
      headers['content-length'] = String(options.declaredBytes);
    const req = httpRequest(
      { host: E2E_HOST, port: E2E_PORT, method: options.method, path: options.path, headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
            written,
          });
          // The rest of a declared body is never sent; the socket goes with the answer.
          req.destroy();
        });
        res.on('error', reject);
      },
    );
    req.setTimeout(RAW_TIMEOUT_MS, () =>
      req.destroy(new Error(`No answer within ${RAW_TIMEOUT_MS} ms (${written} bytes sent)`)),
    );
    // A reset after the answer is a no-op: the promise has already settled.
    req.on('error', reject);
    if (options.sendBytes !== undefined) {
      const chunk = Buffer.alloc(options.sendBytes, 0x61);
      req.write(chunk, () => {
        written += chunk.length;
      });
      // The request stays open: the declared rest never follows.
    } else {
      req.end();
    }
  });
}

/** `<status> <messageKey>`, so two refusals can be told apart whatever their shape. */
async function refusalOf(response: APIResponse): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { messageKey?: string } };
    return `${response.status()} ${body.error?.messageKey ?? ''}`;
  } catch {
    return `${response.status()} (not JSON)`;
  }
}

forEachLocale('SEC CSP', 'on every public page', async ({ request, locale }) => {
  for (const path of PUBLIC_PAGES) {
    const response = await request.get(`/${locale}${path}`);
    expect(response.status(), `/${locale}${path}`).toBe(200);
    expect(
      response.headers()['content-security-policy'] ?? '',
      `content-security-policy on /${locale}${path}`,
    ).not.toBe('');
  }
});

// Runs after Step 34 rebase: the Host check is U41's.
forEachLocale('SEC Host', 'a foreign Host is refused', async ({ locale }) => {
  const answer = await rawRequest({
    method: 'GET',
    path: `/${locale}`,
    headers: { host: FOREIGN_HOST, accept: 'text/html' },
  });
  expect(answer.status, `GET /${locale} with Host ${FOREIGN_HOST}`).toBeGreaterThanOrEqual(400);
  expect(answer.status).toBeLessThan(500);
  expect(answer.body, 'no page body').not.toMatch(/<html/i);
  expect(answer.body, 'no demo marker').not.toContain(msg(locale, 'demo.banner'));
});

// Runs after Step 34 rebase: the Origin check on server actions is U41's (Next.js alone answers
// a foreign Origin with a 500).
test('SEC Origin a foreign Origin is refused on a server action', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('data-motion-ready', '');
  // ASSUMPTION(U50): the theme switch's server action is the harmless one to replay.
  const actionCall = page.waitForRequest(
    (req) => req.method() === 'POST' && req.headers()['next-action'] !== undefined,
  );
  await page.locator('#theme').click();
  const action = await actionCall;
  expect((await action.response())?.status(), 'the same-origin call itself').toBe(200);

  const headers = { ...(await action.allHeaders()) };
  for (const name of ['host', 'connection', 'content-length', 'cookie', 'origin', 'referer']) {
    delete headers[name];
  }
  const replay = await page.request.post(action.url(), {
    headers: { ...headers, origin: FOREIGN_ORIGIN },
    data: action.postDataBuffer() ?? '',
    maxRedirects: 0,
  });
  expect(replay.status(), `server action with Origin ${FOREIGN_ORIGIN}`).toBeGreaterThanOrEqual(
    400,
  );
  expect(replay.status()).toBeLessThan(500);
});

// Runs after Step 34 rebase: U41 owns the upload route's Origin check (U48 WF1 step 1).
test('SEC Origin a foreign Origin is refused on the upload route', async ({ request }) => {
  const form = { multipart: { reviewId: 'x' } };
  // Same origin, signed out: the route's own refusal, the control.
  const control = await request.post(UPLOAD_PATH, { ...form, headers: { origin: E2E_ORIGIN } });
  const foreign = await request.post(UPLOAD_PATH, { ...form, headers: { origin: FOREIGN_ORIGIN } });
  expect(foreign.status(), `${UPLOAD_PATH} with Origin ${FOREIGN_ORIGIN}`).toBeGreaterThanOrEqual(
    400,
  );
  expect(foreign.status()).toBeLessThan(500);
  // ASSUMPTION(U50): a refusal the same-origin call also gets would not prove the Origin check.
  expect(await refusalOf(foreign), 'refused by the Origin check, not the route').not.toBe(
    await refusalOf(control),
  );
});

test('SEC upload cap a declared length above the cap is refused before the body', async () => {
  const answer = await rawRequest({
    method: 'POST',
    path: UPLOAD_PATH,
    headers: {
      origin: E2E_ORIGIN,
      'content-type': 'multipart/form-data; boundary=e2e-cap-boundary',
    },
    declaredBytes: DECLARED_BYTES,
    sendBytes: SENT_BYTES,
  });
  expect(answer.status, `${UPLOAD_PATH} declaring ${DECLARED_BYTES} bytes`).toBeGreaterThanOrEqual(
    400,
  );
  expect(answer.status).toBeLessThan(500);
  // The signed-out refusal would mean the length was never looked at first. Getting any answer
  // proves "before the full body": only SENT_BYTES ever leave, and a server that waited for the
  // declared rest would hit RAW_TIMEOUT_MS.
  expect(answer.status, 'refused by the cap, not by the sign-in check').not.toBe(401);
});
