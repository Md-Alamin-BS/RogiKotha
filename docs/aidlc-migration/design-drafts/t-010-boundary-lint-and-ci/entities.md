# Entities — U3 `t-010-boundary-lint-and-ci`

Source of truth for the data shape this Unit works on. U3 adds no table, column or runtime data. Its entities are the parts of the quality gate: the architectural elements of the monorepo and the import edges between them, the fixture that proves the rules bite, the coverage scope and floor per package, the format scope, the `pnpm check` pipeline, the CI workflow, the contrast run and the identity guard, plus the records that carry the decisions. Built from T-010, `01-conventions.md` §1, §2, §7.8, §10, §13, team.md (Code Style, Testing Posture, Way of Working), FD-040, ISS-060, ISS-127, ISS-205, ISS-226 and the answers in `functional-design-questions.md`. Workflows and state transitions are in `functional-spec.md`; decision logic is in `rules.md`.

The element ids `E1`–`E14`, the fixture case ids `FX1`–`FX15` and the check step ids `S1`–`S9` are stable within this Unit's record and are used by `rules.md` and `functional-spec.md`.

```yaml
entities:
  - name: WorkspacePackage
    description: "A pnpm workspace member (packages/* or apps/*). The unit of the coverage floor and the owner of one or more elements."
    attributes:
      - { name: package_name, type: identifier, required: true, unique: true, constraints: "the package.json name, for example @rogikotha/contracts" }
      - { name: path, type: path, required: true, unique: true, allowed_values: [packages/domain, packages/contracts, packages/application, packages/database, packages/adapters, packages/i18n, packages/test-support, apps/web, apps/worker] }
      - { name: source_root, type: path, required: true, constraints: "<path>/src" }
      - { name: has_executable_source, type: boolean, required: true, constraints: "true when at least one non-test, non-excluded file under source_root has an executable line; a placeholder 'export {}' has none" }
      - { name: exports, type: list<string>, required: true, constraints: "the package.json exports keys, for example '.', './format'; the worker entry './worker' is added to @rogikotha/application by the first Unit that needs it (Question 2)" }
    relationships:
      - { to: Element, cardinality: "one-to-many", direction: "WorkspacePackage contains Element" }
      - { to: CoverageThreshold, cardinality: "one-to-one", direction: "WorkspacePackage is measured against CoverageThreshold" }

  - name: Element
    description: "An architectural layer the boundary rules know, matched by a path pattern. Every source file under packages/*/src and apps/*/src belongs to exactly one element; the first matching pattern in list order wins, so narrower patterns come first."
    attributes:
      - { name: element_id, type: identifier, required: true, unique: true, constraints: "E1..E14" }
      - { name: type, type: identifier, required: true, unique: true, allowed_values: [domain, contracts, application, database, adapters, i18n, test-support-seed, test-support, web-container, web-actions, web-server, web-components, web, worker] }
      - { name: pattern, type: glob, required: true, constraints: "repository-relative; also accepted under the fixture root lint-fixtures/boundary-violation/ (Question 6)" }
      - { name: order, type: integer, required: true, unique: true, min: 1, max: 14 }
      - { name: package, type: identifier, required: true, references: WorkspacePackage.package_name }
    constraints:
      - "E1 domain packages/domain/src/**; E2 contracts packages/contracts/src/**; E3 application packages/application/src/**; E4 database packages/database/src/**; E5 adapters packages/adapters/src/**; E6 i18n packages/i18n/src/**; E7 test-support-seed packages/test-support/src/seed/**; E8 test-support packages/test-support/src/**; E9 web-container apps/web/src/server/container.ts; E10 web-actions apps/web/src/server/actions/**; E11 web-server apps/web/src/server/**; E12 web-components apps/web/src/components/**; E13 web apps/web/src/**; E14 worker apps/worker/src/**"
      - "E7 precedes E8, and E9 and E10 precede E11, which precedes E13; E12 precedes E13"
    relationships:
      - { to: DependencyRule, cardinality: "one-to-one", direction: "Element is governed by DependencyRule" }
      - { to: ExternalRestriction, cardinality: "one-to-zero-or-one", direction: "Element may carry ExternalRestriction" }

  - name: FileCategory
    description: "A classification orthogonal to Element. A test file keeps its element's rules and gains the test allowances of Question 5."
    attributes:
      - { name: category, type: enum, required: true, allowed_values: [source, test] }
      - { name: test_patterns, type: list<glob>, required: true, default: ["**/*.test.ts", "**/*.test.tsx", "**/*.smoke.test.ts", "**/*.smoke.test.tsx", "**/*.int.test.ts", "**/test-setup.ts", "**/global-setup.ts", "**/*-test-support.ts"] }
      - { name: allowances, type: list<string>, required: true, constraints: "test in packages/*: Node built-ins and test-support; test in apps/*: Node built-ins only (FD-040)" }

  - name: DependencyRule
    description: "The allowed internal edges of one element (default disallow). The matrix is § 3 of functional-spec.md; it encodes 01-conventions.md §2 with FD-040, team.md and Questions 1-5."
    attributes:
      - { name: from_element, type: identifier, required: true, unique: true, references: Element.type }
      - { name: allowed_targets, type: list<identifier>, required: true, references: Element.type, constraints: "an element may always import its own type" }
      - { name: import_kinds_checked, type: list<enum>, required: true, allowed_values: [value, type, re-export, dynamic, require], default: [value, type, re-export, dynamic, require] }
      - { name: source, type: string, required: true, constraints: "01-conventions.md §2, FD-040, team.md Code Style, or a question number" }

  - name: ExternalRestriction
    description: "A rule on third-party or Node built-in specifiers for one element: either an allowlist (nothing else permitted) or a denylist (everything else permitted)."
    attributes:
      - { name: element, type: identifier, required: true, references: Element.type }
      - { name: mode, type: enum, required: true, allowed_values: [allowlist, denylist] }
      - { name: specifiers, type: list<string>, required: true }
      - { name: applies_to_category, type: enum, required: true, allowed_values: [source, source_and_test] }
      - { name: mechanism, type: enum, required: true, allowed_values: [boundaries_external, no_restricted_imports], constraints: "AD-6 bans use no_restricted_imports, which matches the specifier text and needs no installed package" }
    constraints:
      - "domain: allowlist []; application: allowlist []; contracts: allowlist [zod, uuid] (Question 4); i18n: allowlist [next-intl] (Question 4)"
      - "web-components, source only: denylist [node:*, every bare Node built-in name, pg, pg-boss, drizzle-orm, better-auth, sharp, pdfjs-dist, dotenv, @node-rs/argon2]"
      - "worker: denylist [better-auth, better-auth/*, drizzle-orm, drizzle-orm/*, pg] plus the AD-6 application specifiers of WorkerApplicationSurface"

  - name: WorkerApplicationSurface
    description: "What the worker may import from @rogikotha/application (Question 2, AD-6, C13 worker_import_rule)."
    attributes:
      - { name: allowed_value_specifier, type: string, required: true, allowed_values: ["@rogikotha/application/worker"], constraints: "exists only once the first Unit needing application code in the worker adds it" }
      - { name: allowed_type_only_specifier, type: string, required: true, allowed_values: ["@rogikotha/application"] }
      - { name: forbidden_patterns, type: list<string>, required: true, default: ["@rogikotha/application (value import)", "**/modules/identity/**", "**/modules/account/**", "**/modules/data-requests/commands/**", "better-auth", "better-auth/*"] }
      - { name: second_net, type: string, required: true, allowed_values: ["apps/worker/src/container.test.ts text scan for better-auth|identity.reveal|dataRequest.delete"] }

  - name: ImportEdge
    description: "One import in one file as the linter sees it: the unit the rules decide on."
    attributes:
      - { name: file, type: path, required: true }
      - { name: from_element, type: identifier, required: true, references: Element.type, constraints: "a file matching no element is an error, not an unknown that passes" }
      - { name: category, type: enum, required: true, allowed_values: [source, test] }
      - { name: specifier, type: string, required: true }
      - { name: kind, type: enum, required: true, allowed_values: [value, type, re-export, dynamic, require] }
      - { name: resolves_to, type: enum, required: true, allowed_values: [element, external, builtin, unresolved], constraints: "workspace specifiers (@rogikotha/*) and the @/ alias must resolve to an element file; unresolved internal is an error" }
      - { name: target_element, type: identifier, required: false, references: Element.type }
      - { name: verdict, type: enum, required: true, allowed_values: [allowed, refused] }
      - { name: rule_id, type: identifier, required: false, constraints: "the reporting ESLint rule when refused" }

  - name: BoundaryFinding
    description: "A refused ImportEdge in the real tree found when the rules are first switched on."
    attributes:
      - { name: file, type: path, required: true }
      - { name: rule_id, type: identifier, required: true }
      - { name: owning_unit, type: identifier, required: true }
      - { name: disposition, type: enum, required: true, allowed_values: [fixed_in_u3, suppressed_owner_merged, escalated], constraints: "suppressed only with '-- <owner> to fix' and an ISS row; escalated stops the Unit (task step 3)" }
      - { name: issue_id, type: identifier, required: false }

  - name: FixtureCase
    description: "One planted file in lint-fixtures/boundary-violation/, mirroring the repository layout, listed in the fixture manifest."
    attributes:
      - { name: case_id, type: identifier, required: true, unique: true, constraints: "FX1..FX15 (functional-spec.md § 6)" }
      - { name: path, type: path, required: true, unique: true }
      - { name: kind, type: enum, required: true, allowed_values: [violation, control] }
      - { name: expected_rule_id, type: identifier, required: false, constraints: "required for violation; absent for control" }
      - { name: expected_count, type: integer, required: true, min: 0, max: 1, constraints: "1 for a violation, 0 for a control" }
      - { name: proves, type: string, required: true, constraints: "the BR id the case proves" }
    constraints:
      - "Outside every tsconfig include and every package's Vitest include; ignored by pnpm lint; linted only by the fixture script with --no-ignore and with type-aware rules disabled"
      - "Each file is otherwise lint-clean, so the only reported problems are the planted ones"

  - name: FixtureManifest
    description: "The expected (path, rule id) list the fixture script compares with ESLint's report."
    attributes:
      - { name: cases, type: list<FixtureCase>, required: true }
      - { name: expected_violations, type: integer, required: true, constraints: "number of violation cases; printed as 'N expected violations found'" }

  - name: CoverageThreshold
    description: "The line-coverage floor for one package, aggregated over every counted file in its source root."
    attributes:
      - { name: package, type: identifier, required: true, unique: true, references: WorkspacePackage.package_name }
      - { name: glob, type: glob, required: true, constraints: "<path>/src/**" }
      - { name: metric, type: enum, required: true, allowed_values: [lines] }
      - { name: minimum_percent, type: number, required: true, min: 80, max: 100, default: 80, constraints: "never lowered (D10); raising is allowed" }
      - { name: auto_update, type: boolean, required: true, allowed_values: [false] }
      - { name: state, type: enum, required: true, allowed_values: [exempt_no_code, enforced_passing, enforced_failing] }
    constraints:
      - "Exemption is mechanical: a package with no executable line passes without being listed anywhere; there is no exemption list"

  - name: CoverageExclusion
    description: "A pattern removed from the coverage denominator, with its reason (Question 8)."
    attributes:
      - { name: pattern, type: glob, required: true, unique: true }
      - { name: reason, type: enum, required: true, allowed_values: [test_file, test_setup, test_helper, type_declaration, generated_file] }
      - { name: added_by, type: identifier, required: true, constraints: "Unit id; a later addition needs a recorded reason in that Unit's hand-off" }

  - name: CoverageMeasurement
    description: "One package's figure from one coverage run, as reported, never estimated."
    attributes:
      - { name: package, type: identifier, required: true, references: WorkspacePackage.package_name }
      - { name: lines_covered, type: integer, required: true, min: 0 }
      - { name: lines_total, type: integer, required: true, min: 0 }
      - { name: percent, type: number, required: true, constraints: "100 when lines_total is 0" }
      - { name: files_counted, type: integer, required: true, constraints: "equals the number of non-excluded source files of the package (proves untested files count)" }
      - { name: run, type: string, required: true, constraints: "the pnpm check run it came from (date and branch)" }

  - name: FormatScope
    description: "Which files Prettier checks, and the line-ending policy (Question 9)."
    attributes:
      - { name: included_roots, type: list<path>, required: true, default: [apps, packages, scripts, lint-fixtures, .github/workflows, "root configuration files"] }
      - { name: ignored, type: list<glob>, required: true, constraints: "each with a reason in .prettierignore: apps/web/src/styles/**, **/migrations/**, **/*.md, aidlc/**, docs/**, tools/**, ui-design-prototype/**, _bmad/**, .claude/**, .codex/**, .agents/**, .github/agents/**, .impeccable/**, .data/**, pnpm-lock.yaml, node_modules, **/dist, **/.next" }
      - { name: end_of_line, type: enum, required: true, allowed_values: [auto], constraints: "git owns line endings through .gitattributes eol=lf" }
      - { name: baseline_commit, type: string, required: true, constraints: "one commit on the Bolt branch holding only prettier --write output over the scope, after CR-011 is on main; its hash is recorded in the hand-off" }

  - name: CheckStep
    description: "One step of the root pnpm check script."
    attributes:
      - { name: step_id, type: identifier, required: true, unique: true, constraints: "S1..S9" }
      - { name: script, type: identifier, required: true, allowed_values: [typecheck, lint, "lint:boundaries", "format:check", "check:identity", "test:coverage", "i18n:check", contrast, build] }
      - { name: order, type: integer, required: true, unique: true, min: 1 }
      - { name: needs_postgres, type: boolean, required: true, constraints: "true only for test:coverage (database project)" }
      - { name: exit_semantics, type: string, required: true, constraints: "non-zero exit stops the pipeline (&&) and fails pnpm check" }
    constraints:
      - "Later Units may append a step (T-011 adds check:motion after contrast); no Unit removes or reorders one without a recorded reason"

  - name: CheckPipeline
    description: "The root pnpm check: the single local gate and the body of CI."
    attributes:
      - { name: steps, type: list<CheckStep>, required: true }
      - { name: wall_clock_seconds, type: integer, required: true, constraints: "recorded at Build and Test; target under 300 locally" }

  - name: CiWorkflow
    description: ".github/workflows/check.yml."
    attributes:
      - { name: triggers, type: list<string>, required: true, default: ["push: main", "push: bolt/**", "workflow_dispatch"] }
      - { name: runner, type: string, required: true, allowed_values: [ubuntu-latest] }
      - { name: timeout_minutes, type: integer, required: true, default: 20 }
      - { name: concurrency, type: string, required: true, constraints: "one group per ref; a newer push cancels the older run" }
      - { name: permissions, type: string, required: true, allowed_values: ["contents: read"] }
      - { name: secrets_used, type: list<string>, required: true, default: [], constraints: "APP_ENCRYPTION_KEY and BETTER_AUTH_SECRET are generated in the job and never stored" }
      - { name: action_pins, type: string, required: true, constraints: "every third-party action pinned to a full commit hash with its version in a comment" }
      - { name: steps, type: list<string>, required: true, default: [checkout, "pnpm setup from packageManager", "Node from .nvmrc with pnpm cache", "install --frozen-lockfile", "init roles and extensions with psql", "db:migrate from empty", "pnpm check", "pnpm smoke"] }
    relationships:
      - { to: CiService, cardinality: "one-to-many", direction: "CiWorkflow starts CiService" }
      - { to: CiRun, cardinality: "one-to-many", direction: "CiWorkflow produces CiRun" }

  - name: CiService
    description: "A service container of the job."
    attributes:
      - { name: image, type: string, required: true, allowed_values: ["postgres:18"] }
      - { name: env, type: map, required: true, constraints: "POSTGRES_USER postgres, POSTGRES_PASSWORD from the job, POSTGRES_DB rogikotha (01-roles.sql alters it)" }
      - { name: health_check, type: string, required: true, constraints: "pg_isready" }

  - name: CiRun
    description: "One run of the workflow on one commit."
    attributes:
      - { name: ref, type: string, required: true }
      - { name: commit, type: string, required: true }
      - { name: result, type: enum, required: true, allowed_values: [success, failure, cancelled] }
      - { name: url, type: url, required: true, constraints: "recorded in the Unit hand-off" }

  - name: ContrastRun
    description: "One run of tools/contrast.mjs."
    attributes:
      - { name: token_source, type: path, required: true, constraints: "the prototype 04b styles.css without a flag; the --tokens path otherwise (apps/web/src/styles/tokens.css for pnpm contrast)" }
      - { name: variants, type: list<string>, required: true, constraints: "LIGHT, DARK and every light scheme block found" }
      - { name: pairs_evaluated, type: integer, required: true, constraints: "150 on 2026-10-28 for both sources" }
      - { name: pairs_skipped, type: integer, required: true, constraints: "with --tokens, any skip fails the run" }
      - { name: failures, type: integer, required: true }

  - name: IdentityGuardPattern
    description: "An attribution marker check:identity refuses (Question 11)."
    attributes:
      - { name: pattern, type: string, required: true, constraints: "Co-Authored-By trailer; 'Generated with' or 'Generated by' footer; the robot-emoji footer; known tool no-reply addresses" }
      - { name: surfaces, type: list<enum>, required: true, allowed_values: [commit_messages_since_merge_base, tracked_files] }
      - { name: excluded_paths, type: list<glob>, required: true, default: ["docs/**", "aidlc/**", ".claude/**", ".codex/**", ".agents/**", ".github/agents/**", "_bmad/**", "ui-design-prototype/**"] }

  - name: DecisionRecord
    description: "An FD row in docs/status/decision-log.md. This Unit adds one (FD-093 at the time of writing) for the rulings that change 01-conventions.md §2, before any configuration is written."
    attributes:
      - { name: fd_id, type: identifier, required: true, unique: true }
      - { name: rulings, type: list<string>, required: true, constraints: "Questions 1-5 at least; Questions 6-11 are recorded in the hand-off" }
      - { name: decided_by, type: string, required: true, constraints: "the agent on the owner's standing instruction of 2026-10-27, awaiting the owner's confirmation" }

  - name: DependencyCheckEntry
    description: "A dated entry in docs/status/dependency-check-log.md, written before the first install."
    attributes:
      - { name: date, type: date, required: true }
      - { name: covers, type: list<string>, required: true, default: [eslint-plugin-boundaries, dependency-cruiser, ESLint 10, typescript-eslint, "an import resolver if needed", "@vitest/coverage-v8", Prettier, "actions/checkout", "actions/setup-node", "pnpm/action-setup", "postgres:18"] }

  - name: IssueRow
    description: "A row in docs/implementation/ISSUES.md. This Unit closes ISS-205, ISS-226 and ISS-060 and adds the rows it finds, each with Found in U3 T-010."
    attributes:
      - { name: issue_id, type: identifier, required: true, unique: true }
      - { name: severity, type: enum, required: true, allowed_values: [S1, S2, S3, S4] }
      - { name: found_in, type: string, required: true }
      - { name: status, type: string, required: true }
```

