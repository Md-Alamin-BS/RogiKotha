// Replaces: `renderViewerBody` (evidence viewer) and the evidence groups
// rendered inside `renderAccount`, app.js. Maps from RK.evidence (group,
// state, pages, label, failReason) — but only `published` items ever reach
// a public view model (03-routes-and-contracts.md §4 `evidence.getPublic`
// "only published").
//
// TODO(T-308): owner refines every field below against the ported
// evidence-viewer component.
import type { EvidenceGroup } from '../enums.js';

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
