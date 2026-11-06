import { expect, test, type Page, type Response } from '@playwright/test';

// U41 (design § 8.4, BR2.1, BR1.x, ENT-011, AC12.4.1): what the built app sends and what the
// browser does with it. Needs the compose PostgreSQL and a seeded database, like demo.spec.ts.

type Locale = 'en' | 'bn';
const LOCALES: readonly Locale[] = ['en', 'bn'];

// A seeded patient (packages/test-support/src/seed/seed-accounts.ts), synthetic like every seed row.
const SEEDED_PATIENT = { email: 'abba_of_two@demo.rogikotha.local', password: 'demo-pass-2026!' };

// BR2.1, written out here so a change to `lib/security/headers.ts` has to change this spec too.
const STATIC_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  'x-frame-options': 'DENY',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
};

// ENT-011 on http: the session cookie keeps its plain name, the preference cookies are readable.
const SESSION_COOKIES = new Set(['rk.session_token', 'rk.dont_remember']);
const PREFERENCE_COOKIES = new Set(['rk.lang', 'rk.theme', 'rk.motion']);

type Violations = Window & { __cspViolations: string[] };

// Runs before the page's own scripts, so a violation during hydration is recorded too.
function recordCspViolations() {
  const recorder = window as unknown as Violations;
  recorder.__cspViolations = [];
  document.addEventListener('securitypolicyviolation', (event) => {
    recorder.__cspViolations.push(
      `${event.violatedDirective} ${event.blockedURI} at ${event.sourceFile}:${event.lineNumber}:${event.columnNumber}`,
    );
  });
}

function nonceOf(policy: string | undefined): string {
  const nonce = /'nonce-([^']+)'/.exec(policy ?? '')?.[1];
  if (nonce === undefined) throw new Error('no nonce in the Content-Security-Policy header');
  return nonce;
}

/** Fails the test when any request leaves the app's own origin (AC12.4.1). */
function watchOrigins(page: Page, origin: string): string[] {
  const offOrigin: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') return;
    if (url.origin !== origin) offOrigin.push(request.url());
  });
  return offOrigin;
}

async function load(page: Page, path: string): Promise<Response> {
  const response = await page.goto(path);
  if (response === null) throw new Error(`no response for ${path}`);
  return response;
}

/** The five storyboard pages of design § 8.4, found by following links from the seeded data. */
async function fivePages(page: Page, locale: Locale): Promise<string[]> {
  await load(page, `/${locale}/doctors`);
  await page.getByTestId('doctor-entry').first().getByRole('link').first().click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/doctors/[^/]+$`));
  const doctor = new URL(page.url()).pathname;
  await load(page, `/${locale}`);
  await page.getByTestId('experience-row-title-link').first().click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/experiences/[^/]+$`));
  const experience = new URL(page.url()).pathname;
  return [`/${locale}`, `/${locale}/doctors`, doctor, experience, `/${locale}/sign-in`];
}

test.describe('security headers', () => {
  for (const locale of LOCALES) {
    test(`sends the BR2.1 headers, a nonce CSP and no X-Powered-By on /${locale}`, async ({
      page,
    }) => {
      const headers = (await load(page, `/${locale}`)).headers();

      for (const [name, value] of Object.entries(STATIC_HEADERS)) {
        expect(headers[name], name).toBe(value);
      }
      expect(headers['x-powered-by']).toBeUndefined();
      expect(headers['content-security-policy']).toContain("'strict-dynamic'");
      expect(headers['content-security-policy']).not.toContain("'unsafe-eval'");
    });

    test(`gives every load of /${locale} a new nonce that every script carries`, async ({
      page,
    }) => {
      const first = await load(page, `/${locale}`);
      const second = await load(page, `/${locale}`);
      const firstNonce = nonceOf(first.headers()['content-security-policy']);
      const secondNonce = nonceOf(second.headers()['content-security-policy']);

      expect(firstNonce).not.toBe(secondNonce);
      const html = await second.text();
      const scripts = html.match(/<script\b[^>]*>/g) ?? [];
      expect(scripts.length).toBeGreaterThan(0);
      for (const tag of scripts) {
        expect(tag, tag).toContain(`nonce="${secondNonce}"`);
      }
    });

    test(`reports no CSP violation on five pages in ${locale}`, async ({ page, baseURL }) => {
      const offOrigin = watchOrigins(page, new URL(baseURL ?? '').origin);
      const consoleViolations: string[] = [];
      page.on('console', (message) => {
        if (/Content Security Policy/i.test(message.text())) consoleViolations.push(message.text());
      });
      await page.addInitScript(recordCspViolations);

      const byPage: Record<string, string[]> = {};
      for (const path of await fivePages(page, locale)) {
        await load(page, path);
        await page.waitForLoadState('networkidle');
        byPage[path] = await page.evaluate(() => (window as unknown as Violations).__cspViolations);
      }
      expect(Object.values(byPage).flat(), JSON.stringify(byPage)).toEqual([]);
      expect(consoleViolations).toEqual([]);
      expect(offOrigin).toEqual([]);
    });
  }

  // BR1.4: the root not-found page renders outside the `[locale]` layout; `/fr` matches no route.
  test('reports no CSP violation on the root not-found page', async ({ page }) => {
    await page.addInitScript(recordCspViolations);
    const response = await load(page, '/fr');
    await page.waitForLoadState('networkidle');

    expect(response.status()).toBe(404);
    const violations = await page.evaluate(() => (window as unknown as Violations).__cspViolations);
    expect(violations).toEqual([]);
  });

  test('holds only the ENT-011 cookies with their attributes after signing in', async ({
    page,
    context,
    baseURL,
  }) => {
    const offOrigin = watchOrigins(page, new URL(baseURL ?? '').origin);
    await load(page, '/en/sign-in?next=%2Fen%2Fme');
    await page.locator('#f-signin-email').fill(SEEDED_PATIENT.email);
    await page.locator('#f-signin-password').fill(SEEDED_PATIENT.password);
    await page.getByTestId('signin-form-submit-button').click();
    await expect(page.getByTestId('masthead-account-menu-button')).toBeVisible();

    const cookies = await context.cookies();
    const host = new URL(baseURL ?? '').hostname;
    expect(cookies.map((cookie) => cookie.name)).toContain('rk.session_token');
    for (const cookie of cookies) {
      const known = SESSION_COOKIES.has(cookie.name) || PREFERENCE_COOKIES.has(cookie.name);
      expect(known, `unexpected cookie ${cookie.name}`).toBe(true);
      expect(cookie.domain, cookie.name).toBe(host);
      expect(cookie.path, cookie.name).toBe('/');
      expect(cookie.sameSite, cookie.name).toBe('Lax');
      expect(cookie.secure, cookie.name).toBe(false);
      expect(cookie.httpOnly, cookie.name).toBe(SESSION_COOKIES.has(cookie.name));
    }
    expect(offOrigin).toEqual([]);
  });
});
