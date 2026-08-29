# Security evidence digest: trust and file handling

**Research cut:** 2026-08-29  
**Scope:** authentication and recovery; uploads and file validation; malware scanning; Office-to-PDF conversion; PDF viewing and redaction; object storage; auditability and retention; encryption and keys; backup and disaster recovery.  
**Evidence rule:** primary/official sources only. No project files were used as evidence.  
**Evidence notation:** every load-bearing claim carries a source tag such as **[S03]**. The source register expands each tag to its URL, publisher, publication/update date, access date, confidence, and evidence class. Proposed product defaults are explicitly labeled **Decision default**, not presented as standards or legal requirements.

## Executive decision

Adopt a **quarantine-first, asynchronous file pipeline**. A successful HTTP upload is not an accepted document. Keep every new object non-public and non-downloadable until authorization, size limits, filename/extension checks, MIME and signature inspection, malware scanning, and any required conversion have completed. OWASP explicitly recommends defense in depth: allowlisted extensions, untrusted `Content-Type`, signature checks used only with other controls, generated filenames, size limits, out-of-webroot storage, antivirus/sandboxing, and CDR where applicable. **[S03]**

Use the following baseline:

| Capability | Selection | Decision |
|---|---|---|
| Authentication | Standards-based application auth or an OIDC identity provider with WebAuthn/passkeys, MFA, rate limiting, secure recovery, and complete security-event hooks | Require phishing-resistant WebAuthn/passkeys for privileged reviewer/admin roles where feasible; permit strong password plus MFA as a recovery-compatible fallback. Do not build custom token formats or recovery cryptography. **[S01][S02]** |
| Upload transport | Authenticated upload-intent endpoint plus a short-lived, single-object presigned upload or an application-streamed upload | Presigned URLs are bearer tokens and can overwrite an existing key, so generate an unguessable, never-reused quarantine key, keep expiry short, and never expose the URL in logs. **[S14]** |
| Type validation | Extension allowlist + claimed MIME check + content signature/magic check + container-aware checks | Treat all three signals as untrusted/incomplete. A mismatch is a rejection or manual-review event, not an opportunity to “fix” the extension. **[S03]** |
| Malware scanning | Self-hosted ClamAV daemon with current official signatures, isolated behind a local socket/private network | Good free baseline, not a guarantee of safety. Quarantine on detection or scan error; never auto-delete because false positives occur. Do not expose the unauthenticated `clamd` TCP socket. **[S05][S06]** |
| Office preview | LibreOffice headless conversion in a disposable, network-denied worker | Acceptable pragmatic converter, but **not a CDR/sanitization guarantee**. Its importer is a hostile-file parser with a recurring security-advisory history; pin a maintained release and patch quickly. **[S07][S08]** |
| Managed Office conversion alternative | Microsoft Graph drive-item conversion to PDF | Lower local parser-operations burden when Microsoft 365 is already an approved processor. It requires storing the file in OneDrive/SharePoint and returns a short-lived preauthenticated download URL; privacy, residency, BAA/DPA, licensing, and conversion limits need procurement validation. **[S10]** |
| PDF viewing | Self-hosted PDF.js, customized and pinned | Strong free viewer choice for render, navigation, search, zoom, and range loading. Render visible pages only and preserve the text layer. **[S11][S12]** |
| Manual redaction | A real redaction engine that removes underlying objects and sanitizes hidden content; commercial SDK/service if reliable OSS removal cannot be proved | PDF.js is a parser/renderer/viewer, not evidence of secure redaction. Drawing a black rectangle or annotation is not redaction. Gate or defer the feature until destructive removal is independently verified. **[S11][S13]** |
| Object storage | Managed Amazon S3 (or an approved managed S3-compatible provider with equivalent controls) behind an internal storage abstraction | Prefer private buckets, least-privilege workload identity, SSE-KMS, versioning, lifecycle rules, and separate quarantine/clean/derived namespaces. **[S14][S15][S16]** |
| Self-hosted S3 | Do not start a new deployment on the archived MinIO community repository | The official repository was archived on 2026-04-25 and states it is no longer maintained; legacy binaries do not receive updates. AIStor is the vendor successor, with licensing/support terms to procure. **[S18]** |
| Audit | Append-only application audit events plus infrastructure/security logs, protected from tampering and health-data leakage | Record who/what/when/where/result and all high-risk workflow transitions; never log document content, passwords, access tokens, encryption keys, or full presigned URLs. **[S04][S17]** |
| Backup/DR | Versioning plus immutable backup copies in a separate failure domain; tested database-and-object restore | Versioning helps recover from user/application error; Object Lock supplies WORM retention; cross-Region replication supplies geographic copies. None replaces a tested recovery plan. **[S16][S17]** |

