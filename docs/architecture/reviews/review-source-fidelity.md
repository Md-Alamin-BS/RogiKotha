# Architecture review — source and dependency fidelity

Date: 2026-08-30  
Sources checked: requirement baseline, founder decisions FD-001–024, research report/digests, dependency check log and dependency selections

## Verdict

PASS WITH FOLLOW-UP. The recommendation preserves all confirmed founder decisions and does not revive superseded ratings, BM&DC verification, privileged provider responses, broad Phase 1 file formats, private Beta, automated danger classification or analytics in the demo. Exact dependency patches still require the repository's less-than-three-day installation check.

## Findings

| Severity | Finding | Resolution |
|---|---|---|
| High | Anonymous-author reveal wording described only Admin/Moderator grants and left Super Admin behavior ambiguous. | AD-3 and the recommendation now state purpose-bound audited Super Admin access plus separately enabled, normally-disabled Admin/Moderator capabilities. |
| Medium | Stack table coupled Drizzle ORM and migration tooling to one version without separate evidence. | The architecture pins only the researched Drizzle ORM released line; migration-tool compatibility is checked before scaffold. |
| Medium | Dependency companion and spine differed on Tailwind/Lucide snapshot values. | Companion values were aligned to the researched spine snapshot. |
| Low | Office conversion appearing in topology could be mistaken as enabled Phase 1 scope. | Recommendation and dependency selection explicitly keep Office parsing unreachable until a later per-format gate. |

## Decision fidelity

- Public unrestricted production remains conditional only on basic legal/healthcare and full readiness gates, not a private Beta.
- Demo is USD 0, public, synthetic, read-only and analytics-off.
- Initial evidence allowlist is JPEG/PNG/PDF; public processed copy requires author review/confirmation; originals remain private.
- Retention defaults are 90/180 days, dynamic prospectively; bulk retroactivity and record holds are separately logged.
- Bengali and English are equal product/interface languages.
- Advice receives plain warning/report/manual moderation, not automated medical/threat classification.

## Remaining risk

Current Bangladesh law and healthcare-policy interpretation still belongs to qualified reviewers. Package availability, advisories and commercial conditions can change between this snapshot and installation.
