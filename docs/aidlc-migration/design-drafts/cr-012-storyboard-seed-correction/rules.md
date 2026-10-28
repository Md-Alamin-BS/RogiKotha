# Business rules — U6 `cr-012-storyboard-seed-correction`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U6), CR-012 with its FD-089 amendment, FD-039, FD-086, FD-089, `requirements.md` (Constraints: Data), the project hard rules in `aidlc/spaces/default/memory/project.md`, the port and seed code on the branch and the prototype data. U6 has no story (enabling Unit), so the sources are decision ids and CR-012 acceptance rows. The workflows that apply these rules are in `functional-spec.md`; the collection ids `DC1`–`DC22` and correction ids `SC1`–`SC12` are defined there.

Rules that follow an answer in `functional-design-questions.md` cite it; every answer is A, decided on the owner's standing instruction and awaiting the owner's confirmation in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. `functional-spec.md` § 14 lists what changes if the owner reverses one.

```yaml
rules:
  - id: BR1.1
    statement: "The prototype data is the only source of demo records; the seed loads a record only when the prototype holds it."
    category: policy
    applies_to: "every corpus collection and seed step"
    trigger: "Any change to the corpus or the seed"
    logic: "IF a seeded row has no prototype record behind it (other than the derived accounts, personas, organisations, aliases and the reactor pool) THEN it is an error"
    violation: "An invented record contradicts FD-039 and CR-012's prerequisite; the count tests (BR6.1, BR6.2) fail"
    source: "FD-039, FD-089, CR-012 Prerequisite and step 4a"
  - id: BR1.2
    statement: "Every person, doctor, facility and account is synthetic; before merge, each new doctor name with its specialty and city, each new facility name with its city, and each new BMDC number is checked against public listings, and a real match stops the Unit."
    category: validation
    applies_to: "d7-d10, f6-f10 and their organisations, P-144-P-151, every new named author"
    trigger: "Build and Test, before the merge"
    logic: "IF a new name, or name plus specialty and city, or BMDC number matches a real registered doctor or real facility THEN record an S1 ISS row and stop: the prototype changes (owner), the seed does not"
    violation: "A real person or facility in a negative or mixed account breaks the project's Forbidden rule on real personal data"
    source: "project.md Forbidden (synthetic data), CR-012 hard-rule checklist and acceptance row 'FD-089: synthetic and flagged'"
  - id: BR1.3
    statement: "Every record that existed before FD-089 keeps its corpus id, code, username and every authored value through the port and the seed."
    category: constraint
    applies_to: "the pre-FD-089 records: d1-d6, f1-f5, c1-c8, r1-r12, fr1-fr8, k1-k10, e1-e7, MOD-2011/2029/2033/2038/2041, n1-n5, dr1-dr2, a1-a13, nA1-nA6, P-140/P-143, C-58, F-77/F-78, the 20 pre-FD-089 personas and 30 accounts"
    trigger: "The port is re-run; the seed runs from empty"
    logic: "IF a pre-FD-089 corpus record differs in any value from main before this Unit THEN the port is wrong; database UUIDs and public ids are excluded, they are regenerated on every reset"
    violation: "A changed existing value breaks FD-089 and may break a storyboard step"
    source: "FD-089, CR-012 step 4a and acceptance row 'FD-089: storyboard unchanged'"
  - id: BR1.4
    statement: "New child records attach to existing parents where the prototype attaches them; the parents' derived values follow from the rows."
    category: policy
    applies_to: "k11-k24 on r2-r5, r7, r9-r12; follow-ups on r3, r5, r9, r11; later care on r2, r5, r12; bookmarks; drafts"
    trigger: "Seed run"
    logic: "IF a new prototype record names an existing parent THEN it is seeded under that parent; comment counts and latest_status are recomputed from rows, never copied"
    violation: "Dropping a child breaks the count rule (BR1.5); copying a prototype count breaks the hard rule that counts come from rows"
    source: "Question 3 answer A, FD-089, project.md Mandated (exact counts from rows)"
  - id: BR1.5
    statement: "Each seeded collection holds exactly as many rows as its prototype collection, with one recorded exception: user notifications hold 9 of the prototype's 10."
    category: validation
    applies_to: "DC1-DC22 (functional-spec.md § 6)"
    trigger: "pnpm db:reset && pnpm db:migrate && pnpm db:seed"
    logic: "IF the row count of a collection differs from its expected count in § 6 THEN the seed test fails naming the collection"
    violation: "A missing or extra row fails CR-012 acceptance row 'FD-089: counts per module'"
    source: "FD-089, CR-012 acceptance row 'FD-089: counts per module', Question 5 answer A, Question 6 answer A"
  - id: BR1.6
    statement: "New records carry every value the prototype gives them wherever the schema has a column for it under the record's kind; the gaps that keep 'Not provided' demonstrable on new doctors and branches are the columns the prototype never fills (doctors.about_*, facility_branches.address_*)."
    category: validation
    applies_to: "d7-d10, f6-f10, r13-r24, fr9-fr19, k11-k49, e8-e12, the new cases and follow-ups"
    trigger: "Seed run"
    logic: "IF a prototype field has a column for the record's kind THEN the column is filled; a detailed review stores sections, not body, as every detailed review already does; no filled prototype value is blanked to create a gap"
    violation: "A dropped prototype value fails the acceptance row 'new records are complete'; a blanked value alters prototype data"
    source: "FD-089, CR-012 acceptance row 'FD-089: new records are complete, some gaps remain', Question 11 answer A"
  - id: BR1.7
    statement: "A prototype record that shows what a binding decision rules out is withheld by an explicit, commented exclusion naming the decision, and recorded as an ISS row."
    category: policy
    applies_to: "n8 (reporter decision notice)"
    trigger: "Seed notifications step"
    logic: "IF a record is n8 THEN it is not inserted, because FD-086 gives decision notices to the affected author only; the exclusion names FD-086"
    violation: "Seeding n8 puts a reporter notice into the demo against FD-086"
    source: "Question 6 answer A, FD-086, project.md Mandated (decision log binding)"
  - id: BR2.1
    statement: "The generated corpus files change only by running the port; none is edited by hand."
    category: constraint
    applies_to: "packages/test-support/src/corpus/*.ts except types.ts, index.ts and the tests"
    trigger: "Code Generation"
    logic: "IF a corpus file differs from the port's output for the committed prototype THEN it is wrong"
    violation: "A hand edit is undone by the next port run and hides a drift between prototype and seed"
    source: "corpus file header, Question 4 answer A, T-007 step 2"
  - id: BR2.2
    statement: "The port reads follow-ups the way the prototype does: a review's chain if it has one, otherwise its single inline followUp."
    category: calculation
    applies_to: "FOLLOW_UPS; r17 and r24 (inline only)"
    trigger: "Port run"
    logic: "IF RK.followUps has no chain for a review AND the review has followUp THEN emit one follow_up row <review>-fu-1 from it; reviews with a chain are unchanged (r1's inline copy is ignored, as today)"
    violation: "Without it the port emits 19 follow-ups, not the prototype's 21"
    source: "prototype followUpsFor, FD-089"
  - id: BR2.3
    statement: "An anonymous comment in the thread of an anonymous review reuses that review's anonymous persona and account; no second persona or account is emitted."
    category: constraint
    applies_to: "PERSONAS, ACCOUNTS; k31 in r15's thread"
    trigger: "Port run"
    logic: "IF a comment is anonymous AND a persona anon:<review> already exists from the review THEN reuse it; otherwise emit anon:<review> with account anon_author_<review> as today (k5, k16, k42)"
    violation: "A duplicate anon:r15 entry breaks the corpus invariant 'one persona per anonymous thread' and the seed's account lookup"
    source: "T-401 step 4 (the review's anonymous author reuses the thread alias), corpus.test.ts invariant"
  - id: BR2.4
    statement: "Every persona that existed before FD-089 keeps its avatar hue; new personas take hues by continuing the same sequence in discovery order."
    category: calculation
    applies_to: "PERSONAS (nadia_k, rumana_h, Dr. Farhana Rahman, health_tips_bd, shafiq_ctg would otherwise change)"
    trigger: "Port run"
    logic: "IF a persona key is in the pinned pre-FD-089 set THEN its hue is the pinned value ELSE it takes the next hue of the sequence (+37 mod 360) after the last pinned one"
    violation: "A changed hue changes an existing record (BR1.3)"
    source: "FD-089 (existing records unchanged), port-corpus.mjs nextHue"
  - id: BR2.5
    statement: "The aliases shash and mathabatha are classified as Banglish."
    category: validation
    applies_to: "ALIASES of c9 and c10"
    trigger: "Port run"
    logic: "IF an alias is in the Banglish list (dayabetis, chulkani, shash, mathabatha) THEN lang = banglish; Bengali script gives bn; anything else en"
    violation: "A Banglish alias stored as en is matched under the wrong language by T-205's search"
    source: "02-data-model.md §4 (hard-coded Banglish list), port-corpus.mjs BANGLISH_ALIASES"
  - id: BR2.6
    statement: "The port exports the signed-in demo user's bookmarks as a corpus collection, in prototype order."
    category: constraint
    applies_to: "USER_BOOKMARKS (new), corpus/types.ts CorpusBookmark"
    trigger: "Port run"
    logic: "IF RK.user.bookmarks lists a review THEN emit {accountUsername: shirin_88, reviewSeedRef} for it"
    violation: "The seed keeps hard-coding r6 and r9 and misses six prototype bookmarks"
    source: "Question 5 answer A"
  - id: BR2.7
    statement: "The port is deterministic: a second run on the same prototype leaves the corpus unchanged."
    category: validation
    applies_to: "port-corpus.mjs"
    trigger: "Code Generation and Build and Test"
    logic: "IF the port runs twice THEN git status shows no change under src/corpus beyond EOL-only churn (ISS-178)"
    violation: "Non-deterministic output makes BR1.3 unverifiable"
    source: "port-corpus.mjs header, T-007 acceptance"
  - id: BR3.1
    statement: "Every seed step is idempotent per record by a natural key: a second run inserts 0 rows in every step, and a run on a database seeded before this Unit adds only the new records."
    category: constraint
    applies_to: "accounts (username), personas (username; anonymous by account link), taxonomy terms (seed_ref), organisations and branches and doctors (seed_ref), reviews and facility reviews and comments (seed_ref), follow-ups (review + body), evidence (seed_ref), cases (code), audit rows (stream + action + actor), staff and user notifications (dedupe_key), submissions (bmdc), claims (doctor + claimant), field changes (doctor + field), bookmarks (account + review), drafts (account + stored payload), reactions (target)"
    trigger: "pnpm db:seed"
    logic: "IF a row with the natural key exists THEN skip it and insert nothing for that record; drafts compare the stored payload, not the number of drafts"
    violation: "A duplicate row or a non-zero second-run count fails acceptance row 'Seed idempotent'"
    source: "CR-012 step 4a and acceptance row 'Seed idempotent', seed.ts header"
  - id: BR3.2
    statement: "A doctor's chamber links to a branch when its name equals the branch name, the branch label, or '<branch name> — <branch label>'."
    category: calculation
    applies_to: "doctor_chambers.branch_id for d7-d10"
    trigger: "Seed directory step"
    logic: "IF a chamber name matches one of the three forms of a branch THEN set branch_id to that branch ELSE leave it null; the first two forms are checked first, so every existing link is unchanged"
    violation: "Without the third form, d7-d10 lose their links to f6-f10, which the prototype's facility.doctors lists show"
    source: "CR-012 step 4a ('real foreign keys'), prototype facilities[].doctors and doctors[].chambers"
  - id: BR3.3
    statement: "Notification times 'N day(s)/week(s)/month(s) ago' are parsed, a month counting 30 days, and each notification maps to the ids its text refers to or to none."
    category: calculation
    applies_to: "seed-notifications.ts; n6-n10"
    trigger: "Seed notifications step"
    logic: "IF when matches N months ago THEN created_at = now - N x 30 days; n6 -> {reviewPublicId r1, commentPublicId k9}, route /experiences/<r1>; n7 -> {} /me; n9 -> {} /me; n10 -> {} /me/security; message_key is the kind's existing key"
    violation: "An unparsed time throws and stops the seed; an unmapped id throws by design"
    source: "Question 7 answer A, CR-008 ASSUMPTION (ids only, no stale values), T-405 routing table"
  - id: BR3.4
    statement: "An appeal case is seeded as a hidden target, one hide decision by mod_rashid and one open appeal by the target's author, for review and comment targets alike."
    category: policy
    applies_to: "MOD-2011 (review r4), MOD-2018 (comment k27)"
    trigger: "Seed moderation step"
    logic: "IF a case's lane is appeals THEN set the target's state to hidden_pending_review, insert decision {action hide, reasonCode other, actor mod_rashid}, insert appeal {appellant = account linked to the target's author persona, text = appealText.bn, status open}; MOD-2011's appellant stays r_ahmed"
    violation: "An appealed case with no decision and no appeal row is an incoherent state the console cannot show"
    source: "prototype MOD-2018, seed-moderation.ts header ASSUMPTION, FD-088 (appeals deferred, data kept)"
  - id: BR3.5
    statement: "Likes and dislikes become real reaction rows from the reactor pool; a target needing more reactors than the pool holds fails the seed."
    category: constraint
    applies_to: "reactions on reviews and comments (the largest new target needs 44 of 50)"
    trigger: "Seed content step"
    logic: "IF likes + dislikes of a target > pool size (50) THEN throw ELSE insert one row per like and dislike from distinct pool accounts"
    violation: "Wrapping the pool would collide with the unique (target, account) index"
    source: "seed-content.ts ASSUMPTION(T-007), project.md Mandated (counts from rows)"
  - id: BR3.6
    statement: "The seed loads drafts and bookmarks from the corpus, not from hard-coded lists."
    category: constraint
    applies_to: "review_drafts (dr1-dr4), bookmarks (8 for shirin_88)"
    trigger: "Seed content step"
    logic: "IF the corpus lists a draft or bookmark THEN seed it under BR3.1's key"
    violation: "A hard-coded list misses prototype records"
    source: "Question 5 answer A"
  - id: BR3.7
    statement: "The seed loads .env quietly."
    category: constraint
    applies_to: "packages/test-support/src/seed/seed.ts"
    trigger: "pnpm db:seed"
    logic: "IF the seed loads .env THEN dotenv runs with quiet true, so the output shows only the per-step counts"
    violation: "The dotenv banner stays (ISS-252)"
    source: "Question 12 answer A, ISS-252, ISS-203"
  - id: BR4.1
    statement: "MOD-2033's reports beyond its three listed reasons are padded with factual, from one padding table that holds only MOD-2033, and the same padded list feeds both moderation_case_reasons and the reports rows."
    category: calculation
    applies_to: "MOD-2033"
    trigger: "Seed moderation step"
    logic: "IF the case is MOD-2033 THEN reasons = [factual, factual, impersonation, factual, factual, factual]; reasons factual 5 and impersonation 1; six reports rows from reporter_1..reporter_6"
    violation: "impersonation as the majority reason (ISS-221); tables that disagree"
    source: "FD-039, ISS-221, CR-012 step 4 and acceptance row 'MOD-2033 reasons'"
  - id: BR4.2
    statement: "A case whose report count exceeds its listed reasons and that has no padding entry fails the seed instead of inventing reasons."
    category: validation
    applies_to: "every other case (none is short today)"
    trigger: "Seed moderation step"
    logic: "IF reportCount > reasons.length AND the case has no padding entry THEN throw naming the case"
    violation: "A silent padding rule would invent report reasons for a later prototype record"
    source: "CR-012 step 4 ('make the padding rule explicit for this case only'), BR1.1"
  - id: BR4.3
    statement: "The existing cases keep their report and reporter counts and reasons; new cases add their own rows."
    category: constraint
    applies_to: "MOD-2011 0/0, MOD-2029 1/1, MOD-2038 1/1, MOD-2041 2/2; MOD-2047 1, MOD-2045 3, MOD-2036 2, MOD-2031 1, MOD-2018 0"
    trigger: "Seed moderation step"
    logic: "IF a case is seeded THEN report_count = distinct_reporters = the number of its reports rows, each from a distinct reporter_N"
    violation: "Changed counts fail acceptance row 'Other cases unchanged'"
    source: "CR-012 acceptance rows 'Other cases unchanged' and FD-089 step 4a"
  - id: BR4.4
    statement: "MOD-2041 is seeded in the critical lane, and every reporter reads restricted in the staff views."
    category: constraint
    applies_to: "MOD-2041; every case"
    trigger: "Seed moderation step"
    logic: "IF MOD-2041 is seeded THEN lane = critical; no seeded text names a reporter"
    violation: "A standard-lane MOD-2041 contradicts the prototype (ISS-176); a named reporter breaks the hard rule"
    source: "FD-039, ISS-176, project.md Forbidden (reporter identity), CR-012 hard-rule checklist"
  - id: BR5.1
    statement: "The storyboard names r2 and anon_author_r2 for alias isolation, puts MOD-2041 in the critical lane, and its seeded-accounts table and content paragraph state the new counts; no other walkthrough step changes."
    category: constraint
    applies_to: "05-demo-storyboard.md: SC1-SC5"
    trigger: "Code Generation"
    logic: "IF the storyboard is corrected THEN the table row, step 7, step 19 and the content paragraph read as in functional-spec.md § 8; steps 1-6, 8-18 and 20-28 are byte-identical"
    violation: "A stale name or count, or an edited step, fails acceptance rows 'MOD-2041 lane', 'Alias-isolation account' or 'FD-089: storyboard unchanged'"
    source: "FD-039, CR-012 step 2, Questions 1, 8 and 9 answer A"
  - id: BR5.2
    statement: "The T-106, T-401 and T-409 places that name r4 as anonymous or anon_author_r4 are corrected to r2 and anon_author_r2, and T-409's FD-088 row names r_ahmed."
    category: constraint
    applies_to: "SC6-SC12 (functional-spec.md § 8)"
    trigger: "Code Generation"
    logic: "IF a line in those files names r4 as anonymous or anon_author_r4 THEN it is replaced as in § 8; nothing else in those files changes"
    violation: "A stale line fails acceptance row 'No stale names' or leaves a wrong premise in a later Unit's test"
    source: "FD-039, CR-012 step 3, Question 2 answer A"
  - id: BR5.3
    statement: "After the corrections, anon_author_r4 appears nowhere in the storyboard or the three task files."
    category: validation
    applies_to: "05-demo-storyboard.md, T-106*, T-401*, T-409*"
    trigger: "Build and Test"
    logic: "IF the grep of CR-012's 'No stale names' row runs THEN it prints nothing"
    violation: "Acceptance row 'No stale names' fails"
    source: "CR-012 acceptance row 'No stale names'"
  - id: BR5.4
    statement: "The alias-isolation account's anonymous persona carries only r2, and none of that account's public content or reactions carries it."
    category: validation
    applies_to: "anon_author_r2, persona anon:r2"
    trigger: "Seed test"
    logic: "IF the persona of anon_author_r2 is queried THEN it is the author of r2 only, persona_links.review_id = r2, no comment, facility review or reaction carries its id, and the account has no other persona"
    violation: "Acceptance row 'Alias-isolation account' fails"
    source: "CR-012 acceptance row 'Alias-isolation account', Question 1 answer A, project.md Forbidden (reporter and anonymous identity)"
  - id: BR6.1
    statement: "The seed integration test asserts the per-collection counts, MOD-2033's reasons, the other cases' counts, MOD-2041's lane, alias isolation, referential integrity, the missing optional fields and a zero second run."
    category: validation
    applies_to: "packages/test-support/src/seed/seed.int.test.ts"
    trigger: "Build and Test (run standalone, as its header and vitest.config.ts require)"
    logic: "IF the test runs on an empty migrated database THEN each assertion in functional-spec.md § 11.1 holds"
    violation: "A missing assertion leaves an acceptance row unexecuted"
    source: "CR-012 step 5 and acceptance rows, team.md Testing Posture"
  - id: BR6.2
    statement: "The default test sweep proves, without a database, that the corpus matches the prototype: counts per collection, the n8 exclusion, pinned hues, one persona per anonymous thread, the Banglish aliases, inline follow-ups and that anon_author_r4 is not r4's author."
    category: validation
    applies_to: "packages/test-support/src/corpus/*.test.ts"
    trigger: "pnpm test, pnpm check"
    logic: "IF the corpus drifts from the prototype or a port rule regresses THEN a corpus test fails naming the collection or rule"
    violation: "Drift is caught only by the opt-in seed test"
    source: "BR1.3, BR1.5, BR2.2-BR2.5, Question 10 answer A"
  - id: BR6.3
    statement: "Assertions whose premise FD-089 changes are rewritten to the new state, with the reason recorded in the hand-off; none is deleted or skipped."
    category: validation
    applies_to: "test-support.smoke.test.ts (6 doctors, 12 reviews), cr-008-validation.test.ts (5 notifications, one per kind, day/week times), seed.int.test.ts (old counts)"
    trigger: "Code Generation"
    logic: "IF an assertion pins a pre-FD-089 count or shape THEN it is rewritten to the § 6 value or the new shape and keeps its intent"
    violation: "A deleted or red assertion breaks the rule that existing suites stay green and only grow"
    source: "team.md Testing Posture, ISS-247 precedent"
  - id: BR6.4
    statement: "The cumulative smoke suite gains at least one assertion for this Unit and loses none."
    category: validation
    applies_to: "packages/test-support/src/test-support.smoke.test.ts"
    trigger: "Code Generation"
    logic: "IF the Unit lands THEN pnpm smoke asserts the FD-089 corpus counts and FD-039's MOD-2033 and MOD-2041 facts through the package entry point"
    violation: "No smoke assertion for the Unit breaks team.md Testing Posture"
    source: "team.md Testing Posture (cumulative smoke suite)"
  - id: BR6.5
    statement: "pnpm check, pnpm smoke, pnpm test:int and the standalone seed integration test exit 0, with i18n parity unchanged and test counts only grown."
    category: validation
    applies_to: "the whole repository"
    trigger: "End of Code Generation and Build and Test"
    logic: "IF the Unit is complete THEN the four commands exit 0 with the compose PostgreSQL running"
    violation: "Any red check blocks the merge"
    source: "CR-012 acceptance row 'Nothing else moved', team.md Way of Working"
  - id: BR7.1
    statement: "ISS-158, ISS-176 and ISS-221 are set to fixed by CR-012 with the commit, ISS-252 likewise, and every new finding is an ISS row found in U6 CR-012."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "End of Code Generation"
    logic: "IF the corrections land THEN the four rows read fixed in CR-012 with the squash commit; each finding of functional-spec.md § 12 has its own row"
    violation: "An open fixed row or an unrecorded finding breaks the defect-register rule"
    source: "CR-012 step 6, project.md Mandated (ISS rows), Question 12 answer A"
  - id: BR7.2
    statement: "The hand-off lists every new record whose Bengali text enters the demo database, by corpus id and field, for the owner's bilingual review, and states that no i18n key was added."
    category: policy
    applies_to: "CR-012 hand-off"
    trigger: "End of Code Generation"
    logic: "IF a new record stores a bn value THEN it is listed (functional-spec.md § 10.7)"
    violation: "Unreviewed Bengali copy breaks FD-089 and FD-042"
    source: "FD-089, FD-042, CR-012 acceptance row 'FD-089: synthetic and flagged'"
  - id: BR7.3
    statement: "Every file changed outside CR-012's listed owned paths is named in the hand-off with its reason and recorded as an S4 ISS row."
    category: policy
    applies_to: "port-corpus.mjs, src/corpus/*.ts, T-401 FD-062 row, T-409 step 11"
    trigger: "End of Code Generation"
    logic: "IF a changed file or line is outside the listed owned paths THEN the hand-off and one ISS row name it and the answer that allowed it"
    violation: "An unrecorded owned-path addition fails the reviewer's owned-path check (team.md Way of Working step 4)"
    source: "Questions 2 and 4 answer A, ISS-248 precedent"
```

