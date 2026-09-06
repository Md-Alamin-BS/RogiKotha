# Digest — Indic typography + prototype-fidelity risk, 2026

Date: 2026-09-06
Method: cross-source: Vercel blog (engineering-led design org), Wikipedia, Figma Config 2025 announcements, prototype-fidelity literature.

## Bengali + Indic script handling in design tools vs the browser

The honest 2026 answer is that **Figma does not have an intrinsic Indic-typography advantage over a browser.** Figma renders any installed OTF/TTF font and shows it on a canvas; a browser does the same thing plus OpenType GSUB/GPOS shaping rules for Bengali conjuncts (যুক্তাক্ষর), reph/roph, and the full pre-base consonant cluster logic. Figma's font rendering is layout-pure, not runtime-shaped the way Chrome/Safari/Firefox are.

Specific known pain points for Figma + Indic:

- **Conjuncts**: the র + ক = র্ক (reph/ya-phala) ligature requires OpenType GSUB lookup `blwf` or `half` — modern Bengali fonts include this but it does not always render correctly inside Figma's text engine on the canvas.
- **Kerning between Bengali and Latin**: mixed-script lines (e.g., "Dr. Farzana Akhter এর প্রেসক্রিপশন") can show awkward spacing in Figma preview that does not appear in browser output.
- **Digit substitution (০১২৩ vs 0123)**: Figma has no runtime language toggle. The existing RogiKotha prototype's `bn()` function (app.js:41–45) flips digits at runtime; Figma requires manual character entry or multiple artboards.
- **Right-to-left mixing** (Bengali is LTR but Bangladesh-style Urdu-Arabic legal text is RTL): Figma has improved RTL support since 2023 but is still behind browser engine support.
- **Font fallback chains**: the existing prototype uses `Noto Sans Bengali` → `Nirmala UI` → `Shonar Bangla` → `Kalpurush` → `SolaimanLipi` (styles.css:1134, 1186, 1189, 1196). Figma only shows the first installed font; fallback behaviour is canvas-inert.

**Net result**: for Bengali specifically, the browser is the better authoring medium. The existing RogiKotha prototype already has correct rendering; re-doing it in Figma would introduce *new* Indic-typography bugs that don't exist in the current code.

## Prototype-fidelity risk for public demos

The general 2025–2026 consensus from growth and product practice:

- **A static HTML/CSS/JS prototype is a legitimate test artifact** for patient-facing flows where the user is reading/clicking, not transacting. Healthcare decision-support prototypes specifically benefit from realistic-feeling typography and language — both of which are already working in the existing HTML.
- **Fake-door tests** (the prototype-as-pitch-deck pattern) work as long as users can perform the *intended action* they came for. For RogiKotha, that action is "read the description, check the BMDC verification badge, decide whether to consult" — which the current HTML already supports.
- **Where prototypes break**: when the user wants to do something the prototype does not support (e.g., submit a real form, persist data, see a doctor). None of those actions are in the brief.
- **Concierge MVP** practice (manual back-end, scripted UI) is *more* important than visual fidelity for early signal. The current HTML is already a concierge surface — the real back-end work is future scope.

## Sources

1. Vercel blog — [AI-powered prototyping with design systems](https://vercel.com/blog/ai-powered-prototyping-with-design-systems) — explicitly addresses how design tokens and component registries matter more than visual fidelity.
2. Vercel blog — [Teaching agents product design at Vercel](https://vercel.com/blog/teaching-agents-product-design-at-vercel) — the "why" of design decisions matters more than the surface fidelity.
3. Vercel blog — [How Code and Theory cut time-to-prototype 75% with v0](https://vercel.com/blog/how-code-and-theory-cut-time-to-prototype-75-with-v0) — concrete before/after numbers.
4. Rauno Freiberg — [personal site](https://raunofreiberg.com/) — explicit "make it carefully" / "make it soulful" framing that prioritises craft over platform choice.
5. Brad Frost — [Atomic Web Design](https://bradfrost.com/blog/post/atomic-web-design/) — the systems-of-components thesis that any platform can host.
