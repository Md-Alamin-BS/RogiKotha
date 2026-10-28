# Business rules — U3 `t-010-boundary-lint-and-ci`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U3), `unit-of-work-story-map.md` (US1.1), `stories.md` (AC1.1.1–AC1.1.5), `requirements.md` (NFR11; NFR6 for the contrast tool), `components.md` and `contract-summary.md` (AD-6 and C13's `worker_import_rule`), T-010, `01-conventions.md` §1, §2, §7.8, §10, §13, team.md (Code Style, Testing Posture, Way of Working), `org.md` (Testing Posture for `classic`), FD-040 and ISS-060, ISS-127, ISS-205, ISS-226. The workflows that apply these rules are in `functional-spec.md`; element ids `E1`–`E14`, fixture cases `FX1`–`FX14` and check steps `S1`–`S9` are defined there and in `entities.md`.

The rules that follow Questions 1–11 of `functional-design-questions.md` (all answered A) were decided on the owner's standing instruction of 2026-10-27 and await the owner's confirmation in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. `functional-spec.md` § 14 lists what changes if the owner reverses one.

```yaml
rules:
  - id: BR1.1
    statement: "Every source file under packages/*/src and apps/*/src belongs to exactly one element, and a file that matches none is a lint error."
    category: validation
    applies_to: "Element E1-E14, every file under the source roots"
    trigger: "pnpm lint"
    logic: "IF a file under a source root matches no element pattern THEN the linter reports it; the first matching pattern in list order decides the element"
    violation: "An unclassified file escapes every boundary rule; pnpm lint fails"
    source: "T-010 step 2 (element list), 01-conventions.md §1 layout"
  - id: BR1.2
    statement: "Narrower element patterns are listed before the broader patterns they sit inside."
    category: constraint
    applies_to: "E7 before E8; E9 and E10 before E11; E11 and E12 before E13"
    trigger: "The element list is written or changed"
    logic: "IF pattern A is inside pattern B THEN A is listed before B"
    violation: "seed files would be judged as plain test-support, or container.ts as plain web-server, refusing the FD-040 and container edges; fixture controls FX12 and FX13 fail"
    source: "T-010 step 2 (web-components and web-server before web), FD-040, team.md Code Style"
  - id: BR1.3
    statement: "Workspace specifiers (@rogikotha/*, including subpath exports) and the apps/web @/ alias resolve to element files; an internal import the linter cannot resolve is an error."
    category: validation
    applies_to: "Every ImportEdge whose specifier starts with @rogikotha/ or @/, or is relative"
    trigger: "pnpm lint"
    logic: "IF an internal specifier does not resolve to a file THEN report it; IF it resolves THEN the target's element is used for BR2.x, never 'external'"
    violation: "An unresolved or external-classified workspace import passes every boundary rule silently; fixture case FX1 (which imports through @rogikotha/application) fails"
    source: "T-010 acceptance row 'temporarily add import @rogikotha/application to packages/domain'"
  - id: BR1.4
    statement: "Value imports, type-only imports, re-exports, dynamic imports and require calls are all checked."
    category: validation
    applies_to: "Every ImportEdge"
    trigger: "pnpm lint"
    logic: "IF an edge is refused for a value import THEN the same edge is refused as a type-only import, re-export or dynamic import, except the type-only allowance of BR3.5"
    violation: "A type import or a re-export would carry a forbidden dependency through"
    source: "01-conventions.md §2 ('domain imports anything' is forbidden, without a kind exception)"
  - id: BR2.1
    statement: "Element-to-element imports are allowed only along the dependency matrix of functional-spec.md § 3; everything else is refused (default disallow)."
    category: authorization
    applies_to: "DependencyRule for E1-E14"
    trigger: "pnpm lint"
    logic: "IF the target element is not in the source element's allowed list THEN refuse with the boundary rule; an element may import its own type"
    violation: "pnpm lint fails with the boundary rule id; for example domain -> application (FX1)"
    source: "01-conventions.md §2, T-010 step 2, team.md Code Style"
  - id: BR2.2
    statement: "Only packages/test-support/src/seed/** may import database; the rest of test-support may not."
    category: authorization
    applies_to: "E7 test-support-seed, E8 test-support"
    trigger: "pnpm lint"
    logic: "IF a test-support file outside seed/ imports @rogikotha/database THEN refuse; IF a seed/ file does THEN allow"
    violation: "Refusing the seed breaks pnpm db:seed's build; allowing the rest widens FD-040; FX6 and FX12 fail"
    source: "FD-040, ISS-226"
  - id: BR2.3
    statement: "In apps/web only server/container.ts imports adapters."
    category: authorization
    applies_to: "E9 web-container; E10-E13"
    trigger: "pnpm lint"
    logic: "IF a web file other than server/container.ts imports @rogikotha/adapters THEN refuse"
    violation: "Adapters instantiated outside the composition root; FX5 and FX13 fail"
    source: "team.md Code Style, 01-conventions.md §1 and §2"
  - id: BR2.4
    statement: "Component source imports only contracts, i18n, other components and server actions; never the container, auth, other server files, database, adapters or test-support."
    category: authorization
    applies_to: "E12 web-components"
    trigger: "pnpm lint"
    logic: "IF a component imports a target outside [contracts, i18n, web-components, web-actions] THEN refuse"
    violation: "pnpm lint fails; FX3 and FX4 prove the refusals, FX15 the allowed server-action import"
    source: "Question 1 answer A, 01-conventions.md §2 and §8, T-010 step 2"
  - id: BR2.5
    statement: "A test file keeps its element's rules and may additionally import Node built-ins; a test file in packages/* may also import test-support."
    category: policy
    applies_to: "FileCategory test"
    trigger: "pnpm lint"
    logic: "IF a test file imports a Node built-in THEN allow; IF a test file in packages/* imports test-support THEN allow; any other edge is judged by its element's rule"
    violation: "Merged component tests that read stylesheets would fail lint; application tests could not use the fakes §10 requires; FX14 fails"
    source: "Question 5 answer A, 01-conventions.md §10"
  - id: BR2.6
    statement: "Nothing in apps/* imports test-support, in source or test files, and apps/web no longer declares it as a dependency."
    category: authorization
    applies_to: "E9-E14, apps/web/package.json"
    trigger: "pnpm lint; the Unit's package.json edits"
    logic: "IF any file under apps/ imports @rogikotha/test-support THEN refuse; the unused devDependency is removed"
    violation: "FD-040 broken; FX7 fails"
    source: "FD-040, Question 5 answer A"
  - id: BR3.1
    statement: "domain and application import no external package and no Node built-in."
    category: authorization
    applies_to: "E1 domain, E3 application"
    trigger: "pnpm lint"
    logic: "IF a domain or application source file imports anything that is not an allowed element THEN refuse"
    violation: "A library adapter or framework leaks into the pure layers (01-conventions.md §2)"
    source: "01-conventions.md §2 ('domain importing anything', 'application importing a library adapter')"
  - id: BR3.2
    statement: "contracts imports only zod and uuid; i18n imports only next-intl among externals and no internal package."
    category: authorization
    applies_to: "E2 contracts, E6 i18n"
    trigger: "pnpm lint"
    logic: "IF contracts imports an external other than zod or uuid, OR i18n imports an external other than next-intl or any element, THEN refuse"
    violation: "pnpm lint fails"
    source: "Question 4 answer A, T-003 (newId with UUIDv7), packages/i18n/package.json peer dependency"
  - id: BR3.3
    statement: "Component source imports no Node built-in (node: prefix or bare name) and none of pg, pg-boss, drizzle-orm, better-auth, sharp, pdfjs-dist, dotenv, @node-rs/argon2."
    category: authorization
    applies_to: "E12 web-components, category source"
    trigger: "pnpm lint"
    logic: "IF a component source file imports a listed specifier THEN refuse, whether or not the package is installed"
    violation: "Server-only code in a component bundle; FX2 fails"
    source: "01-conventions.md §2, T-010 step 2 externals list"
  - id: BR3.4
    statement: "The worker never imports better-auth or any better-auth subpath."
    category: authorization
    applies_to: "E14 worker, source and test"
    trigger: "pnpm lint"
    logic: "IF a worker file's specifier is better-auth or starts with better-auth/ THEN refuse; the rule matches the specifier text, so it works before and after the package is installed"
    violation: "AD-6 broken: the worker would hold an application session capability; FX8 fails"
    source: "AD-6, 01-conventions.md §2, T-010 step 2, C13 worker_import_rule"
  - id: BR3.5
    statement: "The worker takes application code only from @rogikotha/application/worker; a value import of the @rogikotha/application root, or of any path under modules/identity/, modules/account/ or modules/data-requests/commands/, is refused; type-only imports of the root are allowed."
    category: authorization
    applies_to: "E14 worker, WorkerApplicationSurface"
    trigger: "pnpm lint"
    logic: "IF a worker file value-imports @rogikotha/application, OR imports a forbidden module path THEN refuse; IF it imports @rogikotha/application/worker, OR type-imports the root THEN allow"
    violation: "identity.reveal or dataRequest.delete reachable from the worker through the root export; FX9 (refused value import) or FX11 (allowed type-only import) fails"
    source: "Question 2 answer A, AD-6, C13 worker_import_rule, 01-conventions.md §1 (application root is the full Application interface)"
  - id: BR3.6
    statement: "The worker imports neither drizzle-orm nor pg; table access goes through packages/database repositories, and ISS-205's raw count moves into the outbox repository."
    category: authorization
    applies_to: "E14 worker, apps/worker/src/health.ts, apps/worker/package.json"
    trigger: "pnpm lint; Code Generation"
    logic: "IF a worker file imports drizzle-orm, drizzle-orm/* or pg THEN refuse; health.ts calls the outbox repository's pending count; apps/worker/package.json declares no drizzle-orm"
    violation: "Raw SQL spreads into worker handlers; FX10 fails; ISS-205 stays open"
    source: "Question 3 answer A, ISS-205, 01-conventions.md §2"
  - id: BR3.7
    statement: "Each file set has exactly one effective no-restricted-imports configuration, and its options combine every ban that applies to that set."
    category: constraint
    applies_to: "The flat-config blocks that set no-restricted-imports or its TypeScript variant"
    trigger: "eslint.boundaries.mjs is written or changed"
    logic: "IF two config blocks set the rule for overlapping files THEN the later replaces the earlier entirely; so the bans for one file set are written in one block"
    violation: "A later block silently drops an earlier ban; the fixture controls and violations catch it (FX2, FX8, FX9, FX10)"
    source: "ESLint flat-config rule-option replacement; developer view functional-spec.md § 10"
  - id: BR3.8
    statement: "The worker's container-grep test stays as a second net beside the lint rules."
    category: policy
    applies_to: "apps/worker/src/container.test.ts"
    trigger: "Code Generation"
    logic: "IF the lint rule does not cover the grep exactly THEN keep both; it does not, because the grep matches text the import rules cannot see"
    violation: "Deleting it removes the only check on capability names reached through the root export"
    source: "T-010 'Tests to write', Question 2 answer A"
  - id: BR4.1
    statement: "pnpm lint exits 0 on the real tree with the rules on, after the dispositions of BR4.2."
    category: validation
    applies_to: "The repository"
    trigger: "Code Generation, Build and Test"
    logic: "IF the rules report a finding in merged code THEN it is fixed in U3 (ISS-205, the unused devDependency), suppressed per BR4.2 when its owner is merged, or the Unit stops and escalates"
    violation: "A red lint blocks the merge"
    source: "T-010 step 3, acceptance row 'pnpm lint exit 0'"
  - id: BR4.2
    statement: "An inline suppression names the rule, the owning Unit and its ISS row, and is used only when the owning Unit is already merged."
    category: policy
    applies_to: "eslint-disable comments added by U3"
    trigger: "A finding in merged code that U3 does not fix"
    logic: "IF a suppression is added THEN it reads '-- <owner> to fix (ISS-nnn)' and the ISS row exists; IF the owner is not merged THEN no suppression: the Unit stops"
    violation: "An unexplained suppression breaks team.md Code Style ('every inline suppression carries its reason')"
    source: "T-010 step 3, team.md Code Style"
  - id: BR5.1
    statement: "The fixture mirrors the repository layout under lint-fixtures/boundary-violation/, lies outside every tsconfig include and Vitest include, is ignored by pnpm lint, and is linted only by the fixture script with --no-ignore and with type-aware rules disabled."
    category: constraint
    applies_to: "lint-fixtures/boundary-violation/**"
    trigger: "pnpm lint, pnpm typecheck, pnpm test, pnpm lint:boundaries"
    logic: "IF pnpm lint, typecheck or test runs THEN the fixture is not seen; IF the fixture script runs THEN the same element patterns classify the fixture files through the fixture root"
    violation: "Planted violations would turn the real lint or typecheck red, or the rules would never classify the fixture files"
    source: "T-010 step 4, Question 6 answer A"
  - id: BR5.2
    statement: "pnpm lint:boundaries exits 0 only when ESLint's report on the fixture equals the manifest exactly: every violation case reported once with its expected rule, nothing else reported; it prints 'N expected violations found'."
    category: validation
    applies_to: "scripts/check-boundaries-fixture.mjs, FixtureManifest"
    trigger: "pnpm lint:boundaries (S3)"
    logic: "IF the set of (file, rule id) problems equals the manifest's violation cases AND there are no other errors or warnings THEN exit 0 ELSE print the difference and exit 1"
    violation: "A rule that stops biting, or a new unexpected error, fails pnpm check"
    source: "T-010 step 4 and acceptance row 'Fixture proves rules', Question 6 answer A"
  - id: BR5.3
    statement: "Every control case of the fixture reports no problem."
    category: validation
    applies_to: "FX11-FX15"
    trigger: "pnpm lint:boundaries"
    logic: "IF a control file reports any problem THEN the script exits 1"
    violation: "An allowed exception (FD-040 seed, container adapters, worker entry, test built-ins) turned into a refusal unnoticed"
    source: "Question 6 answer A"
  - id: BR5.4
    statement: "Removing any one boundary rule makes pnpm lint:boundaries fail."
    category: validation
    applies_to: "The fixture proof"
    trigger: "Build and Test (mutation check)"
    logic: "IF one rule block is disabled THEN at least one violation case is missing from the report AND the script exits 1"
    violation: "A fixture that cannot fail does not prove the rules (team.md: a test must be able to fail)"
    source: "team.md Testing Posture, T-010 acceptance rows 'Rule really blocks …'"
  - id: BR5.5
    statement: "The Unit adds one smoke assertion: the boundary rules refuse domain -> application, run through ESLint's Node API in a tooling Vitest project that pnpm smoke collects."
    category: validation
    applies_to: "scripts/ tooling project, pnpm smoke"
    trigger: "pnpm smoke"
    logic: "IF pnpm smoke runs THEN the assertion lints fixture case FX1 and expects the boundary rule's error; every earlier smoke assertion still runs"
    violation: "No smoke assertion for the Unit breaks team.md Testing Posture"
    source: "team.md Testing Posture (cumulative smoke suite)"
  - id: BR6.1
    statement: "Each workspace package's line coverage, aggregated over its counted source files, is at least 80% in pnpm check."
    category: validation
    applies_to: "CoverageThreshold for every package in packages/* and apps/*"
    trigger: "S6 test:coverage inside pnpm check"
    logic: "IF a package's lines covered / lines total is below 0.80 THEN the coverage run exits non-zero and pnpm check fails"
    violation: "AC1.1.3 fails"
    source: "AC1.1.3, NFR11, D10, team.md Testing Posture, org.md Testing Posture (classic)"
  - id: BR6.2
    statement: "Every non-excluded source file counts, including files no test loads, which count as 0% covered."
    category: validation
    applies_to: "CoverageMeasurement.files_counted"
    trigger: "S6"
    logic: "IF a source file is not loaded by any test THEN it still appears in the report with its lines uncovered; the count of files reported per package equals the package's non-excluded source files"
    violation: "Untested files invisible to the floor; the trial of 2026-10-28 showed 15 of 67 web files and 3 of 9 worker files reported without this"
    source: "D10 (no figure that hides code), functional-spec.md § 2 trial"
  - id: BR6.3
    statement: "A package with no executable source line passes the floor without being listed anywhere, and is held to it as soon as it has one."
    category: policy
    applies_to: "packages/domain, packages/application, packages/adapters today"
    trigger: "S6"
    logic: "IF lines total is 0 THEN the package passes ELSE BR6.1 applies; no exemption list exists"
    violation: "An exemption list could outlive the emptiness it was for"
    source: "team.md Testing Posture ('applies to a package once that package has source code')"
  - id: BR6.4
    statement: "Only test files, test setup and global-setup files, test-only helper modules, type declarations and files with a generated header are excluded from coverage, each pattern with its reason."
    category: constraint
    applies_to: "CoverageExclusion"
    trigger: "The coverage configuration is written or changed"
    logic: "IF a pattern is excluded THEN its reason is one of the five; entry points, Next route files and data modules count; a later exclusion needs a recorded reason in that Unit's hand-off"
    violation: "A wider exclusion lowers the floor by shrinking the denominator (D10)"
    source: "Question 8 answer A, D10"
  - id: BR6.5
    statement: "The floor is never lowered: 80 is a minimum, thresholds never auto-update, no script or CI step overrides them, and a package below 80% is raised with tests in this Unit before the thresholds are switched on."
    category: policy
    applies_to: "CoverageThreshold, the Bolt order"
    trigger: "Code Generation; every later change to the coverage configuration"
    logic: "IF a package is below 80% THEN U3 adds test files until it is at or above 80% AND only then enables its threshold in the same Bolt; IF it cannot reach 80% without a source change THEN record an ISS row and ask the owner; never lower the number"
    violation: "Lowering or bypassing the floor breaks D10 and org.md ('may not be weakened to make a step pass')"
    source: "Question 7 answer A, D10, team.md Testing Posture, org.md Testing Posture"
  - id: BR6.6
    statement: "pnpm check runs the whole test suite once, with coverage on, across every project including database."
    category: constraint
    applies_to: "S6 test:coverage"
    trigger: "pnpm check"
    logic: "IF pnpm check runs THEN the test step is the coverage run (no second plain run); pnpm test keeps its current fast behaviour for local use"
    violation: "Two test runs double the database project's time against the 5-minute target"
    source: "T-010 acceptance row 'Time < 5 min', team.md Way of Working (pnpm test includes the database project)"
  - id: BR6.7
    statement: "Build and Test records each package's covered and total lines and file count from the report of that run; nothing is estimated."
    category: policy
    applies_to: "CoverageMeasurement"
    trigger: "Build and Test"
    logic: "IF a coverage figure is recorded THEN it is copied from the run's summary with the run's date and branch"
    violation: "A claimed figure breaks team.md ('we do not claim a coverage figure we have not measured')"
    source: "team.md Testing Posture"
  - id: BR7.1
    statement: "format:check runs Prettier --check over the format scope, as a step of pnpm check and of CI."
    category: validation
    applies_to: "FormatScope, S4"
    trigger: "pnpm check, CI"
    logic: "IF any file in scope differs from Prettier's output THEN format:check exits non-zero"
    violation: "Unformatted code merges"
    source: "team.md Code Style (the owner's answer of 2026-10-15)"
  - id: BR7.2
    statement: "Verbatim-ported and generated files are never formatted: apps/web/src/styles/**, migrations/** and the other ignores of FormatScope stay out of scope, each with a reason in .prettierignore."
    category: constraint
    applies_to: ".prettierignore"
    trigger: "format:check, the baseline formatting commit"
    logic: "IF a file is ported verbatim, generated, Markdown, or belongs to engine or documentation trees THEN it is ignored"
    violation: "Prettier would rewrite the ported staff stylesheet against 01-conventions.md §7.1, or churn generated snapshots"
    source: "Question 9 answer A, 01-conventions.md §7.1, project.md Code Style (FD-091)"
  - id: BR7.3
    statement: "Line endings are git's job: Prettier's endOfLine is auto, and .gitattributes keeps the repository LF."
    category: constraint
    applies_to: "prettier.config.mjs, .gitattributes"
    trigger: "format:check on any checkout"
    logic: "IF a working tree has CRLF files (core.autocrlf=true) THEN format:check judges content only; the repository content stays LF through .gitattributes"
    violation: "Every CRLF file fails on Windows while CI passes (180 of 309 files on 2026-10-28)"
    source: "Question 9 answer A, .gitattributes (CR-008, ISS-178)"
  - id: BR7.4
    statement: "The first green format:check comes from one commit on the Bolt branch holding only Prettier output over the scope, made after CR-011 is on main; the hand-off records its hash."
    category: policy
    applies_to: "FormatScope.baseline_commit"
    trigger: "Code Generation"
    logic: "IF the baseline commit is made THEN it contains no other change, follows CR-011's merge, a whitespace-insensitive diff of it shows no token change, and pnpm check passes after it; the squash onto main folds it into the Bolt's one commit, so the Bolt branch keeps it reviewable on its own"
    violation: "A mixed commit hides logic changes in formatting noise; formatting before CR-011 lands conflicts with its build"
    source: "Question 9 answer A, team.md Way of Working (commit only the Unit's paths)"
  - id: BR8.1
    statement: "pnpm check runs, in order: S1 typecheck, S2 lint, S3 lint:boundaries, S4 format:check, S5 check:identity, S6 test:coverage, S7 i18n:check, S8 contrast, S9 build."
    category: constraint
    applies_to: "CheckPipeline"
    trigger: "pnpm check"
    logic: "IF pnpm check runs THEN the nine steps run in this order, cheap static steps first and the build last"
    violation: "A missing step leaves its rule unenforced; AC1.1.1 fails"
    source: "AC1.1.1, NFR11, T-010 step 5, 01-conventions.md §13, Questions 9 and 11"
  - id: BR8.2
    statement: "A failing step stops pnpm check and makes it exit non-zero."
    category: validation
    applies_to: "CheckPipeline"
    trigger: "Any step fails"
    logic: "IF a step exits non-zero THEN no later step runs AND pnpm check exits non-zero"
    violation: "A swallowed exit code lets a red check look green"
    source: "T-010 step 5 (&& chain), 01-conventions.md §13"
  - id: BR8.3
    statement: "pnpm check's wall-clock time is recorded at Build and Test; above 5 minutes locally is recorded as an ISS row, and no step is dropped to get under it."
    category: policy
    applies_to: "CheckPipeline.wall_clock_seconds"
    trigger: "Build and Test"
    logic: "IF the time exceeds 300 s THEN record it and an ISS row; the steps stay"
    violation: "Dropping a step to save time lowers the gate"
    source: "T-010 acceptance row 'Time', D10"
  - id: BR8.4
    statement: "Later Units append steps to pnpm check (T-011 adds check:motion after contrast); a step is removed or reordered only with a recorded reason."
    category: policy
    applies_to: "CheckPipeline"
    trigger: "A later Unit changes the root check script"
    logic: "IF a Unit adds a check THEN it appends it; IF it removes or reorders one THEN its hand-off says why"
    violation: "A silently removed step lowers the gate"
    source: "T-011 owned paths (check:motion), team.md Testing Posture"
  - id: BR9.1
    statement: "tools/contrast.mjs accepts --tokens <path>; without the flag it reads the prototype stylesheet and behaves exactly as today."
    category: constraint
    applies_to: "tools/contrast.mjs, pnpm tools:contrast"
    trigger: "Any contrast run"
    logic: "IF --tokens is given THEN read that file ELSE read ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/styles.css"
    violation: "pnpm tools:contrast changes behaviour"
    source: "T-010 steps 5 and 6"
  - id: BR9.2
    statement: "pnpm contrast reads apps/web/src/styles/tokens.css and today gives the same pair results as pnpm tools:contrast."
    category: validation
    applies_to: "pnpm contrast (S8)"
    trigger: "pnpm check"
    logic: "IF pnpm contrast runs on today's tokens THEN its 150 pair results equal pnpm tools:contrast's (verified in memory 2026-10-28)"
    violation: "Acceptance row 'Contrast on ported tokens' fails"
    source: "T-010 step 6 and acceptance row, 01-conventions.md §7.8, NFR6"
  - id: BR9.3
    statement: "With --tokens, an unreadable file, no variant found, or any pair skipped for a missing token fails the run."
    category: validation
    applies_to: "tools/contrast.mjs --tokens"
    trigger: "pnpm contrast"
    logic: "IF the file cannot be read, OR no :root block is found, OR any pair is skipped THEN exit non-zero with the reason"
    violation: "A wrong path or renamed tokens would print 'OK' with nothing checked (today every pair would be skipped and the run would pass)"
    source: "phase rule (silent failures are not acceptable), NFR6"
  - id: BR9.4
    statement: "The contrast thresholds and failure semantics are unchanged: a text pair below 4.5:1 or a hard 1.4.11 pair below 3:1 fails."
    category: constraint
    applies_to: "tools/contrast.mjs PAIRS"
    trigger: "Any contrast run"
    logic: "IF the flag is added THEN no pair, threshold or hard flag changes"
    violation: "Lowered contrast thresholds"
    source: "T-010 step 6 ('everything else unchanged'), D10"
  - id: BR10.1
    statement: "The CI workflow runs on pushes to main and bolt/** and on manual dispatch."
    category: constraint
    applies_to: ".github/workflows/check.yml"
    trigger: "git push, manual dispatch"
    logic: "IF a commit is pushed to main or a bolt/ branch THEN the workflow runs"
    violation: "CI never runs before a merge"
    source: "Question 10 answer A, team.md Way of Working (bolt branches), org.md (classic: CI execution before merge)"
  - id: BR10.2
    statement: "The CI job uses a postgres:18 service initialised with infra/compose/postgres-init/*.sql, generates APP_ENCRYPTION_KEY and BETTER_AUTH_SECRET inside the job, uses no repository secret, has a read-only token, pins every action to a commit hash, and has no step that commits, comments or carries tool identity."
    category: constraint
    applies_to: "CiWorkflow, CiService"
    trigger: "Every CI run"
    logic: "IF the job runs THEN roles, databases and extensions come from the compose init scripts, secrets are generated per job, and the only write is the job's own log"
    violation: "A secret in the repository, a mutable action tag, or a bot step breaks the security or no-identity rules"
    source: "T-010 step 7, project Forbidden rule (no tool identity), construction phase rule (no hardcoded secrets)"
  - id: BR10.3
    statement: "The CI job installs with the frozen lockfile, migrates the empty database, then runs pnpm check and pnpm smoke."
    category: validation
    applies_to: "CiWorkflow.steps"
    trigger: "Every CI run"
    logic: "IF install, migrate from empty, pnpm check or pnpm smoke fails THEN the run fails"
    violation: "AC1.1.1 or AC1.1.2 unproven on a clean machine"
    source: "AC1.1.1, AC1.1.2, T-010 step 7, team.md Way of Working"
  - id: BR10.4
    statement: "A Bolt merges only after the local pnpm check and pnpm smoke are green and the CI run on the Bolt branch head is green; the run URL is recorded."
    category: policy
    applies_to: "Every Bolt from U3 on"
    trigger: "Merge step"
    logic: "IF the Bolt head has no green CI run THEN do not merge; after the merge, main's run is checked too"
    violation: "A Bolt that is green only on one machine merges"
    source: "Question 10 answer A, org.md Testing Posture (classic: CI before merge), T-010 step 8"
  - id: BR10.5
    statement: "One CI run per ref is active at a time, and a run is cut off after 20 minutes."
    category: constraint
    applies_to: "CiWorkflow.concurrency, timeout_minutes"
    trigger: "Every CI run"
    logic: "IF a newer commit is pushed to the same ref THEN the older run is cancelled; IF a run passes 20 minutes THEN it fails"
    violation: "Stale runs report on superseded commits; a hang holds the runner"
    source: "T-010 step 7"
  - id: BR11.1
    statement: "check:identity fails on attribution markers in the commit messages since main's merge base and in tracked files outside the excluded trees."
    category: validation
    applies_to: "IdentityGuardPattern, S5"
    trigger: "pnpm check, CI"
    logic: "IF a commit message or a tracked file outside docs/, aidlc/, .claude/, .codex/, .agents/, .github/agents/, _bmad/, ui-design-prototype/ contains a Co-Authored-By trailer, a 'Generated with/by' footer, the robot-emoji footer or a known tool no-reply address THEN exit non-zero naming the place"
    violation: "Tool identity reaches a commit or file (ISS-057 repeated)"
    source: "Question 11 answer A, ISS-060, project Forbidden rule, AGENTS.md"
  - id: BR11.2
    statement: "A bare model or tool name is not a marker; the audit cost entries AGENTS.md allows are never flagged."
    category: constraint
    applies_to: "IdentityGuardPattern"
    trigger: "check:identity"
    logic: "IF a file contains only a name (for example a task header's model column or an audit By Model line) THEN it passes"
    violation: "The guard fails on records the owner decided to keep"
    source: "AGENTS.md (cost-entry exception of 2026-10-15)"
  - id: BR12.1
    statement: "The FD entry recording the rulings that change 01-conventions.md §2 (Questions 1-5) is written before any configuration."
    category: policy
    applies_to: "docs/status/decision-log.md"
    trigger: "Start of Code Generation"
    logic: "IF the boundary rules differ from §2's text THEN the next free FD entry (FD-093 at the time of writing) names each ruling and that it was decided on the owner's standing instruction"
    violation: "A binding convention changes without its decision record (project Mandated rule)"
    source: "project.md Mandated (decision log binding)"
  - id: BR12.2
    statement: "A dated dependency-check entry covering every new or newly used dependency and CI action is written before the first install, and the plugin's ESLint 10 support is confirmed from its changelog or the dependency-cruiser fallback is taken and said so."
    category: policy
    applies_to: "docs/status/dependency-check-log.md, package.json"
    trigger: "Before pnpm add"
    logic: "IF the latest entry covering a dependency is older than 3 days or absent THEN check the current stable release and its known issues and append an entry; pick the latest stable, not the newest"
    violation: "Breaks the AGENTS.md and project Mandated dependency rule"
    source: "project.md Mandated, T-010 'Read first' item 6, NFR11"
  - id: BR12.3
    statement: "01-conventions.md §2 and §13 and tools/README.md describe the rules as built; the team.md correction of Question 4 is proposed through the learnings step, not written directly."
    category: constraint
    applies_to: "01-conventions.md, tools/README.md, team.md"
    trigger: "Code Generation; the stage gate"
    logic: "IF a ruling changes §2's text THEN §2 states the new rule with its FD id; §13 lists the nine check steps; tools/README.md gets one paragraph on --tokens; team.md changes only through the human-gated learnings step"
    violation: "The written conventions and the lint disagree (the ISS-140 pattern)"
    source: "FD-040 ('written into 01-conventions.md §2'), T-010 step 6, team.md header ('edit at the gate, not directly')"
  - id: BR12.4
    statement: "ISS-205, ISS-226 and ISS-060 are closed as fixed in U3 T-010; ISS-127 records that CI starts PostgreSQL and stays open for the local message; every new finding is an ISS row with Found in U3 T-010."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "End of Code Generation"
    logic: "IF a row's fix lands THEN its status names U3 T-010; new rows carry severities S1-S4"
    violation: "Breaks the defect-register rule"
    source: "project.md Mandated (ISS rows), team.md Way of Working"
  - id: BR12.5
    statement: "The hand-off lists every owned-path addition and every corrected task-text item with its reason."
    category: policy
    applies_to: "T-010 task file hand-off, docs/implementation/handoffs/T-010.md"
    trigger: "End of Code Generation"
    logic: "IF the Unit writes outside the task file's owned paths, or corrects a task statement THEN the hand-off names the path or statement and the question or rule behind it"
    violation: "Files outside owned paths without a reason fail the reviewer's diff check (team.md step 4)"
    source: "team.md Way of Working step 4, functional-spec.md § 12"
  - id: BR12.6
    statement: "Code Generation starts only after CR-011 is on main, and the re-check list of functional-spec.md § 16 is worked through first."
    category: policy
    applies_to: "The Bolt for U3"
    trigger: "Start of Code Generation"
    logic: "IF CR-011 is not merged THEN do not start; IF it is THEN re-read the files § 16 names and update this design where they changed"
    violation: "Formatting, ISS-205's move and the worker rules would conflict with CR-011's rewrite of the same files"
    source: "CR-011 'Parallel-safe with' (apps/worker/src, packages/database/src/queue, the env files), team.md (serial Construction)"
```

