#!/usr/bin/env node
/*
 * `pnpm fixtures:build` — generates packages/test-support/fixtures/*.
 *
 * Scope change 2026-09-12 (CR-001/FD-036, "images only") — this task's own
 * "Scope change" block says "Fixture list as in T-303's scope-change
 * block": prescription-1.jpg / prescription-2.jpg (replaces the old
 * `prescription.pdf`), photo.jpg (EXIF GPS), not-a-png.png (JPEG bytes
 * named .png), broken.jpg (truncated -> malformed), flagged.jpg (COM
 * segment marker, malware-signature demo), oversize.png (16 MB,
 * git-ignored). `report.pdf` is *not* in T-303's list but *is* in
 * `docs/implementation/05-demo-storyboard.md`'s own "Fixtures" section
 * (storyboard step 12: "Try fixtures/report.pdf -> refused at once") —
 * added here too so that walkthrough step has a fixture to use; logged as
 * an `ISS-` row (a deliberate addition beyond the task's literal list, not
 * a silent deviation).
 *
 * `encrypted.pdf`/`eicar.pdf` from the pre-scope-change fixture set are
 * dropped entirely (FD-036: no PDF intake in Phase 1; ClamAV detection is
 * demonstrated by `flagged.jpg`'s COM-segment marker instead of EICAR).
 */

/* eslint-disable no-undef, no-console -- Node CLI script using Buffer/
 * process/console directly; see packages/i18n/scripts/port-from-prototype.mjs
 * for the same pattern. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, '../fixtures');

const DEMO_MARKER = 'DEMO — SYNTHETIC DOCUMENT — NOT A REAL PATIENT RECORD';
const MALWARE_MARKER = 'ROGIKOTHA-MALWARE-TEST-MARKER';

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function prescriptionSvg(label) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754">
    <rect width="1240" height="1754" fill="#ffffff" />
    <text x="40" y="80" font-family="sans-serif" font-size="22" fill="#b00020" font-weight="bold">${escapeXml(DEMO_MARKER)}</text>
    <text x="40" y="160" font-family="sans-serif" font-size="26" fill="#111111">${escapeXml(label)}</text>
    <text x="40" y="220" font-family="sans-serif" font-size="18" fill="#333333">Dr. Farhana Rahman — Shefa General Hospital</text>
    <text x="40" y="260" font-family="sans-serif" font-size="18" fill="#333333">Rx: Metformin 500mg, twice daily</text>
  </svg>`);
}

async function writePrescriptionJpg(filename, label) {
  await sharp(prescriptionSvg(label))
    .jpeg({ quality: 90 })
    .toFile(path.join(fixturesDir, filename));
}

/**
 * True if the given EXIF buffer (as returned by `sharp(file).metadata().exif`
 * — a TIFF-formatted blob, optionally prefixed with the 6-byte `Exif\0\0`
 * APP1 marker) carries tag `0x8825` (GPSInfo, IFD0's pointer to the GPS
 * sub-IFD) in its 0th IFD. CR-008 / ISS-175: a fixture that claims a
 * property must prove it, or T-304's metadata-stripping test would pass
 * vacuously — verified by hand-parsing the bytes rather than trusting
 * `withExif`'s input was honoured.
 */
function exifHasGpsInfoTag(exif) {
  const tiffStart = exif.toString('ascii', 0, 4) === 'Exif' ? 6 : 0;
  const byteOrder = exif.toString('ascii', tiffStart, tiffStart + 2);
  if (byteOrder !== 'II' && byteOrder !== 'MM') return false;
  const littleEndian = byteOrder === 'II';
  const readU16 = (offset) =>
    littleEndian ? exif.readUInt16LE(offset) : exif.readUInt16BE(offset);
  const readU32 = (offset) =>
    littleEndian ? exif.readUInt32LE(offset) : exif.readUInt32BE(offset);
  const ifd0Offset = tiffStart + readU32(tiffStart + 4);
  const numEntries = readU16(ifd0Offset);
  for (let i = 0; i < numEntries; i += 1) {
    const entryOffset = ifd0Offset + 2 + i * 12;
    if (readU16(entryOffset) === 0x8825) return true;
  }
  return false;
}

