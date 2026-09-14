# Model assignment for the demo build — research (2026-09-10)

**Question:** Which of the models available to the founder (Claude Code: Fable 5.1, Opus 5, Sonnet 5,
Haiku 4.5; Codex CLI: GPT-5.6 Sol, Terra, Luna) should implement and validate which kind of task in
`docs/implementation/00-master-plan.md`, given both are on flat-rate subscriptions?
**Method:** primary-source fetches of vendor model/pricing/model-selection pages on 2026-09-10; benchmark
numbers copied from vendor announcements. Third-party summaries are flagged.
**Result:** the routing table in `00-master-plan.md` §7. This file is the evidence behind it.
**Supersedes:** the assignment classes in `docs/planning/07-agent-model-assignment.md` (2026-08-30 snapshot)
for the demo build; that file's cross-vendor validation and human-gate rules still apply.

## 1. Anthropic models (Claude Code)

| Model | API id | Vendor positioning | List price in/out per MTok | Context / max out | Notes |
|---|---|---|---|---|---|
| Claude Fable 5.1 | `claude-fable-5-1` | "demanding reasoning and long-horizon agentic work"; most capable GA model | $10 / $50 | 1M / 128K | thinking always on; default effort `high`; cache reads 0.025× |
| Claude Opus 5 | `claude-opus-5` | "complex agentic coding and enterprise work"; recommended start for most workloads | $5 / $25 | 1M / 128K | adaptive thinking; default `high`; Fast mode available |
| Claude Sonnet 5 | `claude-sonnet-5` | "best combination of speed and intelligence" | $2 / $10 (the planned Sept-2026 increase was cancelled) | 1M / 128K | adaptive thinking; default `high` |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | "fastest model with near-frontier intelligence" | $1 / $5 | 200K / 64K | no effort parameter |

Claude Code effort levels: `low`, `medium`, `high` (default), `xhigh`, `max` (vendor warns `max` is "prone to overthinking"). Aliases `opusplan` (Opus plans, Sonnet executes) and `best` exist.

Sources: https://platform.claude.com/docs/en/models/overview · https://platform.claude.com/docs/en/about-claude/pricing · https://code.claude.com/docs/en/model-config · https://www.anthropic.com/claude/fable · https://www.anthropic.com/claude-fable-and-mythos-5-1 · https://www.anthropic.com/news/claude-opus-5 · https://www.anthropic.com/news/claude-sonnet-5

## 2. OpenAI models (Codex CLI)

| Model | Vendor positioning | List price in/out per MTok (cached in) | Context / max out |
|---|---|---|---|
| GPT-5.6 Sol | "flagship model for complex professional work" | $4 / $20 ($0.40) | ~1.05M / 128K |
| GPT-5.6 Terra | "balances intelligence and cost" | $2 / $12 ($0.20) | ~1.05M / 128K |
| GPT-5.6 Luna | "optimized for cost-sensitive workloads" | $0.20 / $1.20 ($0.02) | ~1.05M / 128K |
| GPT-5.5 / 5.4 (legacy) | still listed | $5 / $30 · $2.50 / $15 | 272K |

Reasoning effort: `low`, `medium` (default), `high`, `xhigh`, `max`; a `pro` execution mode can be combined. Batch API is 50 % off.

**Caveat:** OpenAI's model-selection guide now leads with `gpt-6-astra` and positions GPT-5.6 as the value tier; the Sol/Terra/Luna task split below is consistent with the pricing page but the guide text retrieved did not name Sol explicitly. The GPT-5.6 announcement page returned HTTP 403 to automated fetch; its benchmark numbers below come from third-party summaries of that page.

Sources: https://developers.openai.com/api/docs/models · https://developers.openai.com/api/docs/pricing · https://developers.openai.com/api/docs/guides/model-selection · https://developers.openai.com/api/docs/guides/reasoning · Codex CLI docs (https://learn.chatgpt.com/docs/codex/cli)

## 3. Benchmarks (all vendor-reported; cross-vendor rows are the *reporting* vendor's run of the competitor)

| Benchmark | Fable 5.1 | Opus 5 | Sonnet 5 | Sol | Terra | Reported by |
|---|---|---|---|---|---|---|
| Terminal-Bench 4.0 | 55.8 | 52.3 | — | 37.3 | — | Anthropic, Sep 2026 |
| Terminal-Bench 2.1 | — | 89.1 | 80.4 | 88.8 (91.9 "ultra") | 87.4 | Anthropic Jul 2026 / OpenAI Jun 2026 (via third-party summaries) |
| SWE-bench Verified | — | 96.0 | — | — | — | Anthropic |
| SWE-bench Pro | — | 79.2 | 63.2 | 64.6 | 63.4 | Anthropic / OpenAI (third-party summaries) |
| CursorBench 3.2.0 | 73.4 | 70.0 | — | 67.2 | — | Anthropic |
| Agents' Last Exam | (Fable 5: 40.5) | — | — | 53.6 | — | OpenAI (third-party summaries) |

No independent harness ran both vendors' models identically; treat Opus 5 and Sol as one tier, and Sonnet 5 and Terra as one tier.

## 4. What this implies

1. **Spec-following implementation (M1/M2):** Sonnet 5 and Terra are interchangeable. Prefer Sonnet 5 for UI ports because this repo's `impeccable` skill, `tools/` checks and the prototype conventions are already wired into Claude Code; prefer Terra when Claude quota is the constraint.
2. **High-risk, cross-cutting (M3):** Opus 5 first, Sol as the alternate, always validated by the other vendor's top tier plus the founder's approval (AD-16). Both have `xhigh`/`high` effort; use `xhigh` on Opus for state machines and threat-modelled code.
3. **Mechanical (M0):** Luna or Haiku 4.5. Ports of strings/data/config where the task file *is* the specification.
4. **Fable 5.1:** not for implementation (5× Sonnet per token, always-on thinking wasted on specified work). Optional final security read in T-505 if the subscription exposes it.
5. **Flat-rate economics:** with both subscriptions the binding constraint is the rate-limit window, not dollars. Keep Opus/Sol sessions short and scoped (one task each), run the long UI ports on Sonnet/Terra, and never run validation in the implementer's session.
6. **Effort defaults:** Sonnet/Terra `high`; Opus `xhigh` for M3, `high` for M4 reviews; Luna `medium`.

## 5. Not verified / open

- Codex CLI subscription billing details and rate-limit windows were not found in the docs retrieved.
- Whether Fable 5.1 is exposed on the founder's Claude subscription — check `/model` in Claude Code.
- Live SWE-bench leaderboard did not render to automated fetch; numbers above are from announcements.
