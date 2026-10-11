# Phase 2 — Document evidence (PDF first, then HEIC and Office)

**Status:** Planned, not authorised to start. Runs after the image-only demo (FD-036, CR-001) is
delivered and validated (T-505 PASS).
**Why a separate phase:** every new format is a new untrusted parser on the evidence boundary (AD-6).
FD-002 allows expansion only with per-format malicious-corpus, sandbox and redaction evidence. The
image pipeline proves the boundary; this phase adds parsers behind the same ports.

## What was removed from Phase 1 on 2026-09-12

| Item | Where it was | Now |
|---|---|---|
| PDF in the intake allowlist (`.pdf`, `application/pdf`) | T-303 | refused with `evidence.type_rejected` |
| `PdfRasteriser` port + `pdf-pdfjs` adapter (pdfjs-dist + `@napi-rs/canvas`), page cap 30, `encrypted`/`too_many_pages` failures | T-304 | P2-002 |
| `PdfAssembler` port + `pdf-assemble` adapter (`@cantoo/pdf-lib`), `derivative_pdf` artifact, text-free assertion | T-305 | P2-003 |
| Multi-page paging inside one document; processed-PDF download | T-308 | P2-004 (Phase 1 pages between items of a group and downloads the processed image) |
| `prescription.pdf`, `encrypted.pdf`, `eicar.pdf` fixtures | T-007, storyboard | replaced by JPEG fixtures and a custom ClamAV signature |
| Stack rows pdfjs-dist, `@napi-rs/canvas`, `@cantoo/pdf-lib` | master plan §3 | listed here, re-verified before P2-001 |

Schema and contracts already reserve what Phase 2 needs: `evidence_fail_reason` keeps `encrypted` and
`too_many_pages`; `artifact_kind` keeps `derivative_pdf`; `evidence_items.page_count` exists;
`evidence_artifacts.page_no` exists; `evidence.getPublic` returns a `pages[]` array. No migration
changes the meaning of a Phase 1 column.

## Tasks

Same file format and rules as the Phase 1 tasks (`01-conventions.md`, `04-handoff-and-validation.md`).
Task files are written when this phase is authorised; the summaries below fix scope and estimates.

| ID | Task | Class | Est. (h) | Depends |
|---|---|---|---|---|
| P2-000 | Dependency recheck: pdfjs-dist, `@napi-rs/canvas` prebuilt binaries for Windows/Linux, `@cantoo/pdf-lib`; record in the dependency-check log; decide `pdfjs-dist/legacy` build and `isEvalSupported: false` | M1 | 1–1.5 | T-505 |
| P2-001 | Intake: add `.pdf` / `application/pdf` to the allowlist behind a config flag `featureVisibility.pdfEvidence` (default off until P2-005 passes); magic check for `%PDF-`; size stays 15 MB | M3 | 2–3 | P2-000 |
| P2-002 | Rasteriser adapter + worker stage: pdfjs in Node with a canvas factory, ≤ 30 pages, 110 dpi, per-page `page_png` + thumbnail of page 1, `encrypted` and `too_many_pages` failures, 120 s timeout, memory cap; fake for tests | M3 | 4–5 | P2-001 |
| P2-003 | Derivative assembly: `PdfAssembler` builds an image-only PDF from the **current** page PNGs after redaction; `derivative_pdf` artifact, immutable, public on publish; `getPublic.downloadUrl` becomes the PDF for multi-page items; text-layer-empty assertion; explicit metadata (title/producer only) | M3 | 3–4 | P2-002 |
| P2-004 | Viewer: page prev/next inside a multi-page item, page-of-N announced, keyboard unchanged, thumbnail strip optional; composer redaction canvas per page | M2 | 2–3 | P2-003 |
| P2-005 | Malicious/edge PDF corpus and validation (M4, cross-vendor, human approval): polyglots (`not-a-png.png` with PDF bytes, PDF/JPEG polyglot), encrypted, malformed/truncated, JavaScript-bearing, embedded files, 31+ pages, page bombs (huge MediaBox), decompression bombs (FlateDecode), fonts with malicious programs, XFA; expected outcome per file; resource limits observed; original never served | M4 | 3–4 | P2-002, P2-003 |
| P2-006 | Fixtures, seed, storyboard and docs: `prescription.pdf` (2 pages, DEMO marker on every page), `encrypted.pdf`, seed e1 as a 2-page PDF, storyboard steps 6/12 restored, coverage matrix rows | M1 | 1–2 | P2-004 |

Phase 2 (PDF) total: **16–22.5 h** implementation + **5–7 h** validation + handoff overhead ≈ 2 h.
Wall-clock: about one week with one lane; P2-004 can run beside P2-005.

## Later formats (not estimated in detail)

| Format | Approach | Why it waits |
|---|---|---|
| HEIC/HEIF | sharp can decode HEIC only when libvips is built with libheif; the prebuilt npm binaries do not include it (patent-encumbered codecs). Options: a custom sharp build in the worker container, or a separate converter container (`heif-convert`) behind the `ImageSanitiser` port. Output stays JPEG/PNG. | needs a container build and its own corpus; ≈ 6–10 h |
| Office (DOC/DOCX/XLS/XLSX/PPT/PPTX), TXT, RTF | LibreOffice headless in an **isolated** container with no network and no shared credentials (AD-15), converting to PDF, then the Phase 2 PDF path. Time and memory limits per conversion; macro-enabled files refused at intake. | large parser surface; requires the LibreOffice sandbox spike from `DEPENDENCY-SELECTIONS.md`; ≈ 15–25 h plus corpus |

## Acceptance for the phase

- Every Phase 1 evidence test still passes; image items are unaffected.
- The P2-005 corpus table has an expected and observed outcome per file, none "unexpected".
- `pdfEvidence` flag on → the storyboard's PDF steps run; flag off → PDFs refused exactly as in Phase 1.
- Cross-vendor validation record `docs/validation/PHASE-2.md` with founder approval.
