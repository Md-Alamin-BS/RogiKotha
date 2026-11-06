// Replaces: `renderAccount` (experience/account page) and the experience
// index cards, app.js. Maps from RK.reviews (title, body, timeline,
// followUp, tags, claims, likes/dislikes/comments/evidence counts).
//
// TODO(T-307): owner refines every field below against the ported
// component; `review.getExperience`'s "thirteen sections" and "Not
// provided" semantics (03-routes-and-contracts.md §4) are this task's call.
import type { FollowUpKind, Outcome, Relationship, Sentiment, TagGroup } from '../enums';
import type { EvidenceGroupVM } from './evidence';

// The card moved to its own file with U46 (functional-spec § 7); U47 extends it there.
export type { ExperienceCardVM } from './experience-card';

export interface TimelineSectionVM {
  key: 'symptoms' | 'diagnosis' | 'treatment' | 'after';
  body: string;
}

export interface FollowUpVM {
  kind: FollowUpKind;
  date: string;
  body: string;
  laterProviderText?: string;
}

/** "Reviewer's label" — never rendered as a validated claim. */
export interface ClaimVM {
  label: string;
  note?: string;
}

export interface TagVM {
  group: TagGroup;
  label: string;
}

export interface ExperiencePageVM {
  publicId: string;
  doctor: { publicId: string; name: string; specialty: string };
  condition?: { publicId: string; name: string };
  relationship: Relationship;
  sentiment?: Sentiment;
  outcome?: Outcome;
  period: string;
  postedAt: string;
  title: string;
  body?: string;
  sections?: TimelineSectionVM[];
  followUps: FollowUpVM[];
  claims: ClaimVM[];
  tags: TagVM[];
  identityLabel: string;
  likes: number;
  dislikes: number;
  edited: boolean;
  tombstone: boolean;
  evidenceGroups: EvidenceGroupVM[];
}

/** `review.preview` returns the exact VM the public would see. */
export type PreviewVM = ExperiencePageVM;
