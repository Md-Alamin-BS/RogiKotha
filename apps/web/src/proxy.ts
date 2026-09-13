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
import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// 01-conventions.md §7: the [locale] layout cannot read the current
// pathname any other way (nested layouts don't get route params for
// sibling segments), so the proxy stamps it onto the request headers.
// next-intl's own middleware builds its outgoing request headers with
// `new Headers(request.headers)` (carrying this header through) before
// adding its locale header, so setting it before delegating is sufficient —
// no need to touch the response next-intl returns.
export default function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-pathname', request.nextUrl.pathname);
  const requestWithPathname = new NextRequest(request, { headers });
  return intlMiddleware(requestWithPathname);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
