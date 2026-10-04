// Replaces: `renderMine` (personal workspace — tabs: published/drafts/
// preferences/feedback/data requests, appeal sheet `openAppeal`), app.js.
// Maps from RK.user (published, drafts, bookmarks) and the account/
// data-requests/moderation queries this page composes.
//
// TODO(T-409): owner refines every field below against the ported
// component.
import type { DataRequestKind, DataRequestStatus, Locale, PublicationState } from '../enums';

export interface WorkspacePublishedItemVM {
  publicId: string;
  title: string;
  doctorName: string;
  postedAt: string;
  state: PublicationState;
  /** present only while a deleted/tombstoned item is still restorable */
  restoreDeadline?: string;
}

export interface WorkspaceDraftItemVM {
  draftId: string;
  title: string;
  excerpt: string;
  expiresInDays: number;
  blocked: boolean;
}

export interface WorkspacePreferencesVM {
  interfaceLocale: Locale;
  emailSecurity: boolean;
  emailModeration: boolean;
  emailEvidence: boolean;
  emailDiscussion: boolean;
}

export interface WorkspaceDataRequestVM {
  kind: DataRequestKind;
  status: DataRequestStatus;
  requestedAt: string;
}

export interface WorkspaceAppealableVM {
  caseCode: string;
  reviewPublicId: string;
}

export interface WorkspaceVM {
  displayName: string;
  username: string;
  joinedAt: string;
  published: WorkspacePublishedItemVM[];
  drafts: WorkspaceDraftItemVM[];
  preferences: WorkspacePreferencesVM;
  dataRequests: WorkspaceDataRequestVM[];
  appealable: WorkspaceAppealableVM[];
}
