# Frontend and UX technical selection digest (R1)

**Research date / accessed:** 2026-08-29  
**Scope:** Current production guidance for Next.js, React, TypeScript, responsive PWA, Bangla/English internationalization and search, accessibility/reduced motion, UI primitives, icons, component documentation, and frontend testing.  
**Evidence policy:** Primary/official sources only. No repository or product-context files were used as evidence.  
**Source budget:** 18 official source groups (some groups contain two pages from the same project where version/license and implementation guidance are separate).  
**Confidence scale:** High = directly stated by an official source; Medium = engineering inference from official facts; Low = unresolved or requires a product-specific spike.  
**Claim classes:** Fact, Recommendation, Risk, Inference, Unknown.

## Decision summary

Use a current patched Next.js 16.3 / React 19.2 / TypeScript 6.0 baseline, with exact patch versions locked only after checking the current security advisory and package registry on implementation day. Prefer the App Router, locale-prefixed routes (`app/[lang]`), server-loaded locale dictionaries, semantic HTML, responsive CSS, and a progressively enhanced PWA. Treat the service worker as optional infrastructure: it must never be required for first-load or core online functionality.

Use shadcn/ui as owned source code over explicitly pinned Radix primitives, Tailwind CSS for generated static CSS, and Lucide via named icon imports. Use Motion selectively behind a reduced-motion policy; prefer CSS transitions/animations when they are sufficient. Storybook is optional and should be added only if the component surface justifies a separate development environment.

Use Vitest + Testing Library for behavior-focused component/unit tests, MSW for network-boundary mocks, Playwright for critical responsive and cross-browser journeys, and axe-core inside Playwright/Storybook. Automated accessibility checks are a gate for detectable defects, not a WCAG conformance verdict; manual keyboard, screen-reader, zoom/reflow, language, and reduced-motion checks remain required.

All selected core projects are open source and usable in commercial software under permissive or weak-copyleft terms. Most are MIT; Next.js, React, shadcn/ui, Radix, Tailwind, Motion, Storybook, Vitest, Testing Library, and MSW declare MIT. TypeScript and Playwright declare Apache-2.0. Lucide declares ISC (with inherited MIT-covered Feather portions). axe-core declares MPL-2.0. Preserve license/notice files and run an exact lockfile license audit before release; this is a technical screen, not legal advice.

## Evidence-backed findings

### 1. Framework baseline and production posture

**F1 — Next.js production line.** The official release stream identifies Next.js 16.3 as current stable and the August 2026 security release includes 16.3.3 (with a 15.5 maintenance patch also published). The project has moved to scheduled security releases, so a bare major/minor recommendation will age quickly. **Implication:** target the current patched 16.3 line, pin an exact patch, and make monthly security review part of maintenance. Do not copy an old starter's version range.  
Metadata: URL: https://nextjs.org/blog | Publisher: Vercel / Next.js | Publication/update: rolling blog; relevant entries July-August 2026 | Accessed: 2026-08-29 | Confidence: High | Class: Fact + Recommendation + Risk.

**F2 — Next.js hosting is not inherently Vercel-only.** The official repository is MIT-licensed and describes Next.js as a full-stack React framework. Next.js applications can be self-hosted; provider-specific managed features are not required for the core framework. **Implication:** retain a conventional Node/self-host deployment path and validate any cache, image, middleware, or adapter behavior against the chosen host rather than assuming provider parity.  
Metadata: URL: https://github.com/vercel/next.js | Publisher: Vercel | Publication/update: rolling repository, accessed at current `canary` state | Accessed: 2026-08-29 | Confidence: High for license/self-hostable code, Medium for provider-parity risk | Class: Fact + Recommendation.

**F3 — React stable line.** React's official version page states that 19.2 is the latest documentation line and lists 19.2.7 (June 2026) as the latest patch shown. React stable releases follow semver, but security fixes have landed on patch releases. **Implication:** use React 19.2.x at the patch supported by the selected Next.js release; do not independently float React beyond Next.js compatibility. React is MIT-licensed.  
Metadata: URL: https://react.dev/versions | Publisher: React project / React Foundation | Publication/update: rolling; latest listed patch June 2026 | Accessed: 2026-08-29 | Confidence: High | Class: Fact + Recommendation.