## Reference security flow

1. **Create intent.** Authenticate and authorize the caller, enforce tenant/case ownership, rate limits, per-user quotas, and allowed business file types. Create a database record with a random object identifier; keep the user filename only as display metadata after normalization. **[S03]**
2. **Receive into quarantine.** Upload only to a private quarantine namespace. If presigning, issue a narrowly scoped URL for one random key and one HTTP method with a short expiry; require a supported checksum. A presigned URL is reusable until expiry and inherits the signer’s permissions, so the signing identity must have only the required object action. **[S14]**
3. **Recheck server-side.** Enforce size both before/during transfer and after storage; never trust client-reported length. Decode the filename before extension checks, reject double extensions and dangerous names, compare extension, claimed MIME, and content signature, and apply container/decompression limits. OWASP warns that MIME can be spoofed, signatures are bypassable when used alone, and decompressed size matters. **[S03]**
4. **Scan.** Stream the quarantined bytes to a local/private `clamd`, record engine/signature versions, verdict, duration, and any limit/error status. `freshclam` must keep the official signature database current. A timeout, scanner outage, unscanned oversized file, or parse-limit result is **not clean**. **[S05][S06]**
5. **Convert if needed.** Run Office conversion in a fresh worker with no outbound network, no credentials, a read-only base filesystem, a unique temporary profile, non-root UID, strict CPU/RAM/PID/file/output/time limits, and access only to one input and output location. LibreOffice officially supports command-line PDF export, but its advisories document crafted-document memory corruption, path traversal, script execution, link/network retrieval, and information-disclosure classes; headless mode does not remove parser risk. **[S07][S08]**
6. **Validate derived output.** Confirm the output is actually a PDF, cap page count and output size, scan it, and store it under a different immutable key linked to the source hash and converter version. Conversion success never changes the original scan verdict.
7. **Publish state, not a bucket.** Only an atomic state transition from `quarantined` to `clean`/`ready` permits authorized access. Serve through an authorization check or a very short-lived GET URL. Keep source, preview, and redacted derivatives as separate objects with provenance.
8. **View.** Load PDF.js from the application origin, pin the worker and API to the same version, preserve same-origin/CORS controls, use HTTP Range support, and render only visible pages to contain memory. Raw binary is preferable to base64 because base64 conversion consumes more memory. **[S11][S12]**
9. **Redact.** Save redaction marks as review instructions until the user applies them. Application must generate a new derivative in which content inside marked regions is removed, hidden content is sanitized, and the result is reopened and tested for text extraction, copy/paste, search, metadata, attachments, layers, comments, and incremental-update leakage. Adobe’s official workflow distinguishes marking from applying redactions and separately offers sanitization of hidden information. **[S13]**

## Authentication and account recovery

### Required controls

- Prefer WebAuthn/FIDO2 for privileged users. NIST identifies WebAuthn as a verifier-name-bound phishing-resistant standard; passwords, OTP, and out-of-band codes are not phishing-resistant. **[S01]**
- If passwords exist: 15-character minimum when used as a single factor; at least eight when they are only part of MFA; allow at least 64 characters; reject known/common/compromised values; do not impose composition rules or periodic changes; permit password managers, paste, and autofill; rate-limit failed attempts. These are current NIST SP 800-63B-4 requirements/recommendations, not older composition-policy folklore. **[S01]**
- Return generic authentication and recovery responses to resist account enumeration, transmit credentials only over TLS, reauthenticate for sensitive account/security changes, and rotate/invalidate sessions after high-risk events. **[S02]**
- Recovery must not be weaker than normal authentication. NIST recognizes saved/issued recovery codes, recovery contacts, and repeated identity proofing; saved codes need at least 64 bits of approved randomness and hashed storage, and every recovery event requires an independent user notification. **[S01]**
- Bind at least two usable authenticators for privileged staff where feasible. Provide accessible backup methods that do not depend on the same device or communication channel.

