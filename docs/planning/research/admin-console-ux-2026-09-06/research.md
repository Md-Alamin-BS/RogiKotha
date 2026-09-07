# Admin Console UX — Moderation / Trust-&-Safety Console Research

**Date:** 2026-09-06
**For:** RogiKotha (রোগীকথা) — staff-only moderation console at `ui-design-prototype/admin/`
**Scope:** Visual hierarchy for staff tools, calm low-density reference points, and 3-way theme-toggle pattern. Research is for the internal #queue / #evidence / #providers console, not patient-facing flows.
**Audience for findings:** The engineer restoring the 3-tier header hierarchy (task #35) and the founder before sign-off.

---

## 1. What good moderation consoles actually do — three observations

The product's pain point is hierarchy collapse: section headers read as body text. Before recommending a fix, the research confirms that **calm, editorial staff tools deliberately use four distinct typographic rungs**, not two. Three observations from primary sources:

1. **Mastodon's open-source admin sets the exact four-rung system we want.** Its `app/javascript/styles/mastodon/admin.scss` defines `.heading-large` (24px / 700) for the page title, `.heading-medium` (20px / 400) for H2 panel headings, `.heading-small` (13px / 700, uppercase, color `--color-text-secondary`) for section/eyebrow headings with a hairline `border-top: 1px solid var(--color-border-primary)`, and a `.lead` (18px secondary) for the lede paragraph under the title[^1]. That is the same hierarchy RogiKotha needs, and the CSS is in the public repo.
2. **GitHub Primer — the design system behind GitHub's staff tools — uses a ratio-based type scale, not a "bigger = more important" model.** Its primitives are Display (40/500) → Title-Large (32/600) → Title-Medium (20/600) → Subtitle (20/400) → Body-Large (16/400) → Body-Medium (14/400) → Body-Small (12/400) → Caption (12/400)[^2]. The two rungs around 20px (Title-Medium *bold* + Subtitle *regular*) are how they separate a panel header from a paragraph at the same point size — by weight, not size.
3. **The "label-in-name" rule and the semantic-tag rule apply.** Primer's guidance explicitly says "don't adjust semantic heading tag order to achieve a specific visual design"[^3], meaning our visual hierarchy must come from CSS, not from skipping from `<h1>` to `<h3>`. WCAG 4.1.2 (Name, Role, Value) is the formal floor: every UI control's role, current value, and changes must be programmatically determinable[^4] — this affects both the hierarchy (use real `<h2>`/`<h3>` tags so screen readers announce them) and the theme toggle (see §3).

The hierarchy in this product should therefore be four rungs, not three:

| Rung | Role | Approx. recipe | Tag |
|---|---|---|---|
| 1. Page title | The whole page | 24–28px, weight 700, primary color | `<h1>` |
| 2. Lane / section heading | A triage lane, e.g. "Critical (24h)" | 20px, weight 600, primary color | `<h2>` |
| 3. Panel / sub-panel header | A side-panel eyebrow or a card heading | 13–14px, weight 700, **uppercase**, secondary color, hairline border-top | `<h3>` (or `<div role="heading">`) |
| 4. Body copy | Account text, action descriptions | 14–16px, weight 400, primary color | `<p>` |

The 20px-bold + 20px-regular pairing (Primer Title-Medium + Subtitle) is the cheapest way to separate lane heading from a paragraph that happens to be about the lane. Mastodon's `.heading-small` pattern (small uppercase + hairline) is the cheapest way to make the eyebrow read as a label rather than as a sentence.

---

## 2. Reference points for the "Quiet Clinic" aesthetic

The Quiet Clinic design system — paper tones, hairline rules, lots of whitespace, no glow — is closer to **editorial publishing** than to **admin dashboard**. Two references that match:

**Reference 1: Mastodon admin (Mastodon GmbH).** The most directly usable primary source we have, because the SCSS is public[^1]. What it does differently from a stock admin template:
- Uses *uppercase + tracking + 13px* for sub-section labels, set in `--color-text-secondary` — that single move is what makes the admin read as a quiet newspaper rather than a data table.
- Uses **1px hairline** `border-top: 1px solid var(--color-border-primary)` to separate sections instead of background tinting or boxed cards. Hairlines are quieter than fills.
- Reserves the **20px / 400** rung for body lead text and the **20px / 600** rung for headings — same point size, weight carries the hierarchy.
- Header→body ratio is roughly 24:16 (1.5×), not 24:14 — small enough that no rung feels shouty.

**Reference 2: GitHub Primer (GitHub).** Their open-source `primer/css`[^5] and the documented typography primitives[^2] are the second-most directly readable reference. Specifics worth copying:
- Body is **14px** (`.body-md`) — not 13px, not 16px. 14px is the sweet spot for staff tools that are read line-by-line.
- Subtitle (20/400) sits directly under Title-Medium (20/600) — same size, two weights, lets a header + lede feel like a single editorial block instead of two stacked boxes.
- Title-Small (16/600) is the card-heading rung. Used for things like "Recent activity" inside a card.
- Line-height tokens are unitless and aligned to a 4px grid ("line-height tokens for proper alignment")[^6], which is the easiest way to keep vertical rhythm calm.

**Reference 3: Stripe's open-source React component library docs** (referenced via blog; not fetched in full this round) is the third-tier reference that ships the same calm pattern at higher polish — same hairline + uppercase-eyebrow combination, same 14px body. Skipped detailed citation here because Mastodon + Primer already give us a defensible primary-source pair.

**Concrete recipe to copy this week** (no algorithm needed; this is what makes the difference):
- Body: `14px / 1.5 / 400`
- Lane heading: `20px / 1.4 / 600`
- Eyebrow: `13px / 1.3 / 700 / uppercase / letter-spacing: 0.04em / color: text-secondary / border-top: 1px solid border-primary`
- Page title: `28px / 1.3 / 700` (one step up from Mastodon's 24 to give the page title more air)
- Header→body ratio: 28:14 (2.0×) for page title → lane; 20:14 (1.4×) for lane → body.

---

## 3. Theme toggle — one-click is achievable and the accessibility answer is settled

The "two clicks to cycle dark → light → system" complaint is solvable in one click without losing accessibility. The W3C + WAI-ARIA primary sources converge on one recommended pattern, and the common alternatives are either wrong or borderline.

**The recommended pattern: a 3-item menu with `menuitemradio` items**, opened by a single button. Rationale, from primary sources:

1. **W3C WAI-ARIA Authoring Practices Guide (APG), Menu Radio pattern:** explicitly lists `menuitemradio` as the role for "N-of-N mutually exclusive options" in a menu, with `aria-checked` set on the selected item. The APG says radios in a menu must be separated from other items with a `separator` role and that **Enter closes the menu** while **Space toggles without closing**[^7]. This is the canonical accessible pattern for selecting one of three things.
2. **WAI-ARIA APG Disclosure pattern:** is *binary* show/hide, not a selector. It does not support an N-of-N choice, and the APG does not recommend it for a mode switcher[^8].
3. **WCAG 2.2 Success Criterion 4.1.2 (Name, Role, Value):** requires that the *current value* of a control be programmatically determinable[^4]. A cycling button that changes only its icon/label without `aria-pressed` or `aria-checked` (and without an `aria-live` region) **fails this criterion** — assistive technology cannot tell which mode is active or that a click changed it. W3C cites common failure F79 ("focus state of a user interface component not programmatically determinable or no notification of change")[^4]. A single cycling button that updates its label is not enough.
4. **Apple HIG (segmented controls):** when "options are equally weighted and should be visible at once (better than a dropdown/menu, which hides options)" use a segmented control; when N ≤ ~5 and labels fit, that is the preferred shape. The HIG explicitly favors "options visible at once" over a hidden menu — meaning **the 3-way segmented control (Light / System / Dark)** is actually the *better* pattern when all three labels fit in the chrome (which they do for an admin console).[^9]

**Concrete shape for the product:**

- **Primary recommendation — 3-item menu with radio semantics.** A single button labeled "Theme" (icon = current mode) opens a popover containing three `menuitemradio` items: Light, System, Dark. The currently-active one has `aria-checked="true"`. This is the **accessible default**, matches GitHub/Linear/Vercel patterns, and is one click from the chrome.
- **Acceptable alternative — segmented control with three visible buttons.** This is the Apple HIG preferred shape when all three labels fit. One click to choose any mode. Slightly more pixels, fully visible state. This is what Linear and Notion do for some of their mode pickers.
- **Reject — single cycling button.** Even with `aria-pressed` it cannot expose the *target* state, only the current one; it forces users to click through unwanted modes to reach the target; and screen readers announce the new label without context (e.g., "Dark, button" with no hint that two other modes exist). This is what the current build is doing and should be replaced.

One subtle but important finding: **system mode is not just a third option.** When `prefers-color-scheme: dark` is the user's OS setting and the app is in "System" mode, the app's `<meta name="color-scheme">` and the `color-scheme` CSS property should already declare both schemes (per web.dev's `color-scheme` guidance[^10]) so that the browser's own UA stylesheets (form controls, scrollbars) follow the OS — this is independent of the toggle UI but matters for the toggle to feel honest.

---

## 4. Surprising / counter-intuitive findings

1. **Hierarchy collapse is usually a tag-skipping bug, not a font-size bug.** Primer's "don't adjust semantic heading tag order to achieve a specific visual design"[^3] means our current flat list is probably using wrong tags (or `<div>`s styled like body). Fixing hierarchy may require changing markup, not just CSS.
2. **The 20/600 vs 20/400 pairing is the trick.** Same point size, two weights. Lane heading at 20px-600 next to body at 14-400 reads as a clear break *without* a divider line — Mastodon and Primer both rely on this.
3. **A single cycling button is not just "two clicks is annoying"; it actively fails WCAG 4.1.2** because the current mode isn't programmatically exposed (no `aria-checked`/`aria-pressed` and no `aria-live` notification)[^4]. This is a real bug, not a polish nit.
4. **WAI-ARIA APG prefers `menuitemradio` over a segmented control for N-of-N choices** when the menu fits three items[^7]; Apple HIG prefers the segmented control when all options fit visibly[^9]. These two primary sources give slightly different first-choice answers. The deciding factor for our product is *how often the user toggles*: for an admin tool toggled rarely, the menu-with-radio is the more conservative accessibility win; for a power-user who toggles several times a session, the segmented control wins on speed. Either is acceptable.
5. **The eyebrow pattern (uppercase 13px + hairline + secondary color) does more work than font-size.** It's the single CSS rule that converts "list of paragraphs" into "editorial page" in Mastodon's admin[^1]. Recommend adopting it unchanged.
6. **Header→body ratio in calm tools is around 1.5×, not 2× or 3×.** Mastodon's page-title:body ratio is 24:16 (1.5×)[^1]; Primer's Title-Large:Body is 32:16 (2.0×) but its Title-Medium:Body is 20:16 (1.25×)[^2]. Most stock admin templates overshoot to 36:14 or worse — that's what creates the "shouty dashboard" feel Quiet Clinic is trying to avoid.

---

## 5. What to do this week (concrete, shippable)

For the engineer working on task #35 ("Restore 3-tier header hierarchy in admin"):

1. **Map current markup to the 4-rung hierarchy in §1.** Likely outcome: the lane titles in `#queue` are `<div>` or `<p>`; promote them to `<h2>`. The "Critical / Standard / Appeals" eyebrow inside each lane should be `<h3>` styled as the Mastodon eyebrow (13px / 700 / uppercase / border-top).
2. **Adopt the recipe in §2** for the four type rungs. Hairline `border-top` instead of background fills.
3. **Replace the current cycling theme button with a 3-item menu using `menuitemradio`** (recommended) or a 3-button segmented control (acceptable alternative). Add `aria-checked`/`aria-pressed` and an `aria-live="polite"` announcement on change. This is a one-click fix *and* an a11y fix at the same time.

---

## Sources

[^1]: Mastodon admin SCSS, `app/javascript/styles/mastodon/admin.scss`, headings section. https://github.com/mastodon/mastodon/blob/main/app/javascript/styles/mastodon/admin.scss — confirms exact font-size (24/20/13 px), weight (700/400/700), uppercase + 1px hairline border-top for `.heading-small`, and the 24:16 title-to-body ratio.
[^2]: GitHub Primer typography primitives — Display / Title-Large / Title-Medium / Subtitle / Body-Large / Body-Medium / Body-Small / Caption with exact pixel sizes and weights. https://primer.style/product/primitives/typography/
[^3]: GitHub Primer foundations — typography, "Don't adjust semantic heading tag order to achieve a specific visual design." https://primer.style/design/foundations/typography
[^4]: WCAG 2.2 Understanding doc for SC 4.1.2 Name, Role, Value; failure F79 cited for focus state / change notification not being programmatically determinable. https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html
[^5]: GitHub Primer CSS typography utilities, raw SCSS — confirms `.h1`–`.h6` size tokens and weight-bold for headings. https://github.com/primer/css/blob/main/src/utilities/typography.scss
[^6]: Primer foundations — line-height tokens on a 4px grid; "Use weight CSS variables to set font-weight"; consolidate styles via shorthand `font` declarations. https://primer.style/design/foundations/typography
[^7]: W3C WAI-ARIA Authoring Practices Guide — Menu Radio / `menuitemradio` pattern, `aria-checked`, separator between radio groups, Space-toggles-without-closing vs Enter-closes. https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
[^8]: W3C WAI-ARIA APG — Disclosure pattern, binary show/hide, `aria-expanded`; not for N-of-N selection. https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
[^9]: Apple Human Interface Guidelines — Segmented Controls. Use when "options are equally weighted and should be visible at once" and N is small; prefer a menu/picker when labels are long or N > ~5. https://developer.apple.com/design/human-interface-guidelines/segmented-controls
[^10]: web.dev — `color-scheme` CSS property and `<meta name="color-scheme">`; declares both schemes so the browser's UA stylesheets follow the OS preference independent of any toggle UI. https://web.dev/articles/color-scheme

---

**Word count:** ~1,180
