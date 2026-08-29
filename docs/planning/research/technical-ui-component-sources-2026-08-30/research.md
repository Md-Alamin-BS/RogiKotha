---
type: technical
topic: free open-source UI component sources
decision: shortlist sources for five dummy UI concepts and admin
status: complete
created: 2026-08-30
updated: 2026-08-30
verified_claims: 12
unverified_claims: 0
---

# UI component-source research

## Executive summary

Use the already selected Tailwind + source-owned shadcn/ui + Radix foundation for all five concepts. This produces genuinely different visual systems without five incompatible dependency stacks. Use HyperUI and free Flowbite core as pattern references; use Magic UI/Motion Primitives very selectively; use Tremor plus optional TanStack Table/Recharts for the later dummy admin panel. daisyUI is useful as theme inspiration but overlaps the chosen component layer. Exclude React Bits by default because its Commons Clause and animation-heavy catalogue add avoidable ambiguity and trust/performance risk.

The important caveat is that “accessible” library primitives do not make assembled pages accessible. Every copied or installed component still needs licence, keyboard, screen-reader, contrast, reduced-motion and bundle review.

## Selection matrix

| Source | Free/open terms | Best use | Decision |
|---|---|---|---|
| shadcn/ui | Open source/open code; free blocks [1] | Owned React components, forms, navigation, admin shell | Primary |
| Radix Primitives | MIT; accessibility-focused primitives [2] | Dialog/menu/tabs/tooltip/selection behavior | Primary |
| Tailwind CSS | Open-source styling; official dark-mode system [3] | Tokens, layout, five concepts, light/dark | Primary |
| HyperUI | MIT copy/paste Tailwind v4 [4] | Layout/card/form pattern inspiration | Approved source |
| Flowbite core | MIT released code; Pro separate [5] | Pattern inspiration or narrow free component | Conditional |
| daisyUI | MIT, strong theme support [6] | Rapid theme exploration | Inspiration only by default |
| Magic UI | MIT free core; Pro separate [7] | Restrained decorative/motion detail | Conditional |
| Motion Primitives | MIT, beta [8] | One or two interaction refinements | Conditional |
| Tremor | Apache-2.0 React dashboard components [9] | Admin analytics/status patterns | Approved source |
| TanStack Table | MIT headless table engine [10] | Complex admin sorting/filtering | Conditional on need |
| Recharts | MIT React/SVG charts [11] | Limited admin charts with text equivalents | Conditional on need |
| React Bits | MIT + Commons Clause [12] | Animation catalogue | Excluded by default |

## Recommendations

1. Five concepts must share domain types, mock services, semantic component behavior and test fixtures. Concepts own tokens, composition, typography, density, navigation and motion.
2. Finish the public/user experience across all five concepts before starting admin. Admin may share one behavior model while still rendering all five concepts and both themes.
3. Treat gallery code as untrusted source: inspect dependencies, copy only necessary files, adapt to RogiKotha tokens and record it in `docs/design/third-party-component-register.md`.
4. Prefer CSS and native browser behavior for simple effects. Add motion libraries only when the interaction benefit survives reduced motion and mobile performance review.
5. Recheck exact versions, licences and free/paid boundaries immediately before installation or copying.

## Source appendix

1. [shadcn/ui docs and blocks](https://ui.shadcn.com/docs) — open-code component model; accessed 2026-08-30.
2. [Radix Primitives](https://github.com/radix-ui/primitives) — MIT accessible primitives; accessed 2026-08-30.
3. [Tailwind dark mode](https://tailwindcss.com/docs/dark-mode) — theme selector behavior; accessed 2026-08-30.
4. [HyperUI repository](https://github.com/markmead/hyperui) — MIT Tailwind v4 copy/paste components; accessed 2026-08-30.
5. [Flowbite licence](https://flowbite.com/docs/getting-started/license/) — MIT released code and separate Pro/docs terms; accessed 2026-08-30.
6. [daisyUI repository](https://github.com/saadeghi/daisyui) — MIT Tailwind component/theme layer; accessed 2026-08-30.
7. [Magic UI repository](https://github.com/magicuidesign/magicui) — MIT free core; accessed 2026-08-30.
8. [Motion Primitives repository](https://github.com/ibelick/motion-primitives) — MIT beta components; accessed 2026-08-30.
9. [Tremor repository](https://github.com/tremorlabs/tremor) — Apache-2.0 dashboard components; accessed 2026-08-30.
10. [TanStack Table](https://github.com/TanStack/table) — MIT headless tables; accessed 2026-08-30.
11. [Recharts repository](https://github.com/recharts/recharts) — MIT React/SVG charts; accessed 2026-08-30.
12. [React Bits repository](https://github.com/DavidHDev/react-bits) — MIT plus Commons Clause; accessed 2026-08-30.

## Staleness map

Recheck all versions, licences, Pro/free boundaries and compatibility immediately before adoption; these are fast-moving component sources and this snapshot should not be used after 2027-02-28 without refresh.
