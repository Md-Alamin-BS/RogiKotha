# T-501 — PWA: manifest, icons, safe shell caching, sign-out purge

| Field | Value |
|---|---|
| Story | STORY-PLAT-002 (FR-PWA-001/002); touches STORY-PLAT-001 |
| Phase / Lane | 5 / B |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 2–3 h agent; validation 1 h |
| Depends on | T-008 (shell), T-102 (sign-out action exists), T-207 (emergency/about pages exist), T-011 (design and motion system, FD-091) |
| Parallel-safe with | T-410, T-502 (T-502 must merge after this task so its CSP covers `sw.js`), T-406–T-409 |

## Amendments — patient redesign and motion (FD-091)

This decision is binding and overrides the text below where they differ.

- **FD-091 — patient redesign and motion** — Pages are built on the T-011 tokens, classes and motion components (`RouteTransition`), not on the concept 04b styles. The prototype stays the source of truth for content, data, structure and behaviour (copy, fields, states, flows, hard-rule wording), but not for the look. The project rule of 2026-10-27 (`project.md`, Code Style) overrides the team.md verbatim-CSS rule for patient pages; verbatim port applies only to the staff console. Page-specific styles go in this Unit's own section of `patient.css` (append-only, each rule marked `/* added: T-501 reason */`) and use only T-011 tokens and class names. Tokens, shell styles and motion rules belong to T-011; a Unit that needs a new token asks for it through an ISSUES.md row instead of editing `tokens.css` or `motion.css`. Prototype class names are kept only where T-011 kept them. Changes: Depends on, Read first, step 1, the motion step and the acceptance checks.

## Goal

Make the patient app installable and progressively enhanced without ever caching private,
health-adjacent or authenticated content. Only an explicit allowlist of public shell routes and
versioned static assets is cached; every private route, API route and auth screen is on a deny list
that is tested, not assumed. Sign-out purges every cache.

## Read first

1. `docs/implementation/00-master-plan.md` §1–§4, §7
2. `docs/implementation/01-conventions.md` §7, §8, §9, §11, §13
3. `docs/implementation/03-routes-and-contracts.md` §1 (URL map; the deny list below is derived from it)
4. `docs/planning/08-product-backlog.md` — STORY-PLAT-002 acceptance ("only allowlisted public shell assets are available and private/dashboard/review-draft/evidence responses are absent from all caches")
5. `docs/planning/01-requirement-baseline.md` — search for "PWA" (no sensitive offline caching)
6. `apps/web/src/app/[locale]/layout.tsx` and `apps/web/src/server/actions/account.ts` (sign-out action) as they exist after T-102
7. `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/index.html` lines 20–45 (brand mark markup — the icon shape; FD-091: its colours follow the T-011 palette)

## Owned paths

Create:
- `apps/web/public/icons/` (generated PNGs: `icon-192.png`, `icon-512.png`, `maskable-512.png`, `apple-touch-icon.png`)
- `apps/web/scripts/build-icons.mjs` (sharp: renders `apps/web/src/assets/brand-mark.svg` → the PNGs; `pnpm --filter web icons`)
- `apps/web/src/assets/brand-mark.svg` (the `.brand-mark` shape from the prototype, teal-gray on paper, no text)
- `apps/web/src/app/manifest.webmanifest/route.ts` (EN manifest) and `apps/web/src/app/[locale]/manifest.webmanifest/route.ts` (locale-specific name/short_name/description/lang/start_url)
- `apps/web/public/sw.js` (hand-written service worker; **no Workbox**)
- `apps/web/src/app/[locale]/(patient)/offline/page.tsx` (offline fallback, both locales)
- `apps/web/src/components/shared/ServiceWorkerRegistration.tsx` (`'use client'`; registers `/sw.js`, listens for sign-out purge flag, posts `SKIP_WAITING`)
- `apps/web/e2e/pwa-cache-inventory.spec.ts` (see Tests)
- `apps/web/src/lib/pwa/cache-policy.ts` (the allowlist/denylist as data, imported by both the SW build step and the test)
- `apps/web/scripts/build-sw.mjs` (inlines `cache-policy.ts` constants + a build hash into `public/sw.js`; runs in `prebuild`)

Modify:
- `apps/web/src/app/[locale]/layout.tsx` — add `<link rel="manifest">`, `<meta name="theme-color">` (light + dark via `media`), apple-touch-icon link, `<ServiceWorkerRegistration/>`
- `apps/web/src/server/actions/account.ts` — sign-out action sets cookie `rk.purge=1` (short-lived, non-httpOnly) before redirect
- `apps/web/package.json` — `icons`, `build:sw` scripts; `prebuild` hook
- `packages/i18n/messages/en.json`, `bn.json` — `pwa.*` keys (below)

## Not in scope

Push notifications, background sync, offline drafts, caching any evidence artifact or API response,
an install-prompt banner, Workbox or any SW library, the staff console (never cached, never
installable — its layout must **not** render the manifest link or the registration component).

## Steps