## Rules summary

| ID | Rule | Category |
|---|---|---|
| BR1.1 | Every source file belongs to one element; unclassified files fail | validation |
| BR1.2 | Narrower element patterns first | constraint |
| BR1.3 | Workspace specifiers and `@/` resolve to elements; unresolved internal imports fail | validation |
| BR1.4 | Type imports, re-exports, dynamic imports are checked too | validation |
| BR2.1 | Element imports follow the matrix; default disallow | authorization |
| BR2.2 | Only `test-support/src/seed/**` imports database (FD-040) | authorization |
| BR2.3 | Only `apps/web/src/server/container.ts` imports adapters | authorization |
| BR2.4 | Components import contracts, i18n, components and server actions only | authorization |
| BR2.5 | Test files may add Node built-ins; package tests may add `test-support` | policy |
| BR2.6 | Nothing in `apps/*` imports `test-support`; unused devDependency removed | authorization |
| BR3.1 | domain and application import no external | authorization |
| BR3.2 | contracts: `zod`, `uuid`; i18n: `next-intl` | authorization |
| BR3.3 | Component source: no Node built-ins, no server libraries | authorization |
| BR3.4 | Worker: no `better-auth`, by specifier | authorization |
| BR3.5 | Worker: application only through `@rogikotha/application/worker` | authorization |
| BR3.6 | Worker: no `drizzle-orm`, no `pg`; ISS-205 fixed | authorization |
| BR3.7 | One effective `no-restricted-imports` per file set | constraint |
| BR3.8 | Worker container-grep test kept | policy |
| BR4.1 | `pnpm lint` green on the real tree | validation |
| BR4.2 | Suppressions only for merged owners, with reason and ISS row | policy |
| BR5.1 | Fixture mirrors the layout and is isolated from the real gates | constraint |
| BR5.2 | Fixture report equals the manifest exactly | validation |
| BR5.3 | Control cases report nothing | validation |
| BR5.4 | Removing a rule fails the fixture proof | validation |
| BR5.5 | One smoke assertion through a tooling project | validation |
| BR6.1 | 80% line floor per package | validation |
| BR6.2 | Untested files count | validation |
| BR6.3 | Empty packages pass mechanically; no exemption list | policy |
| BR6.4 | Narrow, reasoned coverage exclusions | constraint |
| BR6.5 | Floor never lowered; raise with tests first | policy |
| BR6.6 | One test run with coverage in `pnpm check` | constraint |
| BR6.7 | Figures recorded as measured | policy |
| BR7.1 | `format:check` in `pnpm check` and CI | validation |
| BR7.2 | Ported and generated files never formatted | constraint |
| BR7.3 | Git owns line endings; Prettier `endOfLine: auto` | constraint |
| BR7.4 | One formatting-only baseline commit after CR-011 | policy |
| BR8.1 | Nine check steps in order | constraint |
| BR8.2 | Fail fast, exit non-zero | validation |
| BR8.3 | Wall clock recorded; no step dropped for time | policy |
| BR8.4 | Later Units append steps | policy |
| BR9.1 | `--tokens` flag; no flag means unchanged | constraint |
| BR9.2 | `pnpm contrast` on `tokens.css` equals today's result | validation |
| BR9.3 | With `--tokens`, skips and unreadable input fail | validation |
| BR9.4 | Thresholds unchanged | constraint |
| BR10.1 | CI on `main`, `bolt/**`, manual | constraint |
| BR10.2 | Service, generated secrets, read-only token, pinned actions, no bot step | constraint |
| BR10.3 | Frozen install, migrate from empty, `pnpm check`, `pnpm smoke` | validation |
| BR10.4 | Merge waits for green CI on the Bolt head | policy |
| BR10.5 | One run per ref; 20-minute limit | constraint |
| BR11.1 | `check:identity` refuses attribution markers | validation |
| BR11.2 | Bare names and allowed audit entries pass | constraint |
| BR12.1 | FD entry before configuration | policy |
| BR12.2 | Dependency check before install; ESLint 10 support confirmed | policy |
| BR12.3 | §2, §13, `tools/README.md` updated; team.md through learnings | constraint |
| BR12.4 | ISS-205, ISS-226, ISS-060 closed; new rows recorded | policy |
| BR12.5 | Owned-path additions and task corrections listed | policy |
| BR12.6 | Start after CR-011; re-check list first | policy |
