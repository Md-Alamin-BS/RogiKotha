# Release 1 page review checklist

Status: skeleton. The URLs, locales and the rules that apply are filled; the Observed, Evidence and
Verdict cells are filled by opening every page in the running `pnpm demo` at Build and Test, never
from screenshots or earlier records (BR11.5). Each verdict cell reads `✓`, `✗ (ISS-nnn)` or `n/a`,
with the evidence beside it: the journey test title (`P<part>.<step> [<locale>]`) or the manual
look. The rules are section 14 of
[01-conventions.md](../implementation/01-conventions.md); H14 is checked once at the end.

## Hard rules used below

| Id | Rule |
|---|---|
| H1 | No number stands for quality; every distribution shows count and denominator; no combined score |
| H2 | Missing values read Not provided or No documents, never 0 |
| H3 | Limited data below the configured threshold |
| H4 | Registration not verified on every doctor |
| H5 | Evidence copy is "Documents attached — not medically validated" |
| H6 | Reviewer claims read "Reviewer's label" |
| H7 | Facility feedback never enters a doctor's aggregates |
| H8 | Reporter identity restricted (staff console and reports are release 2; not walked) |
| H9 | Original evidence never served publicly; scanning that cannot run fails closed |
| H10 | Persistent disclaimer and non-blocking emergency guidance where the prototype has them |
| H11 | Neutral ordering; no "highest rated" |
| H12 | Bengali and English both work; numerals follow the language; no capital-letter transform in Bengali |
| H13 | Synthetic marker visible; no real person or facility in a negative account |
| H14 | No agent, tool or model attribution in any file or commit |

## Release-1 pages

| Page | Locale | Rules that apply | Observed | Evidence | Verdict |
|---|---|---|---|---|---|
| `/` | bn | H2 H3 H10 H12 H13 | | | |
| `/` | en | H2 H3 H10 H12 H13 | | | |
| `/emergency` | bn | H10 H12 H13 | | | |
| `/emergency` | en | H10 H12 H13 | | | |
| `/about` | bn | H10 H12 H13 | | | |
| `/about` | en | H10 H12 H13 | | | |
| `/terms` | bn | H12 H13 | | | |
| `/terms` | en | H12 H13 | | | |
| `/privacy` | bn | H12 H13 | | | |
| `/privacy` | en | H12 H13 | | | |
| `/doctors` | bn | H1 H3 H4 H11 H12 H13 | | | |
| `/doctors` | en | H1 H3 H4 H11 H12 H13 | | | |
| `/doctors/<id> (Dr. Farhana Rahman)` | bn | H1 H2 H3 H4 H7 H10 H12 H13 | | | |
| `/doctors/<id> (Dr. Farhana Rahman)` | en | H1 H2 H3 H4 H7 H10 H12 H13 | | | |
| `/doctors/<id> (a sparse doctor, d7 to d10)` | bn | H2 H3 H4 H12 H13 | | | |
| `/doctors/<id> (a sparse doctor, d7 to d10)` | en | H2 H3 H4 H12 H13 | | | |
| `/facilities` | bn | H1 H3 H7 H11 H12 H13 | | | |
| `/facilities` | en | H1 H3 H7 H11 H12 H13 | | | |
| `/facilities/<id>` | bn | H1 H2 H3 H7 H12 H13 | | | |
| `/facilities/<id>` | en | H1 H2 H3 H7 H12 H13 | | | |
| `/topics` | bn | H10 H11 H12 H13 | | | |
| `/topics` | en | H10 H11 H12 H13 | | | |
| `/topics/<id>` | bn | H10 H11 H12 H13 | | | |
| `/topics/<id>` | en | H10 H11 H12 H13 | | | |
| `/experiences` | bn | H1 H4 H11 H12 H13 | | | |
| `/experiences` | en | H1 H4 H11 H12 H13 | | | |
| `/experiences/<id> (r1)` | bn | H1 H2 H4 H5 H6 H9 H10 H12 H13 | | | |
| `/experiences/<id> (r1)` | en | H1 H2 H4 H5 H6 H9 H10 H12 H13 | | | |
| `/experiences/<id>/edit (own experience)` | bn | H5 H6 H12 H13 | | | |
| `/experiences/<id>/edit (own experience)` | en | H5 H6 H12 H13 | | | |
| `/authors/<username> (shirin_88)` | bn | H12 H13 | | | |
| `/authors/<username> (shirin_88)` | en | H12 H13 | | | |
| `/register` | bn | H12 H13 | | | |
| `/register` | en | H12 H13 | | | |
| `/verify-email (pending, confirm, done, expired)` | bn | H12 H13 | | | |
| `/verify-email (pending, confirm, done, expired)` | en | H12 H13 | | | |
| `/sign-in` | bn | H12 H13 | | | |
| `/sign-in` | en | H12 H13 | | | |
| `/reset-password (request, new password)` | bn | H12 H13 | | | |
| `/reset-password (request, new password)` | en | H12 H13 | | | |
| `/me` | bn | H10 H12 H13 | | | |
| `/me` | en | H10 H12 H13 | | | |
| `/me/security` | bn | H12 H13 | | | |
| `/me/security` | en | H12 H13 | | | |
| `/write (composer, preview, publish)` | bn | H5 H6 H10 H12 H13 | | | |
| `/write (composer, preview, publish)` | en | H5 H6 H10 H12 H13 | | | |
| `the 404 page` | bn | H12 H13 | | | |
| `the 404 page` | en | H12 H13 | | | |

## Negative probes

Run against the running demo; each is recorded in `bn` and `en` where the page has a locale.

| Probe | Expected | Observed | Evidence | Verdict |
|---|---|---|---|---|
| 1. GET `/api/evidence/items/<id>/original` signed out, and signed in as another account | not 2xx and not `image/*` | | | |
| 2. A seeded hidden review opened by its direct URL | 404 | | | |
| 3. `/authors/anon_author_r2`, and every author page, for the anonymous review r2 | the empty state; r2 is absent | | | |
| 4. Another account's `/experiences/<id>/edit` | 404 | | | |

## Release-2 routes still on main

| Page | Mark | What to record | Observed | Verdict |
|---|---|---|---|---|
| `/search` | release 2 (FD-105) | what it shows on main today | | |
| `/saved` | release 2 (FD-105) | what it shows on main today | | |
| `/notifications` | release 2 (FD-105) | what it shows on main today | | |
| `/admin and every /admin/* page` | release 2 (FD-105) | what it shows on main today (signed out and as a contributor) | | |

## Whole-repository checks

| Check | Expected | Observed | Verdict |
|---|---|---|---|
| H14: the attribution grep of BR13.5 over `docs`, `README.md` and `DEMO.md`, and the author fields of `git log main` | no hit; commits carry only the owner's identity (BR13.5, BR15.3) | | |