async function writePhotoWithExifGps() {
  // A synthetic "photo" with EXIF GPS coordinates, to prove metadata
  // stripping in the real pipeline (T-304). GPS tags per the EXIF/TIFF
  // spec: GPSLatitudeRef/GPSLatitude, GPSLongitudeRef/GPSLongitude.
  //
  // ASSUMPTION(CR-008): sharp 0.35.4's `withExif` only recognises the
  // literal IFD-number keys its own documented example uses (`IFD0`,
  // `IFD3`, ...) — the previous, equally plausible-looking `GPS` key was
  // silently dropped rather than rejected (ISS-175). `IFD3` is sharp's
  // documented name for the GPS IFD (sharp.pixelplumbing.com/api-output/
  // #withexif's own example sets `GPSLatitudeRef`/`GPSLatitude` under
  // `IFD3`); confirmed empirically here too — re-reading the written file
  // with `sharp(file).metadata()` shows EXIF tag `0x8825` (GPSInfo) in
  // IFD0 only when the GPS block is keyed `IFD3`, never `GPS`.
  const svg = prescriptionSvg('Photograph of the prescription');
  const outPath = path.join(fixturesDir, 'photo.jpg');
  await sharp(svg)
    .jpeg({ quality: 90 })
    .withExif({
      IFD0: { Software: 'RogiKotha fixture generator' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '23/1 45/1 0/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '90/1 23/1 0/1',
      },
    })
    .toFile(outPath);

  // Re-read the file just written and fail the script unless the GPS IFD
  // really landed — a fixture that claims a property must prove it.
  const { exif } = await sharp(outPath).metadata();
  if (!exif || !exifHasGpsInfoTag(exif)) {
    throw new Error(
      'writePhotoWithExifGps: fixtures/photo.jpg has no EXIF tag 0x8825 (GPSInfo) after writing — GPS metadata did not round-trip through sharp.withExif()',
    );
  }
}

async function writeNotAPng() {
  // Valid JPEG bytes saved with a .png extension — a declared/detected MIME
  // mismatch the worker's magic-byte check (file-type, T-304) must catch.
  const bytes = await sharp(prescriptionSvg('Type mismatch fixture')).jpeg().toBuffer();
  fs.writeFileSync(path.join(fixturesDir, 'not-a-png.png'), bytes);
}

async function writeBrokenJpg() {
  // A truncated JPEG: valid header, cut off mid-stream -> `malformed`.
  const bytes = await sharp(prescriptionSvg('Truncated fixture')).jpeg().toBuffer();
  fs.writeFileSync(
    path.join(fixturesDir, 'broken.jpg'),
    bytes.subarray(0, Math.floor(bytes.length / 3)),
  );
}

async function writeFlaggedJpg() {
  // A valid JPEG carrying `ROGIKOTHA-MALWARE-TEST-MARKER` inside a COM
  // (comment, marker 0xFFFE) segment — matched by the custom ClamAV
  // signature T-002 mounts, so malware detection is demonstrable without a
  // real EICAR string in a JPEG (which most viewers would refuse to open).
  const base = await sharp(prescriptionSvg('Flagged fixture')).jpeg().toBuffer();
  const comment = Buffer.from(MALWARE_MARKER, 'ascii');
  const segmentLen = comment.length + 2; // length field includes itself, excludes the 0xFFFE marker
  const comSegment = Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from([(segmentLen >> 8) & 0xff, segmentLen & 0xff]),
    comment,
  ]);
  // Insert the COM segment right after the JPEG SOI marker (0xFFD8, first 2 bytes).
  const withComment = Buffer.concat([base.subarray(0, 2), comSegment, base.subarray(2)]);
  fs.writeFileSync(path.join(fixturesDir, 'flagged.jpg'), withComment);
}

