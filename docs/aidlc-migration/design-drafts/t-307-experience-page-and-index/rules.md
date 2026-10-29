# Business rules — U27 `t-307-experience-page-and-index`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U27), `unit-of-work-story-map.md` (US6.2, US6.3, US6.4, US3.3, US10.2), `requirements.md`, `stories.md`, T-307 with its FD-091 amendment, the hard rules in `project.md` and `PRODUCT.md`, `01-conventions.md` §2 and §6–§9, and the upstream drafts (U21 T-301, U22 T-302, U15 T-202, U16 T-203, U11 T-104, U14 T-201, U17 T-204, U9 T-102, U45 T-011). The workflows that apply these rules are in `functional-spec.md`, the component contracts in `frontend-components.md`, and the data shapes in `entities.md`.

Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. Questions 1–17 are answered A, decided by the agent under the owner's no-questions instruction of 2026-10-29; `functional-spec.md` § 13 lists what changes under each other option. The Unit renders view models; every decision about eligibility, order, current status, linking and identity is made upstream and only displayed here.

```yaml
rules:
  # 1. Routing, loading and metadata
  - id: BR1.1
    statement: "Pages read experiences only through the review queries wired in the web composition root; components receive view models as props and import only contracts, i18n, server actions and web-shared."
    category: constraint
    applies_to: "experiences/page.tsx, experiences/[publicId]/page.tsx, components/patient/experience/**"
    trigger: "Any data a page renders"
    logic: "page (element web) -> getActor() (server/auth.ts) and container (server/container.ts) -> review.getExperience | review.listExperiences -> view model -> components; IF a component imports server/ (other than actions), @rogikotha/database, @rogikotha/adapters, @rogikotha/test-support or node:* THEN pnpm lint fails"
    violation: "A boundary import fails pnpm lint (eslint.boundaries.mjs, FD-093) and the reviewer's diff check"
    source: "01-conventions.md §2 and §8, FD-093, eslint.boundaries.mjs (T-010 merged), contract-summary.md C9"
  - id: BR1.2
    statement: "The experience segment holds a public id with an optional trailing slug; a malformed id is a 404 and every link the app writes has no slug."
    category: validation
    applies_to: "experiences/[publicId]/page.tsx, RelatedCard, AccountRow, margin links"
    trigger: "A request to /{locale}/experiences/{segment}"
    logic: "publicId = stripSlug(decodeURIComponent(segment)) from @rogikotha/contracts (Crockford base32, PUBLIC_ID_RE); null -> notFound(); links = {pathname: '/experiences/[publicId]', params: {publicId}}; no page-local pattern"
    violation: "A page-local pattern rejecting valid ids sends real experiences to 404 (S1); a 500 on a malformed id is an S1"
    source: "01-conventions.md §4 and §9, packages/contracts/src/ids.ts, T-202 BR1.2"
  - id: BR1.3
    statement: "A missing, unpublished, hidden, rejected or soft-deleted experience answers 404 with no part of it shown, and no loading boundary sits under the experience segment."
    category: constraint
    applies_to: "experiences/[publicId]/page.tsx, its generateMetadata, [publicId]/not-found.tsx"
    trigger: "getExperience returns err not_found"
    logic: "page body awaits load(publicId) before any markup; IF err.code = not_found THEN notFound(); no loading.tsx in experiences/[publicId]/ so the status is set before the first byte; not-found.tsx renders inside the patient layout"
    violation: "A hidden review visible to the public fails FR71 and 01-conventions §9 (S1); a streamed shell before notFound() gives a soft 404 with status 200 (S2)"
    source: "01-conventions.md §9, T-301 WF7, T-302 WF9 step 2, Question 12, fact 10"
  - id: BR1.4
    statement: "A tombstone result renders the tombstone page, never the experience body."
    category: constraint
    applies_to: "experiences/[publicId]/page.tsx, Tombstone"
    trigger: "getExperience returns {kind: 'tombstone'}"
    logic: "switch (result.kind) { 'tombstone' -> <Tombstone vm/>; 'experience' -> <ExperiencePage vm/> }; the switch is exhaustive (TypeScript never)"
    violation: "Rendering the body path for a tombstone would show nothing or crash; showing removed content fails FR71 (S1)"
    source: "FR71, AC6.3.4, T-302 TombstoneVM and BR9.1"
  - id: BR1.5
    statement: "One request-scoped loader serves generateMetadata and the page; the document title is the title alone for anonymous and Former member bylines, and 'title — Written by name' otherwise."
    category: calculation
    applies_to: "experiences/[publicId]/page.tsx (load, generateMetadata), lib/titles.ts experienceTitle"
    trigger: "Every experience request"
    logic: "load = React cache((publicId) => review.getExperience({publicId})); title = plainRedacted(vm.title, t('label.redacted')) + (byline.personaKind = named AND NOT formerMember ? ' — ' + t('experience.writtenBy') + ' ' + displayName : personaKind = pseudonymous AND NOT formerMember ? ' — ' + t('experience.writtenBy') + ' @' + username : ''); documentTitle(...) adds the brand; tombstone -> documentTitle('account'); not_found -> no title (notFound)"
    violation: "Two queries per request; an anonymous alias or 'Former member' in the tab title; a raw redaction token in the title"
    source: "Prototype titleForView case account, T-307 step 1, Question 14, T-104 Q15 B"
  - id: BR1.6
    statement: "A live experience and the index are indexable and set no robots field; a tombstone sets robots noindex."
    category: policy
    applies_to: "generateMetadata of both routes"
    trigger: "Building metadata"
    logic: "experience -> {title, openGraph: {title, type: 'article'}} without robots; tombstone -> {title, robots: {index: false}} because vm.noindex is true; index -> {title: documentTitle('experiences')}"
    violation: "robots on a live page fails the T-010 route-table test; an indexed tombstone keeps search results on removed content"
    source: "01-conventions.md §8, app/pages.test.tsx (T-010), T-302 TombstoneVM.noindex, Question 10"
  - id: BR1.7
    statement: "The index reads one keyset page per request from the cursor in the URL; an invalid cursor redirects to the first page."
    category: validation
    applies_to: "experiences/page.tsx, ExperienceIndex pager"
    trigger: "A request to /{locale}/experiences?cursor=..."
    logic: "cursor = first value of searchParams.cursor (string) or undefined; r = review.listExperiences({cursor, limit: 20}); IF r is err validation THEN redirect('/{locale}/experiences') (307); next link = ?cursor={r.nextCursor} when present; 'Back to the newest' link when a cursor was given"
    violation: "A tampered cursor answering 500 breaks the reading journey"
    source: "T-301 WF7 (listExperiences, limit 20, max 50), contracts/page.ts CursorPage, Question 13"
  - id: BR1.8
    statement: "The route table names the moved experience route and both rows own their heading."
    category: constraint
    applies_to: "apps/web/src/app/pages.test.tsx (recorded change)"
    trigger: "Replacing the two T-008 placeholders"
    logic: "row '/experiences' (container mock, ownsHeading: true, title documentTitle('experiences'), robots absent); row '/experiences/[publicId]' with params {publicId: 'a1b2c3d4e5'} (container mock returning a builder page, ownsHeading: true, title from BR1.5, robots absent), inside AuthGateProvider"
    violation: "An unchanged row imports a deleted [id]/page.tsx and fails pnpm test"
    source: "T-010 route-table test, T-202 BR1.10"

  # 2. Hard rules on the page
  - id: BR2.1
    statement: "Sentiment and outcome flags show their label or 'Not provided'; no missing value renders as 0 or blank, and no score, star or rating appears."
    category: policy
    applies_to: "Flags, RelatedCard, AccountRow (T-202)"
    trigger: "Rendering vm.flags, card sentiment and outcome"
    logic: "render vm.flags in order; flag.key -> t(flag.key) (label.notProvided when T-301 set it); badge class sentiment value or 'plain'; never a number in a flag; related card meta omits the outcome segment when outcome is null and never prints 0"
    violation: "'0' or an empty badge for a missing value breaks the PRODUCT.md hard rule and AC6.2.3 (S1)"
    source: "PRODUCT.md hard rules, T-301 BR6.5, AC6.2.3, AC6.4.2, project.md Forbidden"
  - id: BR2.2
    statement: "Every claim renders as the author's claim under 'Reviewer's label', followed by the why-note."
    category: policy
    applies_to: "ReviewerLabels"
    trigger: "vm.claims non-empty"
    logic: "p > span.reviewer-label (b t(claim.labelKey), i t(vm.reviewerLabelKey)) per claim; then p.note t(vm.reviewerLabelNoteKey); no claim -> nothing"
    violation: "A claim shown as a platform finding fails AC6.2.4 and the hard rule (S1)"
    source: "PRODUCT.md, FR47, AC6.2.4, T-301 R3 (three labels in release 1)"
  - id: BR2.3
    statement: "Every doctor shown on the page carries 'Registration not verified'."
    category: policy
    applies_to: "ExperienceMargin, LaterCare, FollowUpSpine (later provider), RelatedCard"
    trigger: "Any doctor link or name"
    logic: "margin doctor -> DoctorLink + NotVerified; later doctor -> DoctorLink + NotVerified; related card meta names the doctor as text (the card is one link) and the doctor's page carries the badge"
    violation: "A doctor link without the badge fails the hard rule (S1)"
    source: "PRODUCT.md, D-003, T-202 BR2.6, T-307 hard-rule checklist"
  - id: BR2.4
    statement: "The evidence slot says 'No documents' only when the review has no published document; otherwise it shows the 'Documents attached — not medically validated' notice and the count."
    category: policy
    applies_to: "EvidenceSlot"
    trigger: "Rendering the evidence section before U28 T-308"
    logic: "h2 t('filter.evidence'); n = vm.documentsCount; IF n = 0 THEN p.note t('label.noDocuments'); IF n > 0 THEN div.callout.warn (b t('evidence.status')) t('evidence.notice') + p.note t('label.documentsCount', {count: formatNumber(n), n}); IF n is undefined (U21/U22 merged without the field) THEN the heading only, never 'No documents', and an S2 row; once T-308 passes children, they replace everything under the heading"
    violation: "'No documents' over published documents is false (S2); 'verified' or 'approved' wording breaks the hard rule (S1)"
    source: "PRODUCT.md, T-201 BR1.5, T-305 BR5.10, Question 3"
  - id: BR2.5
    statement: "No count is printed for comments or reactions until the data exists."
    category: policy
    applies_to: "DiscussionSlot, ActionsRow"
    trigger: "Rendering before U31 T-402"
    logic: "h2 t('experience.discussion') without a number; no mine.empty line; react buttons without a b count; T-402 adds counts from its view model through formatNumber"
    violation: "A '0' on a review that has comments states a false value (S2)"
    source: "PRODUCT.md (missing value never 0), Question 4"
  - id: BR2.6
    statement: "The long medical-advice disclaimer closes the main column on every experience and tombstone page and never moves."
    category: policy
    applies_to: "ExperiencePage, Tombstone"
    trigger: "Every render"
    logic: "div.callout.warn.disclaimer-end[data-static=disclaimer] t('disclaimer.long') as the last child of the main column; exactly one data-static=disclaimer per page (T-011 BR7.3)"
    violation: "A missing or animated disclaimer fails AC2.4.4 and the hard rule (S1); two disclaimer groups make the browser skip every transition"
    source: "PRODUCT.md, FD-091, T-011 BR7.2 and BR7.3, AC2.4.4"
  - id: BR2.7
    statement: "The page carries no anonymity caveat about lawful disclosure or staff access."
    category: policy
    applies_to: "ExperienceMargin, ExperienceBody"
    trigger: "An anonymous review"
    logic: "no use of compose.identity.anonNote or any key about staff identity access; the byline alone shows 'Written anonymously', the alias and the Anonymous chip"
    violation: "A caveat on the page contradicts FD-022 and AC3.3.6 (S2)"
    source: "FD-008, FD-022, AC3.3.6, T-301 BR6.13 and FD entry (b), T-104 F10"
  - id: BR2.8
    statement: "Lists keep the order of their view model; the page offers no sort, no pin and no percentage."
    category: policy
    applies_to: "ExperienceIndex, RelatedGrid, FollowUpSpine, ExperienceMargin other accounts"
    trigger: "Rendering any list"
    logic: "render items in the given order; no sort control, no 'highest rated', no %"
    violation: "A quality ordering or percentage breaks the hard rules and the owner's counts-only answer"
    source: "PRODUCT.md, T-202 Q1 B (owner), T-301 BR7.2"
  - id: BR2.9
    statement: "Every number and month on the page follows the active language."
    category: calculation
    applies_to: "every component"
    trigger: "Rendering a count, period, posted month, edited month or follow-up month"
    logic: "counts -> formatNumber(n, locale); {year, month} -> formatMonthYear(m, locale); time.dateTime = 'YYYY-MM' in ASCII digits"
    violation: "Latin digits on /bn fail FD-024 and AC parity rows"
    source: "FD-024, packages/i18n/src/format.ts, T-307 step 7"

  # 3. Byline and identity
  - id: BR3.1
    statement: "Every author on the page and the index is rendered by T-202's one Byline."
    category: constraint
    applies_to: "ExperienceBody (lead), RelatedCard (row, static), AccountRow (row)"
    trigger: "Any author"
    logic: "import Byline from components/patient/shared; no Byline, Initials or account-row copy under experience/"
    violation: "Two bylines drift; the prototype comment names this as the defect it removed"
    source: "Question 1, T-202 frontend-components §4, prototype byline() comment"
  - id: BR3.2
    statement: "A named author is plain text, a pseudonymous username links to their public profile, an anonymous author shows the thread alias without a link, and a de-identified persona reads 'Former member' without a link."
    category: policy
    applies_to: "Byline (T-202, with this Unit's additive anonymous form)"
    trigger: "Rendering a BylineVM"
    logic: "named -> lede experience.writtenBy, span displayName, chip byline.identity.real; pseudonymous -> lede, Link /authors/{username} '@username' (not when isStatic), chip byline.identity.pseudo; anonymous -> lede byline.anonSentence, span alias when present, chip compose.identity.anon, avatar '—'; formerMember -> '—', byline.formerMember text, no chip; relationship chip rel.<value> except variant comment; no profileUsername is read"
    violation: "A link from an anonymous review to any profile breaks FD-015 and AC3.3.2 (S1); a named link reverses T-202 Q7 A without an FD entry"
    source: "FR10, FR11, AC3.3.1, AC3.3.2, AC10.2.1, T-104 Q6 A, Q15 B, Q17, T-202 Q7 A, Question 2"
  - id: BR3.3
    statement: "'Other experiences by this author' lists only what the view model gives, which is empty for anonymous and Former member authors, and is left out when empty."
    category: policy
    applies_to: "ExperienceMargin"
    trigger: "vm.margin.otherAccounts"
    logic: "IF otherAccounts.length > 0 THEN div > span.k t('experience.otherAccounts') + ul.margin-links > li > Link /experiences/{publicId} (RedactedText title) ELSE nothing"
    violation: "Listing other reviews under an anonymous byline links threads (AC3.3.2, AC10.2.3; S1)"
    source: "AC3.3.2, AC3.3.3, AC10.2.3, T-301 BR6.9"
  - id: BR3.4
    statement: "The rendered page holds no internal id, persona or account field, exact date, file name, version or reason code."
    category: constraint
    applies_to: "every component and the HTML response"
    trigger: "Every render"
    logic: "components read only view-model fields listed in entities.md; no data-* attribute carries an id other than public ids in hrefs; the test serialises the HTML and asserts none of the builder's private markers (accountId, personaId, exact_date, a uuid, a file name) appear"
    violation: "A private field in the DOM is an S1 (PRODUCT.md, 01-conventions §14)"
    source: "T-307 threat notes, T-301 BR6.2, T-302 BR9.3, AC6.2.2"

  # 4. Experience body
  - id: BR4.1
    statement: "The experience page shows its blocks in the prototype's order."
    category: constraint
    applies_to: "ExperiencePage, ExperienceBody"
    trigger: "Every live experience"
    logic: "head (kicker experience.episode · condition, h1.a-title, lead Byline, flags, status summary, reviewer labels) -> a-grid -> main column [story, timeline, edited note, follow-ups, later care, evidence slot, discussion slot, actions, related condition, related doctor, disclaimer] + aside margin; a block with no data is left out except the evidence and discussion slots and the related-condition heading"
    violation: "Headings out of order fail the T-307 'Section order' acceptance row"
    source: "Prototype renderAccount (sections 1–13), T-307 step 3, acceptance row 'Section order'"
  - id: BR4.2
    statement: "A detailed review shows its filled sections as an ordered list in symptoms, diagnosis, treatment, after order, with empty ones left out; a quick review shows the story only."
    category: calculation
    applies_to: "ExperienceBody, Chapters"
    trigger: "vm.reviewKind and vm.sections"
    logic: "p.story.story-lead vm.body when present; IF sections non-empty THEN h2 experience.timeline + ol.chapters > li (span.k t(CHAPTER_KEYS[key]), p body) in the VM's order (T-301 sorts and drops empty); no heading when no section"
    violation: "A blank heading or a bullet list fails AC6.2.1"
    source: "FR39, FR41, AC6.2.1, prototype CHAPTER_KEYS, T-301 BR6.6"
  - id: BR4.3
    statement: "The follow-up spine shows the view model's order with the one current item marked; the page never sorts it and no control can pick the current item."
    category: policy
    applies_to: "FollowUpSpine"
    trigger: "vm.followUps non-empty"
    logic: "h2#follow-ups label.followUp + p.note experience.currentNote + ol.spine > li per item in VM order; li.current#follow-up-current when isCurrent with ' · ' + experience.currentStatus in span.when; kind correction -> label.correction prefix; kind later_care -> experience.laterCare prefix and the provider (DoctorLink + NotVerified or text); time dateTime"
    violation: "Re-sorting or a pin control fails AC6.3.3 and FR70"
    source: "FR70, AC6.3.3, T-302 Question 1 A and BR3.1, Question 6"
  - id: BR4.4
    statement: "The newest reported status is summarised at the top of the page and links to its full entry."
    category: calculation
    applies_to: "StatusNow"
    trigger: "vm.currentStatus not null"
    logic: "div.status-now in a-head after the flags: b experience.currentStatus · formatMonthYear(dated); p clip(body, 200 graphemes, redaction-safe) + '…' when cut; Link href '#follow-up-current' experience.readUpdate; null -> nothing"
    violation: "No summary at the top fails AC6.3.3; a clip inside a token shows a broken token"
    source: "FR70, AC6.3.3, T-302 WF9 currentStatus, Question 17"
  - id: BR4.5
    statement: "The later-care callout names the later provider, links them only when the view model gives a doctor, offers profile submission otherwise, and stays apart from the reviewed care."
    category: policy
    applies_to: "LaterCare"
    trigger: "vm.laterCare not null"
    logic: "h2 experience.laterCare; div.callout > b (DoctorLink(doctor) + NotVerified | providerText) + body; p.note experience.laterCareNote; IF offerProfileSubmission THEN p.note experience.laterCareSubmit + AddDoctorPanel(initialName: providerText, pendingNoteKey: experience.laterCarePending) when T-204's panel exists"
    violation: "A link to a hidden doctor or a count change for the later provider fails AC6.2.5"
    source: "FR55, AC6.2.5, T-302 BR3.4 and LaterCareVM, T-204 AddDoctorPanel, Questions 7 and 8"
  - id: BR4.6
    statement: "An edited review shows 'Edited {month year}' under the story whenever editedAt is set."
    category: calculation
    applies_to: "ExperienceBody"
    trigger: "vm.editedAt not null"
    logic: "p.note.edited-note > time[dateTime YYYY-MM] t('experience.editedOn', {date: formatMonthYear(editedAt)})"
    violation: "A hidden edit fails AC6.3.1"
    source: "FR69, AC6.3.1, T-302 Question 3 A, Question 9"
  - id: BR4.7
    statement: "A redaction token renders as 'private detail removed' in both languages wherever author text appears."
    category: calculation
    applies_to: "RedactedText, lib/redaction.ts, AccountRow (recorded addition), document title"
    trigger: "Any author text"
    logic: "split(text) on /\\u2063\\[redacted\\]\\u2063/ -> segments; token -> span.redacted t('label.redacted'); plainRedacted(text, label) for the title; clip(text, n) never cuts inside a token"
    violation: "A raw token in the page reads as broken text (S2)"
    source: "T-302 BR7.2 and BR7.3, Question 14"
  - id: BR4.8
    statement: "Author text carries its own language when it differs from the page language."
    category: calculation
    applies_to: "ExperienceBody, FollowUpSpine, LaterCare, StatusNow"
    trigger: "vm.contentLanguage"
    logic: "IF contentLanguage in {en, bn} AND contentLanguage != locale THEN lang attribute on the h1, the story, each chapter, each follow-up and the later-care body; mixed -> none"
    violation: "Mispronounced stories for screen-reader users (WCAG 3.1.2)"
    source: "NFR6, T-301 contentLanguage, Question 15"
  - id: BR4.9
    statement: "Related cards are links to the other experience, titled by an h3, with a static byline and a meta line; same-doctor cards appear only when there are any."
    category: constraint
    applies_to: "RelatedGrid, RelatedCard"
    trigger: "vm.relatedByCondition, vm.sameDoctor"
    logic: "h2 experience.relatedCond + p.note experience.relatedNote + (Reveal div.related-grid > RelatedCard ×n | p.note mine.empty); IF sameDoctor non-empty THEN h2 experience.relatedDoc + Reveal grid; RelatedCard = Link.related-card[aria-labelledby=h3 id][aria-describedby=meta id] > sentiment Badge (or Badge plain label.notProvided), h3 RedactedText title, Byline variant row isStatic, p meta doctor · period · outcome"
    violation: "A button card breaks middle-click and sharing; an h4 under an h2 skips a level"
    source: "Prototype relatedCard, T-307 step 5, facts 17"
  - id: BR4.10
    statement: "The margin shows the treatment period, the published month, the doctor with 'Registration not verified', the condition, the tags and the author's other experiences."
    category: constraint
    applies_to: "ExperienceMargin"
    trigger: "vm.margin"
    logic: "aside.a-margin[aria-label=experience.aboutThis] > div (span.k review.episodeDate, span.v period) ; div (k experience.publishedLabel, v posted) when posted ; div (k profile.kicker, DoctorLink, NotVerified) ; div (k filter.condition, ConditionLink) when condition ; div (k review.tags, ul.margin-tags > li span.tag) when tags ; other accounts per BR3.3"
    violation: "A missing doctor badge fails BR2.3; an anonymity note fails BR2.7"
    source: "Prototype renderAccount aside, T-307 step 4, T-301 margin VM"
  - id: BR4.11
    statement: "ExperienceBody also renders the composer's preview, where the head and story match the public page and the page-only parts are absent."
    category: constraint
    applies_to: "ExperienceBody (mode 'preview'), ComposerPreview (U26 T-306, recorded addition here)"
    trigger: "T-306's preview VM"
    logic: "mode 'preview': no published month, no status summary, no follow-ups, later care, evidence, discussion, actions or related blocks (the preview VM has none); h1 becomes h2 inside the composer; everything else identical"
    violation: "A preview that differs from the public page breaks 'preview equals public' (T-301 BR6.1, AC6.1.1)"
    source: "T-306 Q7 A and § 15, T-301 BR6.12"

  # 5. Gated controls and slots
  - id: BR5.1
    statement: "Like, Dislike, Report and Save run through the auth gate; before their Units land, a confirmed account sees them as unavailable, not removed."
    category: constraint
    applies_to: "ActionsRow"
    trigger: "A press on any of the four controls"
    logic: "onClick = guard(fn) from useAuthGate(); signed out -> sign-in sheet; unconfirmed -> confirm sheet; confirmed -> fn; before T-402/T-403 fn is a no-op and the button has aria-disabled='true' for a confirmed viewer (TODO(T-402), TODO(T-403)); Save has aria-pressed false; review.reactionNote under the row"
    violation: "A control that fails silently for a signed-out visitor breaks auth spec §3.7"
    source: "docs/design/auth-screens-spec.md §3.7, T-102 useAuthGate, Question 5"
  - id: BR5.2
    statement: "The discussion slot carries the review's public id for its thread and is replaced by T-402."
    category: constraint
    applies_to: "DiscussionSlot, Tombstone"
    trigger: "Every live page and every tombstone"
    logic: "section.discussion[aria-labelledby] > h2 experience.discussion + p.note experience.providerNote + {children}; threadSlot = vm.discussion.threadSlot | tombstone.threadSlot (public id only); T-402 passes its Discussion as children"
    violation: "An internal id in the slot exposes a review uuid (T-301 F22)"
    source: "T-402 step list, T-302 TombstoneVM, T-301 F22"
  - id: BR5.3
    statement: "The evidence slot is replaced by T-308 without changing the page."
    category: constraint
    applies_to: "EvidenceSlot"
    trigger: "U28 T-308 merges"
    logic: "EvidenceSlot({documentsCount, hasDocuments, groups, children}); T-308 renders EvidenceSection as children; with children the slot renders only its heading and the children"
    violation: "T-308 editing ExperiencePage beyond the slot collides with T-402's hunk"
    source: "T-308 owned paths, T-402 owned paths"

  # 6. Tombstone
  - id: BR6.1
    statement: "A tombstone shows the removal notice, the reason the thread is kept, the discussion slot and the disclaimer, and nothing of the removed review."
    category: policy
    applies_to: "Tombstone"
    trigger: "{kind: 'tombstone'}"
    logic: "section.a-head > span.kicker nav.account + h1 t(vm.messageKey); div.callout.warn.tombstone-notice[data-static=notice] p t(vm.whyKey); DiscussionSlot(threadSlot); disclaimer per BR2.6; no title, byline, flags, margin, related or follow-ups"
    violation: "Any removed content on the tombstone fails FR71 (S1)"
    source: "FR71, AC6.3.4, T-302 BR9.1, T-307 step 1"
  - id: BR6.2
    statement: "The tombstone notice has no motion of its own."
    category: constraint
    applies_to: "Tombstone"
    trigger: "Every render"
    logic: "notice not inside Reveal, no data-press, data-static='notice' (covered by T-011's [data-static] animation none); no view-transition-name"
    violation: "An animated notice fails the T-307 FD-091 step"
    source: "T-307 step 11, T-011 BR7.1, Question 11"

  # 7. Index
  - id: BR7.1
    statement: "The index opens with the prototype's head and a count line of all eligible experiences when the total is known."
    category: calculation
    applies_to: "ExperienceIndex"
    trigger: "Every index request"
    logic: "IndexHead(kicker nav.discover, title nav.account, note index.experiencesNote); IF page.total defined THEN p.note.count-line t('sentiment.totalAccounts', {count: formatNumber(total), n: total}) ELSE nothing"
    violation: "Printing the page size as the total is false"
    source: "Prototype renderExperienceIndex, T-202 ENT-012 sentiment.totalAccounts, Question 13"
  - id: BR7.2
    statement: "The index lists AccountRow cards in the view model's order, newest first, with reveal motion."
    category: constraint
    applies_to: "ExperienceIndex"
    trigger: "page.items non-empty"
    logic: "Reveal as='div' className='index-list' > AccountRow(card, headingLevel 2) ×n; pager nav[aria-label=experience.pagerLabel] after the list"
    violation: "A different order breaks neutral ordering"
    source: "PRODUCT.md (neutral order), T-301 BR7.2, T-202 AccountRow"
  - id: BR7.3
    statement: "An empty index shows the invitation to write instead of a blank page or a zero."
    category: policy
    applies_to: "ExperienceIndex"
    trigger: "page.items empty and no cursor"
    logic: "div.empty-state > p index.beFirst + Link.btn /write nav.compose; no count line"
    violation: "A blank list or '0 patient experiences' fails the empty-state rule"
    source: "T-307 step 6, PRODUCT.md"
  - id: BR7.4
    statement: "The index loading state is a static skeleton sized like the real head and three rows."
    category: constraint
    applies_to: "experiences/loading.tsx"
    trigger: "A slow index load"
    logic: "section.index-head.skeleton + 3 × div.acct.skeleton[aria-hidden=true]; p.sr-only experience.loading role=status; no animation (check:motion M3 refuses an infinite shimmer)"
    violation: "A looping shimmer fails reduced motion and the motion check"
    source: "design-direction-research.md (static skeletons), T-011 BR4.4, Question 12"

  # 8. Look, motion and layout
  - id: BR8.1
    statement: "No page of this Unit adds a RouteTransition, a view-transition name or a motion rule."
    category: constraint
    applies_to: "both routes, every component, T-307's patient.css section"
    trigger: "Code Generation"
    logic: "the layout's one RouteTransition covers the pages; T-307's CSS section has no transition, animation, @keyframes, @starting-style or view-transition rule (check:motion M6, M11)"
    violation: "A second 'page' element makes the browser skip every route transition (S2); motion in patient.css fails pnpm check"
    source: "T-011 Q4 A, BR4.7, BR6.12, fact 11, Question 16"
  - id: BR8.2
    statement: "Only the index list and the related grids reveal; the head, story, status summary, spine, later care, notice and disclaimer are painted at once."
    category: constraint
    applies_to: "ExperienceIndex, RelatedGrid"
    trigger: "Rendering lists"
    logic: "Reveal (T-011, first 6 children staggered, rest at once) wraps .index-list and .related-grid only; nothing above the fold of the experience page is inside a Reveal"
    violation: "An animated title or story delays the LCP element (AC2.4.6)"
    source: "AC2.4.6, AC2.4.4, T-307 step 11, T-011 BR6.2 and BR7.4"
  - id: BR8.3
    statement: "Press feedback comes from T-011's list or the data-press hook; hover changes colour only."
    category: constraint
    applies_to: "RelatedCard, ActionsRow, pager links, StatusNow link"
    trigger: "Any pressable"
    logic: ".related-card, .react and .btn are in T-011's press list; the pager links and the status link get data-press; no :hover transform (M9-hover)"
    violation: "A hover lift fails check:motion"
    source: "T-011 BR6.5, BR6.11"
  - id: BR8.4
    statement: "T-307's styles live in its own appended section of patient.css, use only T-011 tokens, and keep Bengali free of uppercase and letter-spacing."
    category: constraint
    applies_to: "apps/web/src/styles/patient.css (T-307 section)"
    trigger: "Code Generation"
    logic: "one comment header; each rule /* added: T-307 <reason> */; spacing var(--space-*), colour tokens, radius tokens; no literal px for spacing; no text-transform without a :lang(bn) reset (M8); no column-0 dark block (M10); Prettier-formatted with double-quoted attribute selectors"
    violation: "pnpm check fails (check:motion, format:check) or the reviewer rejects a literal value"
    source: "FD-091 amendment, project.md Code Style (2026-10-27), T-011 BR9.8"
  - id: BR8.5
    statement: "Both pages work at 360 px without horizontal scrolling, with 44 px touch targets and the margin below the story."
    category: constraint
    applies_to: "ExperiencePage, ExperienceIndex, RelatedCard, ActionsRow"
    trigger: "Viewport 360 px"
    logic: "T-011's .a-grid single column below its breakpoint with .a-margin static; .reactions wraps; min-block-size var(--target) on .react and pager links; long words wrap (overflow-wrap: anywhere on .a-title and .story)"
    violation: "Horizontal scroll or small targets fail NFR4 and NFR6"
    source: "NFR4, NFR6, FR95, FD-091 (44 px targets)"

  # 9. Copy, accessibility and tests
  - id: BR9.1
    statement: "Every user-facing string is a key in both dictionaries; this Unit adds seven keys and reuses the rest."
    category: constraint
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "Code Generation"
    logic: "new: experience.readUpdate, experience.moreExperiences, experience.backToNewest, experience.pagerLabel, experience.aboutThis, experience.loading, experience.laterCarePending; label.redacted only if U22 has not added it; both files in one commit; Bengali flagged for the owner (FD-042)"
    violation: "A key without its Bengali string is a build failure (ADR 0011)"
    source: "project.md Mandated, 01-conventions.md §6, FD-024, FD-042"
  - id: BR9.2
    statement: "Headings run h1, h2, h3 without gaps, every time element is machine-readable, and the margin is a labelled complementary landmark."
    category: constraint
    applies_to: "every component"
    trigger: "Every render"
    logic: "one h1 per page (the title or the tombstone notice or IndexHead); section heads h2; related card h3; AccountRow headingLevel 2 on the index; time dateTime; aside aria-label"
    violation: "axe heading-order or landmark findings in U42 T-503"
    source: "NFR6, FR95, T-503 axe gate"
  - id: BR9.3
    statement: "Tests run in en and bn with local builders, keep apps/web at 80 % lines, and add one smoke assertion."
    category: constraint
    applies_to: "components/patient/experience/*.test.tsx, experience-test-support.ts, experiences.smoke.test.tsx"
    trigger: "Code Generation and Build and Test"
    logic: "builders in experience-test-support.ts (test category, excluded from coverage, never @rogikotha/test-support); @/i18n/routing mocked (ISS-053); smoke renders a builder page and the index in both locales; pnpm check and pnpm smoke green; impeccable detect and contrast zero findings"
    violation: "Coverage below 80 % or a red check blocks the merge"
    source: "team.md Testing Posture, T-010 coverage floor, FD-040"
```