1. **Manifest.** `/manifest.webmanifest` returns the EN manifest (`name: "RogiKotha"`, `short_name: "RogiKotha"`, `lang: "en"`, `start_url: "/en"`, `scope: "/"`, `display: "standalone"`, `background_color` = `--bg` light value from `tokens.css`, `theme_color` = same (FD-091: both are the T-011 palette values; the icons are redrawn in the T-011 palette, same brand mark shape), icons array with `purpose: "any"` and `"maskable"`). `/bn/manifest.webmanifest` returns the same with `name: "রোগীকথা"`, `short_name: "রোগীকথা"`, `lang: "bn"`, `start_url: "/bn"`. The patient layout links the manifest of the **current** locale, so an install from a Bengali session gets a Bengali name and starts in Bengali — this is why there are two manifests rather than one with a locale query string (browsers ignore query strings for manifest identity and would dedupe). Both routes set `Content-Type: application/manifest+json` and `Cache-Control: public, max-age=3600`.
2. **Icons.** Draw `brand-mark.svg` from the `.brand-mark` CSS in `patient.css` (it is a CSS shape; reproduce it as SVG paths, no text, no gradient). `build-icons.mjs` renders 192/512 with 10 % padding on `--bg`, and a maskable 512 with 20 % safe-zone padding. Commit the PNGs (< 60 KB total).
3. **Cache policy as data.** In `cache-policy.ts`:
   ```ts
   export const SHELL_ROUTES = ['/', '/en', '/bn', '/en/emergency', '/bn/emergency', '/en/about', '/bn/about', '/en/offline', '/bn/offline'];
   export const ASSET_PATTERNS = [/^\/_next\/static\//, /^\/icons\//, /^\/fonts\//]; // fonts dir is empty; kept for the pattern
   export const DENY_PATTERNS = [/^\/[a-z]{2}\/me(\/|$)/, /^\/[a-z]{2}\/write(\/|$)/, /^\/[a-z]{2}\/notifications(\/|$)/, /^\/[a-z]{2}\/saved(\/|$)/, /^\/[a-z]{2}\/admin(\/|$)/, /^\/api\//, /^\/[a-z]{2}\/(register|sign-in|verify-email|reset-password|sign-out)(\/|$)/, /^\/[a-z]{2}\/experiences\//, /^\/[a-z]{2}\/authors\//, /^\/[a-z]{2}\/search/];
   export const CACHE_VERSION = '__BUILD_HASH__';
   ```
   Experiences, author profiles and search results are **not** shell and are never cached (they carry user content; a hidden item must vanish immediately — AD-5).
