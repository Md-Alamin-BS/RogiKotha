# Dependency check log

Tracks when an agent last verified that this project's libraries,
frameworks, and other dependencies are on a current **stable** release
(see [AGENTS.md](../../AGENTS.md) — "Check dependency versions before
implementing something new").

Rules:

- Before starting a new/first-time integration or a big feature, check the
  most recent entry below that covers the relevant dependency/dependencies.
- If it's less than 3 days old, skip re-checking.
- Otherwise, check now and append a new entry above the previous ones
  (newest first), following the format below.

## Entry format

```
### YYYY-MM-DD

- Scope: <what was being implemented that triggered this check>
- Checked: <dependency/framework names and versions considered>
- Findings: <current stable version vs. latest version, and whether latest
  is safe to use or has known issues; link sources if useful>
- Decision: <version(s) actually used, and why>
```

## Entries

### 2026-11-05 (U9 T-102 — patient auth screens)

- Scope: T-102 builds the pending, confirm, reset and security screens as forms on server actions
  (`useActionState`, `redirect()` and `cookies().set` inside an action, native form POST without
  JavaScript). The entry covering `next`, `react` and `next-intl` (2026-10-29) is older than 3
  days. No new dependency is added.
- Checked:
  - `next`: installed 16.3.4; npm `latest` 16.4.5 (2026-11-03), 16.4.4 (2026-11-02). The 16.4.5
    release notes fix seven moderate advisories: `'use cache'` disclosure and poisoning
    (GHSA-mfr8-8qww-v76h, GHSA-vc7v-qv4w-wrv8, GHSA-vvgp-ww4w-46vf, GHSA-rhh4-g77r-r9qj), response
    injection when a self-hosted app forwards fetched responses (GHSA-pc58-hwjq-p385), an SVG
    rejection bypass in image optimisation (GHSA-7qx7-33qx-rqx2), and an HttpOnly cookie exposure
    through an internal header on Edge runtime routes (GHSA-f3mh-rxg3-f5g2).
  - `react`/`react-dom`: installed 19.3.0; npm `latest` 19.3.1.
  - `next-intl`: installed 4.14.4; npm `latest` 4.14.9 (2026-10-02). 4.14.5–4.14.9 change
    `useExtracted`, the SWC plugin, a peer dependency and pathname reads in `useRouter`/`Link`;
    none touches `getLocale`, `getTranslations`, `createTranslator` or `redirect`.
- Findings: `useActionState` with a server function as its action keeps progressive enhancement
  (the form posts natively before hydration and the page renders the returned state), and
  `redirect()` and `cookies().set()`/`delete()` inside a server action are the documented pattern
  on Next 16. None of the 16.4.5 advisories is on a path this Unit uses: no `'use cache'`, no image
  optimisation, no Edge runtime route, no forwarded fetch response. The cookie exposure is
  Edge-runtime only; the app runs on Node.
- Decision: keep `next` 16.3.4, `react`/`react-dom` 19.3.0 and `next-intl` 4.14.4 for this Unit
  (a framework bump is its own task, as on 2026-10-29). No new FD entry is needed: U9 changes no
  hard rule, data boundary or founder decision (FD-053, FD-057, FD-096, FD-103, FD-104 cover it).
  A `next` patch bump to 16.4.5 is proposed as a separate issue row.

### 2026-10-30 (U8 T-101 — Better Auth behind the application boundary)

- Scope: T-101 installs Better Auth for the first time (`apps/web`), and the first `@node-rs/argon2`
  and `nodemailer` uses in production code (`packages/adapters`). The Better Auth entry
  (2026-09-10) and the `@node-rs/argon2` entry (2026-09-13) are older than 3 days, and nodemailer
  had none (design F17, BR7.8).
- Checked:
  - `better-auth`: npm `latest` 1.7.14 (2026-10-26); 1.7.x patches from 1.7.3 (2026-09-06) to
    1.7.14; `beta` 1.8.0-beta.3 (prerelease, not used). Peers on 1.7.14: `next ^14 || ^15 || ^16`,
    `react ^18 || ^19`, `drizzle-orm ^0.45.2 || >=1.0.0-rc.1`, `pg ^8`, all met by the pins
    (Next 16.3.4, React 19.3.0, drizzle-orm 0.45.2, pg 8.23). The GitHub security advisories
    (github.com/better-auth/better-auth/security/advisories, read 2026-10-30) since 1.7.3 concern
    plugins this Unit does not enable (SSO, OAuth proxy, magic link, device login, SCIM, Stripe),
    plus one low-severity Drizzle-adapter advisory (GHSA-44jh-23m7-hpcf, concurrent requests pass
    the library rate limit on PostgreSQL); the library limiter is only defence in depth here, the
    `RateLimiter` port decides (BR7.5).
  - `nodemailer`: npm `latest` 10.3.1 and 10.3.0 were both published on 2026-10-29, the day of
    this check; 10.2.1 (2026-10-22) is the previous patch. CHANGELOG: 10.0.0 (Node 20+, TypeScript
    with its own types, `NoAuth` renamed `ENOAUTH`, TLS validation on by default), 10.1.0 (security
    hardening against resource exhaustion; no environment variables read at import), 10.2.0
    (`err.permanent`), 10.2.1 (`stripComments`), 10.3.x (OTP header). No advisory open.
  - `@node-rs/argon2`: npm `latest` 2.2.2 (2026-10-06); the lockfile already holds 2.2.1 for
    `packages/test-support` (seed). No advisory; parameters m=65536, t=3, p=1 unaffected.
- Findings: Better Auth 1.7.14 is the current stable line with its peers met; `pnpm add` printed no
  peer warning. Nodemailer 10.3.x is a few hours old, so the previous patch is preferred; it ships
  its own type declarations, so no `@types/nodemailer` is needed.
- Decision: `better-auth@1.7.14` (exact) in `apps/web`; `nodemailer@10.2.1` (exact, one week old,
  avoiding the same-day 10.3.x) and `@node-rs/argon2@^2.2.1` (the lockfile's 2.2.1, one copy with
  the seed) in `packages/adapters`. The master plan's 1.7.3 pin is superseded by the 1.7.14 patch on
  the same minor line.
### 2026-10-30 (demo slice — Better Auth and Argon2id in apps/web)

- Scope: intent `261030-demo-slice` (FD-099), plan Step 2: first install of `better-auth` and `@node-rs/argon2` into `apps/web`.
- Checked: `better-auth` dist-tags (`latest` 1.7.14 of 2026-10-26, `beta` 1.8.0-beta.3, `release-1.6` 1.6.33); its peer ranges (`next ^16`, `react ^19`, `drizzle-orm ^0.45.2`, `pg ^8`); its bundled `@better-auth/drizzle-adapter` 1.7.14. `@node-rs/argon2` `latest` 2.2.2 (the seed already uses `^2.2.0`).
- Findings: 1.7.14 is the newest patch of the stable 1.7 line, which carries the CVE fixes recorded in the 2026-09-10 entry; 1.8 is still beta and is not adopted. The peer ranges match this repo (Next 16.3.4, React 19.3.0, Drizzle 0.45.2), and pnpm resolved a single `drizzle-orm@0.45.2` instance for `database`, `worker` and `web`. The Drizzle adapter reads columns by the Drizzle table's property names, so `packages/database/src/schema/auth.ts`'s camelCase properties need only a `modelName` mapping, not the `fields` mapping its header comment lists. Better Auth telemetry is off by default and is set off explicitly.
- Decision: `better-auth@~1.7.14` and `@node-rs/argon2@^2.2.2` in `apps/web`, Argon2id with the seed's parameters (m=64 MiB, t=3, p=1).

### 2026-10-29 (U45 T-011 — patient design and motion system)

- Scope: T-011 adds the first web font (Hind Siliguri 600 through `next/font/local`), the first use of
  React's `<ViewTransition>` in this app, a Playwright smoke (installed in plan Step 9), and re-runs
  impeccable as a UI gate. No entry under 3 days old covers any of them. The Prettier 3.9.6 entry of
  2026-10-28 (T-010) is reused: it is one day old and this Unit changes no Prettier version.
- Checked:
  - `next` 16.3.4 (installed; npm `latest` 16.4.3, 2026-10-23) and its bundled React: the App Router
    runs `next/dist/compiled/react` `19.3.0-canary-cbb046ab-20260731`, which exports
    `ViewTransition` and `addTransitionType`; installed `react`/`react-dom` 19.3.0 (npm `latest`
    19.3.1, 2026-10-14). Next's view-transitions guide (nextjs.org/docs/app/guides/view-transitions,
    updated 2026-10-15) and the React reference (react.dev/reference/react/ViewTransition).
    `next/dist/lib/needs-experimental-react.js` on 16.3.4 lists no view-transition flag, and
    `<Link transitionTypes>` is in `dist/client/app-dir/link.d.ts`.
  - `next/font/local` on 16.3.4 (`dist/compiled/@next/font/dist/local/index.d.ts`): options `src`,
    `display`, `weight`, `style`, `adjustFontFallback` (`'Arial' | 'Times New Roman' | false`),
    `fallback`, `preload`, `variable`, `declarations` (used for `unicode-range`).
  - Hind Siliguri: google/fonts `ofl/hindsiliguri` (`METADATA.pb`: Indian Type Foundry, licence OFL,
    five static weights) and its `OFL.txt` (`https://raw.githubusercontent.com/google/fonts/main/ofl/hindsiliguri/OFL.txt`, sha256
    `4b255eb44f613a8e426e195f0d0b7e10fcba1af7eb6047d9a7f4f3c449940e19`, 4,371 B; "Copyright (c)
    2015 Indian Type Foundry", SIL OFL 1.1, no Reserved Font Name). The weight-600 Bengali subset
    served by the Google Fonts CSS2 API
    (`https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@600&display=swap`, file
    `https://fonts.gstatic.com/s/hindsiliguri/v14/ijwOs5juQtsyLLR5jN4cxBEoREP-0vQVKxGv.woff2`):
    74,784 B, sha256 `b92b5da6d4f4f6de315f093f26a4e20d7ce7876a7db3ae7dda6a92fc5c3cc7c4`; its name
    table reads "Hind Siliguri SemiBold", version 1.001, `usWeightClass` 600, licence URL
    `http://scripts.sil.org/OFL`, 492 glyphs; its CSS `unicode-range` is `U+0951-0952, U+0964-0965,
    U+0980-09FE, U+1CD0, U+1CD2, U+1CD5-1CD6, U+1CD8, U+1CE1, U+1CEA, U+1CED, U+1CF2, U+1CF5-1CF7,
    U+200C-200D, U+20B9, U+25CC, U+A8F1, U+11DF0-11DF1`.
  - `@playwright/test` (npm `latest` 1.64.1, 2026-10-14; 1.64.0, 2026-10-07; 1.63.0, 2026-09-04)
    with the GitHub release notes; `npm view` of `@playwright/test`, `playwright` and
    `playwright-core` 1.64.1 (no install scripts, `node >=20`).
  - impeccable (npm `latest` 4.8.0, 2026-10-26; 4.7.0, 2026-10-19; 4.6.0, 2026-10-15) with the
    GitHub release notes.
- Findings:
  - React `<ViewTransition>` ships in React 19.3.0 (release notes 2026-09-09) and works in the App
    Router with no configuration on Next 16.3.4; the React reference page still shows a canary
    version string. React applies `view-transition-name` and `view-transition-class` through the
    element's style property (CSP note for T-502, not a style attribute). A keyed boundary whose
    key changes in a Transition becomes an exit and enter pair, a shared pair when both sides carry
    the same `name`, and the deleted side's `share` prop picks the class; `update="none"` stops
    update animations; `default="none"` keeps a named boundary still during unrelated transitions;
    React skips animations on popstate (back and forward); React does not apply reduced motion
    itself. 19.3.1 lists no view-transition change; Next 16.4.0–16.4.3 list no `next/font` or
    view-transition fix that touches this Unit (16.4.3's font fix is for Google font URLs). The
    plan Step 4 spike confirms the behaviour on the pins (below).
  - Hind Siliguri may be self-hosted and subset under OFL 1.1 (no Reserved Font Name, so the subset
    keeps the family name). The Google Fonts subset is that OFL font, already cut to the Bengali
    `unicode-range`, below the 80,000 B budget of `entities.md` ENT-010. `next/font/local`'s
    automatic fallback metrics target Arial or Times, which hold no Bengali glyphs, so they would
    add a fallback face that never matches the Bengali system stack.
  - Playwright 1.64.1 is a patch release that fixes two 1.64.0 regressions (Electron packaged-app
    windows; Chromium 155+ cross-origin redirects with routes), bundles Chromium 156, and is 15 days
    old, so pnpm 11's `minimumReleaseAge` (one day by default; no override in this repository)
    accepts it. 1.64.0's breaking changes (device `screen` forwarding, JSX in tests following
    `tsconfig.json`, `--update-snapshots=missing`, hidden-iframe elements) do not touch a new
    Chromium-only smoke. The packages have no install script, so `pnpm install` downloads no browser
    (CI runs no Playwright until T-503).
  - impeccable 4.6.0–4.8.0 add `--github`, `--list-rules`, `--cdp` and new detection rules
    (`straggler`, `unbalanced-heading`, hard-offset shadows as advisory); none changes `detect`'s
    exit codes, `--no-advisory` or the `.impeccable/config.json` format.
- Decision:
  - Keep `next` 16.3.4 and `react`/`react-dom` 19.3.0 (a bump is its own task, as the 2026-10-27
    research advised); use `ViewTransition` from `react`.
  - Commit the Google Fonts Bengali subset at weight 600 as
    `apps/web/src/app/fonts/HindSiliguri-SemiBold-bengali.woff2` (74,784 B, sha256 above) with the
    google/fonts `OFL.txt` beside it, loaded by `next/font/local` with `display: 'swap'`,
    `preload: false`, the Bengali `unicode-range` above through `declarations`,
    `adjustFontFallback: false` and the system Bengali stack as `fallback`. `*.woff2 binary` is
    added to `.gitattributes` first (ISS-178).
  - Plan Step 9 adds `@playwright/test` 1.64.1 as an exact devDependency of `apps/web`; Chromium
    comes from `npx playwright install chromium`.
  - Run impeccable as `npx impeccable detect apps/web/src --no-advisory`, which resolves 4.8.0 today
    (no devDependency, as on 2026-09-10).
- Spike confirmation (plan Step 4, 2026-10-29, `next start` of the Bolt branch in headless Chrome
  157.0.8103.27): a `<ViewTransition key={path} name="page" default="none" update="none">` in the
  patient layout, with enter, exit and share mapped to `rk-page`, runs one view transition per path
  change (`::view-transition-old(page)` 160 ms, `::view-transition-new(page)` 240 ms) and none for a
  theme toggle, a search-parameter change or back and forward. A language switch is a same-document
  navigation that remounts the `[locale]` subtree, so it pairs the `page` boundaries and animates
  unless the navigation carries a transition type mapped to `none` (`rk-language`; next-intl 4.14.4's
  `Link` forwards `transitionTypes` to `next/link`). Record:
  `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/t-011-patient-design-and-motion-system/code-generation/code-summary.md`.

### 2026-10-29 (U3 T-010 review fixes — CI service image digest)

- Scope: the T-010 review (R-05) asked to pin the CI `postgres:18` service image by digest, as the
  actions are pinned by commit.
- Checked: Docker Hub `postgres:18` with `docker buildx imagetools inspect postgres:18`
  (2026-10-29): an OCI image index, digest
  `sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4`, whose `linux/amd64`
  manifest is `sha256:f4b419e350fd98d4a8429603295208976dea4c8fb8326d818d346d3e29f1db6f`,
  `org.opencontainers.image.version` 18.6, created 2026-10-28 on `debian:trixie-slim`. PostgreSQL
  18.6 release notes (postgresql.org/docs/release/18.6/).
- Findings: 18.6 (2026-08-13) is a regular minor and security release and still the newest 18.x
  (18.5 was skipped for a regression); no dump or restore from 18.x. Its upgrade notes (GIN
  `reltuples`, `btree_gist` and `ltree` reindex, `COPY ... FROM STDIN` terminators in test
  scripts, `output_plugin_libraries`, pgcrypto `ignore-cipher-failure`) do not touch this
  project's empty-database CI run. The image built 2026-10-28 is a base-image rebuild of the same
  18.6; the local compose image is also 18.6 (`PG_VERSION=18.6-1.pgdg13+2`), from an earlier build.
- Decision: `.github/workflows/check.yml` uses
  `postgres:18@sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4`, the
  multi-platform index digest (the tag is kept for readers; the digest decides). The compose file
  keeps the floating `postgres:18` tag for local work (the 2026-09-13 T-002 decision); bumping the
  CI digest is a deliberate edit with a new entry here.

### 2026-10-28 (U3 T-010 — boundary lint, coverage floor, format check, CI)

- Scope: T-010 adds the first import-boundary plugin and a TypeScript import resolver for it,
  switches on `@vitest/coverage-v8` (installed, never configured), makes Prettier part of the gate
  and writes the first GitHub Actions workflow. No earlier entry covers any of these.
- Checked: `eslint-plugin-boundaries` (npm `latest` 7.4.0, 2026-10-27; 7.3.0, 2026-10-23; 7.2.1,
  2026-10-21; 6.0.0, 2026-03-15) with its `packages/eslint-plugin/CHANGELOG.md`, release list and
  open issues; `eslint-import-resolver-typescript` (npm `latest` 4.4.5, 2026-06-01); the installed
  `eslint` 10.10.0 (npm `latest` 10.13.0), `typescript-eslint` 8.70.0 (`latest` 8.72.1, peer
  `eslint ^8.57 || ^9 || ^10`); `@vitest/coverage-v8` and `vitest` 4.1.11 (`latest` 5.0.5; 4.1.12
  released 2026-10-15) with the 4.1.11 `docs/config/coverage.md`; `prettier` 3.9.6 (`latest`
  3.9.10); `dependency-cruiser` 18.7.0 (fallback only); `actions/checkout` v7.0.1
  (`3d3c42e5aac5ba805825da76410c181273ba90b1`, 2026-07-20), `actions/setup-node` v7.1.0
  (`949feb2413d6458794dcd2491c4babbbce0c15c1`, 2026-10-08), `pnpm/action-setup` v6.1.0
  (`ea17c68df8912ef543352723c149a84f56e3d413`, 2026-09-05); Docker Hub `postgres:18`.
- Findings: `eslint-plugin-boundaries` declares peer `eslint >=6.0.0`; 6.0.1 fixed its config
  helper types for ESLint 10, and v7 documents flat config throughout, so ESLint 10 flat config is
  supported and the `dependency-cruiser` fallback is not needed. Current rules are
  `boundaries/dependencies` (with `policies`, `checkAllOrigins` for externals and `to.module.*`
  selectors), `boundaries/no-unknown-files` and `boundaries/no-unknown-dependencies`;
  `element-types` and `external` are deprecated aliases. 7.3.0 replaced `micromatch` with
  `picomatch` (removes the unpatched `braces` advisory) and fixed `basePattern`; 7.4.0 fixes the
  `node:`-only built-ins' origin, extglob matching and a cache bug that could change errors from
  one run to the next (#568). 7.4.0 is a non-prerelease release, one day old, with no open bug
  issue against it. TypeScript sources need `eslint-import-resolver-typescript` (the plugin's
  default node resolver does not read `paths` or map `.js` specifiers to `.ts`); 4.4.5 is five
  months old and declares `eslint-plugin-import` as an optional peer. Vitest 4.1.11: uncovered
  files appear only through `coverage.include`; glob thresholds are per pattern and not inherited;
  `perFile` defaults off, so a glob threshold is an aggregate. Vitest 5 is a new major and stays
  out of this Unit. The action hashes above are the release tags' commits and are re-read when the
  workflow is written (plan Step 15).
- Decision: add `eslint-plugin-boundaries` 7.3.0 and `eslint-import-resolver-typescript` 4.4.5 as
  exact root devDependencies. 7.4.0 was refused by pnpm 11's `minimumReleaseAge` policy (it and its
  `@boundaries/elements` 3.3.0 were under a day old), and adopting it would mean adding them to
  `minimumReleaseAgeExclude`; 7.3.0 is five days old and its #568 cache bug only touches dot files
  inside element folders, of which the source roots hold none (checked with `find`). Move to 7.4.x
  in a later Unit once it has aged. `unrs-resolver`'s postinstall (a `napi-postinstall` check that
  re-fetches the native binding) is denied in `pnpm-workspace.yaml` `allowBuilds`; the binding
  arrives as a platform optionalDependency. Keep `eslint` 10.10.0, `typescript-eslint` 8.70.0,
  `vitest` and `@vitest/coverage-v8` 4.1.11 (they move in lockstep) and `prettier` 3.9.6, because
  this Unit changes no installed version.
