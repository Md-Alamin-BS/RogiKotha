# Code Generation Plan Approval

AI-DLC writes this file when it asks you to approve the plan. To answer here
instead of in chat, write your answer after `[Answer]:` and say done.

## Plan Approval

Approve these 3 code plans?

- Builds: the Directory and Taxonomy modules (queries, `addMemberDoctor` for FD-100, the provisional-term operation and `createProvisional`), the `ProviderExperience` and `ConditionStats` ports with ...
- Touches: `packages/{contracts,domain,application,database,test-support,i18n}`, `apps/web/src/{app/[locale]/(patient)/{doctors,facilities,topics},components/patient/{doctors,facilities,topics,shared...
- Tests: domain policy functions, contracts `stableHue`, application queries and commands on `test-support` fakes (happy path in `en` and `bn`, each refusal, one audit assertion), database `*.int.tes...

Full plan: aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u46-directory/code-generation/code-generation-plan.md
Test instructions: aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u46-directory/code-generation/unit-test-instructions.md

[Approval Fingerprint]: sha256:v3:321e3bf31f99dc7b476ebbb76e8426b1da14ca54021873ec0f86c3d1258f2b3d
[Planned Source]: 78aa21207641a2f7028dc2e99b87c91ec8b1d0ab4188dc17822d488c8305dc75

- A. Approve all
- B. Request Changes
- C. I'll edit the files

[Answer]: Approve Plan
