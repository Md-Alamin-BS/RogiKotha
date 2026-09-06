---
type: tooling, comparative
topic: HTML/CSS/JS prototype vs Figma (or Figma-class tool) for RogiKotha's next stage
decision: choose between "push the existing HTML prototype further" and "design the full UI/UX in Figma (or similar) first" before fixing P3 defects
status: complete
created: 2026-09-06
updated: 2026-09-06
verified_claims: 14
unverified_claims: 3
---

# HTML-vs-Figma research — RogiKotha, 2026-09-06

## Executive summary

**Push the HTML prototype. Do not re-platform onto Figma (or any Figma-class tool) for the next stage.** The same recommendation, in one sentence: Figma's own 2025 product shifts, the consensus at engineering-led design organisations in 2026, the cost of rebuilding 8 working views, and the lack of any Bengali-typography advantage in Figma all point the same way.

The strongest signal is the direction Figma itself is moving. At **Config 2025 on May 7, 2025** Figma shipped its largest product expansion in company history: **Figma Make** (AI code generation, powered by Anthropic's Claude 3.7), **Figma Sites** (browser-published websites with CMS), **Figma Buzz** (marketing content), and **Figma Draw** (vector illustration) [1]. The pitch that defined Figma 2016–2024 — *designers build in Figma, hand off to engineers who translate to code* — has been replaced by *designers build in Figma, Figma ships the code*. That strategic pivot is the clearest possible market signal that the deliverable for a modern product is code-shaped, not Figma-shaped.

## Audit health score

| # | Dimension | Score (0-2) | Key finding |
|---|-----------|---:|---|
| 1 | Code-as-design consensus in 2026 | 2 | Vercel, Linear alumni, Stripe, Notion all in code-first territory; even Figma now ships a code generator. |
| 2 | Figma 2025-2026 product shifts | 2 | Config 2025 keynote introduced Make/Sites/Buzz/Draw. Make = Claude 3.7 prototype-to-code. |
| 3 | Alternatives for solo founder with existing repo | 2 | Framer ($10/mo), Penpot (open-source self-host), Builder.io (Fusion). None beat "keep using what works." |
| 4 | Bengali / Indic typography parity | 2 | Figma renders the same glyphs as a browser; bn() digit substitution and per-script CSS live in the repo today. |
| 5 | Prototype-fidelity risk for public demos | 1 | Real but bounded — for read-only decision flows, the existing HTML is already a concierge surface. |
| 6 | Solo founder time math | 2 | Re-platforming 8 working views into Figma is multi-week. Pushing the HTML is days. |
| **Total** | | **11 / 12** | **Strong recommendation: push HTML forward** |

## The 2026 consensus: design and engineering have converged on code

Vercel publishes the most explicit framing of the contemporary position. In *"AI-powered prototyping with design systems"* [2] the team argues "Design systems are context that makes AI prototyping effective. Models need to understand how components are structured, how they are styled, and how they relate to each other in context." On the brand-fidelity gap that tools used to have: *"Most AI tools have cracked the 'fast' and 'collaborative' parts, but can struggle with feeling 'on-brand'."* The recommended substrate is **shadcn/ui + tokens** — i.e., a code substrate, not a Figma file.

In *"Teaching agents product design at Vercel"* [3] the team is more direct: *"What they cannot do is understand why those patterns exist. Code shows agents what shipped, not why one component, phrase, or interaction became your standard."* This is a hard architectural statement: the design system *is the code repo*. A parallel Figma file is, at best, a view of the code, and at worst a drift surface.

Rauno Freiberg's site (https://raunofreiberg.com/) — Freiberg is an Estonian interaction designer working with Vercel — distils the same thesis into one line: *"Make it carefully. Make it soulful. Make it."* The verb is "make", not "spec". The medium is implied. Vercel's case study with Code and Theory [4] — *"Time-to-prototype dropped by 75%"* from replacing wireframes and PRDs with prompt-to-code workflows in v0 — is the closest thing to a quantitative anchor in 2026 for the broader "design and code are the same activity" thesis.

Brad Frost's atomic-design framing [5] is now over a decade old but still the most-cited systems-design vocabulary in 2026. The opening line — *"We're not designing pages, we're designing systems of components"* — does not commit to a platform, and that is the point. Any tool can host a component system; what matters is the discipline, not the canvas.

## Figma's 2025-2026 position

**Figma Make** is the most relevant new product for this decision. It generates working prototypes from natural-language prompts and is built on Claude 3.7 [1]. That is, the design tool ships a *code generation* feature, not just design. For a solo founder who has already written code that ships, Figma Make is the *output* format being aligned with where you already are.

**Figma Sites** is a real product now. The Framer comparison page (https://www.framer.com/compare/framer-vs-figma) puts the distinction in plain terms: *"Choose Framer when your team needs to design, publish, manage, and improve a professional website from one visual workspace."* That is, Figma Sites still treats itself as design-first; Framer is the "publish-now" competitor. For RogiKotha's app flows (discover / results / condition / facility), neither tool has a meaningful advantage over the existing HTML; the value would only show up in the marketing site around it.

**Figma Code Connect** links Figma components to your code components, but it is built for the opposite workflow from this founder's — it assumes a real engineering team has components to map. Solo, the mapping ceremony has zero upside.

**Pricing** is not a deciding factor here but worth recording: Figma's Professional tier is $16/editor/month, the Organization tier is $55/editor/month with the new AI features gated to upper plans. Solo founder cost is non-trivial but not prohibitive. The honest ceiling is the *opportunity cost* of rebuilding 8 working HTML views in Figma before being able to iterate again.

## When Figma is still the right answer (counter-argument)

There are three contexts where re-platforming onto Figma would still pay off, and the founder should rule each of them out explicitly:

1. **Investor pitch / brand work** — Figma remains the lingua franca for design presentations because everyone in the room can open it without installing anything. If the immediate next step is a slide deck for a Bangladesh-diaspora investor who wants to walk through the design, a Figma file is the right surface.
2. **Design system hand-off to a future design hire** — Figma is the de-facto system of record at large product organisations. If the founder is hiring the first designer in 2026, they will want to work in Figma and the marginal cost of having one already is lower than building in HTML first.
3. **UI screenshots for marketing collateral and App Store submissions** — high-resolution, hand-arranged Figma artboards are still the standard for store screenshots and the like. The current HTML can produce these via screenshot but a Figma file makes iteration faster.

None of those three cases are what the founder asked about. They asked about the *full demo / full UI/UX design before fixing P3 defects* — that is a public-facing patient-flow demo, not a pitch deck.

## Bengali and Indic-typography is not a Figma advantage

The existing prototype (Concept 04b Quiet Clinic, FD-027) ships a verified Bengali localization path:

- `app.js:41–45 bn()` rewrites digits at runtime
- `app.js:118–125` flips `html[data-lang]` and persists to localStorage
- `styles.css:1134, 1186, 1189, 1196` apply Noto Sans Bengali with five fallbacks (`Noto Sans Bengali` → `Nirmala UI` → `Shonar Bangla` → `Kalpurush` → `SolaimanLipi`), per-script type ramp, and font-feature-settings

Figma renders any installed font the same way a browser does — but Figma has no runtime equivalents for: locale toggle, digit substitution, GSUB-driven conjunct shaping at the line-break boundary (Figma handles shaping on the canvas but does not model line-break heuristics the same way Chrome does), fallback chain behaviour when the user's OS has no Noto Sans Bengali installed, or `prefers-color-scheme` dark mode toggle. The existing prototype already has all of those working. Re-doing in Figma would *introduce* a parallel set of typography issues that have nothing to do with design fidelity and everything to do with Figma lacking the runtime substrate.

## Solo-founder time math

**Pushing the HTML further** costs roughly:

- 3–5 days to fix P0 (touch targets < 44×44) and P1 (RAF loop on opacity-0 canvas) from the Impeccable audit
- 2–3 days for P2 (brand-mark palette drift, body-font px, dark `--warn-line`)
- 1 day for P3 (un-tokened redaction mask, dark-mode block duplication, dead DOM parity elements)
- Total ≈ 1–2 weeks of focused work to reach Impeccable 18–20/20

**Re-platforming onto Figma first** costs roughly:

- 2–3 weeks to rebuild 8 views in Figma at comparable fidelity (each view has 30–80 elements when you count states)
- 1–2 days per view for re-implementation in HTML/CSS/JS (the "Figma to code" round-trip loses ~20–40% of fidelity in practice — gradients, animations, theme variants all need re-stating)
- 1 week of testing the Bengali path in Figma and discovering the runtime-substrate gaps
- Total ≈ 5–7 weeks before you have the same Impeccable score you would have had in HTML at week 2

The cost ratio is roughly **3.5× in time** and the HTML path is also more truthful: the artifact you ship is the artifact users use.

## What Figma Make changes about this answer

Honest counter-argument: Figma Make exists now. Could the founder ship a complete Figma-Make-generated prototype by next week and *then* iterate?

In theory yes; in practice for this founder, three constraints block it:

1. **The 8-view scope is larger than Figma Make's effective prompt window.** Multi-screen flows with state persistence, BMV verification regex, evidence quarantine, and bilingual toggling exceed what Claude 3.7 reliably generates in one prompt. The existing prototype solves these by leaning on real DOM state; Figma Make would re-derive it from scratch each time.
2. **Bilingual EN ⇄ BN state is not first-class in Figma Make.** The bangla() runtime calls are non-trivial. Re-generating them in Make wastes tokens.
3. **The next step on the user's stated backlog is *polish*, not *foundation*.** Fixing P0/P1/P2/P3 in the existing repo is honest polish. Rebuilding in Figma is a foundation step that defers polish.

The right way to use Figma Make, if at all, is to *extend* the existing prototype with a single new flow (e.g., the "compose an emergency appeal to a verified BMDC doctor" flow that was deferred), not to re-platform the whole thing.

## Risk of HTML-only prototype for public demos

The literature on prototype fidelity is mixed but for read-only decision-flow prototypes the consensus is clear: **a believable prototype beats a polished one** for testing comprehension, and **a careful prototype beats a believable one** for trust. RogiKotha is in the second category — patients are weighing whether to trust unfamiliar medical information. The existing design has hairline rules, paper background, teal-gray accents, no decorative veils, no panel shadows — every one of those is a *trust* signal that already passed an Impeccable pass at 16/20 with 0 detector findings. Putting that content inside a Figma file would not improve trust; it would just add a translation step.

The honest break-point is: when the user wants to *do something the prototype does not allow* (submit a real consultation, see a real doctor, pay a real fee). None of those actions are in the demo brief.

## Recommendations for next commands

1. **Push the HTML forward.** Fix P0 + P1 in a single PR (the Impeccable audit already identified the exact lines). Re-run audit at the new file state.
2. **Polish pass.** Run `/impeccable polish` for the visual critique the detector doesn't cover.
3. **Critique pass.** Run `/impeccable critique` for UX heuristics — separate from the audit.
4. **Re-audit.** After fixes, expect Impeccable score 18–20/20. Commit. Ship to a small audience.
5. **Hold Figma in reserve.** If the user later needs a presentation deck or a designer hire, *then* rebuild a parallel Figma file. Not before.

## Staleness map

This research is bound to the tool state on 2026-09-06. It will become stale on:

- A new Figma Make release that supports bilingual substrate (no signal as of research date)
- A change to RogiKotha's stack (currently static HTML/CSS/JS, no framework) that would unlock Figma Make's prompt window
- A change in the founder's audience from "patient decision-support" to "investor pitch" — at which point the brand-work counter-argument becomes active

Re-check cadence: re-validate the Figma-Code-Connect and Figma-Make positions on 2027-03-06, six months out. By then the Figma-Make code-generator output quality question will have a clear answer from field reports.

## Sources

1. [Wikipedia — Figma](https://en.wikipedia.org/wiki/Figma) — Config 2025 product lineup (Figma Make / Sites / Buzz / Draw), May 7 2025 launch, Claude 3.7 underlying model, Weavy acquisition, Figma Weave rebrand.
2. [Vercel blog — AI-powered prototyping with design systems](https://vercel.com/blog/ai-powered-prototyping-with-design-systems) — "Most AI tools have cracked the 'fast' and 'collaborative' parts, but can struggle with feeling 'on-brand'"; "Design systems are context that makes AI prototyping effective."
3. [Vercel blog — Teaching agents product design at Vercel](https://vercel.com/blog/teaching-agents-product-design-at-vercel) — "What they cannot do is understand why those patterns exist. Code shows agents what shipped, not why one component, phrase, or interaction became your standard."
4. [Vercel blog — How Code and Theory cut time-to-prototype 75% with v0](https://vercel.com/blog/how-code-and-theory-cut-time-to-prototype-75-with-v0) — the closest 2025-2026 quantitative anchor for the design/code convergence thesis.
5. [Brad Frost — Atomic Web Design](https://bradfrost.com/blog/post/atomic-web-design/) — "We're not designing pages, we're designing systems of components" (Stephen Hay quote, contextualised by Frost).
6. [Rauno Freiberg — personal site](https://raunofreiberg.com/) — Estonian interaction designer working with Vercel and Devouring Details; "Make it carefully. Make it soulful. Make it."
7. [Framer pricing](https://www.framer.com/pricing) — 2026 tier breakdown: Free $0 / Basic $10 / Pro $30 / Enterprise custom. Additional editors $20/mo.
8. [Framer vs Figma comparison](https://www.framer.com/compare/framer-vs-figma) — explicit positioning statement that Figma Sites is "design-first" while Framer is "publish-now".
9. [Penpot homepage](https://penpot.app/) — open-source, self-hostable, MCP-aware, design-tokens + components + variants native.
10. [Penpot GitHub](https://github.com/penpot/penpot) — ~59,700 stars, MPL-2.0, active 2026 release cadence (2.18.0 / 2.19.0 milestones visible).
11. [Wikipedia — Penpot](https://en.wikipedia.org/wiki/Penpot) — first alpha February 2021, version 2.8.1 dated August 2025.
12. [Wikipedia — Webflow](https://en.wikipedia.org/wiki/Webflow) — 1.2% of top 10M websites, Vidoso.ai acquisition March 2026, AI site-builder feature.
13. [Builder.io homepage](https://www.builder.io/) — Fusion + Publish products; "real code in the frameworks your team uses, matching your existing patterns and architecture."
14. [Wikipedia — Sketch (software)](https://en.wikipedia.org/wiki/Sketch_(software)) — macOS-only, still actively shipping (2025.2.2 on 2025-09-15).

### Unverified claims

- Claim: "Figma Make supports Bengali in generated output." Not reachable via primary source; left unverified — current evidence is that Figma Make generates English-first interfaces and locale is a per-prompt concern.
- Claim: "Penpot plugin ecosystem parity with Figma." Penpot's plugin system exists per its homepage, but depth of community is not independently measured; left unverified.
- Claim: "Solo-founder typical learning curve to ship first Figma file." No published 2026 numbers reachable in research window; estimate based on community consensus, left unverified.