**F4 — TypeScript stable line and transition risk.** The official repository identifies TypeScript 6.0.3 (2026-04-16) as latest stable and Apache-2.0 licensed. The 6.0 line is a transition release: feature work is moving to the native TypeScript 7 implementation, while the JavaScript compiler receives critical fixes. **Implication:** choose TypeScript 6.0.3+ stable, enable strict checking, remove deprecated configuration instead of merely silencing it, and avoid TypeScript 7 previews for production. Expect a deliberate compiler migration later, not an invisible upgrade.  
Metadata: URL: https://github.com/microsoft/TypeScript | Publisher: Microsoft / TypeScript | Publication/update: latest release 2026-04-16 | Accessed: 2026-08-29 | Confidence: High | Class: Fact + Recommendation + Risk.

### 2. Responsive PWA and internationalization

**F5 — PWA must be progressive enhancement.** A service worker can proxy requests and serve Cache Storage responses offline, but the official guide warns it is unavailable on first load, may be unsupported, and should be optional rather than required for core features. Updates can remain waiting while old clients control open tabs. **Implication:** ship responsive online functionality first; add a manifest and narrowly scoped service worker; show explicit offline/update states; never cache authenticated or fast-changing responses without a documented strategy; test first-load, upgrade, offline, and recovery flows.  
Metadata: URL: https://web.dev/learn/pwa/service-workers | Publisher: Google web.dev | Publication/update: living PWA course; page first published circa 2021 | Accessed: 2026-08-29 | Confidence: High | Class: Fact + Recommendation + Risk.

**F6 — Locale routing.** Current Next.js App Router guidance recommends locale-aware routing and demonstrates nesting the root layout under `app/[lang]`; locale selection can derive from `Accept-Language`. **Implication:** use stable, shareable `/bn/...` and `/en/...` URLs, set the document `lang`, keep a visible user override, and load only the active dictionary on the server. Do not ship both complete dictionaries to every client or rely solely on browser negotiation.  
Metadata: URL: https://nextjs.org/docs/app/guides/internationalization | Publisher: Vercel / Next.js | Publication/update: 2026-02-27 | Accessed: 2026-08-29 | Confidence: High | Class: Fact + Recommendation.

**F7 — Locale content and formatting stay local/self-hosted.** Next.js does not prescribe a translation SaaS. Native `Intl` APIs and versioned application dictionaries are sufficient for two locales. **Implication:** prefer checked-in, reviewable `bn` and `en` dictionaries, BCP 47 language tags, and `Intl.NumberFormat`/`Intl.DateTimeFormat`. A translation-management service can be added later but is not a runtime dependency or paywall.  
Metadata: URL: https://nextjs.org/docs/app/guides/internationalization | Publisher: Vercel / Next.js | Publication/update: 2026-02-27 | Accessed: 2026-08-29 | Confidence: Medium (architecture inference from official routing guidance) | Class: Inference + Recommendation.

### 3. Unicode-safe Bangla, English, and Banglish search

**F8 — Normalize for identity, but preserve source text.** Unicode/CLDR transforms explicitly compose normalization operations with transliteration, and transliteration rules are context-sensitive. Language-to-language transforms are not expected to be lossless. **Implication:** retain the original display string; create a separate normalized search key (normally NFC, with case folding for Latin); never overwrite stored Bangla with an NFKC/transliterated form. Test canonically equivalent Bengali sequences, combining marks, punctuation, digits, and mixed scripts.  
Metadata: URL: https://unicode.org/reports/tr35/tr35-general.html | Publisher: Unicode Consortium / CLDR | Publication/update: current LDML, crawled as updated in 2026 | Accessed: 2026-08-29 | Confidence: High for transform behavior, Medium for the concrete indexing policy | Class: Fact + Recommendation.