### Decision implications

- **Managed identity provider:** can reduce implementation and recovery risk, but requires verification of BAA/DPA availability, region/data flow, security-event export, WebAuthn support tier, recovery administration, audit retention, tenant isolation, availability SLA, and exit/export path. Pricing and BAA eligibility are unknown until a vendor/plan is named.
- **Self-hosted identity:** avoids a new processor and may be free/open source, but transfers patching, deliverability, abuse prevention, recovery support, and high-availability obligations to the operator.
- **Simplest acceptable native alternative:** use the application framework’s mature authentication/session implementation only if it supplies standards-compliant password hashing, WebAuthn/MFA, one-time recovery tokens, session invalidation, CSRF defenses, and security-event hooks. A home-grown auth subsystem is not justified.

## Upload policy and limits

### Proposed starter allowlist

**Decision default, not an external mandate:** begin with `pdf`, `docx`, `xlsx`, and `pptx` only. Reject legacy binary Office formats (`doc`, `xls`, `ppt`), macro-enabled formats (`docm`, `xlsm`, `pptm`), RTF, archives, executables, HTML/SVG, and password-encrypted documents until a documented business need and format-specific threat model exist. OWASP supports minimizing allowed types to business-critical formats and specifically warns that ZIP files create many attack vectors. **[S03]**

**Decision default:** 25 MiB compressed/input size; 250 MiB total decompressed/container scan budget; 1,000 embedded entries; 60-second scan/convert wall-clock budget; 200-page preview budget. These numbers are deliberately conservative starting points and need representative-file load testing. OWASP mandates appropriate upload/request/decompressed-size limits but does not prescribe universal numeric values. **[S03]**

Reject, rather than silently truncate, when a scanner or converter reaches a limit. Record a machine-readable reason and show the user a safe, non-diagnostic explanation. A ClamAV `--max-filesize` skip can otherwise be treated as clean by the tool, so application orchestration must distinguish `clean`, `infected`, `error`, `limit`, and `unsupported`. **[S06]**

## Malware scanning decision

ClamAV is an actively documented, self-hostable GPLv2 malware toolkit with a multithreaded daemon and automatic signature updater. It recognizes Office, OOXML, PDF, archives, macro malware, and archive-bomb conditions, but its own documentation says evolving formats cannot all be unpacked or extracted and false positives occur. It is a detection layer, not proof that a file is safe. **[S05][S06]**

Operational requirements:

- Use the local Unix socket where possible; if TCP is unavoidable, isolate it to a private service network because `clamd` does not authenticate or protect TCP traffic. **[S06]**
- Use `clamd` for amortized signature loading. The official minimum recommendation is approximately 3 GiB RAM, so include scanner memory in capacity plans and back-pressure the upload queue. **[S05]**
- Update signatures through `freshclam`, monitor signature age and update failures, and block promotion when the signature age exceeds an approved threshold. **[S06]**
- Quarantine detections and let an authorized workflow release documented false positives. Do not invoke destructive removal automatically. **[S06]**
- Run periodic test files and failure injections through the entire state machine; monitoring only “daemon is up” is insufficient.

**License/commercial use:** GPLv2 permits commercial use and self-hosting, with redistribution/modification obligations that legal counsel should confirm if binaries or modified code are distributed. There is no feature paywall in the open-source scanner; commercial detection/support products are separate. **[S05]**

## Office conversion and sanitization

LibreOffice is a maintained, free, self-hostable converter under MPL 2.0 (with components under other licenses). Official help documents `soffice --convert-to ...pdf...` and PDF export controls. Commercial use is permitted under the license, subject to notice/source obligations when covered code is distributed; review the installation’s bundled license inventory. **[S07][S09]**

