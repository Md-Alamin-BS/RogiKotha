// Replaces: `renderProviders` (staff provider submissions/claims/field
// changes), admin/app.js. Maps from RK.moderation.providers (pending,
// claims, fieldChanges).
//
// Release 2 (T-407): owner refines every field below against the ported
// component.
export interface PendingSubmissionVM {
  id: string;
  name: string;
  specialty?: string;
  city?: string;
  bmdcNumber?: string;
  submittedBy: 'community' | 'provider';
  duplicateOfPublicId?: string;
  note?: string;
}

export interface PendingClaimVM {
  id: string;
  doctorPublicId: string;
  method: string;
  note?: string;
}

export interface PendingFieldChangeVM {
  id: string;
  targetPublicId: string;
  field: string;
  from?: string;
  to: string;
  protected: boolean;
}

export interface ProvidersVM {
  pendingSubmissions: PendingSubmissionVM[];
  pendingClaims: PendingClaimVM[];
  pendingFieldChanges: PendingFieldChangeVM[];
}
