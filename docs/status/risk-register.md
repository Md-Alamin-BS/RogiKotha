# RogiKotha risk register

**As of:** 2026-08-30  
**Scale:** Likelihood and impact are 1 (low) to 5 (very high). Score is likelihood × impact before the listed mitigations.

| ID | Risk | L | I | Score | Current response | Recommended response / owner |
|---|---|---:|---:|---:|---|---|
| RK-01 | Current Bangladesh privacy/cyber obligations or commencement are misunderstood | 4 | 5 | 20 | Do not infer obligations from the legislative index; obtain consolidated texts and written advice | Bangladesh counsel sign-off |
| RK-02 | Defamatory, doxxing, retaliatory, or false allegation is published or mishandled | 4 | 5 | 20 | First-hand/opinion rules, evidence separation, reason-coded moderation, notice/appeal, urgent escalation | Counsel-approved publication workflow + moderation drill |
| RK-03 | Provider reply or review discloses confidential health information | 4 | 5 | 20 | No privileged provider channel; confidentiality rules; safety classification and human escalation | Healthcare/counsel sign-off + scenario tests |
| RK-04 | Uploaded file compromises converter, host, reviewer, or public user | 4 | 5 | 20 | Quarantine, allowlist, magic/MIME checks, AV, disposable network-denied conversion, sanitised derivatives | Malicious-corpus and sandbox boundary test |
| RK-05 | Redaction only hides pixels while underlying sensitive data remains recoverable | 4 | 5 | 20 | Destructive redaction, metadata/object removal, flatten/raster policy, verification | Demonstrated redaction proof for each format |
| RK-06 | Anonymous/pseudonymous presentation exposes or overpromises identity privacy | 4 | 5 | 20 | Separate public identity from private linkage; no promise against lawful process; minimise staff access | Founder policy + counsel-approved disclosure notice |
| RK-07 | Single VPS failure destroys database, blobs, analytics, or configuration | 4 | 5 | 20 | Automated encrypted off-host backup on separate failure/credential domain; monitored restore drills | Agreed RPO/RTO and successful full restore |
| RK-08 | Privileged account compromise permits content, identity, evidence, or audit abuse | 4 | 5 | 20 | Strong passwords, secure sessions, new-device email approval/password recheck, least privilege, audited break-glass; Phase 1 MFA/passkeys intentionally deferred | Auth spike, security test and explicit accepted-risk review |
| RK-09 | One runtime configuration change disables a core safety control | 3 | 5 | 15 | Compile/configure immutable policy invariants outside mutable settings; two-person change for high risk | Approved invariant list + authorisation tests |
| RK-10 | Report thresholds are brigaded to suppress legitimate content | 4 | 4 | 16 | Layered signals, reversibility, factual-dispute separation, bounded review SLA, coordination detection | Founder moderation decision + abuse simulation |
| RK-11 | Bangla/Banglish search hides relevant profiles or enables impersonation | 4 | 4 | 16 | Preserve originals, curated aliases, native exact-match priority, confusable tests, local relevance corpus | Measured corpus acceptance threshold |
| RK-12 | Unsafe or misleading medical advice stays visible long enough to harm a user | 3 | 5 | 15 | Plain advice warning, dedicated report reason, five-account reversible hide and manual moderation; no automated classifier | Healthcare-reviewed warning/report procedure + clinical drill |
| RK-13 | Broad Office/HEIC formats create fidelity, resource, licence, or parser failures | 4 | 4 | 16 | Start narrow; add format only after test matrix passes | Founder format decision + per-format acceptance |
| RK-14 | Garage on one node is mistaken for redundant object storage | 4 | 4 | 16 | Explicitly separate storage from backup; conformance/failure test; off-host copy | Storage decision + restore test |
| RK-15 | Authentication library transition/advisories introduce an exploitable flow | 3 | 5 | 15 | Prefer current patched supported path; threat-model recovery/account linking; monitor advisories | Auth spike + implementation-day advisory check |
| RK-16 | Self-hosted analytics expands attack surface and operations beyond its value | 3 | 3 | 9 | Minimise fields, isolate runtime, make optional, or defer | Founder value decision + privacy/ops review |
| RK-17 | Accessibility barriers prevent review creation or privacy editing | 4 | 4 | 16 | WCAG 2.2 AA, native semantics, both-language manual tests, reduced motion, low-end device pass | Documented manual accessibility verdict |
| RK-18 | Founder-moderator workload exceeds response and safety capacity | 4 | 4 | 16 | Queue priorities, SLAs, rate limits, canned reasons, escalation and staffing triggers | Load model + operational readiness review |
| RK-19 | Audit/version retention is too short for disputes or too long for minimisation duties | 3 | 5 | 15 | Record-level policy, legal holds, access audit, scheduled deletion, counsel review | Founder retention decision + counsel approval |
| RK-20 | Automated implementation work overwrites user changes or creates inconsistent parallel edits | 3 | 4 | 12 | One task/worktree/file owner, recorded base, dirty-tree check, small commits, acceptance checks | Execution plan approval and integration checklist |

## Accepted risks and required release evidence

The founder confirmed an unrestricted public Phase 1 after basic legal/healthcare review, email/password without Phase 1 MFA/passkeys, and a plain warning/report/manual workflow rather than automated medical-danger or threat classification. The USD 0 demo is public, synthetic and read-only; real operation targets USD 100/month. These decisions intentionally favor accessibility, simplicity and cost. The associated account-takeover, publication, moderation, capacity and recovery risks remain open until the named spikes and release gates pass.

This does not require visible friction for ordinary users. Password hashing, rate limiting, secure sessions, access control, audit events, safe file handling, backups and rollback are implementation hygiene. The demo has no real accounts, writes, uploads or analytics, so production-only controls are not simulated as real security there.

## Review cadence

- Re-evaluate critical risks at every approval gate and after any architecture-changing founder answer.
- Recheck dependency/security advisories at implementation, release candidate, and monthly maintenance.
- Recheck Bangladesh official sources and professional guidance immediately before collecting real reviews and before public release.
- Close a risk only with linked evidence; a plan or installed dependency is not proof of control.