However, conversion and sanitization are different claims. LibreOffice’s official advisories show that malformed Office/PDF/import content has repeatedly reached memory-safety, arbitrary-script/command, path traversal, remote-resource, and information-disclosure vulnerabilities. The converter therefore belongs in an untrusted-parser sandbox and must follow the maintained security branch. **[S08]**

Recommended hierarchy:

1. **Controlled application documents:** generate PDF directly from controlled HTML/templates with the existing browser/print engine if fidelity is sufficient. This removes an Office parser from the path.
2. **Untrusted Office preview:** isolated LibreOffice conversion, as described above. Never advertise the result as certified CDR.
3. **High-assurance disarm requirement:** procure a CDR product/service that explicitly documents supported active-content removal, nested-container handling, retention/data use, BAA/DPA, deployment model, false-negative handling, and independent validation. No candidate can be selected without jurisdiction, data-residency, and budget inputs.
4. **Microsoft 365 already approved:** Microsoft Graph can convert supported DriveItem formats to PDF and returns a 302 to a short-lived preauthenticated URL. It is operationally simpler than maintaining LibreOffice, but moves the document into the Microsoft processing boundary and is not itself evidence of CDR. **[S10]**

Conversion fidelity, tracked changes/comments, embedded objects, formulas, external links, fonts, page dimensions, and accessibility tags require a representative corpus. Conversion failures must not expose the original file through a fallback browser download.

## PDF viewing, zoom, accessibility, and redaction

PDF.js is Apache-2.0, self-hostable, free for commercial use, current, and already structured as core parser, display layer, and viewer. Its maintained viewer includes navigation, zoom, search, keyboard controls, localization, annotation support, and ongoing accessibility work. **[S11][S12]**

Performance and accessibility implications:

- Render only visible pages. PDF.js documents that a letter-sized 96-DPI canvas is about 3.5 MiB and about 14 MiB on a 2x HiDPI display; rendering 100 pages eagerly can exhaust memory. **[S12]**
- Enable byte-range responses and web-optimized PDFs so the viewer can fetch needed portions rather than the entire object. **[S12]**
- Keep the selectable text/structure layer, keyboard zoom/navigation, visible focus, toolbar labels, and screen-reader announcements. Do not replace the document with canvas-only screenshots.
- PDF accessibility ultimately depends on the file’s tags, reading order, alt text, forms, and conversion fidelity. PDF.js UI accessibility cannot repair an inaccessible source PDF. Test NVDA/JAWS/VoiceOver, keyboard-only operation, 200%/400% zoom, reflow expectations, large scans, and mobile memory before acceptance.
- Keep PDF.js pinned and patched: it parses hostile PDFs in the browser. Use a restrictive CSP, serve files with `Content-Disposition: inline` only after authorization, set `X-Content-Type-Options: nosniff`, and prevent uploaded content from sharing the application origin as executable web content.

For manual redaction, the acceptance criterion is **irreversible removal**, not visual concealment. Adobe Acrobat Pro’s official process removes selected text/images when redactions are applied and separately offers sanitization/removal of hidden information before saving. That behavior is the benchmark for any in-product implementation. **[S13]**

**Decision:** use PDF.js for selecting/previewing candidate regions only. Apply regions on the server with a redaction-capable engine, sanitize, save as a new derivative, and verify by extraction/render/diff tests. If no engine can pass the verification corpus, ship annotations without claiming redaction or defer the feature. Acrobat Pro is commercial/paywalled and desktop-oriented; Adobe PDF Library or another server SDK would require commercial licensing and a separate security/procurement review. **[S13]**

## Object storage, encryption, and key management

### Managed S3 baseline

- Keep buckets private and use workload roles, not long-lived access keys.
- Use separate quarantine, clean source, derived preview, redacted derivative, audit, and backup prefixes or buckets with explicit policies. A database state alone must not grant object access.
- Use short-lived presigned URLs only after an application authorization decision. They are bearer tokens, can be reused until expiry, and inherit the signer’s permissions. For uploads, generate never-reused keys because uploading to an existing key replaces it. Require SigV4 checksums. **[S14]**
- Use SSE-KMS with a customer-managed key where audit/control requirements justify it. AWS KMS supports centralized policy, rotation, disabling, deletion scheduling, and use auditing; SSE-KMS has additional charges and permissions must be restricted. S3 otherwise encrypts new objects with SSE-S3 by default. **[S15]**
- Separate keys by environment and major security boundary. Do not default to one key per file or tenant until the access-control, cost, and operational benefit is demonstrated.
- Never hard-delete a KMS key while retained objects or backups still depend on it. Include key availability and historical decryption in restore tests.

