# Business rules — U7 `cr-004-live-region-announcements`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U7), `unit-of-work-story-map.md` (US12.1), `requirements.md` (FR91, FR95, NFR6, NFR7), `components.md` (no domain component; the web shell lives in `apps/web`), `contract-summary.md` (no runtime contract on U7's edges), CR-004, FD-042 and `ISS-122`. The workflows and state transitions that apply these rules are in `functional-spec.md`.

The rules in group 2 follow answer A to Question 1 in `functional-design-questions.md`, recorded on the owner's standing instruction and awaiting the owner's confirmation in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. `functional-spec.md` § 9 lists what changes if the owner switches to option B.

```yaml
rules:
  - id: BR1.1
    statement: "Activating the theme toggle announces the new effective theme to the live region, in the page's active language."
    category: policy
    applies_to: "Theme toggle (#theme) in the patient and staff mastheads"
    trigger: "The theme preference write started by the toggle completes successfully"
    logic: "IF the write succeeds THEN announce 'a11y.announce.themeDark' when the new theme is dark, or 'a11y.announce.themeLight' when it is light, in the active locale"
    violation: "No announcement, or an announcement naming the wrong theme, is a defect against CR-004 acceptance check 'Theme toggle announces' (ISS-122 regression)"
    source: "FR95, NFR6, CR-004, ISS-122, prototype app.js:173"
  - id: BR1.2
    statement: "The theme that is written and the theme that is announced are the same value: the opposite of the current effective theme."
    category: calculation
    applies_to: "Theme toggle (#theme)"
    trigger: "Theme toggle activated"
    logic: "IF an explicit theme is set THEN the current effective theme is that theme ELSE it is the system colour-scheme preference; the new theme is the opposite of the current effective theme; that one value is both written and announced"
    violation: "Announcing a theme other than the one written is a defect"
    source: "CR-004, prototype app.js:170-175 (currentIsDark), ASSUMPTION(T-008) two-state toggle"
  - id: BR1.3
    statement: "A failed theme preference write announces nothing and keeps today's failure path unchanged."
    category: policy
    applies_to: "Theme toggle (#theme)"
    trigger: "The theme preference write fails"
    logic: "IF the write fails THEN make no announcement, and let the failure surface exactly as it does today (it is neither swallowed nor routed to a new error screen)"
    violation: "Announcing a theme change that did not happen, or hiding a failure that is visible today, is a defect"
    source: "phases/construction.md Error Handling, CR-004"
  - id: BR2.1
    statement: "Activating the language toggle leaves a pending language-change note and announces nothing at the click."
    category: policy
    applies_to: "Language toggle (#lang) in the patient and staff mastheads"
    trigger: "Language toggle activated, before the page changes locale"
    logic: "IF the language toggle is activated THEN store, for this browser tab only, a note holding the target locale, the current locale-free path and the time of the click, replacing any earlier note; make no announcement at the click"
    violation: "A click-time announcement in the language being left (option B behaviour) under option A is a defect"
    source: "FR91, FR95, CR-004, FD-042, functional-design-questions.md Question 1"
  - id: BR2.2
    statement: "A page that renders in the note's target locale, on the note's path, within 30 seconds of the click announces the language change in its own language instead of the view."
    category: policy
    applies_to: "View announcement point (ViewShell) on every patient and staff page"
    trigger: "A view is shown, or its view or locale changes"
    logic: "IF a note exists AND its target locale equals the page's active locale AND its path equals the current locale-free path AND it is at most 30 seconds old THEN announce 'a11y.announce.language' in the active locale instead of the view message, and keep the note (so a repeated run for the same page repeats the same announcement)"
    violation: "Announcing the view instead of the language after a toggle-initiated switch, or announcing the language in the language that was left, is a defect"
    source: "FR91, FR95, NFR7, CR-004 acceptance check 'Language toggle announces', prototype app.js:151"
  - id: BR2.3
    statement: "A stale or superseded note is discarded and never announced; a fresh note for the other locale is left alone."
    category: constraint
    applies_to: "View announcement point (ViewShell)"
    trigger: "A view is shown, or its view or locale changes, while a note exists"
    logic: "IF the note is older than 30 seconds, OR its target locale equals the active locale but its path differs THEN delete the note and announce the view; IF its target locale differs from the active locale and it is fresh THEN leave it untouched and announce the view"
    violation: "A language announcement on a page the reader reached by other means (a later navigation, the back button, a reload after the window) is a defect"
    source: "CR-004, NFR6"
  - id: BR2.4
    statement: "When the per-tab storage is unavailable, the language toggle still works exactly as before; only the language announcement is skipped."
    category: policy
    applies_to: "Language toggle (#lang) and view announcement point (ViewShell)"
    trigger: "Writing or reading the note fails (storage disabled, blocked or full)"
    logic: "IF the note cannot be written or read THEN raise no error, still navigate and persist the language choice, and on arrival announce the view in the new language"
    violation: "A storage failure that blocks or breaks the language switch is a defect"
    source: "FR91, phases/construction.md Error Handling, prototype app.js:150 (storage access guarded)"
  - id: BR2.5
    statement: "The language toggle's navigation, state and persistence are unchanged: it still links to the same page in the other locale, keeps its pressed state and glyph, and stores the reader's override."
    category: constraint
    applies_to: "Language toggle (#lang)"
    trigger: "Language toggle activated, with or without scripts"
    logic: "IF the toggle is activated THEN it navigates to the current path in the other locale and the stored language override is written as today; adding the note never replaces or delays either"
    violation: "Any change to where the toggle leads, to aria-pressed, to the A / অ glyph, or to the stored override is a regression"
    source: "FR91, AC12.1.2"
  - id: BR3.1
    statement: "Each view announces itself when it is shown and when its view or active locale changes."
    category: policy
    applies_to: "View announcement point (ViewShell) on every patient and staff page"
    trigger: "A view is shown, or its view identifier or the active locale changes"
    logic: "IF no matching language note applies (BR2.2) THEN announce 'a11y.announce.view' with the view's localized name in the active locale"
    violation: "A view change that announces nothing is a regression of the ported behaviour"
    source: "FR95, NFR6, 01-conventions.md §8, prototype app.js:313"
  - id: BR3.2
    statement: "The announced view name is the page's localized name: the same name the page title mapping gives, with Discover as the name of the home view."
    category: calculation
    applies_to: "View announcement (a11y.announce.view)"
    trigger: "A view message is built"
    logic: "IF the title mapping gives a non-empty name for the view THEN use it ELSE (the home view 'discover') use 'nav.discover'; both in the active locale"
    violation: "A view announced with an empty name, or with a name from the other locale, is a defect"
    source: "NFR7, FD-042, apps/web/src/lib/titles.ts"
  - id: BR3.3
    statement: "The raw view identifier is never part of announced text; it stays only in the page's data and id attributes."
    category: validation
    applies_to: "View announcement (ViewShell)"
    trigger: "A view message is built"
    logic: "IF a message would contain the raw identifier (for example 'signin' or 'admin-security') THEN it is invalid; the data-view attribute and the section id keep the identifier unchanged"
    violation: "English identifiers spoken inside a Bengali announcement break the equal-language rule"
    source: "NFR7, FD-042, ADR 0011, FD-024"
  - id: BR4.1
    statement: "Every announced string comes from a message key present in both dictionaries, added in the same change, with the same placeholders and a distinct Bengali value."
    category: validation
    applies_to: "Keys a11y.announce.language, a11y.announce.themeLight, a11y.announce.themeDark, a11y.announce.view"
    trigger: "pnpm check (i18n parity) and every build"
    logic: "IF a key exists in only one dictionary, or its placeholders differ, or its value is empty or identical in both, or the generated key list is stale THEN the parity check fails and blocks the build"
    violation: "A hard-coded or English-only announcement string is a build failure, never a TODO"
    source: "NFR7, AC12.1.4, project.md Mandated (both dictionaries in one commit), project.md Forbidden (no hard-coded user-facing string)"
  - id: BR4.2
    statement: "Announcement text is always in the page's active locale, the language of the page's lang attribute, so the screen reader speaks it with the matching voice."
    category: constraint
    applies_to: "All announcements of this Unit"
    trigger: "Any announcement"
    logic: "IF a message is announced THEN it is looked up in the active locale of the page that holds the live region at that moment"
    violation: "Text in one language under the other language's lang attribute is a defect (mispronounced or skipped by the screen reader)"
    source: "FR95, NFR6, NFR7, AC12.1.6"
  - id: BR4.3
    statement: "Announcements go only through the existing live region and its hook: one message at a time, cleared after one second, with no focus move, no visible change and no added heading or landmark."
    category: constraint
    applies_to: "All announcements of this Unit"
    trigger: "Any announcement"
    logic: "IF a message is announced THEN it replaces the live region's text and is cleared after one second; IF the live region is absent THEN the announcement does nothing and nothing else fails"
    violation: "Moving focus, adding visible text or headings, or adding a second live region is a defect"
    source: "FR95, NFR6, AC12.1.6, apps/web/src/lib/announce.ts, apps/web/src/components/shared/LiveRegion.tsx"
  - id: BR4.4
    statement: "The motion toggle announces nothing."
    category: policy
    applies_to: "Motion toggle (#motion), patient masthead"
    trigger: "Motion toggle activated"
    logic: "IF the motion toggle is activated THEN its behaviour stays exactly as today and no announcement is made"
    violation: "An announcement added for motion is out of scope without the owner's say-so"
    source: "CR-004 Not in scope, prototype app.js:176-186"
  - id: BR4.5
    statement: "The Bengali copy of the new keys is a draft awaiting the owner's bilingual review, batched with ISS-050; ISS-122 is closed as fixed in CR-004, naming the option taken."
    category: policy
    applies_to: "bn.json values of the four new keys; ISSUES.md rows ISS-122 and ISS-050"
    trigger: "Code Generation adds the keys; Build and Test records the Unit's issues"
    logic: "IF the keys are added THEN the Bengali values are recorded for review with ISS-050 at the phase gate, and ISS-122 is closed naming FD-042 and the answer to Question 1"
    violation: "Shipping invented Bengali copy without flagging it for review breaks FD-042"
    source: "FD-042, FD-089, ISS-050, ISS-122"
```

