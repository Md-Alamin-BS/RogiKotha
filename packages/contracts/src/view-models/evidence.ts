// Replaces: `renderViewerBody` (evidence viewer) and the evidence groups
// rendered inside `renderAccount`, app.js. Maps from RK.evidence (group,
// state, pages, label, failReason) — but only `published` items ever reach
// a public view model (03-routes-and-contracts.md §4 `evidence.getPublic`
// "only published").
//
// Release 2 (T-308): owner refines every field below against the ported
// evidence-viewer component.
import type { EvidenceGroup } from '../enums';

export interface EvidencePageRefVM {
  artifactUrl: string;
  width: number;
  height: number;
}

export interface EvidenceItemVM {
  publicId: string;
  label?: string;
  pages: EvidencePageRefVM[];
  downloadUrl: string;
  pageCount: number;
}

export interface EvidenceGroupVM {
  group: EvidenceGroup;
  items: EvidenceItemVM[];
}

export interface ViewerDocVM {
  itemId: string;
  label?: string;
  pages: EvidencePageRefVM[];
  downloadUrl: string;
}

// U48 (ENT-008 to ENT-010): the author's own list and the public note. `OwnEvidenceList` and
// `OwnEvidenceFile` keep the names and fields of `apps/web/src/server/actions/evidence.ts`; the
// status union only widens (`failed`) and `reasonKey` is optional, so `EvidenceUploader` keeps its props.

export type OwnEvidenceStatus = 'ready' | 'pending' | 'rejected' | 'failed';

/** One of the author's files, as the uploader shows it. No storage key, hash or internal id. */
export interface OwnEvidenceFile {
  publicId: string;
  /** The opened original file name; null when it is empty or cannot be opened. */
  name: string | null;
  status: OwnEvidenceStatus;
  size: number;
  /** The i18n key of the reason, for `rejected` and `failed` only (BR6.2). */
  reasonKey?: string;
}

export interface OwnEvidenceList {
  reviewPublicId: string;
  /** Oldest first; removed and expired items are not listed. */
  files: OwnEvidenceFile[];
  maxFiles: number;
  maxBytes: number;
}

/** The public part of `EvidenceSection`: a count only; 0 renders "No documents", never 0. */
export interface EvidenceNoteVM {
  count: number;
}
