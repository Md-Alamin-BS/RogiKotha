// Replaces: `SecuritySettings` (`/me/security`) and the staff `renderSecurity`
// ("Trusted devices" / "Where you're signed in"), app.js. Maps from
// `account.listSessions`, `account.getOwnAccount` and `staff.listDevices`.

/** One live session (T-101 BR4.7): no token, no IP, no login history. */
export interface SessionVM {
  /** the library's session id, never the session token */
  id: string;
  current: boolean;
  /** browser family (Chrome, Firefox, Safari, Edge), null when unknown; T-102 builds the label */
  browser: string | null;
  /** OS family (Windows, macOS, Android, iOS, Linux), null when unknown */
  os: string | null;
  /** ISO 8601, the session's creation */
  firstSeen: string;
  /** ISO 8601, the session's last refresh */
  lastSeen: string;
}

export interface TrustedDeviceVM {
  id: string;
  label: string;
  approvedAt?: string;
  lastSeenAt: string;
}

/**
 * The holder's own account (FD-096, T-101 BR4.10): built per request, never cached, never
 * logged, and only for that holder. The full address never leaves `account.getOwnAccount`.
 */
export interface OwnAccountVM {
  username: string;
  displayName: string;
  emailVerified: boolean;
  /** first grapheme of the local part, `****`, `@`, the domain, e.g. `s****@example.test` */
  emailMasked: string;
}

export interface SecurityVM {
  sessions: SessionVM[];
  /** from `OwnAccountVM.emailVerified` */
  emailVerified: boolean;
  /** from `OwnAccountVM.emailMasked` */
  ownEmailMasked: string;
  /** staff only — absent for a plain patient account */
  trustedDevices?: TrustedDeviceVM[];
}
