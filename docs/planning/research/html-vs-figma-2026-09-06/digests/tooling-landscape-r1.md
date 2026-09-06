# Digest — tooling landscape, 2026

Date: 2026-09-06
Method: vendor sites, vendor blog posts, Wikipedia, GitHub primary data. Cross-checked launch dates and pricing where reachable.

## Figma — Config 2025 was a turning point

The Config 2025 keynote on **May 7, 2025** introduced four new product lines in one event — the largest product expansion in Figma's history [1]:

- **Figma Make** — AI prototype-and-code generation tool powered by Anthropic's Claude 3.7. Generates working prototypes from natural-language prompts.
- **Figma Sites** — AI-driven website and web app builder with CMS features. Positioned as a Webflow / Framer competitor but still inside Figma.
- **Figma Buzz** — AI marketing content creator.
- **Figma Draw** — Vector illustration tool, Adobe Illustrator-class.

The strategic shift is unmistakable: Figma now ships code generation. The "design and hand off to engineers" pitch that defined Figma 2016–2024 has been replaced by "design and ship directly." For a solo founder, this changes the cost calculation — but it also confirms the industry direction (designers and engineers converging on the same output medium).

Figma also acquired Weavy (~$200M, October 2025) and rebranded it as **Figma Weave**, opening an R&D centre in Tel Aviv [1]. That acquisition is mostly about generative video and image editing, not relevant to a healthcare prototype.

## Framer — the AI website builder eating Figma Sites from the side

Framer pricing 2026 [2]: Free $0 / Basic $10/mo / Pro $30/mo / Enterprise custom. Additional editors $20/mo. Per-site pricing, not per-seat. Solo founder can ship a $10/mo site today.

Framer's own comparison page (https://www.framer.com/compare/framer-vs-figma) is explicit about positioning: "Choose Framer when your team needs to design, publish, manage, and improve a professional website from one visual workspace." For a public-facing product, that pitch is real. Framer includes hosting, SSL, CDN, CMS, SEO out of the box. The marketing message is "AI creates editable, publishable pages" vs Figma Sites' "AI stays within a design-first workflow."

The honest read for RogiKotha: Framer is built for the marketing-site side of a product (landing page, "about", pricing). The app itself (the discover/results/condition flows) is not what Framer is optimised for.

## Penpot — the open-source underdog that is, in fact, production-usable

GitHub data [3]: ~59,700 stars, ~4,100 forks, MPL-2.0 license, Clojure stack, 692 open issues but a healthy closed-PR cadence. Version 2.8.1 (August 2025) per Wikipedia; the active milestones visible on the repo as of 2026-09-06 are 2.18.0 and 2.19.0, which means a 2026 release cadence. Penpot self-hosts via Docker / Kubernetes. Native design tokens, variants, MCP server, full SVG export.

For a solo founder on open-source-first principles, Penpot is the honest Figma substitute. The trade-off: the plugin ecosystem is years behind Figma's, and the Figma import story is "good enough" but lossy. Most importantly, switching 8 working HTML views into Penpot gains nothing the existing repo doesn't already have.

## Sketch — alive but not the answer for a solo founder on Windows

Wikipedia confirms Sketch is still actively shipping (2025.2.2 on 2025-09-15 per release notes), positioned as a "toolkit made by designers, for designers" [4]. **Sketch is macOS-only** — that alone disqualifies it for many solo founders, and the question explicitly notes the founder is on Windows. Sketch remains a credible product but its market position has eroded since 2020, and the focus on "not for PMs, developers or clients" is the opposite of what RogiKotha needs.

## Webflow — incumbent of the no-code site-builder world

Wikipedia: Webflow is used by 1.2% of the top 10 million websites (W3Techs, 2025), acquired Vidoso.ai in March 2026, has AI site-builder features. Webflow's pitch remains "design in browser, ship as real HTML/CSS/JS" — closer in spirit to the existing RogiKotha approach than Figma is. For the actual app flows, though, Webflow's CMS-driven model is awkward; it's best for the marketing side.

## Plasmic, Builder.io — the "design-to-code" middle layer

Builder.io (https://www.builder.io/) positions itself as the bridge: "Create real product experiences that stay on brand, in code, and ready to ship." Their core products are **Fusion** (apps and UIs from Figma designs or existing repos) and **Publish** (headless CMS, visual page builder). Solo-founder pricing is reasonable but adds another tool to maintain. Useful only if the founder wants a Figma file that produces production code — but that's exactly what Figma Make started doing in May 2025.

## What the consensus is not

There is no 2026 consensus that "Figma is dead" — there is consensus that **"designers and developers should operate in the same medium, which is increasingly code-shaped."** Figma's response to that consensus was to add code generation. Vercel's response was to ship v0. Framer's response was to add agents. Penpot's response was to add MCP and design tokens. Every serious tool is converging on the same place.

## Sources

1. [Wikipedia — Figma](https://en.wikipedia.org/wiki/Figma) — Config 2025 product lineup, Weavy acquisition, history.
2. [Framer pricing](https://www.framer.com/pricing) — 2026 tiers.
3. [Penpot GitHub](https://github.com/penpot/penpot) and [Penpot homepage](https://penpot.app/) — open-source self-hosted positioning.
4. [Sketch homepage](https://www.sketch.com/) and [Wikipedia — Sketch (software)](https://en.wikipedia.org/wiki/Sketch_(software)).
5. [Builder.io homepage](https://www.builder.io/) — Fusion + Publish positioning.
6. [Webflow Wikipedia](https://en.wikipedia.org/wiki/Webflow) — market share and acquisitions.
