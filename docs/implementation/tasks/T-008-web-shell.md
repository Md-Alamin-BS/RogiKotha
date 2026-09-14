# T-008 — Web shell (Next.js app, locale routing, ported CSS, layouts, chrome, placeholder pages)

| Field | Value |
|---|---|
| Story | STORY-FOUND-001 — Architecture-enforced application foundation; STORY-PLAT-001 (locale routing, `lang`, skip link, live region) |
| Phase / Lane | 0 / B |
| Class → model | M2 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | high |
| Estimate | 4–6 h agent; validation 1.5 h |
| Depends on | T-003, T-006 |
| Parallel-safe with | T-004, T-005, T-007, T-009 |

## Goal

Stand up `apps/web` as a Next.js 16 App Router application with `/{locale}` routing via next-intl, the three prototype stylesheets ported verbatim, a patient layout and a staff layout that reproduce the prototype chrome (masthead, tabs, controls, colophon, skip link, live region, demo marker), a health route, and a placeholder page for every URL in the route map so navigation works end to end in both languages and both themes before any content task lands.

## Read first

1. `docs/implementation/01-conventions.md` §7 (CSS port rules — follow literally), §8 (React port rules), §9 (routing), §6 (i18n)
2. `docs/implementation/03-routes-and-contracts.md` §1 (every URL, which are `noindex`, the `/api/health` shape)
3. `docs/implementation/00-master-plan.md` §3 (Next 16.3.4, React 19.3.0, next-intl 4.14), §1 (what is dropped: demo panel, scheme picker, role switcher)
4. `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/index.html` — the whole file (masthead, tabs, controls, `#sr-live`, tray, overlay, colophon; the synchronous `<script>` that sets `lang` becomes server rendering)
5. `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` lines 1–48 (`state`), 49–110 (`esc`, `bn`, `setLang`, `setTheme`, `currentIsDark`, `setMotion`, `motionAllowed`), 112–260 (`VIEWS`, `ROUTES`, `LEGACY_SLUG`, `route()`, `titleForView`), 165–181 (`setTitle`, `announce`, `setNoindex`), 2412–2441 (`trapFocus`, `openSheet`, `closeSheet`)
6. `ui-design-prototype/admin/index.html` — whole file; `ui-design-prototype/admin/app.js` lines 103–222 (`VIEWS`, `ICONS`, `NAV_GROUPS`, `navCounts`, `renderNav`, `renderTabBar`, `renderCrumbs`), 224–260 (`announce`, `route`, `renderAll`)
7. `ui-design-prototype/shared/tokens.css`, `…/concept-04b-quiet-clinic-minimal/styles.css`, `…/admin/styles.css` — read the top 60 lines of each for the scoping selectors (`:root`, `:root[data-theme="dark"]`, `html[data-lang="bn"]`, `body[data-motion="off"]`, `body[data-view]`)
8. `docs/design/rogikotha-dev-spec.md` "Screens", "State", "Visual system", "Staff console"
9. Official Next.js 16 docs: App Router `app/[locale]` with next-intl (the `proxy.ts` file — Next 16 renamed `middleware` to `proxy`), `transpilePackages`, global CSS import rules, `generateMetadata`, `cookies()` in server components

## Owned paths

Create: `apps/web/next.config.ts`, `apps/web/proxy.ts`, `apps/web/src/app/layout.tsx` (root pass-through), `apps/web/src/app/page.tsx` (root redirect), `apps/web/src/app/[locale]/layout.tsx`, `apps/web/src/app/[locale]/(patient)/layout.tsx`, `apps/web/src/app/[locale]/(patient)/**/page.tsx` (placeholders for every patient URL), `apps/web/src/app/[locale]/admin/layout.tsx`, `apps/web/src/app/[locale]/admin/**/page.tsx` (placeholders), `apps/web/src/app/api/health/route.ts`, `apps/web/src/app/not-found.tsx`, `apps/web/src/styles/{tokens,patient,admin,globals}.css`, `apps/web/src/components/shared/{SkipLink,LiveRegion,DemoMarker,Icon,Sheet,ThemeControls}.tsx`, `apps/web/src/components/patient/{Masthead,Tabs,Colophon,ViewShell}.tsx`, `apps/web/src/components/admin/{Masthead,ConsoleNav,TabBar,Crumbs,Colophon}.tsx`, `apps/web/src/lib/{announce.ts,titles.ts,cookies.ts,metadata.ts}`, `apps/web/src/server/actions/preferences.ts` (theme/motion/lang cookie actions), `apps/web/src/i18n/{routing.ts,request.ts}` (thin re-exports from `@rogikotha/i18n`), `apps/web/src/**/*.test.tsx`, `apps/web/vitest.config.ts`, `apps/web/vitest.setup.ts`, `apps/web/tsconfig.json` (rewrite from T-001 stub), `apps/web/next-env.d.ts`
Modify: `apps/web/package.json`