async function writeOversizePng() {
  // 16 MB, git-ignored (.gitignore: packages/test-support/fixtures/oversize.png),
  // regenerated on demand — well over the 15 MB per-file limit.
  const targetBytes = 16 * 1024 * 1024;
  // A large flat-colour PNG compresses far below 16 MB, so pad it with
  // pseudo-random noise (incompressible) sized to land just over the limit.
  const side = 2340; // 2340x2340x3 raw ≈ 16.4 MB, just over the 15 MB per-file limit
  const raw = Buffer.alloc(side * side * 3);
  for (let i = 0; i < raw.length; i += 1) raw[i] = (i * 2654435761) % 256;
  const png = await sharp(raw, { raw: { width: side, height: side, channels: 3 } })
    .png({ compressionLevel: 0 })
    .toBuffer();
  const final =
    png.length >= targetBytes ? png : Buffer.concat([png, Buffer.alloc(targetBytes - png.length)]);
  fs.writeFileSync(path.join(fixturesDir, 'oversize.png'), final);
}

function writeReportPdf() {
  // A minimal, valid, single-page PDF — used only to prove PDFs are
  // refused at the upload route in Phase 1 (FD-036); never parsed.
  const marker = `${DEMO_MARKER} — report.pdf fixture`;
  const content = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 80>>stream
BT /F1 12 Tf 40 700 Td (${marker}) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
trailer<</Size 6/Root 1 0 R>>
startxref
0
%%EOF`;
  fs.writeFileSync(path.join(fixturesDir, 'report.pdf'), content, 'utf8');
}

const README = `# Fixtures

Generated by \`pnpm fixtures:build\` (\`packages/test-support/scripts/build-fixtures.mjs\`).
Never committed larger than 1 MB except where noted; regenerate rather than
hand-edit.

| File | Purpose |
|---|---|
| \`prescription-1.jpg\`, \`prescription-2.jpg\` | Two synthetic prescription pages (DEMO marker drawn into the pixels), used in the storyboard's composer walkthrough (step 12). |
| \`photo.jpg\` | A synthetic prescription photo carrying EXIF GPS — proves metadata stripping in the real pipeline (T-304). |
| \`not-a-png.png\` | Valid JPEG bytes saved with a \`.png\` name — a declared/detected MIME mismatch (\`evidence.type_rejected\` / \`type_mismatch\`). |
| \`broken.jpg\` | A truncated JPEG — triggers \`failed(malformed)\`. |
| \`flagged.jpg\` | A valid JPEG whose COM segment holds \`ROGIKOTHA-MALWARE-TEST-MARKER\`, matched by the custom ClamAV signature \`infra/compose/clamav/\` mounts — demonstrates malware detection without a real EICAR string. |
| \`oversize.png\` | 16 MB — over the 15 MB per-file limit. **Git-ignored**, regenerated on demand. |
| \`report.pdf\` | A minimal valid PDF, used only to prove PDFs are refused at the upload route in Phase 1 (FD-036); added beyond T-303's own fixture list because \`05-demo-storyboard.md\` step 12 needs it — see ISSUES.md. |

## Storage key layout (seed derivatives, \`seed/derivatives.ts\`)

Generated evidence derivatives (not these fixtures) are written under
\`STORAGE_ROOT\` as:

\`\`\`
<STORAGE_ROOT>/public/<itemPublicId>/page-1.png
<STORAGE_ROOT>/public/<itemPublicId>/thumb.png
<STORAGE_ROOT>/private/<itemPublicId>/...   (failed items only — never public)
\`\`\`

T-304's real \`FsStorage\` adapter should keep this same \`{public,private}/<itemPublicId>/<file>\`
layout so seeded rows keep resolving after the real pipeline replaces this stand-in.
`;

async function main() {
  fs.mkdirSync(fixturesDir, { recursive: true });
  await writePrescriptionJpg('prescription-1.jpg', 'Prescription, March 2026 — page 1');
  await writePrescriptionJpg('prescription-2.jpg', 'Prescription, March 2026 — page 2');
  await writePhotoWithExifGps();
  await writeNotAPng();
  await writeBrokenJpg();
  await writeFlaggedJpg();
  await writeOversizePng();
  writeReportPdf();
  fs.writeFileSync(path.join(fixturesDir, 'README.md'), README, 'utf8');
  console.log(`Wrote fixtures to ${fixturesDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