- Re-check at plan Step 15 (2026-10-28, `git ls-remote` and the GitHub releases API): the three
  tags still point at the commits above (`pnpm/action-setup` v6.1.0 is an annotated tag whose
  commit is `ea17c68…`), and each is still its repository's latest release. The workflow pins
  these commits.

### 2026-10-28 (U4 CR-011 — transactional outbox relay, queue policy, quiet dotenv)

- Scope: CR-011 relies on three behaviours of the pinned libraries: pg-boss `send(..., { db })` on
  the relay's own transaction, the `exclusive` queue policy, and dotenv's `quiet` option. The last
  entries for pg-boss (2026-09-14) and dotenv (2026-09-13, under T-004) are older than 3 days.
- Checked: pg-boss installed 12.31.0 (`pnpm ls`; `package.json` `^12.31.0`, lockfile 12.31.0)
  against npm `latest` 12.38.0 (2026-10-13) and the GitHub release notes 12.31.1 to 12.38.0.
  dotenv installed 17.4.2 against npm `latest` 18.0.9 (2026-10-22) and the dotenv `CHANGELOG.md`
  for 18.0.0 to 18.0.9. Source read in `node_modules`: pg-boss `dist/manager.js` (`createJob`,
  `getQueueCache`, `createQueue`, `getQueue`) and `dist/plans.js` (`insertJobs`, `job_i6`); dotenv
  `lib/main.js` (`quiet`, `DOTENV_CONFIG_QUIET`).