## Not in scope

- Any data: pages render titles and an empty `.view` section only. No database access, no `server/container.ts` (T-101 creates it).
- Sign-in/account menu (T-102): the masthead renders the signed-out `.ctl` glyph only, linking to `/sign-in`.
- The compare tray, sheets' content, notifications count — later tasks; only the `Sheet` primitive exists here.
- PWA (T-501), CSP headers (T-502).

## Steps

1. `pnpm --filter @rogikotha/web add next@16.3.4 react@19.3.0 react-dom@19.3.0 next-intl@^4.14.2` and `-D @types/react@^19 @types/react-dom@^19 @testing-library/react@^16.3.3 @testing-library/jest-dom@^6 @testing-library/user-event@^14 jsdom@^30 @vitejs/plugin-react@^5`. Pin `next`/`react`/`react-dom` **exactly** (no caret) — Next is patch-sensitive (master plan §3). Scripts: `dev: next dev --port 3000`, `build: next build`, `start: next start`, `typecheck: tsc --noEmit`, `test: vitest run`.
2. `next.config.ts`: `transpilePackages: ['@rogikotha/contracts','@rogikotha/i18n','@rogikotha/application','@rogikotha/domain']`, `experimental.typedRoutes: true` if stable in 16.3 (check; else omit), wrap with `createNextIntlPlugin('./src/i18n/request.ts')`, `poweredByHeader: false`, `images: { unoptimized: true }` (no remote images). `tsconfig.json`: extend base, `"jsx": "preserve"`, `"plugins": [{ "name": "next" }]`, `"paths": { "@/*": ["./src/*"] }`, include `next-env.d.ts`, `.next/types/**/*.ts`.
3. `proxy.ts` (Next 16's name for middleware): `createMiddleware(routing)` from next-intl with `matcher: ['/((?!api|_next|.*\\..*).*)']`. Locale detection order (conventions §9): `rk.lang` cookie → `Accept-Language` prefers `bn` → `en`. Set `localeDetection` accordingly and test with `curl -H "Accept-Language: bn" -I http://localhost:3000/` → `302` to `/bn`.
4. CSS port (conventions §7): copy the three files **byte for byte** into `src/styles/` (`cp`, not retyping). Then, and only then, apply the minimal edits: (a) none expected in `tokens.css`; (b) in `patient.css` and `admin.css`, grep for `url(` — there are none — and for `#view-` id selectors; keep them (the placeholder pages render `<section class="view" id="view-<name>">` exactly). Add `globals.css` containing only `@import './tokens.css';` plus the `.sr-only` rule if it is not already in both sheets. Record every edit as `/* changed: T-008 <reason> */` in the file. `impeccable detect` must stay at zero findings.
5. Root `app/layout.tsx` returns children unchanged (next-intl needs the `[locale]` layout to own `<html>`). `app/page.tsx`: `redirect` to the cookie/Accept-Language locale (same logic as the proxy; the proxy normally handles it, this is the fallback).
6. `app/[locale]/layout.tsx`: validate `locale` with `hasLocale(routing.locales, locale)` else `notFound()`; `setRequestLocale(locale)`; read cookies `rk.theme` (`light|dark|null`), `rk.motion` (`on|off`); render `<html lang={locale} data-lang={locale} data-theme={theme ?? undefined} data-scheme={undefined}>` and `<body data-motion={motion}>`; `NextIntlClientProvider` with messages; `<LiveRegion/>` once. No `<script>` for lang — SSR sets it (the prototype's synchronous script exists only because it was static).
7. `(patient)/layout.tsx`: imports `../../../styles/globals.css` and `patient.css` (App Router allows global CSS imports only in layouts — this is why the two sheets live in two layouts); renders `<SkipLink/>`, `<DemoMarker/>` (`<p class="demo" role="note">` with `demo.banner`), `<Masthead/>` (brand, `<Tabs/>`, `.cta-write` → `/write`, `<ThemeControls/>` with `#lang` `#theme` `#motion` `.ctl` buttons — the `⌘` gallery link and `◇` demo button are **dropped**), `<div class="progress" aria-hidden>`, `<main id="main">{children}</main>`, `<Colophon/>` (foot-nav emergency/about, `disclaimer.long`, `.foot-demo`). Sets `data-app="patient"` on body via a client effect? No — set it from the layout: since `<body>` is owned by `[locale]/layout.tsx`, pass the app kind down with a `data-app` attribute set through a tiny server-side context (simplest: `[locale]/layout.tsx` reads the pathname via `headers().get('x-pathname')` set by `proxy.ts` and derives `data-app = pathname includes '/admin' ? 'admin' : 'patient'`). Document the mechanism in `lib/cookies.ts`.
8. `data-view`: each page calls `<ViewShell view="discover" title=…>` which renders `<section class="view" id="view-discover">` and sets `body[data-view]` via `useEffect` in a client component `ViewAttr` (the prototype's CSS scopes by `body[data-view]`; SSR mismatch is acceptable for a data attribute — mark it `suppressHydrationWarning`). Prefer setting it server-side through the same header trick if it proves simple; document which you chose.
9. `ThemeControls` (client): three buttons with the prototype's glyphs and `aria-pressed`/`title` from i18n; `অ` is a `Link` to the same pathname in the other locale (next-intl `usePathname` + `Link locale=`), plus calls the `setLang` server action to write `rk.lang`; `◐` calls `setTheme(next)` server action (cycles `light → dark → system` like `setTheme` in `app.js:88`), `◌` calls `setMotion`. Server actions in `server/actions/preferences.ts` set cookies (`sameSite: 'lax'`, `path: '/'`, 1 year) and `revalidatePath('/', 'layout')`.
10. `LiveRegion` + `useAnnounce()` (`lib/announce.ts`): `<div id="sr-live" class="sr-only" aria-live="polite" role="status">`; the hook writes text, clears after 1 s (mirror `announce()` at `app.js:170` and `admin/app.js:224`); `ViewShell` announces `View: <title>` on mount.
11. `Sheet` (client): the prototype's `.overlay > .sheet[role=dialog][aria-modal][aria-labelledby=sheet-title]` with `.sheet-head` + close button + `.sheet-body`; focus trap and Escape (port `trapFocus`/`releaseFocusTrap`, `openSheet`/`closeSheet`); returns focus to the trigger. Exposed as `<Sheet open title onClose>{children}</Sheet>`; no content yet — a smoke test opens/closes it.
12. `Icon`: `ICONS` paths from `admin/app.js:123` (inbox, shield, idcard, bell, sliders) plus a `person` path for the sign-in control; `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" …>` matching the prototype's `icon()` markup.
13. Admin layout (`admin/layout.tsx`): imports `globals.css` + `admin.css`; `<meta name="robots" content="noindex">` via `metadata`; masthead per `admin/index.html` (brand with `admin.portal`, `.staff-badge`, `<ConsoleNav/>` from `NAV_GROUPS` with counts **0** for now, `.controls` with lang/theme only — the `#role` switcher and the `↗` gallery link are dropped; a read-only role chip is added by T-103), `<main id="main"><div class="wrap"><Crumbs/>{children}</div></main>`, `<TabBar/>` (bottom, < 760 px — the CSS handles the breakpoint), colophon with `admin.staffOnlyNote` and `admin.permissionNote`. No auth guard yet (T-103); add a `// TODO(T-103): staff guard` marker.
14. Placeholder pages — one `page.tsx` per URL in 03 §1 (patient: `/`, `/search`, `/doctors`, `/doctors/[id]`, `/facilities`, `/facilities/[id]`, `/topics`, `/topics/[id]`, `/experiences`, `/experiences/[id]`, `/write`, `/me`, `/me/security`, `/saved`, `/notifications`, `/authors/[username]`, `/emergency`, `/about`, `/terms`, `/privacy`, `/register`, `/sign-in`, `/verify-email`, `/reset-password`; admin: `/admin` (redirect), `/admin/queue`, `/admin/queue/[code]`, `/admin/evidence`, `/admin/providers`, `/admin/notifications`, `/admin/config`, `/admin/sign-in`, `/admin/approve-device`, `/admin/security`). Each: `generateMetadata` using `lib/titles.ts` (port of `titleForView` — the static branches; dynamic titles are filled by the owning task with `// TODO(T-xxx)`), `<ViewShell view=… >` with the page's `h1.display` from the matching `nav.*`/`admin.tab.*` key and a `.note` reading the i18n key `shell.placeholder` (add to both dictionaries: en "This screen arrives with task {task}." / bn "এই স্ক্রিনটি টাস্ক {task}-এ আসবে।" — the one allowed cross-package edit; list it in the hand-off). `robots: { index: false }` on `/me*`, `/authors/*`, `/admin/*`, auth routes (`lib/metadata.ts` helper `noindex()`).
15. `/api/health/route.ts`: returns `{ ok: true, db: 'unknown', queue: 'unknown', mail: 'unknown', scanner: 'unknown', mode: process.env.APP_MODE }` — real probes are wired by T-101 (db), T-009 (queue), T-304 (scanner). `not-found.tsx`: bilingual "Not found" using `results.none` + a link home.
16. Tests (`vitest.config.ts`: `environment: 'jsdom'`, `setupFiles: ['./vitest.setup.ts']` with jest-dom, React plugin): render `Masthead` in `en` and `bn` (`NextIntlClientProvider` with the real messages) and assert the six tab labels and the write CTA text; `ThemeControls` toggles `aria-pressed`; `Sheet` traps focus and closes on Escape, returning focus; `LiveRegion` receives text from `useAnnounce`; `titles.ts` returns the prototype's titles for each static view in both locales.
17. Manual check: `pnpm dev` → open `/en`, `/bn`, `/bn/doctors`, `/en/admin/queue` — chrome renders with the prototype's look (compare side by side with `pnpm tools:serve` → `http://localhost:8137/ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`); toggle theme/motion/lang; check `<html lang>` in view-source; 360 px width shows the admin bottom tab bar. Run `npx impeccable detect apps/web/src --no-advisory`. Commit: `T-008: Next.js shell with locale routing, ported stylesheets, patient and staff chrome`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Pins exact | `pnpm ls --filter @rogikotha/web next react react-dom` | `16.3.4`, `19.3.0`, `19.3.0` |
| Build | `pnpm --filter @rogikotha/web build` | exit 0; every placeholder route listed |
| Root redirect | `curl -sI -H "Accept-Language: bn" http://localhost:3000/ \| grep -i location` | `/bn` |
| Cookie wins | `curl -sI -H "Cookie: rk.lang=en" -H "Accept-Language: bn" http://localhost:3000/ \| grep -i location` | `/en` |
| Lang attribute SSR | `curl -s http://localhost:3000/bn \| grep -o '<html[^>]*>'` | contains `lang="bn" data-lang="bn"` |
| Theme cookie SSR | `curl -s -H "Cookie: rk.theme=dark" http://localhost:3000/en \| grep -o '<html[^>]*>'` | contains `data-theme="dark"` |
| CSS byte-identical except marked edits | `diff <(grep -v "changed: T-008" apps/web/src/styles/patient.css) ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/styles.css` | empty (same for tokens/admin) |
| Noindex | `curl -s http://localhost:3000/en/me \| grep -o '<meta name="robots"[^>]*>'` | `noindex` |
| Admin noindex | same for `/en/admin/queue` | `noindex` |
| Health | `curl -s http://localhost:3000/api/health` | JSON `ok: true` |
| Detector | `npx impeccable detect apps/web/src --no-advisory` | zero findings |
| Component tests | `pnpm --filter @rogikotha/web test` | green, both locales |
| Unknown locale | `curl -sI http://localhost:3000/fr` | 404 |

## Tests to write

- `components/patient/Masthead.test.tsx`: "renders the six tabs and the write CTA in English", "…in Bengali", "the language control links to the same path in the other locale".
- `components/shared/ThemeControls.test.tsx`: "theme button reflects the current theme", "motion button toggles aria-pressed".
- `components/shared/Sheet.test.tsx`: "traps focus inside the dialog", "Escape closes and returns focus to the trigger".
- `components/shared/LiveRegion.test.tsx`: "announce writes to the live region and clears".
- `lib/titles.test.ts`: "static view titles match the prototype in both locales".
- `components/admin/ConsoleNav.test.tsx`: "renders Casework and Oversight groups with aria-current on the active item".

## Hard-rule checklist

- [ ] Persistent disclaimer present (colophon `disclaimer.long`) and emergency reachable from the foot-nav.
- [ ] Bengali and English both work; `<html lang>` correct server-side; no cap-transform in Bengali (CSS ported unchanged).
- [ ] Synthetic marker visible (`.demo` banner in both layouts).
- [ ] No agent/tool attribution in any file or commit.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