**F9 — Banglish is an alias problem, not merely collation.** CLDR supports Bengali-to-Latin script transforms, but unqualified script transliterations optimize reversibility and language-to-language transcription is not guaranteed lossless. Informal Banglish spellings are more variable than a standards transform. **Implication:** use locale-aware comparison for Bangla/English, then add a product-owned, testable Banglish alias/transliteration layer. Treat aliases as recall aids, not canonical data; preserve ranking signals so exact native-script matches win. Do not promise that `Intl.Collator`, normalization, or one transliterator alone provides acceptable Banglish search.  
Metadata: URL: https://unicode.org/reports/tr35/tr35-general.html | Publisher: Unicode Consortium / CLDR | Publication/update: current LDML | Accessed: 2026-08-29 | Confidence: High for transform limitations, Medium for product recommendation | Class: Fact + Inference + Recommendation + Risk.

**F10 — Avoid unsafe string slicing.** Bengali orthography uses multi-code-point sequences; normalization does not make every visible grapheme one code point. **Implication:** highlighting, truncation, cursor offsets, and snippets must be grapheme-aware (for example via `Intl.Segmenter` where supported) and must not split by UTF-16 index. Include mixed Bangla/Latin and emoji fixtures. Exact segmentation support and fallback behavior remain a browser-matrix verification item.  
Metadata: URL: https://unicode.org/reports/tr35/tr35-general.html | Publisher: Unicode Consortium / CLDR | Publication/update: current LDML | Accessed: 2026-08-29 | Confidence: Medium | Class: Inference + Recommendation + Unknown.

### 4. Accessibility and motion

**F11 — Target WCAG 2.2 AA across every responsive variation.** W3C advises WCAG 2.2 for current work; conformance applies to full pages and explicitly includes responsive variations. New AA criteria include focus not obscured, dragging alternatives, target size minimum, redundant entry, and accessible authentication. **Implication:** make WCAG 2.2 AA the acceptance target; require visible focus, keyboard completion, 200% zoom/reflow, usable touch targets, non-drag alternatives, semantic names/roles/values, and manual testing in both languages.  
Metadata: URL: https://www.w3.org/TR/WCAG22/ | Publisher: W3C WAI | Publication/update: W3C Recommendation 2024-12-12 | Accessed: 2026-08-29 | Confidence: High | Class: Fact + Recommendation.

**F12 — Reduced motion is a policy, not a one-off hook.** WCAG 2.2 includes disabling non-essential interaction-triggered motion (AAA), while automatically moving content has separate pause/stop/hide requirements. Even when AA is the conformance target, motion can cause severe vestibular symptoms. **Implication:** respect `prefers-reduced-motion` globally, eliminate parallax/autoplay motion, retain only essential or low-risk opacity/color transitions, and test the reduced path. Motion's `useReducedMotion`/`MotionConfig` can enforce this, but CSS media queries are the simpler default.  
Metadata: URL: https://www.w3.org/TR/WCAG22/ | Publisher: W3C WAI | Publication/update: 2024-12-12 | Accessed: 2026-08-29 | Confidence: High for standard, Medium for implementation choice | Class: Fact + Recommendation.

### 5. UI and visual-tool selection