## Rules summary

| Id | Rule | Category |
|---|---|---|
| BR1.1 | Reads through the container; boundary imports only | constraint |
| BR1.2 | Crockford segment via `stripSlug`; malformed → 404 | validation |
| BR1.3 | Not eligible → 404 before markup; no loading boundary under the segment | constraint |
| BR1.4 | Tombstone result → tombstone page | constraint |
| BR1.5 | One cached loader; title names named and pseudonymous authors only | calculation |
| BR1.6 | Live and index indexable; tombstone noindex | policy |
| BR1.7 | Keyset cursor; invalid → 307 to the first page | validation |
| BR1.8 | Route-table rows moved and owning their heading | constraint |
| BR2.1 | Not provided, never 0, no score | policy |
| BR2.2 | Reviewer's label on claims | policy |
| BR2.3 | Registration not verified on every doctor | policy |
| BR2.4 | "No documents" only at 0; notice wording | policy |
| BR2.5 | No comment or reaction counts before T-402 | policy |
| BR2.6 | Disclaimer last, static | policy |
| BR2.7 | No anonymity caveat | policy |
| BR2.8 | VM order, no sort, pin or percentage | policy |
| BR2.9 | Numerals and months in the active language | calculation |
| BR3.1 | One Byline (T-202) | constraint |
| BR3.2 | Named text, pseudonymous link, anonymous alias, Former member | policy |
| BR3.3 | Other accounts only from the VM | policy |
| BR3.4 | No private field in the DOM | constraint |
| BR4.1 | Prototype block order | constraint |
| BR4.2 | Ordered chapters, empty omitted | calculation |
| BR4.3 | Spine in VM order, one current, no pin | policy |
| BR4.4 | Current status summary at the top | calculation |
| BR4.5 | Later care: link, offer, separation | policy |
| BR4.6 | Edited month whenever `editedAt` | calculation |
| BR4.7 | Redaction token → "private detail removed" | calculation |
| BR4.8 | `lang` on author text | calculation |
| BR4.9 | Related cards as links with `h3` | constraint |
| BR4.10 | Margin contents | constraint |
| BR4.11 | Preview mode for T-306 | constraint |
| BR5.1 | Gated controls, unavailable until T-402/T-403 | constraint |
| BR5.2 | Discussion slot with the public id | constraint |
| BR5.3 | Evidence slot replaced by T-308 | constraint |
| BR6.1 | Tombstone content | policy |
| BR6.2 | Tombstone notice without motion | constraint |
| BR7.1 | Index head and total count line | calculation |
| BR7.2 | AccountRow list in VM order with reveal | constraint |
| BR7.3 | Empty index invitation | policy |
| BR7.4 | Static index skeleton | constraint |
| BR8.1 | No RouteTransition, view-transition name or motion rule | constraint |
| BR8.2 | Reveal only on lists | constraint |
| BR8.3 | Press from T-011; colour-only hover | constraint |
| BR8.4 | Own CSS section on tokens | constraint |
| BR8.5 | 360 px, 44 px targets | constraint |
| BR9.1 | Keys in both languages | constraint |
| BR9.2 | Heading order, time, landmark | constraint |
| BR9.3 | Tests, coverage, smoke | constraint |
