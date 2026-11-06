// The account row the prototype's `accountRow()` renders (app.js 624-645), shared by the doctor,
// condition and home pages (U46 functional-spec § 7). No engagement counts (Question 9).
import type { IdentityMode, Outcome, Relationship, Sentiment } from '../enums';

/** An anonymous byline carries `personaKind` only (BR2.10). */
export interface BylineVM {
  personaKind: IdentityMode;
  /** Named personas only. */
  displayName?: string;
  /** Pseudonymous personas only. */
  username?: string;
  /** Named and pseudonymous personas only. */
  initials?: string;
}

export interface ExperienceCardVM {
  publicId: string;
  title: string;
  /** At most 190 graphemes of the account's text (BR3.7). */
  excerpt: string;
  truncated: boolean;
  sentiment?: Sentiment;
  outcome?: Outcome;
  /** A term link when the tag resolves to an active term, else the free text as written (BR3.9). */
  condition?: { publicId?: string; name: string };
  documentsCount: number;
  author: BylineVM;
  relationship: Relationship;
  period: { year: number; month: number };
  doctor: { publicId: string; name: string };
}
