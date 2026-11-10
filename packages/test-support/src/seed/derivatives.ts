// Release 2 (T-304): re-seed through the pipeline. Until the real evidence
// pipeline exists, this generates evidence derivatives directly with
// sharp: one `page_png` (1240x1754, white, the DEMO marker text + item
// label + page number, drawn via an SVG overlay) and one `thumbnail`
// (200px) per page, written straight under `STORAGE_ROOT/{public,private}`
// (task step 7 — the real `FsStorage` adapter is T-303/T-304's; the key
// layout here is documented in `fixtures/README.md` so that task keeps it).
//
// Scope change 2026-09-12 (CR-001 / FD-036, "images only"): no PDFs are
// generated here — every seeded evidence item's `page_count` is 1, and no
// `derivative_pdf` artifact is produced (the artifact_kind enum keeps that
// value reserved for Phase 2, unused).
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const THUMB_WIDTH = 200;
const THUMB_HEIGHT = Math.round((THUMB_WIDTH / PAGE_WIDTH) * PAGE_HEIGHT);

const DEMO_MARKER = 'DEMO — SYNTHETIC DOCUMENT — NOT A REAL PATIENT RECORD';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pageSvg(
  labelEn: string,
  pageNo: number,
  width: number,
  height: number,
  scale: number,
): Buffer {
  const fontSize = Math.round(22 * scale);
  const markerSize = Math.round(16 * scale);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
    <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#cccccc" stroke-width="${Math.max(1, Math.round(scale))}" />
    <text x="${Math.round(40 * scale)}" y="${Math.round(80 * scale)}" font-family="sans-serif" font-size="${markerSize}" fill="#b00020" font-weight="bold">${escapeXml(DEMO_MARKER)}</text>
    <text x="${Math.round(40 * scale)}" y="${Math.round(160 * scale)}" font-family="sans-serif" font-size="${fontSize}" fill="#111111">${escapeXml(labelEn)}</text>
    <text x="${Math.round(40 * scale)}" y="${Math.round(200 * scale)}" font-family="sans-serif" font-size="${fontSize}" fill="#111111">Page ${pageNo}</text>
  </svg>`;
  return Buffer.from(svg);
}

export interface GeneratedArtifact {
  kind: 'page_png' | 'thumbnail';
  pageNo: number;
  bytes: Buffer;
  width: number;
  height: number;
  sha256: string;
  storageKey: string;
}

/** Generates the page + thumbnail artifacts for one evidence item and writes them under `STORAGE_ROOT`. */
export async function generateDerivatives(
  storageRoot: string,
  itemPublicId: string,
  labelEn: string,
  pageCount: number,
  isPublic: boolean,
): Promise<GeneratedArtifact[]> {
  const artifacts: GeneratedArtifact[] = [];
  const baseDir = path.join(storageRoot, isPublic ? 'public' : 'private', itemPublicId);
  await fs.mkdir(baseDir, { recursive: true });

  for (let pageNo = 1; pageNo <= pageCount; pageNo += 1) {
    const pagePng = await sharp(pageSvg(labelEn, pageNo, PAGE_WIDTH, PAGE_HEIGHT, 1))
      .png()
      .toBuffer();
    const pageKey = pageCount === 1 ? 'page-1.png' : `page-${pageNo}.png`;
    await fs.writeFile(path.join(baseDir, pageKey), pagePng);
    artifacts.push({
      kind: 'page_png',
      pageNo,
      bytes: pagePng,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      sha256: createHash('sha256').update(pagePng).digest('hex'),
      storageKey: `${isPublic ? 'public' : 'private'}/${itemPublicId}/${pageKey}`,
    });

    if (pageNo === 1) {
      const thumbPng = await sharp(
        pageSvg(labelEn, pageNo, THUMB_WIDTH, THUMB_HEIGHT, THUMB_WIDTH / PAGE_WIDTH),
      )
        .png()
        .toBuffer();
      await fs.writeFile(path.join(baseDir, 'thumb.png'), thumbPng);
      artifacts.push({
        kind: 'thumbnail',
        pageNo: 1,
        bytes: thumbPng,
        width: THUMB_WIDTH,
        height: THUMB_HEIGHT,
        sha256: createHash('sha256').update(thumbPng).digest('hex'),
        storageKey: `${isPublic ? 'public' : 'private'}/${itemPublicId}/thumb.png`,
      });
    }
  }

  return artifacts;
}

/** A deterministic stand-in "original" file's bytes and sha256, for `evidence_items.original_*`. */
export function generateOriginal(
  itemPublicId: string,
  labelEn: string,
): { bytes: Buffer; sha256: string } {
  const bytes = Buffer.from(`synthetic-original:${itemPublicId}:${labelEn}`);
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}
