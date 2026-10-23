# Personas

Three merged personas (the owner's choice at this stage). Each folds in the user types that PRD §3.1 and §3.4 define; when a story depends on a narrower type (for example a caregiver, or a super admin), its criteria name it. All accounts share one account system and confirm they are 18 or older (PRD §3.3); role labels are self-declared and never authority to give medical advice.

## Public user

- **Covers:** visitor (signed out), patient, parent or guardian reviewing care received by a minor, caregiver or family member describing witnessed care, treatment witness, nurse or other health professional taking part in discussion, researcher or student (PRD §3.1).
- **Role:** reads and searches profiles, accounts and processed evidence without an account; once signed in with a confirmed email, writes reviews, comments, reacts, reports and bookmarks.
- **Goals:**
  - Find doctors and facilities by condition, in Bengali, English or Banglish, with neutral ordering.
  - Share what happened in their own words, choosing a named, pseudonymous or anonymous presentation per review.
  - Attach supporting images without exposing private details.
- **Pain points:**
  - Fear of being identified when writing about sensitive care.
  - Distrust of star ratings and of sites that look like advertising.
  - Unclear whether shared documents leak personal data.
- **Tech comfort:** low to medium. Mobile-first, often on an ordinary Bangladesh mobile connection (NFR-001, NFR-004).
- **Frequency:** reads occasionally when a care decision comes up; writes rarely, after an episode of care.
- **Priority:** primary persona.

## Provider

- **Covers:** doctor or dentist (BMDC MBBS/BDS) and facility representative (hospital, clinic or diagnostic centre branch) (PRD §3.1, FR-DOC-006, FR-FAC-002).
- **Role:** an ordinary user who may claim their profile, keep schedule, fee, contact and chamber details current, and take part in discussion like anyone else. They have no privileged review-response channel (FR-DOC-008, D-004).
- **Goals:**
  - Correct and complete their profile.
  - See that feedback on them is narrative, dated and not a quality score.
  - Respond in discussion without breaching patient confidentiality.
- **Pain points:**
  - Profiles that were created by others and are out of date.
  - Fear of unfair or defamatory accounts.
  - Being unable to show they are the real person or facility.
- **Tech comfort:** medium.
- **Frequency:** checks their profile occasionally; acts on a claim or field change rarely.
- **Priority:** secondary persona.

## Staff

- **Covers:** moderator, admin and super admin (PRD §3.4). Authority is granted per capability: super admin holds all settings, identity access, legal access, permissions, audit, enforcement and recovery; admin and moderator hold only what super admin grants, and none can grant themselves permissions.
- **Role:**
  - Works the moderation queue.
  - Reviews provider submissions, claims and field changes.
  - Handles evidence failures, retention and legal holds.
  - Configures bounded runtime settings.
  - Handles export and deletion requests.
  - Every action is audited and reason-coded.
- **Goals:**
  - Act quickly on critical reports (privacy leaks, credible threats, unsafe files).
  - Apply bounded actions without rewriting anyone's story.
  - Change thresholds and retention safely, with preview and rollback.
- **Pain points:**
  - Coordinated report campaigns.
  - Pressure to reveal anonymous authors or reporters.
  - Destructive bulk actions with unclear impact.
- **Tech comfort:** medium to high.
- **Frequency:** daily during the Beta; the founder also handles appeals (FR-MOD-006).
- **Priority:** secondary persona. Its stories are high-risk (identity, evidence, moderation, retention, deletion).

## Relationships

- A Public user writes about a Provider. The Provider may answer only as an ordinary commenter.
- Staff stand between the two: they act on reports from either side, never reveal a reporter to the reported person, and reveal an anonymous author only through the audited capability (FD-016, FD-022).
- The same account can hold more than one role label. For example, a doctor can also review their own care as a patient. Authority comes only from staff capabilities, never from a self-declared label.