| Selection | Verified maintenance/version and license | Bundle/performance and accessibility implications | Recommendation / risk |
|---|---|---|---|
| **shadcn/ui** | Official repo shows `shadcn@4.11.0` (2026-06-08), MIT, active. | It distributes editable component source rather than hiding the top layer behind a runtime package. Accessibility depends on the selected primitive and local edits. | Adopt selectively. Copy only needed components, pin the primitive provider, review generated diffs, and own upstream updates. Source ownership is flexibility plus maintenance responsibility. |
| **Radix Primitives** | Official repo is actively maintained by WorkOS and MIT. It describes an accessible, low-level, incrementally adoptable component system. | Provides WAI-ARIA-oriented behavior, focus management, and keyboard interaction, but consumers still supply correct labels/content and can break behavior through wrappers. | Use for genuinely complex widgets (dialog, menu, select, tabs). Prefer native `<button>`, `<input>`, `<details>`, `<dialog>` where requirements fit. Exact package versions are per-primitive and must be locked from the implementation lockfile. |
| **Tailwind CSS** | Official repo shows v4.3.1 (2026-06-12), MIT. | Generates CSS at build time; no component runtime. Utility proliferation and accidental broad source scanning can enlarge CSS/build cost. | Adopt with a narrow design-token layer and source boundaries. Native CSS remains the simpler alternative for isolated components. |
| **Motion** | npm registry shows v13.1.1 (published 2026-08), MIT; core is open source, while Motion+ is optional paid content/APIs. | Tree-shakable, but high-level animation APIs can add meaningful client JS. Official guidance offers smaller/lazy entry points. Motion cannot make an unnecessary animation accessible by itself. | Do not make it baseline infrastructure. Add only for high-value interactions; lazy-load features and enforce reduced motion. Prefer CSS/WAAPI for simple transitions. |
| **Lucide** | Official project is active (v1.27.0 released 2026-07-25); ISC, with inherited Feather icons under MIT terms; commercial/personal use is explicitly allowed. | SVG icons can tree-shake with named imports. Dynamic whole-library lookup can defeat this. Icons alone do not provide accessible names. | Use named imports only. Mark decorative SVGs hidden; label icon-only controls in text/ARIA. Inline/local SVG is the zero-dependency alternative. No brand-logo set is provided. |
| **Storybook** | npm registry shows v10.5.10 (2026-08), MIT; latest major is the maintained line. | Development/build-time tool, not required in the production bundle. Adds config/dependency/CI surface. Local/static Storybook is self-hostable; hosted review services are optional. | Add when shared component states need independent review or documentation. Skip initially for a small surface; Vitest Browser Mode can cover component behavior with less duplicated configuration. |

Evidence metadata for the table:  
- shadcn/ui: https://github.com/shadcn-ui/ui | Publisher: shadcn/ui | Updated/release: 2026-06-08 | Accessed: 2026-08-29 | Confidence: High | Class: Fact + Recommendation.  
- Radix: https://github.com/radix-ui/primitives | Publisher: Radix UI / WorkOS | Updated: rolling repository | Accessed: 2026-08-29 | Confidence: High for license/positioning, Medium for local accessibility outcome | Class: Fact + Recommendation + Risk.  
- Tailwind: https://github.com/tailwindlabs/tailwindcss | Publisher: Tailwind Labs | Release: 2026-06-12 | Accessed: 2026-08-29 | Confidence: High | Class: Fact + Recommendation.  
- Motion: https://www.npmjs.com/package/motion | Publisher: Motion project via npm | Version published: August 2026 | Accessed: 2026-08-29 | Confidence: High for version/license, Medium for project-specific bundle cost | Class: Fact + Recommendation + Risk.  
- Lucide: https://github.com/lucide-icons/lucide | Publisher: Lucide Icons | Release: 2026-07-25 | Accessed: 2026-08-29 | Confidence: High | Class: Fact + Recommendation.  
- Storybook: https://www.npmjs.com/package/storybook | Publisher: Storybook project via npm | Version published: August 2026 | Accessed: 2026-08-29 | Confidence: High for version/license, Medium for adoption threshold | Class: Fact + Recommendation.

### 6. Test stack

