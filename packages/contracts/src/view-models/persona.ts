// The one public shape of a persona (C4 `publicProjection`, U11 BR1.4). Bylines on reviews and
// comments are built from it. It never carries an id, an account field, a review id or a
// timestamp, and an anonymous projection never carries a username (FD-015).

export interface NamedPersonaPublicVM {
  kind: 'named';
  /** The display name the persona was created with; a rename makes a new persona. */
  displayName: string;
  /** For the `/<locale>/authors/<username>` link. */
  username: string | null;
  avatarHue: number | null;
}

export interface PseudonymousPersonaPublicVM {
  kind: 'pseudonymous';
  /** Always the username (BR1.4). */
  displayName: string;
  username: string | null;
  avatarHue: number | null;
}

export interface AnonymousPersonaPublicVM {
  kind: 'anonymous';
  /** The thread alias `patient-xxxx`, or null for a legacy row that holds no alias (BR2.7). */
  displayName: string | null;
  avatarHue: 0;
}

export type PersonaPublicVM =
  NamedPersonaPublicVM | PseudonymousPersonaPublicVM | AnonymousPersonaPublicVM;
