# Agent and model assignment

> **Update 2026-09-10.** For the local demo build the assignment classes below are superseded by
> `docs/implementation/00-master-plan.md` §7, backed by
> `docs/planning/research/model-assignment-2026-09-10/research.md` (current model line-up: Claude
> Fable 5.1 / Opus 5 / Sonnet 5 / Haiku 4.5 and GPT-5.6 Sol / Terra / Luna, both on flat-rate
> subscriptions). The task-assignment policy, run-record fields, risk-based requirements and
> cross-vendor validation rules in this file still apply unchanged.

Status: Gate 2 execution policy  
Research snapshot: 2026-08-30

## Verified environment

- The current Codex environment exposes GPT-5.6 Sol, Terra, and Luna plus GPT-5.5 and GPT-5.4. Official guidance positions Sol for the hardest agentic coding, Terra for balanced production work, and Luna for low-cost high-volume work. Current direct list prices are recorded in the research report; availability and price must be rechecked before a paid run.
- Claude Code 2.1.251 is installed. Its configured `sonnet` alias is usable, but aliases are provider-dependent and can move. Official current direct-API documentation lists Fable 5, Opus 5, Sonnet 5, and Haiku 4.5; this repository does not claim account access to an untested exact model ID.
- Automated records must store the exact provider/model identifier returned by the run, not only an alias. Product source files and commits must contain no agent attribution.

Primary sources: [OpenAI models](https://developers.openai.com/api/docs/models), [OpenAI model selection](https://developers.openai.com/api/docs/guides/model-selection), [Anthropic model overview](https://platform.claude.com/docs/en/models/overview), [Claude Code model configuration](https://code.claude.com/docs/en/model-config).

## Assignment classes

| Class | Primary implementer | Independent validator | Effort / context | Cost and fallback | Use |
|---|---|---|---|---|---|
| M0 mechanical | GPT-5.6 Luna | Claude Code configured Sonnet | Low; under 40k tokens | Cost-sensitive; fallback GPT-5.4 | Formatting, fixture expansion, narrow tests, inventory updates |
| M1 routine production | GPT-5.6 Terra | Claude Code configured Sonnet | Medium/high; 40k-150k | Balanced; fallback GPT-5.5 | Focused full-stack stories, components, ordinary refactors |
| M2 frontend/UX | Claude Code configured Sonnet | GPT-5.6 Terra | Medium/high; 40k-150k | Iterate quickly; fallback GPT-5.5 | Design concepts, responsive components, interaction polish |
| M3 cross-cutting/high risk | GPT-5.6 Sol | Claude Code configured Sonnet plus human approval | High/max; 100k-400k | Quality first; fallback GPT-5.5 xhigh | Auth, identity reveal, uploads, deletion, retention, moderation, recovery |
| M4 independent architecture/security review | Claude Code configured Sonnet | GPT-5.6 Sol | High; relevant diff plus contracts/tests | Cross-vendor; no fast-model fallback | Architecture boundaries, threat review, release gate evidence |

Claude Opus 5 is a preferred optional validator for large product/UX synthesis only after its exact account/provider availability and price are confirmed. It is not a required dependency. Fable 5 and Haiku 4.5 receive no mandatory tasks until availability is demonstrated locally.

## Task assignment policy

Each task in `backlog.yaml` has an `assignment_class`. That class expands to the pairing above unless the task explicitly overrides it. The validator must use a separate session and inspect the actual diff, tests, commands, and evidence. An implementer summary alone is not validation.

For every run record:

- exact model ID, provider, effort/reasoning setting, start/end commit and relevant paths;
- expected context size and whether compaction occurred;
- commands and tests executed with exit status;
- validation verdict: `PASS`, `PASS WITH FOLLOW-UP`, or `FAIL`;
- residual risks and required human decision.

## Risk-based requirements

Authentication, anonymous-author reveal, evidence processing, moderation, deletion, retention, legal hold, backup/restore, and legal-response work always use M3 or M4, include automated negative tests and a documented threat/risk review, and require named human approval before completion. Legal and clinical adequacy cannot be delegated to a software model.

## Practical evaluation before Gate 4

Run the same bounded, non-sensitive fixture task once with Terra and Claude Sonnet, then compare correctness, test quality, edit scope, duration, and observed usage. Run Luna only on a mechanical variant. Adjust assignments from evidence; do not change high-risk cross-vendor validation or human gates.
