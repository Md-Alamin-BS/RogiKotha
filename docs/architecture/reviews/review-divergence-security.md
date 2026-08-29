# Architecture review — divergence and security

Date: 2026-08-30  
Method: Trace cross-module actions and hostile/failure paths, looking for places two implementers could make incompatible choices.

## Verdict

PASS WITH FOLLOW-UP. The highest-risk divergence points now have one binding contract: public visibility, identity reveal, evidence custody, configuration, deletion and validation. The architecture does not claim that these contracts alone make the product secure.

## Findings

| Severity | Divergence/failure | Resolution |
|---|---|---|
| Critical | Blind account deletion could cascade into held evidence or erase public discussion context. | AD-17/ADR-0013 require per-module planned actions, separate public visibility/preservation and retryable partial outcomes. |
| High | A module could treat a tombstone/hidden state differently and leak through search/cache/notifications. | AD-5 requires shared transition semantics and public-projection-only consumers. |
| High | Identity-reveal capability could be interpreted as a generic staff permission. | AD-3 makes it purpose-bound; role controls and every reveal are audited; public projections exclude linkage. |
| Medium | “Append-only” could cause indefinite retention or ad hoc deletion. | AD-7 permits only authorized retention expiry, not editing or ordinary deletion. |
| Medium | Worker compromise could reach broad application data. | AD-6/AD-15 require scoped credentials, isolated services, bounded processing and no general identity/public-delete ability. |

## Threat-path checks

- Direct public URL, search, sitemap, cache, notification and analytics visibility all converge on the public projection.
- Evidence original, derivative and metadata have distinct permissions/keys; scanner/converter cannot serve public content.
- Reports hide reversibly and do not decide medical truth; factual disagreement is not automatic danger handling.
- Runtime configuration cannot disable structural authorization, identity separation, audit integrity or evidence custody.
- Jobs and telemetry carry opaque identifiers only; medical text, raw queries, filenames and private links are prohibited.

## Remaining risk

Implementation must prove row/object authorization, proxy/cookie assumptions, parser isolation, signature/update failure, bulk-action drift, legal-hold scope, cache invalidation and restore reconciliation with negative tests and drills.
