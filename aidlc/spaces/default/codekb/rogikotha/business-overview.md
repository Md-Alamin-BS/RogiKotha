# Business Overview: rogikotha

## Purpose

RogiKotha is a bilingual (Bengali and English) site where patients in Bangladesh share their experiences with doctors and facilities. It holds structured accounts of care, never ratings. The product rules live in `PRODUCT.md` and are binding: no star rating or combined score, no "highest rated" sort, distributions shown with exact counts and denominators, missing values shown as "Not provided", evidence shown as "Documents attached — not medically validated", "Registration not verified" on every doctor, and facility feedback kept out of doctor aggregates.

The current build is a local demo running on synthetic data only, with the "Demo — fictional records" marker always visible (AD-14).

## Actors

| Actor | Where in code |
|---|---|
| Visitor (signed out) | Patient routes under `apps/web/src/app/[locale]/(patient)/` |
| Patient (signed in, author or commenter) | `account_profiles`, `personas` (named, pseudonymous, anonymous) |
| Staff (moderator, admin) | `account_profiles.staff_role`, staff console under `[locale]/admin/` |
| Worker process | `apps/worker`, `rk_worker` database role |

## Key Business Capabilities and Their State

| Capability | Data model | Behaviour |
|---|---|---|
| Register, sign in, verify email | `auth_*`, `account_profiles`, `account_preferences` | Not built (T-101, T-102) |
| Own profile and preferences | `account_profiles`, `account_preferences`, `personas` | Not built (T-409); only theme, motion and language cookies work |
| Doctor and facility directory | `doctors`, `facilities`, `facility_branches`, and related tables | Not built (T-201 to T-204) |
| Write and edit an experience | `review_drafts`, `reviews`, `review_versions`, `review_tags` | Not built (T-301, T-302, T-306) |
| Attach evidence (images) | `evidence_items`, `evidence_artifacts`, `evidence_custody_events` | Not built (T-303 to T-308) |
| Comments and reactions | `comments`, `comment_mentions`, `reactions` | Not built (T-401, T-402) |
| Moderation, notifications, retention, data requests | Tables exist | Not built (T-403 onward) |
| Static pages: about, emergency, privacy, terms | i18n keys | Built |
| Patient design and motion system (FD-091) | `apps/web/src/styles/` | Built (T-011) |

## Demo-Slice Relevance

The intent's path (register, sign in, edit profile, write and edit an experience about a seeded doctor, attach documents, comment as another user) uses tables, seed data and en/bn copy (`auth`, `compose`, `experience`, `profile` namespaces) that already exist. None of its behaviour exists yet. The gap analysis is in `component-inventory.md`.

## Glossary

- **Experience / review**: a patient's structured account of care (`reviews`, `kind` quick or detailed).
- **Persona**: the public face of an author: named, pseudonymous, or anonymous per thread. `persona_links` is the private link back to the account.
- **Evidence**: images attached to a review, scanned and redacted before anything public is derived.
- **Outbox**: the `outbox_events` table that the worker relays into pg-boss jobs.