4. **Service worker.** `sw.js` (plain JS, generated by `build-sw.mjs` which replaces `__BUILD_HASH__` and inlines the arrays): `install` → precache `SHELL_ROUTES` + the offline pages into `rk-shell-<hash>`; `activate` → delete every cache whose name ≠ current, `clients.claim()`. `fetch`: if request method ≠ GET or URL matches `DENY_PATTERNS` → **do not call `respondWith`** (pass through, never cached); if `ASSET_PATTERNS` → cache-first into `rk-assets-<hash>`; if `SHELL_ROUTES` (navigation request) → network-first with 3 s timeout, fallback cache, then `/{locale}/offline`; anything else → pass through. `message` handler: `{type:'SKIP_WAITING'}` → `self.skipWaiting()`; `{type:'PURGE'}` → delete all caches, reply `{type:'PURGED'}`.
5. **Registration + purge.** `ServiceWorkerRegistration` registers on `load` only when `navigator.serviceWorker` exists and the page is not under `/admin`. On mount, if cookie `rk.purge=1` exists → post `PURGE` to the controller (or to every registration's `active`), wait for `PURGED` (or 2 s), then delete the cookie. When `registration.waiting` appears → post `SKIP_WAITING` (silent update; no prompt).
6. **Sign-out.** The existing sign-out server action additionally sets `rk.purge=1` (`SameSite=Lax`, `Max-Age=60`, not httpOnly) before its redirect; the next patient page mount performs the purge. Also purge on `account.signOutEverywhere` and after `dataRequest.delete` completes (same cookie).
7. **Offline page.** `/offline` in both locales: kicker `pwa.offline.kicker`, H1 `pwa.offline.title`, body `pwa.offline.body`, a link to `/{locale}/emergency` (the emergency numbers are text, so they are available offline by design — say so in `pwa.offline.emergency`). Uses the normal patient layout; the emergency page is itself in `SHELL_ROUTES`.
8. **Head tags.** Manifest link (locale-specific), `theme-color` meta ×2 with `media="(prefers-color-scheme: …)"`, `apple-touch-icon`. Staff layout gets none of these.
9. **Strings.** Add to both dictionaries: `pwa.offline.kicker` ("Offline" / "অফলাইন"), `pwa.offline.title` ("You're offline" / "আপনি অফলাইনে আছেন"), `pwa.offline.body` ("This page needs a connection. Public reading, your workspace and documents are not stored on this device." / "এই পাতাটির জন্য সংযোগ দরকার। প্রকাশ্য পড়া, আপনার ওয়ার্কস্পেস ও নথি এই ডিভাইসে সংরক্ষিত থাকে না।"), `pwa.offline.emergency` ("Emergency numbers are still available." / "জরুরি নম্বরগুলো এখনো পাওয়া যাবে।"), `pwa.name` ("RogiKotha" / "রোগীকথা"), `pwa.description` ("Patient accounts of doctors and facilities in Bangladesh, in Bengali and English." / "বাংলাদেশের ডাক্তার ও স্বাস্থ্যকেন্দ্র নিয়ে রোগীদের অভিজ্ঞতা, বাংলা ও ইংরেজিতে।").
10. Run `pnpm check`, the e2e spec below, and `npx impeccable detect apps/web/src --no-advisory`.
11. **Motion (FD-091).** The offline page uses `RouteTransition` like the other patient pages. The service worker must not break view transitions or the `data-motion` setting: `motion.css` and the font files are plain static assets under `/_next/static/*` or `/fonts/*` and follow the same cache rules. The offline page has no animated retry or progress indicator that runs for more than 5 seconds (AC2.4.4).

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Manifests valid | `curl -s localhost:3000/manifest.webmanifest \| jq .lang` and `…/bn/manifest.webmanifest \| jq .name` | `"en"`; `"রোগীকথা"` |
| Lighthouse installable | Chrome DevTools → Application → Manifest | no errors; "installable" |
| SW scope and precache | DevTools → Application → Cache Storage after loading `/bn` | `rk-shell-<hash>` contains exactly the `SHELL_ROUTES`; `rk-assets-<hash>` contains only `/_next/static/*` and `/icons/*` |
| Deny list never cached | `pnpm e2e --grep pwa-cache-inventory` | passes: after visiting `/en/me`, `/en/write`, `/en/notifications`, `/en/experiences/<id>`, `/api/health`, `/en/admin/queue` (as staff) no cache key matches `DENY_PATTERNS` |
| Offline shell | DevTools offline → navigate `/bn` then `/bn/me` | `/bn` renders from cache; `/bn/me` shows the offline page |
| Sign-out purge | sign in, browse, sign out | Cache Storage is empty within 2 s of the next page load |
| Update flow | rebuild with a change, reload twice | old caches gone; no user prompt |
| Staff console excluded | load `/en/admin/sign-in` | no manifest link, no SW registration call (assert via `navigator.serviceWorker.getRegistrations()` scope) |
| Both locales | `/en/offline`, `/bn/offline` | strings present; numerals unaffected (none) |
| Quality gates | `pnpm check`; `npx impeccable detect apps/web/src --no-advisory` | green; zero findings |
| FD-091: motion check | `pnpm check:motion` | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens |
| FD-091: reduced-motion journey (AC2.4.3) | walk this Unit's pages with the OS reduced-motion setting, then with `data-motion="reduced"` | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never animated (AC2.4.4) |
| FD-091: detector and contrast on the new styles | `npx impeccable detect apps/web/src --no-advisory`; `pnpm contrast` | zero findings |
| FD-091: PWA colours and icons follow T-011 | open the manifest, the `theme-color` metas and the icon files | `theme_color`, `background_color` and the icons use the T-011 palette values (light and dark), not the 04b colours |

## Tests to write

- `apps/web/src/lib/pwa/cache-policy.test.ts` — table test: every URL in 03 §1 is classified exactly once as shell / asset / deny / passthrough; every private URL is `deny`.
- `apps/web/e2e/pwa-cache-inventory.spec.ts` (Playwright, Chromium): seed, sign in as `shirin_88`, visit the deny-listed pages plus one evidence artifact URL, then read `caches.keys()` and every `cache.keys()` in-page and assert none match `DENY_PATTERNS`; then trigger sign-out and assert `caches.keys()` is `[]`.
- `ServiceWorkerRegistration.test.tsx` — with a fake `navigator.serviceWorker`: registers only outside `/admin`; posts `PURGE` when the purge cookie is present and clears it.
- `build-sw.test.ts` — the generated `sw.js` contains the build hash and no `__BUILD_HASH__` placeholder; parses with `new Function`.

## Threat notes

Not an M3 task. Two notes for the validator anyway: (1) the SW must never `respondWith` for
deny-listed requests, because a cached `/api/evidence/artifacts/*` response would outlive a
moderator's `removeFile`; (2) `rk.purge` is a non-sensitive flag, not a token — nothing acts on its
value except deleting caches.

## Hard-rule checklist

- [ ] Persistent disclaimer and emergency guidance present on the offline page (it uses the patient layout).
- [ ] No private, evidence, search or experience response is cached (test evidence: cache-inventory spec).
- [ ] Bengali and English both work (offline page + Bengali manifest name).
- [ ] Synthetic marker still visible on cached shell pages (it is part of the layout).
- [ ] No agent/tool attribution in any file or commit.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
