// Next 16 renamed `middleware.ts` to `proxy.ts` (docs/status/dependency-check-log.md
// 2026-09-13 T-008 entry); next-intl's createMiddleware usage is unchanged.
// ASSUMPTION(T-008): the task file's own "Owned paths" list names this file
// `apps/web/proxy.ts`, but Next.js only ever looks for it beside the `app`
// directory's PARENT (`getPossibleMiddlewareFilenames` in
// next/dist/.../build/utils.js resolves to `path.join(appDir, '..')`, i.e.
// `apps/web/src` here, not `apps/web`) — verified empirically (a proxy.ts at
// the package root was silently never invoked; moving it to `src/` made the
// locale redirect and the `x-pathname` header both work). This also matches
// 01-conventions.md §1's own file tree, which already lists
// `apps/web/src/proxy.ts`. See ISS list in the T-008 hand-off.
//
// U41 (WF1, WF2, WF2b): every matched request gets the Host check and, for an unsafe method, the
// Origin check before anything else; page requests also get a fresh nonce CSP.
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { buildCsp, newNonce } from './lib/security/csp';
import { HSTS_VALUE } from './lib/security/headers';
import { NONCE_HEADER } from './lib/security/nonce';
import { checkRequest, type RefusedDecision } from './lib/security/origin';
import { refusalResponse } from './lib/security/refusal';
import { loadSecuritySettings, logRequestRefused, type SecurityGuard } from './security-settings';

const intlMiddleware = createMiddleware(routing);

const CSP_REQUEST_HEADER = 'content-security-policy';

export type ProxyGuard = Pick<SecurityGuard, 'loadSecuritySettings' | 'logRequestRefused'>;

function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

// Static files, the image optimizer and the development endpoints: next-intl would redirect them
// to a locale (R8).
function isNextInternalPath(pathname: string): boolean {
  return pathname.startsWith('/_next/') || pathname.startsWith('/__nextjs');
}

export function createProxy(guard: ProxyGuard) {
  function refuse(decision: RefusedDecision): Response {
    guard.logRequestRefused(decision.kind);
    return refusalResponse(decision.kind);
  }

  return function proxy(request: NextRequest): Response {
    const settings = guard.loadSecuritySettings();
    if (settings === null) return refusalResponse('settings_invalid');
    const { pathname } = request.nextUrl;

    // ISS-696: Next.js still runs a server action posted to an internal path such as `/_next/x`,
    // so those paths get the Origin rule for an unsafe method as well as the Host check.
    const decision = checkRequest(request, settings);
    if (decision.outcome === 'refused') return refuse(decision);

    if (isNextInternalPath(pathname)) return NextResponse.next();

    if (isApiPath(pathname)) {
      const response = NextResponse.next();
      if (settings.https) response.headers.set('Strict-Transport-Security', HSTS_VALUE);
      return response;
    }

    const nonce = newNonce();
    const policy = buildCsp({ nonce, https: settings.https, development: settings.development });

    // 01-conventions.md §7: the [locale] layout cannot read the current
    // pathname any other way (nested layouts don't get route params for
    // sibling segments), so the proxy stamps it onto the request headers.
    // next-intl's own middleware builds its outgoing request headers with
    // `new Headers(request.headers)` (carrying these headers through) before
    // adding its locale header, so setting them before delegating is sufficient.
    // Next.js reads the nonce for its own scripts from the request's CSP header.
    const headers = new Headers(request.headers);
    headers.set('x-pathname', pathname);
    headers.set(NONCE_HEADER, nonce);
    headers.set(CSP_REQUEST_HEADER, policy);
    let response: Response = intlMiddleware(new NextRequest(request, { headers }));

    // R-07: next-intl answers a path `decodeURI` rejects with a bare `NextResponse.next()`, which
    // would hand the page the client's own `x-nonce` and CSP request headers.
    // ASSUMPTION(U41): only a pass-through without an override is replaced; a redirect needs none.
    if (
      response.headers.has('x-middleware-next') &&
      !response.headers.has('x-middleware-override-headers')
    ) {
      response = NextResponse.next({ request: { headers } });
    }

    response.headers.set('Content-Security-Policy', policy);
    if (settings.https) response.headers.set('Strict-Transport-Security', HSTS_VALUE);
    return response;
  };
}

export default createProxy({ loadSecuritySettings, logRequestRefused });

// ENT-016 as amended at U41 review-01 (ISS-718): only the upload route, which guards itself, is
// unmatched. Next.js ran a server action posted to `/robots.txt` and to a missing `/_next/static/x`,
// and a pattern cannot tell a missing file from a real one, so static paths get the checks too.
export const config = {
  matcher: ['/((?!api/evidence/upload$).*)'],
};