- Findings: pg-boss 12.31.0 runs a send's insert on `options.db` when one is given; the queue
  lookup before it (`getQueueCache`) uses pg-boss's own pool and throws `Queue <name> does not
  exist` once the queue is missing from its 60 s cache. The `exclusive` index is unique on
  `(name, COALESCE(singleton_key, ''))` for states up to `active`. Known issue on the pinned
  version, confirmed by the 12.37.0 notes: a send to a queue whose row is gone while it is still
  cached resolves `null`, the same answer as a de-duplication. 12.37.0 changes that to a rejection
  (inside a `db` transaction, a `23503` at `COMMIT`); a later pin upgrade must keep the relay's
  batch rollback for that case. No release from 12.31.1 to 12.38.0 changes `send`, `createQueue`
  or the `exclusive` policy in a way this Unit depends on; 12.37.1 fixes fetching from
  `singleton`/`stately` queues only. dotenv 17.4.2 honours `quiet: true` and re-reads
  `DOTENV_CONFIG_QUIET` after loading the file; 18.0.0 is a new major (a CLI, an opt-in fast
  parser) with nine patches in five weeks, two of them about how `quiet` is read.
- Decision: keep pg-boss 12.31.0 and dotenv 17.4.2 (CR-011 changes no version). The relay confirms
  every `null` (BR3.6) and treats a thrown missing-queue error as a batch fault, which covers both
  the pinned and the 12.37+ behaviour. Revisit dotenv 18 once its patch rate settles.

### 2026-10-11 (AWS AI-DLC 2.11.0 — process tooling upgrade)

- Scope: upgrade AI-DLC from 2.10.0 to 2.11.0 for both harnesses (Claude Code, Codex CLI) before
  the first intent.
- Checked: GitHub releases of `awslabs/aidlc-workflows` — 2.11.0 marked Latest (2026-10-08); newer
  builds are `2.11.1-preview.*` pre-releases only. Release notes, upgrade guide
  (`docs/guide/18-install-and-lifecycle.md` @ v2.11.0) and the issues/PRs that matter here:
  #1545 (Git Bash launcher) and #1589 / PR #1526 (ownership manifest claimed project files) are fixed
  in 2.11.0; #2117 / PR #2131 (fixed claim-commit identity) is fixed only after 2.11.0 and is moot in
  solo Unit ownership. Open and relevant: #2244 (cache files block Code Generation completion),
  #2263, #1631, #1575/#1548, #1278, #2282. Details:
  `docs/planning/research/aidlc-migration-2026-10-11/research.md`.
- Findings: 2.11.0 defaults Guard Policy `off` and lead-agent-only stages outside `enterprise`;
  knowledge onboarding requires copies under `knowledge/documents/` and has no Word extractor.
- Decision: upgrade and pin 2.11.0; stay off the preview channel. Result: `aidlc update`,
  `aidlc config --pin 2.11.0`, per-harness dry runs (`remove=0`, `conflict=0`; Claude 15 create /
  194 update, Codex 15 create / 203 update), refresh, `aidlc doctor` 0 problems after replacing the
  hand-made Git Bash forwarder with 2.11.0's launcher.

### 2026-10-04 (AWS AI-DLC — process tooling)

- Scope: Install AWS AI-DLC (`awslabs/aidlc-workflows`) as the project's development method,
  configured for Claude Code and Codex CLI. Conversion of existing resources is deferred
  (`docs/aidlc-migration/README.md`).
- Checked: AI-DLC 2.10.0 (GitHub release marked Latest, 2026-09-24) vs
  2.10.1-preview.20261003.2 (pre-release, 2026-10-03); 2.9.1 previews. Licence MIT-0. Installer
  `install.ps1` verifies SHA-256 checksums and GitHub attestations. Codex harness needs
  Codex CLI ≥ 0.145.0 (Codex not installed on this machine at check time); Claude Code 2.1.289
  local.
- Findings: 2.10.0 is the current stable; everything newer is a daily preview. 2.10.0 release
  notes list no known issues; it adds harness coexistence (Claude + Codex in one repo) and Windows
  drive-letter fixes. The Claude harness registers about 12 hooks in `.claude/settings.json`; the
  guard hooks fail open outside an active code-generation stage. The unit-claim registry commits
  as `AI-DLC Unit Claims <aidlc-unit@local>` — conflicts with the no-tool-identity rule in
  `AGENTS.md`; recorded as an open decision in the migration file.
- Decision: install and pin 2.10.0 (`.aidlc-version`). Do not follow the preview channel. Strip
  the AWS MCP servers from `.mcp.json` (project does not run on AWS); keep `context7`.
- Install result: 2.10.0 has a Windows Git Bash launcher bug (#1545, fixed upstream, unreleased)
  and an ownership-manifest bug that would delete project skills on refresh; both worked around,
  see `docs/aidlc-migration/README.md` §1. Re-check for a release containing the #1545 fix before
  upgrading.

### 2026-09-14 (T-009)

- Scope: T-009 (`apps/worker` skeleton, `packages/database/src/queue` — first use of `pg-boss` in this codebase's actual dependency graph). The 2026-09-10 baseline entry covers `pg-boss` but is more than 3 days old.
- Checked: `pg-boss` (task pins `^12.30.0`).
- Findings: `12.31.1` (2026-09-13, one day before this check) is now the current stable release on the 12.x line — `12.30.0` (2026-09-03) is no longer the head of its own caret range. Between them: `12.30.0` added `createQueue`-index performance work, vacuum-health monitoring and deprecated (ignored, not removed) the `priority`/`orderByCreatedOn` `work()` options; `12.31.0` added RRULE scheduling support, a `missed` catch-up option for schedules, and Bun runtime support (schema version 39 → 41, two nullable-column-only bumps, no table rewrites); `12.31.1` is a bug fix for `stop({ close: false })` followed by a second `stop()`. Nothing in either release touches `new PgBoss(...)`, `start()`, `stop()`, `createQueue()`, `send()`/`enqueue`, or `work()` in a breaking way — the only caveat found ("every cron schedule can send twice during a rolling upgrade" for RRULE catch-up) does not apply: this task uses none of `schedule()`/RRULE. `migrate: false`/`createSchema: false` (documented constructor options, unchanged across both versions) let a restricted-privilege role start against an already-installed schema without DDL rights — confirmed working live against this worktree's compose PostgreSQL, connected as `rk_worker`.
- Decision: `pnpm --filter @rogikotha/database add pg-boss@^12.30.0` itself resolved and recorded `pg-boss@^12.31.0` in `package.json` (pnpm resolves the caret range's current head rather than preserving the literal string typed) — accepted rather than force-pinning back to `12.30.0`, since `12.31.x` is the verified-current stable release with no relevant regressions. Logged as `ISS-184` (S4).

### 2026-09-13 (T-007)

- Scope: T-007 (`packages/test-support` — first use of `@node-rs/argon2` and `sharp` in this codebase's actual dependency graph, and `tsx` for this package's own scripts; `@cantoo/pdf-lib` from the task's original step 1 is **not** installed, see Decision).
- Checked: `@node-rs/argon2` (task pins `^2.2.0`); `sharp` (task pins `^0.35.4`); `tsx` (task pins `^4`, already vetted 2026-09-13 for T-004 at `4.23.13`, 3 days old at this check).
- Findings: `@node-rs/argon2` latest on npm is `2.2.0` (published 2 days before this check) — same version the 2026-09-10 entry already vetted (m=64 MiB/t=3/p=1 params unaffected). `sharp` latest is `0.35.4` (published 17 days before this check) — same version the 2026-09-10 entry already vetted, no newer patch. `tsx@4.23.13` unchanged from the T-004 check. No advisories found against any of the three.
- Decision: used `@node-rs/argon2@^2.2.0`, `sharp@^0.35.4`, `tsx@^4` (devDependency) exactly as pinned. Did **not** install `@cantoo/pdf-lib`: the task's own "Scope change 2026-09-12 — images only (CR-001 / FD-036)" block, which overrides the steps below it, says seeded evidence derivatives are PNG pages/thumbnails only ("Do not generate PDFs"), and `03-routes-and-contracts.md` §3 says `PdfRasteriser`/`PdfAssembler` are "**Phase 2** … not created in Phase 1". Installing a PDF-assembly library for code that must not run in Phase 1 would be dead weight; logged as an `ISS-` deviation from step 1's literal (pre-scope-change) instruction.

### 2026-09-13 (T-004)

- Scope: T-004 (`packages/database` — Drizzle ORM/drizzle-kit/`pg`/`dotenv` first use in this codebase, plus `tsx` added to run `migrate.ts`/`reset.ts` directly).
- Checked: `drizzle-orm` (task pins `0.45.2` exact); `drizzle-kit` (task pins `0.31.10` exact); `pg` (task pins `^8.23.0`); `dotenv` (task pins `^17`); `tsx` (not named by the task — added because Node 24's native `.ts` support does not remap `./x.js` relative-import specifiers to `./x.ts` files the way `tsc`'s `moduleResolution: bundler` does, so `node src/migrate.ts` fails on this repo's `.js`-suffixed relative imports; `tsx` is the standard fix).
- Findings: `drizzle-orm@0.45.2`/`drizzle-kit@0.31.10` are still the current versions on the pre-1.0 line (last published ~5 months before this check per npm; no newer 0.4x patch and no 1.0 stable release yet — the 1.0 RC train the master plan says to avoid still has not shipped stable). `pg@8.23.0` resolved exactly. `dotenv` latest is `17.4.2` (same 17.x line the task's `^17` pin targets); `pnpm add dotenv@^17` resolved `17.4.2`. `tsx` latest is `4.23.13` (14 days old at check time), the actively maintained esbuild-based TS runner with no reported regressions relevant to a plain `node <file>.ts` replacement use case.
- Decision: used `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10` (exact pins, confirmed via `pnpm ls`), `pg@^8.23.0` (resolved `8.23.0`), `dotenv@^17.4.2` exactly as the task specifies. Added `tsx@4.23.13` as a new devDependency of `packages/database` — a tooling addition the task text did not anticipate, logged as `ISS-088` (S4).

### 2026-09-13 (T-008)

- Scope: T-008 (`apps/web` shell — first use of `next`, `react`, `react-dom`, `next-intl`'s runtime
  APIs inside a real Next.js app, `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`, `jsdom`, `@vitejs/plugin-react` in this repo).
- Checked: `next` (task pins exact `16.3.4`); `react`/`react-dom` (exact `19.3.0`); `next-intl`
  (`^4.14.2`, already vetted 2026-09-13 for `packages/i18n`); Next 16's `middleware.ts` → `proxy.ts`
  rename and `experimental.typedRoutes` stability; `@testing-library/react` `^16.3.3`;
  `@testing-library/jest-dom` `^6`; `@testing-library/user-event` `^14`; `jsdom` `^30`;
  `@vitejs/plugin-react` `^5`.
- Findings: `next@16.3.4` (2026-08-31) is still the current patch on the 16.x line — no newer 16.3.x
  tag exists (confirms the 2026-09-10 entry, now 3 days old). `proxy.ts` is confirmed as the Next 16
  rename of `middleware.ts`; next-intl's `createMiddleware(routing)` from `next-intl/middleware` is
  unchanged, only the file name/export moved — matches the task's own instruction. `typedRoutes`
  graduated out of `experimental` as of Next 15.5 and stays stable in 16.3 — the task's own
  conditional ("if stable … else omit") resolves to using the top-level `typedRoutes: true`, not
  `experimental.typedRoutes`. next-intl's docs now mention `next/root-params` (Next 16.3+) as an
  alternative to `setRequestLocale`; the task file explicitly specifies `setRequestLocale`, which task
  files win per `01-conventions.md` — used as specified, `root-params` noted as a future follow-up.
  No advisories found against any of the pinned testing-library/jsdom/vitejs-plugin-react versions.
- Decision: used the task's exact pins (`next@16.3.4`, `react@19.3.0`, `react-dom@19.3.0`,
  `next-intl@^4.14.2`) and current-stable testing deps as listed above; `next.config.ts` uses
  top-level `typedRoutes: true`; `proxy.ts` uses `next-intl/middleware`'s `createMiddleware`.

### 2026-09-13 (T-003)

- Scope: T-003 (`packages/contracts` — first use of `zod` and `uuid` in this codebase).
- Checked: `zod` (task pins `^4.5.4`); `uuid` (task pins `^13`).
- Findings: `zod` latest is `4.6.2`/`4.6.0` line (6 days old at check time), still the 4.x stable series the 2026-09-10 entry already vetted; no regressions reported for `z.object`/`z.enum`/`.min`/`.max`/`.strict()`, the only APIs this task uses; `pnpm add zod@^4.5.4` resolved to `4.6.2`, inside the pinned range. `uuid`: v13.0.2 (2026-05) is now the "legacy-13" line — v14.0.0 is current. v14's only breaking change is a Node >= 20 floor (this repo runs Node 24, so it would be compatible) plus a `v7()` bug fix ("aligned the default seq formula in v7Bytes with updateV7State") and a TypeScript moduleResolution/exports fix; no breaking change to `validate()`/`v7()`'s public signature or to published types otherwise. `pnpm add uuid@^13` resolved to `13.0.2`, matching the task's literal pin; ships its own types (`dist/index.d.ts`), so `@types/uuid` was skipped per the task's own conditional.
- Decision: used `zod@^4.5.4` (resolved `4.6.2`) and `uuid@^13` (resolved `13.0.2`) exactly as the task file pins — deviating from a task's pinned major version is outside this task's authority (`04-handoff-and-validation.md` "Only stop entirely for … needing a different library/version than pinned" reserves that call to the human). Flagged `uuid@14` as a follow-up worth a deliberate upgrade decision later, since its `v7()` fix is directly relevant to `ids.ts`'s only use of the package (see `ISS-075`).

### 2026-09-13

- Scope: T-002 (local infra compose: postgres, mailpit, clamav) and T-006 (`packages/i18n`, next-intl).
- Checked: `postgres:18` image tag (floats to patch); `axllent/mailpit` release tags; `clamav/clamav:1.5.4`; `next-intl` npm version.
- Findings: `postgres:18` currently resolves to 18.6 (17 days old), no newer 18.x patch — untagged `18` major tag stays correct per the master plan. `clamav/clamav:1.5.4` (2026-08, blog post "ClamAV 1.5.4 and 1.4.6 security patch versions published") is still the current 1.5.x patch and fixes 8 CVEs (CVE-2026-20337/20338/20339/20345/20346/20347/20348, CVE-2025-8088) plus a clamd STATS thread-safety fix — no newer 1.5.x tag exists, pin unchanged. `axllent/mailpit` has moved past the master plan's "current stable, check before pinning" placeholder to `v1.31.1` (2026-09-05, DNS-rebinding mitigation + SSRF hardening) — this is the tag T-002 pins. `next-intl` is unchanged at `4.14.2` (still current, matches the master plan pin).
- Decision: `infra/compose/docker-compose.yml` pins `postgres:18`, `clamav/clamav:1.5.4` (unchanged) and `axllent/mailpit:v1.31.1` (updated from the plan's placeholder). `packages/i18n` keeps `next-intl@^4.14.2` (unchanged).

### 2026-09-10 (impeccable CLI — local work)

- Scope: Wire `impeccable` CLI into `npm run check` per the
  Assessment-A critique `2026-09-10T15-30-00Z__admin-console-fd030-hover-contrast-fix.md`
  recommendation #1. Detector is the only layer that catches static
  AI-slop patterns the existing contrast/i18n/coverage/proof/smoke
  matrix does not (e.g. the admin hover-contrast bug surfaced today).
- Checked: impeccable 4.1.0 (Apache 2.0, by pbakaus, GitHub
  `pbakaus/impeccable`). npm registry confirms `latest` tag = `4.1.0`.
  Engine requirement `node >=22.18.0`; project runs Node 24.20.0 LTS
  (verified via `node --version`). No published npm advisories at
  adoption time.
- Findings: 4.1.0 is the current stable. Detector subcommand
  (`impeccable detect`) runs cleanly on this project (verified by
  `docs/status/impeccable-detector-2026-09-10.json`). Project-local
  `.impeccable/config.json` and the existing `ignoreRules`/
  `ignoreValues` are honoured. Exit code: 0 on clean, 2 on findings,
  which propagates correctly through `&&` in the `check` script.
- Decision: Do **not** add `impeccable` to `devDependencies`. The
  detector is invoked via `npx --yes impeccable detect …` at check
  time, which downloads to the npm cache on first run and reuses on
  subsequent runs. This avoids pinning the lockfile to a CLI whose
  only consumer is the check script — same pattern used for
  one-shot CLI tools in similar repos. If a future workflow needs
  pinned reproducibility, switch to a `devDependency` entry then.

### 2026-09-10 (demo implementation plan — origin)

- Scope: Demo implementation plan (`docs/implementation/`) — first production-style workspace: Next.js app, PostgreSQL, Better Auth, pg-boss worker, evidence pipeline, tests and lint.
- Checked: Node.js 24.x LTS (24.21 latest patch; local 24.19); Next.js 16.3.4; React 19.3.0; TypeScript 7.0.2 vs 6.x; pnpm 12.3.4 vs 11.20; PostgreSQL 18.6; Drizzle ORM 0.45.2 + drizzle-kit 0.31.10 (1.0.0-rc.4 exists); pg 8.23.0; postgres.js 3.4.9; pg-boss 12.30.0; Better Auth 1.7.3; @node-rs/argon2 2.2.0; next-intl 4.14.2; Zod 4.5.4; React Hook Form 7.87 (8 beta); sharp 0.35.4; pdfjs-dist 6.3.289; pdf-lib 1.17.1 (2021, abandoned) vs @cantoo/pdf-lib; file-type 22.0.2 (ESM-only); ClamAV 1.5.4; Mailpit ~1.28; MinIO CE (archived 2026-04); Garage 2.3.0; Vitest 5.0.0 (2026-09-03) vs 4.1.x; @testing-library/react 16.3.3; Playwright 1.63.0; axe-core 4.13.0; jsdom 30.0.1; ESLint 10.10.0; typescript-eslint; eslint-plugin-boundaries 7.2.0; dependency-cruiser 18.2.0; Prettier 3.9.6; Tailwind 4.3.3; Radix/shadcn (shadcn default primitive switched to Base UI in July 2026).
- Findings: TypeScript 7 (Go rewrite) has no stable programmatic API yet and breaks typescript-eslint/ts-morph — stay on TS 6.x until 7.1. pnpm 12 is a two-week-old Rust rewrite — stay on 11.x. Vitest 5 shipped one week ago with 33 breaking changes and a Node ≥ 22.12 floor — stay on 4.1.x. Better Auth 1.7 is now the stable line and carries the fixes for CVE-2026-67336 (1.6.11), CVE-2026-67327 (1.6.22) and CVE-2026-80192 (1.6.27/1.7.x); community reports of peer-dependency friction with Next 16.0.x and `getServerSession` vs `"use cache"` — verify on 16.3.4 in T-101 with the `pg` adapter as fallback. React ≥ 19.2.1 required (React2Shell CVE-2025-55182). pdf-lib is unmaintained — use `@cantoo/pdf-lib`. MinIO CE is dead — Garage stays the deferred candidate; the demo uses a filesystem adapter. ClamAV 1.5.4 fixes CVE-2026-20337/20338/20345/20339 — pin the tag, not `latest`. Drizzle stays pre-1.0 — pin exact versions, do not adopt the 1.0 RC mid-build. Tailwind/shadcn/Radix are not adopted (FD-032), so their churn is moot.
- Decision: pins as recorded in `docs/implementation/00-master-plan.md` §3. Re-verify exact patches at each task's first `pnpm add` if this entry is older than 3 days.

### 2026-08-30

- Scope: Gate 2 architecture and dependency-selection baseline for the first RogiKotha implementation.
- Checked: Node.js 24.20.0 LTS; Next.js 16.3.3; React 19.2.7; TypeScript 6.0.3; PostgreSQL 18.6; Better Auth 1.6.22; Drizzle ORM 0.45.2; pg-boss 12.26.0; Garage 2.3.0; ClamAV 1.5.4; LibreOffice 26.2.5; PDF.js 6.1.200; Tailwind CSS 4.3.1; shadcn 4.11 line; Lucide 1.27.0; Vitest 4.1.10; Playwright 1.62.1; axe-core 4.11.4; MSW 2.15.0.
- Findings: Selected maintained stable/LTS releases rather than Node 26 Current, Better Auth 1.7 prereleases, PostgreSQL 19 beta, LibreOffice 26.8's new feature branch, or Vitest 5 beta. Next.js remains patch-sensitive; Better Auth has recent security fixes; PostgreSQL 18.6 includes security fixes and GIN follow-up notes; document tools remain hostile-input boundaries rather than trusted libraries. Full official-source metadata and licences are in `docs/planning/03-research-report.md` and its digests.
- Decision: Use these as the authoring baseline, not an immutable future lockfile. Recheck exact stable patches, advisories, peer compatibility, licences, and container digests immediately before the first dependency installation because no application lockfile exists yet.