| Tool | Verified state | Best use | Important limit / cost |
|---|---|---|---|
| **Playwright** | v1.62.1 latest stable; Apache-2.0; Chromium, WebKit, and Firefox builds; no required hosted service. | Critical end-to-end paths, responsive breakpoints, keyboard flows, locale routing, offline/update behavior, reduced motion, and cross-browser smoke tests. | Browser binaries are large and version-coupled; WebKit is not branded Safari. Keep a small critical suite and update browsers with Playwright. |
| **axe-core** | v4.11.4 latest shown (2026-04-28); MPL-2.0; runs locally without a third-party service. | Automated WCAG rule scans in rendered states via `@axe-core/playwright` or Storybook. | Official README says it finds about 57% of WCAG issues on average; hidden/inactive states need opening and rescanning; JSDOM cannot run all rules (notably color contrast). Manual assessment remains mandatory. |
| **Vitest** | v4.1.10 stable; v5 is beta and unsuitable for production CI baseline; MIT. | Fast unit/integration tests and Browser Mode component tests. | Pin the stable major/minor; TypeScript definition changes may occur between minors. Browser Mode needs Playwright/WebdriverIO for CI and adds real-browser cost. |
| **Testing Library** | React package v16.3.2; MIT. | User-visible behavior and semantic queries; prefer role/name and label queries. | JSDOM is not layout/accessibility-engine truth. Avoid implementation-detail selectors; pair with Browser Mode/Playwright. |
| **MSW** | v2.15.0 stable; MIT; browser and Node interception; no required SaaS. | One reusable set of API handlers for component, integration, and selected E2E tests. | Browser MSW uses a service worker. A PWA also has one worker per scope, so never register MSW in production and explicitly test worker/scope behavior. Mocks can drift from the real API unless contract-checked. |

Evidence metadata for the table:  
- Playwright: https://www.npmjs.com/package/@playwright/test | Publisher: Microsoft / Playwright via npm | Version published: July 2026 (registry latest on access) | Accessed: 2026-08-29 | Confidence: High | Class: Fact + Recommendation + Risk.  
- axe-core: https://github.com/dequelabs/axe-core | Publisher: Deque Systems | Latest release shown: 2026-04-28 | Accessed: 2026-08-29 | Confidence: High | Class: Fact + Recommendation + Risk.  
- Vitest: https://www.npmjs.com/package/vitest | Publisher: Vitest project via npm | Stable version published: July 2026; v5 beta current in August | Accessed: 2026-08-29 | Confidence: High | Class: Fact + Recommendation.  
- Testing Library: https://testing-library.com/docs/queries/about/ | Publisher: Testing Library | Page last updated: 2024-03-19 | Accessed: 2026-08-29 | Confidence: High for query guidance, Medium for current package-version claim (registry cross-check) | Class: Fact + Recommendation.  
- MSW: https://www.npmjs.com/package/msw | Publisher: MSW project via npm | v2.15.0 published July 2026 | Accessed: 2026-08-29 | Confidence: High | Class: Fact + Recommendation + Risk.

## Recommended minimum implementation policy

1. Pin exact stable versions; keep prerelease tags (`next`, `canary`, `beta`, `alpha`) out of production dependency ranges.
2. Default to Server Components and server-loaded locale dictionaries. Add client components only at interaction boundaries and measure their JavaScript.
3. Use native semantic elements first, Radix only for complex missing/inadequate platform widgets, and shadcn/ui only for components actually used.
4. Establish budgets before UI work: route-level client JavaScript, CSS, font files, and image payload. Measure representative Bangla and English routes separately because fonts and line wrapping differ.
5. Load a Bangla-capable local font subset only after verifying glyph coverage, shaping, weight availability, license, and real-device rendering; otherwise use a tested system-font stack. Font choice remains unresolved in this stream.
6. Store display text unchanged; generate normalized/index aliases separately. Exact native-script > exact English > curated alias > transliterated/fuzzy matches in ranking.
7. Test search fixtures for Bengali precomposed/decomposed forms, combining marks, Latin case, whitespace/punctuation, Bangla/ASCII digits, common informal Banglish spellings, mixed scripts, and grapheme-safe highlights.
8. Register the production PWA worker only in production-like builds. Keep MSW behind an explicit test/development gate. Exercise install/update/offline/reconnect in Playwright.
9. Set a global reduced-motion policy and ensure the interface remains understandable with all non-essential transform/layout motion disabled.
10. Gate pull requests with type checking, Vitest/Testing Library, a small Playwright suite, and axe scans of each newly exposed interactive state. Schedule manual accessibility checks before release.

## License, hosting, and paywall screen

