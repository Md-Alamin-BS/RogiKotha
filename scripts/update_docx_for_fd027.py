"""Update RogiKotha PRD and BRD .docx files for FD-027 / Concept 04b.

Backs up originals to ./.bak/, inserts a banner paragraph at the top of each
file noting the design-direction update, and replaces FD-026 / warm Quiet
Clinic wording with FD-027 / Concept 04b wording. Reverts on any unhandled
exception.
"""

from __future__ import annotations

import shutil
import sys
import traceback
from pathlib import Path

from docx import Document
from docx.shared import Pt

REPO = Path(__file__).resolve().parents[1]
DOCS = REPO / "docs"
BAK = REPO / "docs" / ".bak"
FILES = [DOCS / "RogiKotha_PRD_v1.0.docx", DOCS / "RogiKotha_BRD_v1.0.docx"]

BANNER_TEXT = (
    "Design direction update — Gate 4 founder decision (FD-027, 2026-09-06): "
    "Concept 04b — Quiet Clinic (minimal pass) is the chosen implementation "
    "direction. FD-026 (Concept 04 — warm Quiet Clinic) is superseded. Source "
    "prototype: ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/. "
    "See docs/planning/ux/DESIGN.md for the current visual contract and "
    "docs/planning/ux/EXPERIENCE.md for the behavioural contract. Motion is "
    "CSS-only (five primitives); killed by the in-app motion-off toggle and "
    "prefers-reduced-motion."
)

# (search, replace). Search is a literal substring; replace is the new text.
REPLACEMENTS = [
    # FD-026 banner from earlier update.
    (
        "Design direction update — Gate 4 founder decision: Concept A — Quiet Clinic is the selected direction. See docs/planning/ux/DESIGN.md for the current design contract.",
        BANNER_TEXT,
    ),
    # 04b replaces 04 / oat / muted teal / serif headings wherever they appear.
    (
        "Quiet Clinic (oat and muted teal, serif headings on a sans interface)",
        "Quiet Clinic, minimal pass (paper base, teal-gray accent, hairline rules, system rounded sans for UI and headings)",
    ),
    (
        "oat + muted teal material with no glass blur",
        "paper base + teal-gray accent with hairline rules and no panel shadow",
    ),
    (
        "serif headings against a sans interface",
        "the system rounded sans for both UI and headings (deliberate departure from the FD-026 serif/sans contrast)",
    ),
    (
        "calm consulting room",
        "calm clinic",
    ),
    (
        "Calm Clinical Trust",
        "Quiet Clinic (minimal pass)",
    ),
    (
        "Concept A — Calm Clinic",
        "Concept 04b — Quiet Clinic (minimal pass)",
    ),
    (
        "Concept A — Quiet Clinic",
        "Concept 04b — Quiet Clinic (minimal pass)",
    ),
    (
        "Concept 04 — Quiet Clinic is the selected",
        "Concept 04b — Quiet Clinic (minimal pass) is the chosen",
    ),
    (
        "Concept 04 — Quiet Clinic was selected",
        "Concept 04b — Quiet Clinic (minimal pass) was chosen",
    ),
    (
        "Concept 04 — Quiet Clinic",
        "Concept 04b — Quiet Clinic (minimal pass)",
    ),
    (
        "FD-026 selected",
        "FD-027 selected",
    ),
    (
        "FD-026 picks",
        "FD-027 picks",
    ),
    (
        "FD-026 chose",
        "FD-027 chose",
    ),
    (
        "FD-026 (warm Quiet Clinic)",
        "FD-027 (Concept 04b, minimal pass)",
    ),
    (
        "(FD-026)",
        "(FD-027)",
    ),
    (
        "selected via FD-026",
        "selected via FD-027",
    ),
]


def backup(path: Path) -> Path:
    BAK.mkdir(parents=True, exist_ok=True)
    out = BAK / (path.name + ".fd026.bak")
    shutil.copy2(path, out)
    return out


def insert_banner(doc: Document, text: str) -> None:
    """Insert a banner paragraph at the very top of the document."""
    body = doc.element.body
    # Build a new paragraph element at the top, styled slightly.
    new_p = doc.paragraphs[0]._p  # borrow element type
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    p_elem = OxmlElement("w:p")
    pPr = OxmlElement("w:pPr")
    # Bold-ish banner
    rPr = OxmlElement("w:rPr")
    b = OxmlElement("w:b")
    rPr.append(b)
    sz = OxmlElement("w:sz")
    sz.set(qn("w:val"), "20")
    rPr.append(sz)
    p_elem.append(pPr)
    p_elem.append(rPr)

    run_elem = OxmlElement("w:r")
    run_elem.append(rPr)  # share formatting
    t = OxmlElement("w:t")
    t.text = text
    t.set(qn("xml:space"), "preserve")
    run_elem.append(t)
    p_elem.append(run_elem)

    # Insert as first child of body
    body.insert(0, p_elem)


def apply_replacements(doc: Document) -> int:
    """Apply REPLACEMENTS to every paragraph and table cell. Returns total hits."""
    hits = 0
    for para in doc.paragraphs:
        for old, new in REPLACEMENTS:
            if old in para.text:
                # Re-run across runs: python-docx splits text across runs.
                _replace_paragraph_text(para, old, new)
                hits += 1
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    for old, new in REPLACEMENTS:
                        if old in para.text:
                            _replace_paragraph_text(para, old, new)
                            hits += 1
    return hits


def _replace_paragraph_text(para, old: str, new: str) -> None:
    """Replace `old` with `new` across runs in a paragraph, preserving runs.

    Concatenate all run texts, do the replacement once, then rewrite the first
    run's text and clear the rest. Good enough for our short literal strings.
    """
    full = "".join(r.text for r in para.runs)
    if old not in full:
        return
    replaced = full.replace(old, new)
    if para.runs:
        para.runs[0].text = replaced
        for r in para.runs[1:]:
            r.text = ""


def process(path: Path) -> tuple[int, Path]:
    bak = backup(path)
    doc = Document(path)
    insert_banner(doc, BANNER_TEXT)
    hits = apply_replacements(doc)
    doc.save(path)
    return hits, bak


def main() -> int:
    try:
        for f in FILES:
            if not f.exists():
                print(f"[skip] {f.name}: not found")
                continue
            hits, bak = process(f)
            print(f"[ok]   {f.name}: { hits } replacements; backup at {bak.relative_to(REPO)}")
    except Exception:
        traceback.print_exc()
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())