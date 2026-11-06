// A persona: the public author identity that reviews and comments point at (AD-3, U11 entities.md).
// It holds no account data. `domain` imports nothing (FD-093), so the kind list is restated here;
// `application` proves at compile time that it equals `IdentityMode` in `@rogikotha/contracts`.

export const PERSONA_KINDS = ['named', 'pseudonymous', 'anonymous'] as const;
export type PersonaKind = (typeof PERSONA_KINDS)[number];

export interface Persona {
  id: string;
  kind: PersonaKind;
  /** named: the name at creation; pseudonymous: the username; anonymous: the alias or legacy text. */
  displayName: string;
  /** Null on every anonymous persona. */
  username: string | null;
  avatarHue: number | null;
}

/** Anonymous personas all share this hue, so a hue never correlates threads (BR1.7). */
export const ANONYMOUS_AVATAR_HUE = 0;
