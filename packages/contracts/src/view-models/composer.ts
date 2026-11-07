// The four-step composer (`renderCompose` / `renderPreview`, app.js) and its draft list
// (U47 ENT-009, ENT-010).
import type { ConfigValues } from '../config-values';
import type { TagGroup } from '../enums';
import type { DraftPayload, DraftTarget } from '../schemas/review';

export interface ComposerOptionVM {
  publicId: string;
  label: string;
}

export interface ComposerSpecialtyVM {
  id: string;
  name: string;
}

export interface ComposerTagSuggestionVM {
  termPublicId: string;
  name: string;
}

export interface ComposerDraftVM {
  draftId: string;
  payload: DraftPayload;
  /** ISO timestamp. */
  expiresAt: string;
}

export interface ComposerVM {
  /** From `directory.listDoctors`, at most 100. */
  doctors: ComposerOptionVM[];
  /** Empty while facility feedback is off. */
  branches: ComposerOptionVM[];
  specialties: ComposerSpecialtyVM[];
  suggestedTags: Record<TagGroup, ComposerTagSuggestionVM[]>;
  /** The author's own names for the identity choice. */
  names: { named: string | null; pseudonymous: string | null };
  draft?: ComposerDraftVM;
  emergencyNumbers: ConfigValues['emergency'];
}

export interface DraftSummaryVM {
  draftId: string;
  /** The author's title or the derived one; null shows Untitled draft. */
  title: string | null;
  target: DraftTarget;
  /** ISO timestamp. */
  updatedAt: string;
  /** ISO timestamp. */
  expiresAt: string;
}