- **No mandatory proprietary runtime:** all recommended core libraries can run locally/self-hosted. No selected tool requires a cloud account for application execution or testing.
- **Optional paid layers:** Motion+ adds premium examples/APIs; Storybook ecosystem hosted review/visual services are optional; Deque sells additional accessibility products. None is required for the open-source baseline described here.
- **Commercial-use screen:** MIT, ISC, Apache-2.0, and MPL-2.0 all permit commercial use subject to their conditions. MPL-2.0 requires care when distributing modified MPL-covered files. Preserve copyright/license/NOTICE material and audit transitive dependencies/assets/fonts separately.
- **Generated/copied code:** shadcn/ui's copied source becomes locally maintained but does not erase upstream or transitive license obligations. Keep notices and record the generator/component version in dependency-update documentation.

## Explicit unknowns and follow-up spikes

1. **Banglish quality target:** no official standard defines the project's informal spelling vocabulary, ranking, tolerance, or acceptable false positives. A representative query set and relevance rubric are required before selecting an algorithm or search service. Confidence: Low | Class: Unknown.
2. **Backend search engine:** this stream establishes Unicode/index behavior, not the server/database search technology. Verify collation, normalization, substring/fuzzy matching, ranking, and index size with real Bengali data. Confidence: Low | Class: Unknown.
3. **Font stack:** Bangla font family, weight files, shaping quality, subset strategy, and license were not selected. Test Android/Windows/macOS/iOS rendering and slow-network payloads. Confidence: Low | Class: Unknown.
4. **PWA offline boundary:** which pages/data may be cached depends on authentication, freshness, privacy, and business rules not present in this evidence stream. Default to an offline shell/status, not broad data caching. Confidence: Low | Class: Unknown + Risk.
5. **Exact Radix package versions:** Radix publishes primitives independently; there is no single version verified here. Lock and audit only the packages actually used. Confidence: High | Class: Unknown.
6. **Safari fidelity:** Playwright WebKit is valuable but is not branded Safari. Any critical iOS install/PWA, font, input, or assistive-technology behavior needs at least one real Safari/device pass. Confidence: High | Class: Risk.
7. **Accessibility conformance:** neither Radix/shadcn claims nor axe results establish application-level WCAG conformance. Content, composition, local modifications, responsive states, and assistive-technology behavior require human verification. Confidence: High | Class: Risk.
8. **Bundle numbers:** official package-level claims cannot predict the application bundle. Run route-level bundle analysis with the final imports, fonts, locales, and Storybook/test code excluded from production. Confidence: High | Class: Unknown.

## Official source register (18 groups)

1. Next.js releases/security and repository: https://nextjs.org/blog ; https://github.com/vercel/next.js — Vercel / Next.js.
2. React versions: https://react.dev/versions — React project / React Foundation.
3. TypeScript repository/releases: https://github.com/microsoft/TypeScript — Microsoft.
4. PWA service workers: https://web.dev/learn/pwa/service-workers — Google web.dev.
5. Next.js internationalization: https://nextjs.org/docs/app/guides/internationalization — Vercel / Next.js.
6. Unicode CLDR transforms: https://unicode.org/reports/tr35/tr35-general.html — Unicode Consortium.
7. WCAG 2.2: https://www.w3.org/TR/WCAG22/ — W3C WAI.
8. shadcn/ui repository: https://github.com/shadcn-ui/ui — shadcn/ui.
9. Radix Primitives repository: https://github.com/radix-ui/primitives — Radix UI / WorkOS.
10. Tailwind CSS repository: https://github.com/tailwindlabs/tailwindcss — Tailwind Labs.
11. Motion registry/project page: https://www.npmjs.com/package/motion — Motion project.
12. Lucide repository/releases: https://github.com/lucide-icons/lucide — Lucide Icons.
13. Storybook registry/project page: https://www.npmjs.com/package/storybook — Storybook project.
14. Playwright registry/project page: https://www.npmjs.com/package/@playwright/test — Microsoft / Playwright.
15. axe-core repository: https://github.com/dequelabs/axe-core — Deque Systems.
16. Vitest registry/project page: https://www.npmjs.com/package/vitest — Vitest project.
17. Testing Library queries guidance: https://testing-library.com/docs/queries/about/ — Testing Library.
18. MSW registry/project page: https://www.npmjs.com/package/msw — Mock Service Worker project.

