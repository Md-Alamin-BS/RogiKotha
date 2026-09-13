// Replaces: `SecuritySettings` (`/me/security`) and the staff `renderSecurity`
// ("Trusted devices" / "Where you're signed in"), app.js. Maps from
// `account.listSessions` and `staff.listDevices`.
//
// TODO(T-102): owner refines every field below against the ported
// component.
export interface SessionVM {
  id: string;
  current: boolean;
  label: string;
  firstSeen: string;
  lastSeen: string;
}

export interface TrustedDeviceVM {
  id: string;
  label: string;
  approvedAt?: string;
  lastSeenAt: string;
}

export interface SecurityVM {
  sessions: SessionVM[];
  /** staff only — absent for a plain patient account */
  trustedDevices?: TrustedDeviceVM[];
}