### S3-compatible/self-hosted decision

An S3-compatible API is useful as an application seam, but compatibility is not equivalence: verify multipart behavior, checksums, conditional writes, presigning, IAM/policy semantics, versioning, WORM retention, lifecycle, event delivery, replication, encryption, KMS integration, audit export, consistency, and restore tooling for each provider.

Do not choose the old MinIO community server for a new production healthcare deployment. The official GitHub repository was archived on 2026-04-25, says “no longer maintained,” states legacy binaries will not receive updates, and points users to AIStor Free/Enterprise. The archived source is AGPLv3; the vendor warns proprietary/commercial users to validate license obligations, while enterprise support/licensing is commercial. **[S18]**

If self-hosting is mandatory, run a fresh selection exercise over currently maintained candidates and include failure-domain design, on-call burden, upgrade/migration tests, erasure/replication behavior, license review, and recovery drills. Local filesystem storage is a simpler development/single-node alternative, but it is not an acceptable production substitute without replicated storage, immutable backups, access isolation, capacity monitoring, and tested recovery.

## Audit logging and retention

OWASP recommends logging authentication successes/failures, authorization failures, session failures, administrative actions, sensitive-data access, key use/rotation, imports/exports, file uploads, and malware detections. Each event should capture enough “when, where, who, and what,” plus action, object, outcome, and reason. **[S04]**

Minimum application audit events:

- sign-in, failed sign-in, MFA/WebAuthn enrollment/removal, recovery request/completion, password/email/role changes, session revocation;
- upload intent, object receipt, validation mismatch, scanner version/verdict/error, conversion start/result/version, state promotion/rejection, download/view/share;
- review assignment, comment/decision, redaction mark/apply/export, source/derivative linkage and hashes;
- admin access, impersonation/break-glass use, policy/configuration/retention/key changes, exports, deletions, legal holds, and restore operations.

Never log document bodies, extracted health data, passwords, reset tokens, access tokens, encryption keys, raw session identifiers, or full presigned URLs. Hash or pseudonymize identifiers where correlation is needed; sanitize CR/LF/delimiters to prevent log injection; restrict and monitor access to audit data; add tamper detection or immutable copies. **[S04]**

The current HIPAA Security Rule requires regulated entities to implement mechanisms that record and examine activity in systems containing ePHI, regularly review records that track access, and establish backup, restore, and emergency-mode procedures. It also requires six-year retention for required Security Rule policies/procedures and documented actions/assessments. **It does not, in the cited summary, impose a universal six-year retention period on every raw audit event.** **[S17]**

**Decision default:** retain security/audit events searchable for 12 months, archive selected legally/compliance-significant events longer only under an approved retention schedule, and delete at schedule end unless on legal hold. This is a risk-based starting point, not a HIPAA mandate. Counsel must reconcile jurisdiction, customer contracts, incident-investigation needs, data-minimization duties, and any clinical/medical-record retention rules. OWASP likewise says logs must not be destroyed before, or kept beyond, the required period. **[S04][S17]**

## Backup and disaster recovery

S3 Versioning preserves and restores object variants; Object Lock prevents overwrite/deletion for a fixed or indefinite period using WORM semantics; cross-Region replication copies objects asynchronously across geographic regions. These features support resilience but do not prove application recoverability. **[S16]**

Required plan:

1. Define product-approved RPO/RTO for metadata database, object storage, identity configuration, audit store, and key material. **Open decision:** proposed starting target is 15-minute RPO and four-hour RTO for active review data, pending cost and business impact analysis.
2. Use point-in-time database recovery plus versioned objects. Maintain encrypted immutable copies in a separate account/project and region/failure domain, with deletion privileges separated from production administrators.
3. Replicate or back up application configuration, policy, infrastructure definitions, scanner/converter version inventory, and the key metadata necessary to decrypt historical data.
4. Maintain referential recovery: the database, source object, derivative, audit history, and cryptographic key must all recover to a consistent point. Run an orphan/missing-object reconciliation after restore.
5. Test sample restores monthly and a complete isolated recovery at least quarterly; record actual RPO/RTO, integrity/hash verification, authorization behavior, and whether old KMS-encrypted versions decrypt. HHS requires backup, restoration, and continuity procedures for systems containing ePHI; scope depends on regulatory status. **[S17]**
6. Test ransomware/admin-compromise scenarios, not only infrastructure loss. Versioning without protected delete permissions or Object Lock can be defeated by a sufficiently privileged attacker.

## Product and licensing matrix

| Product/service | Maintenance at research cut | License / commercial use | Self-host | Free vs paid | Principal caveat |
|---|---|---|---|---|---|
| ClamAV | Active official docs/signature workflow and current platform matrix **[S05][S06]** | GPLv2; commercial use allowed subject to license obligations | Yes | Core scanner/signatures free; separate commercial products/support exist | Not endpoint protection or a safety proof; false positives and unpacking gaps; resource-heavy daemon |
| LibreOffice | Maintained, with 2026 security fixes/advisories **[S08]** | MPL 2.0 plus bundled component licenses; commercial use permitted subject to terms **[S09]** | Yes | Free; professional support available separately | Large hostile parser; conversion is not guaranteed CDR; patch speed and sandboxing are mandatory |
| Microsoft Graph conversion | v1.0 endpoint updated 2026-04-17 **[S10]** | Proprietary Microsoft service terms | No | Requires eligible Microsoft tenant/service; exact cost unknown | File enters OneDrive/SharePoint boundary; short-lived unauthenticated result URL; not proof of sanitization |
| PDF.js | Current stable builds and actively edited FAQ/release stream **[S11][S12]** | Apache 2.0; commercial use permitted | Yes | Free | Viewer/parser, not a secure redaction engine; browser memory and hostile-PDF patching matter |
| Adobe Acrobat Pro redaction | Current help updated 2025-12-15 **[S13]** | Proprietary | Desktop product; server SDK is separate | Paid Pro feature; server licensing unknown | Desktop workflow does not directly solve multi-tenant server automation |
| Amazon S3 + KMS | Current managed service docs **[S14][S15][S16]** | Proprietary service terms | No | Usage-priced; SSE-KMS adds charges | Presigned URLs are bearer tokens; provider/data residency/BAA and cost must be approved |
| MinIO community repository | Archived 2026-04-25; officially “no longer maintained” **[S18]** | AGPLv3; commercial/proprietary usage needs legal review | Source build only for archived community line | Historical community source free; AIStor successor has free and enterprise editions | Do not select archived line for new production; legacy binaries receive no updates |

## Explicit unknowns and gates

These unknowns can materially change the selection and must be answered before implementation sign-off:

1. **Regulatory role and jurisdiction:** Is the operator a HIPAA covered entity/business associate, and which national/state health, privacy, medical-record, evidence, or data-residency rules apply? HHS states the six-year rule for required compliance documentation, not all medical records or all logs. **[S17]**
2. **Data classes:** Do uploads contain ePHI/PHI, biometric data, minors’ data, legal evidence, or specially regulated records? Is de-identification in scope?
3. **Identity assurance:** Which roles need phishing-resistant MFA? Is an enterprise IdP available? What is the acceptable recovery/help-desk proofing process, and must emergency/break-glass access exist?
4. **Supported formats and corpus:** Exact file types, largest files/pages, encrypted/password-protected documents, macro formats, languages/fonts, scanned/OCR documents, tracked changes, embedded objects, and accessibility requirements.
5. **Redaction semantics:** Visual masking, true PDF object removal, hidden-content sanitization, OCR/image redaction, exemption codes, dual review, digital signatures, audit evidence, and whether the original must be retained under legal hold.
6. **Processor constraints:** Which cloud/identity/conversion/malware vendors have approved BAAs/DPAs, regions, subprocessors, retention/deletion terms, model-training exclusions, and breach obligations?
7. **Availability:** Approved RPO/RTO, multi-region requirement, offline review expectations, maximum queue time during scanner/converter outage, and recovery test frequency.
8. **Retention:** Separate schedules for source uploads, derived previews, redacted copies, case decisions, audit events, operational logs, backups, and compliance documentation; deletion and legal-hold authority.
9. **Key control:** Provider-managed versus customer-managed keys, cross-account sharing, external key custody, rotation/compromise procedure, and who may schedule deletion.
10. **Budget and operations:** Managed-service spend versus 24/7 patching/on-call capacity; acceptable commercial redaction/CDR licensing; expected upload/conversion concurrency.

