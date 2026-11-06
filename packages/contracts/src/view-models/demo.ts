// View rows of the demo slice (intent 261030-demo-slice, FD-099). The full Units (T-101 onward)
// replace them.
// ASSUMPTION(demo-slice): the rows live here, not in packages/database, because contracts is the
// one package that both the database data functions and the web components may import (T-010).
import type {
  AccountStatus,
  EvidenceState,
  IdentityMode,
  Locale,
  Outcome,
  Relationship,
  Sentiment,
} from '../enums';

/** The three-value `reviews.language` column. */
export type DemoReviewLanguage = 'en' | 'bn' | 'mixed';

/** An expected refusal from a data function; the caller maps `reason` to an i18n message. */
export type DemoOutcome<T, R extends string> = { ok: true; data: T } | { ok: false; reason: R };

/** The signed-in account. Never carries the email address or the password hash (NFR3). */
export interface DemoCurrentAccount {
  accountId: string;
  authUserId: string;
  username: string;
  displayName: string;
  locale: Locale;
  status: AccountStatus;
  /** The newest named persona linked to the account; a display-name change adds a new one. */
  currentPersonaId: string;
  /** The newest pseudonymous persona not scoped to one review, or null when the account has none. */
  pseudonymousPersonaId: string | null;
  pseudonymousDisplayName: string | null;
}

export interface DemoProfile {
  accountId: string;
  username: string;
  displayName: string;
  locale: Locale;
  createdAt: Date;
}

/** One of the signed-in user's own experiences, for `/me`. */
export interface DemoOwnReviewRow {
  publicId: string;
  title: string;
  doctorName: string;
  state: 'published' | 'hidden' | 'removed' | 'other';
  publishedAt: Date | null;
  edited: boolean;
}

/** A doctor in the `/doctors` list; every text field is in the requested locale, null when not provided. */
export interface DemoDoctorListRow {
  id: string;
  publicId: string;
  name: string;
  specialty: string | null;
  qualifications: string | null;
  city: string | null;
  area: string | null;
  avatarHue: number | null;
  /** Published experiences about this doctor. A count of accounts, never a quality score. */
  publishedReviewCount: number;
  /** A member added this doctor and staff have not yet checked the submission (FD-100). */
  memberAdded: boolean;
}

export interface DemoDoctorChamber {
  name: string;
  hours: string | null;
}

export interface DemoDoctorDetail extends DemoDoctorListRow {
  about: string | null;
  languages: string | null;
  feeDisplay: string | null;
  chambers: DemoDoctorChamber[];
}

/** A doctor choice in the write form. */
export interface DemoDoctorOption {
  id: string;
  publicId: string;
  name: string;
  specialty: string | null;
}

/** A specialty choice in the write form's add-a-doctor panel. */
export interface DemoSpecialtyOption {
  id: string;
  name: string;
}

/** A doctor a member adds from the write form (FD-100); every value is as the member typed it. */
export interface DemoNewDoctorInput {
  name: string;
  specialtyId: string | null;
  chamber: string | null;
  bmdc: string | null;
}

export interface DemoDoctorRef {
  id: string;
  publicId: string;
  name: string;
  specialty: string | null;
}

/** A published experience in a list (home, doctor page). */
export interface DemoReviewCard {
  publicId: string;
  title: string;
  /** The first part of the body, plain text. */
  excerpt: string;
  doctor: DemoDoctorRef;
  authorDisplayName: string;
  identityMode: IdentityMode;
  relationship: Relationship;
  sentiment: Sentiment | null;
  outcome: Outcome | null;
  periodYear: number;
  periodMonth: number;
  publishedAt: Date;
  edited: boolean;
  commentCount: number;
  readyEvidenceCount: number;
}

/** The public projection of one experience; no account id, email or original file reaches it. */
export interface DemoReviewDetail {
  id: string;
  publicId: string;
  title: string;
  body: string | null;
  doctor: DemoDoctorRef;
  authorDisplayName: string;
  identityMode: IdentityMode;
  relationship: Relationship;
  sentiment: Sentiment | null;
  outcome: Outcome | null;
  periodYear: number;
  periodMonth: number;
  language: DemoReviewLanguage;
  publishedAt: Date;
  updatedAt: Date | null;
  /** True once a correction wrote a `review_versions` row after publishing. */
  edited: boolean;
  version: number;
  readyEvidenceCount: number;
}

/** The author's own experience, loaded for the edit form. */
export interface DemoReviewEditRow {
  id: string;
  publicId: string;
  doctorId: string;
  title: string;
  body: string;
  sentiment: Sentiment | null;
  outcome: Outcome | null;
  version: number;
}

export interface DemoCreateReviewInput {
  authorPersonaId: string;
  /** Recorded as `review_versions.actor_id`; never projected. */
  authorAccountId: string;
  doctorId: string;
  relationship: Relationship;
  periodYear: number;
  periodMonth: number;
  title: string;
  body: string;
  sentiment: Sentiment | null;
  outcome: Outcome | null;
  identityMode: 'named' | 'pseudonymous';
  language: DemoReviewLanguage;
}

export interface DemoUpdateReviewFields {
  title: string;
  body: string;
  sentiment: Sentiment | null;
  outcome: Outcome | null;
}

export type DemoEvidenceMime = 'image/jpeg' | 'image/png';

/** The outcome of the ClamAV scan of one upload. */
export type DemoScanResult = 'clean' | 'infected' | 'error';

export interface DemoAddEvidenceInput {
  reviewId: string;
  ownerAccountId: string;
  /** Path of the original under `var/evidence/`, outside the web root. */
  storageKey: string;
  /** The type detected from the file's magic bytes, not the declared one. */
  mime: DemoEvidenceMime;
  size: number;
  sha256: string;
  /** AES-256-GCM of the original file name (`apps/web/src/server/crypto.ts`). */
  originalFilenameEnc: Uint8Array;
}

/** One of the author's own files. The file name stays encrypted until the server decrypts it. */
export interface DemoOwnEvidenceRow {
  id: string;
  publicId: string;
  state: EvidenceState;
  mime: DemoEvidenceMime;
  size: number;
  originalFilenameEnc: Uint8Array;
  createdAt: Date;
}

export interface DemoComment {
  id: string;
  publicId: string;
  /** Null for a deleted comment kept as a tombstone. */
  body: string | null;
  /** Null for a tombstone. */
  authorDisplayName: string | null;
  createdAt: Date;
  tombstone: boolean;
  /** True when the viewer wrote it and it is not deleted. */
  canDelete: boolean;
}

/** A top-level comment with its replies (one reply level), oldest first. */
export interface DemoCommentThread extends DemoComment {
  replies: DemoComment[];
}

export interface DemoAddCommentInput {
  reviewId: string;
  /** The public id of the comment being replied to, or null for a top-level comment. */
  parentPublicId: string | null;
  authorPersonaId: string;
  body: string;
}