## Summary

- **WorkspacePackage** is a pnpm workspace member. It owns elements and is the unit of the coverage floor. `domain`, `application` and `adapters` hold only a placeholder today, so they have no executable line.
- **Element** is a path-matched layer (`E1`–`E14`); narrower patterns come first, so `seed/**` wins over the rest of `test-support`, `container.ts` and `actions/**` win over the rest of `server/**`, and `server/**` and `components/**` win over the rest of `apps/web/src`. **FileCategory** separates test files, which gain the allowances of Question 5.
- **DependencyRule** lists each element's allowed internal targets; **ExternalRestriction** limits third-party and Node built-in specifiers; **WorkerApplicationSurface** pins what the worker may take from `@rogikotha/application` (Question 2).
- **ImportEdge** is what the linter decides on; **BoundaryFinding** records a refused edge in the real tree and what was done about it.
- **FixtureCase** and **FixtureManifest** make the proof exact: each forbidden edge class has a violation file, each allowed exception a control file, and the script compares the report with the manifest.
- **CoverageThreshold**, **CoverageExclusion** and **CoverageMeasurement** carry the 80% floor per package, the few files that may be left out and why, and the figures as reported.
- **FormatScope** says what Prettier checks and that git owns line endings. **CheckStep** and **CheckPipeline** are `pnpm check`. **CiWorkflow**, **CiService** and **CiRun** are the GitHub Actions job and its runs. **ContrastRun** and **IdentityGuardPattern** are the two other checks.
- **DecisionRecord**, **DependencyCheckEntry** and **IssueRow** are the records the Unit writes.