## Source register

### S01 — NIST SP 800-63-4 / SP 800-63B-4

- **URLs:** [publication record](https://csrc.nist.gov/pubs/sp/800/63/4/final), [authenticator requirements](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/), [authenticator events and recovery](https://pages.nist.gov/800-63-4/sp800-63b/events/)
- **Publisher:** U.S. National Institute of Standards and Technology (NIST)
- **Published/updated:** July 2025; final history entry 2025-07-31
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Normative government standard/guideline; primary source
- **Use:** Current password policy, phishing resistance/WebAuthn, rate limiting, recovery methods/codes, recovery notification.

### S02 — OWASP Authentication Cheat Sheet

- **URL:** https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- **Publisher:** OWASP Foundation, Cheat Sheet Series
- **Published/updated:** Undated continuously maintained page; live version accessed
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official industry security guidance; primary guidance source
- **Use:** TLS, generic errors, reauthentication, sensitive-account separation, automated-attack controls, logging.

### S03 — OWASP File Upload Cheat Sheet

- **URL:** https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- **Publisher:** OWASP Foundation, Cheat Sheet Series
- **Published/updated:** Undated continuously maintained page; live version accessed
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official industry security guidance; primary guidance source
- **Use:** Allowlisting, MIME/signature limitations, generated names, size/decompression limits, authorization, segregated storage, antivirus/CDR, parser threats.

### S04 — OWASP Logging Cheat Sheet

- **URL:** https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- **Publisher:** OWASP Foundation, Cheat Sheet Series
- **Published/updated:** Undated continuously maintained page; live version accessed
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official industry security guidance; primary guidance source
- **Use:** Event coverage and fields, sensitive-data exclusion, log-injection defense, tamper protection, retention/disposal.

### S05 — ClamAV introduction/features/license

- **URL:** https://docs.clamav.net/Introduction.html
- **Publisher:** Cisco / ClamAV project
- **Published/updated:** Undated live documentation; current platform matrix includes 2025-era operating-system releases
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official product documentation and license statement; primary source
- **Use:** GPLv2, supported formats, archive limitations, automatic updates, system requirements, self-hosting.

### S06 — ClamAV scanning documentation

- **URL:** https://docs.clamav.net/manual/Usage/Scanning.html
- **Publisher:** Cisco / ClamAV project
- **Published/updated:** Undated live documentation
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official product documentation; primary source
- **Use:** `clamd`, `freshclam`, local/TCP socket risk, scan limits, false positives, quarantine versus deletion.

### S07 — LibreOffice PDF command-line export

- **URL:** https://help.libreoffice.org/latest/en-US/text/shared/guide/pdf_params.html
- **Publisher:** The Document Foundation / LibreOffice
- **Published/updated:** Live LibreOffice 26.8 help
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official product documentation; primary source
- **Use:** Supported command-line PDF conversion/export behavior and controls.

### S08 — LibreOffice security advisories

- **URL:** https://www.libreoffice.org/security/
- **Publisher:** The Document Foundation / LibreOffice
- **Published/updated:** Continuously maintained; latest listed advisory announcement at research cut 2026-08-21
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official vendor security advisories; primary source
- **Use:** Parser/memory-safety, path/script, external-resource, and information-disclosure risk; maintained-version requirement.

### S09 — LibreOffice licenses

- **URL:** https://www.libreoffice.org/licenses/
- **Publisher:** The Document Foundation / LibreOffice
- **Published/updated:** Undated live license page
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official license terms; primary legal source (not legal advice)
- **Use:** MPL 2.0, bundled-license caveat, use/distribution obligations.

### S10 — Microsoft Graph DriveItem format conversion

- **URL:** https://learn.microsoft.com/en-us/graph/api/driveitem-get-content-format?view=graph-rest-1.0
- **Publisher:** Microsoft
- **Published/updated:** Last updated 2026-04-17
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official API documentation; primary source
- **Use:** Supported PDF conversion endpoint, OneDrive/SharePoint processing boundary, 302 preauthenticated result URL.

### S11 — PDF.js Getting Started

- **URL:** https://mozilla.github.io/pdf.js/getting_started/
- **Publisher:** Mozilla / PDF.js project
- **Published/updated:** Live page; stable v6.1.200 shown at research cut
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official project documentation and license statement; primary source
- **Use:** Parser/display/viewer boundaries, self-hosting, current stable build, Apache 2.0.

### S12 — PDF.js Frequently Asked Questions

- **URL:** https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions
- **Publisher:** Mozilla / PDF.js project
- **Published/updated:** Edited 2026-04-28
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official project documentation; primary source
- **Use:** Browser support, same-origin/CORS, raw binary versus base64 memory, visible-page rendering, Range requests, performance.

### S13 — Adobe Acrobat Pro redaction workflow

- **URL:** https://helpx.adobe.com/acrobat/desktop/protect-documents/redact-pdfs/redact.html
- **Publisher:** Adobe
- **Published/updated:** 2025-12-15
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official commercial product documentation; primary source
- **Use:** Distinction between marking/applying redactions and sanitizing hidden information; paid-feature benchmark.

### S14 — Amazon S3 presigned URLs

- **URL:** https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- **Publisher:** Amazon Web Services
- **Published/updated:** Undated live service documentation
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official cloud-service documentation; primary source
- **Use:** Bearer-token behavior, permissions, expiry, reuse, overwrite risk, SigV4 checksums and restrictions.

### S15 — Amazon S3 SSE-KMS

- **URL:** https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- **Publisher:** Amazon Web Services
- **Published/updated:** Undated live service documentation; includes current post-2023 default-encryption behavior
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official cloud-service documentation; primary source
- **Use:** SSE-S3 default, customer-managed KMS keys, envelope encryption, permissions, auditing, rotation/control and additional charges.

### S16 — Amazon S3 resilience

- **URL:** https://docs.aws.amazon.com/AmazonS3/latest/userguide/disaster-recovery-resiliency.html
- **Publisher:** Amazon Web Services
- **Published/updated:** Undated live service documentation
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official cloud-service documentation; primary source
- **Use:** Versioning recovery, Object Lock/WORM, lifecycle/archive, cross-Region replication and backup encryption.

### S17 — HHS Summary of the HIPAA Security Rule

- **URL:** https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- **Publisher:** U.S. Department of Health and Human Services, Office for Civil Rights
- **Published/updated:** Content last reviewed 2026-08-07
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official regulator summary of current rule; primary government source
- **Use:** Applicability framing, audit/activity review, ePHI backup/restore/emergency operations, six-year compliance-documentation retention. Legal applicability still requires counsel.

### S18 — MinIO community repository status and license

- **URL:** https://github.com/minio/minio
- **Publisher:** MinIO official GitHub organization
- **Published/updated:** Repository archived 2026-04-25; read-only at research cut
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** Official project status/license notice; primary source
- **Use:** No-longer-maintained status, source-only/legacy binary warning, AGPLv3, AIStor successor and enterprise-support positioning.

## Bottom line

The lowest-risk near-term architecture is: **standards-based MFA and recovery; private quarantine uploads; extension/MIME/signature and resource-limit checks; ClamAV as one detection layer; Office conversion only in a disposable sandbox; PDF.js as a viewer; real destructive redaction or no redaction claim; managed S3 with KMS/versioning/immutable backups; and privacy-minimized tamper-evident audit events.** The unresolved regulatory, format, redaction, residency, and RPO/RTO questions are selection gates, not implementation details.
