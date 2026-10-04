// Replaces: `renderCompose`/`renderPreview` (composer wizard), app.js. Maps
// from RK.doctors (doctor picker), the suggested tag lists (app.js
// `TAG_GROUPS`, seeded as `taxonomy_terms` in T-007), and RK.user.drafts.
//
// TODO(T-306): owner refines every field below against the ported
// component; `ComposerDraftVM.payload`'s shape is the composer's own state
// (see `schemas/review.ts` `SaveDraftInput.payload`, same TODO owner).
import type { TagGroup } from '../enums';

export interface ComposerDoctorOptionVM {
  publicId: string;
  name: string;
  specialty: string;
  city: string;
  area: string;
}

export interface ComposerTagOptionVM {
  group: TagGroup;
  label: string;
  termId?: string;
}

export interface ComposerDraftVM {
  draftId?: string;
  expiresAt?: string;
  doctorPublicId?: string;
  conditionPublicId?: string;
  title?: string;
  excerpt?: string;
  blocked: boolean;
  payload: unknown;
}

export interface ComposerVM {
  doctors: ComposerDoctorOptionVM[];
  tagGroups: Partial<Record<TagGroup, ComposerTagOptionVM[]>>;
  draft?: ComposerDraftVM;
}