## Rules summary

| ID | Category | Rule in one line |
|---|---|---|
| BR1.1 | policy | Theme toggle announces the new theme in the active language once the write succeeds |
| BR1.2 | calculation | The announced theme is the written theme: the opposite of the current effective theme |
| BR1.3 | policy | A failed theme write announces nothing; today's failure path is unchanged |
| BR2.1 | policy | Language toggle leaves a per-tab note (target locale, path, time); nothing announced at the click |
| BR2.2 | policy | Matching page within 30 s announces the language change in its own language, instead of the view |
| BR2.3 | constraint | Stale or superseded notes are discarded; a fresh note for the other locale is left alone |
| BR2.4 | policy | Storage unavailable: the toggle works as before; only the language announcement is skipped |
| BR2.5 | constraint | Toggle navigation, pressed state, glyph and stored override are unchanged |
| BR3.1 | policy | Every view announces itself when shown and when its view or locale changes |
| BR3.2 | calculation | View name = localized page name; the home view uses `nav.discover` |
| BR3.3 | validation | The raw view identifier is never spoken |
| BR4.1 | validation | Every announced string is a key in both dictionaries, same change, same placeholders |
| BR4.2 | constraint | Announcement text is in the page's active locale (matches `lang`) |
| BR4.3 | constraint | Only through the existing live region: one message, cleared after 1 s, no focus or visible change |
| BR4.4 | policy | The motion toggle stays silent |
| BR4.5 | policy | Bengali copy flagged for review with ISS-050; ISS-122 closed naming the option |