## Rules summary

| ID | Rule | Category |
|---|---|---|
| BR1.1 | The prototype is the only source; no invented records | policy |
| BR1.2 | Synthetic only; new names and BMDC numbers checked before merge | validation |
| BR1.3 | Pre-FD-089 records keep every value | constraint |
| BR1.4 | New children attach where the prototype attaches them; derived values from rows | policy |
| BR1.5 | Seeded counts equal prototype counts; one exception (n8) | validation |
| BR1.6 | New records complete; gaps only where the prototype has no field (`about`, `address`) | validation |
| BR1.7 | A record a binding decision rules out is withheld explicitly (n8, FD-086) | policy |
| BR2.1 | Corpus changes only by running the port | constraint |
| BR2.2 | Follow-ups read like the prototype (inline when no chain) | calculation |
| BR2.3 | Anonymous comment in an anonymous thread reuses its persona | constraint |
| BR2.4 | Existing persona hues pinned; new ones continue the sequence | calculation |
| BR2.5 | `shash`, `mathabatha` are Banglish | validation |
| BR2.6 | Bookmarks exported to the corpus | constraint |
| BR2.7 | Port deterministic | validation |
| BR3.1 | Per-record idempotency by natural key; second run inserts 0 | constraint |
| BR3.2 | Chamber → branch also by "name — label" | calculation |
| BR3.3 | "N months ago" parsed; n6–n10 id mapping; kind's existing key | calculation |
| BR3.4 | Appeal cases on comment targets seeded like MOD-2011 | policy |
| BR3.5 | Reactions from the pool; overflow fails | constraint |
| BR3.6 | Drafts and bookmarks from the corpus | constraint |
| BR3.7 | Seed loads `.env` quietly (ISS-252) | constraint |
| BR4.1 | MOD-2033 padded with `factual`; one shared list | calculation |
| BR4.2 | Any other shortfall fails the seed | validation |
| BR4.3 | Existing case counts unchanged; new cases add rows | constraint |
| BR4.4 | MOD-2041 critical; reporters restricted | constraint |
| BR5.1 | Storyboard corrections SC1–SC5; no other step changes | constraint |
| BR5.2 | Task-file corrections SC6–SC12 | constraint |
| BR5.3 | No `anon_author_r4` left in the four files | validation |
| BR5.4 | `anon_author_r2`'s persona only on r2 | validation |
| BR6.1 | Seed integration test assertions | validation |
| BR6.2 | Corpus tests in the default sweep | validation |
| BR6.3 | Premise-changed assertions rewritten, reasons recorded | validation |
| BR6.4 | At least one new smoke assertion | validation |
| BR6.5 | All checks green; parity unchanged | validation |
| BR7.1 | ISS-158, 176, 221, 252 fixed; findings recorded | policy |
| BR7.2 | New Bengali text listed for review | policy |
| BR7.3 | Owned-path additions recorded | policy |
